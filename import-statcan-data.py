"""
StatCan Data Import and Price Analysis Script

This script downloads the latest grocery price data from Statistics Canada,
imports it into MongoDB, and automatically recalculates price changes and streaks.

Features:
- Downloads latest StatCan data (Table 18100245)
- Imports data into MongoDB with proper indexing
- Calculates month-over-month price changes
- Calculates consecutive price increase/decrease streaks
- Updates price_changes and price_streaks collections

Usage:
    python import-statcan-data.py

Configuration:
    Set RECALCULATE_PRICE_CHANGES = False to skip calculations
    Set MONGODB_URI environment variable for database connection
"""

import requests
import zipfile
import pandas as pd
import os
import shutil
from pymongo import MongoClient, errors
import bson
from datetime import datetime

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("python-dotenv not installed. Install with: pip install python-dotenv")
    print("Or set MONGODB_URI environment variable directly.")

TABLE_ID = "18100245"
LANG = "en"
api_url = f"https://www150.statcan.gc.ca/t1/wds/rest/getFullTableDownloadCSV/{TABLE_ID}/{LANG}"

# Configuration options
RECALCULATE_PRICE_CHANGES = True  # Set to False to skip price change calculations

def calculate_and_store_price_changes(client, db_name, collection_name, geo):
    """
    Calculate and store price changes and streaks for all products in a geographic location.
    This function replicates the logic from the backend TypeScript code.
    """
    print(f"🔄 Calculating price changes and streaks for {geo}...")
    
    db = client[db_name]
    statcan_collection = db[collection_name]
    price_changes_collection = db['price_changes']
    price_streaks_collection = db['price_streaks']
    
    try:
        # Get all products for this geographic location
        products = statcan_collection.distinct('Products', {'GEO': geo})
        print(f"📦 Found {len(products)} products for {geo}")
        
        processed_count = 0
        
        # Process each product
        for product in products:
            try:
                # Get all price data for this product in this region, sorted by date
                price_data = list(statcan_collection.find({
                    'GEO': geo,
                    'Products': product
                }).sort('REF_DATE', 1))
                
                # Need at least 2 data points to calculate a change
                if len(price_data) < 2:
                    print(f"⚠️ Insufficient data for {product} in {geo} ({len(price_data)} points)")
                    continue
                
                # Get the two most recent data points
                current = price_data[-1]
                previous = price_data[-2]
                
                # Ensure we have valid numeric values
                current_price = float(current['VALUE']) if current['VALUE'] is not None else None
                previous_price = float(previous['VALUE']) if previous['VALUE'] is not None else None
                
                if current_price is None or previous_price is None or previous_price == 0:
                    print(f"⚠️ Invalid price data for {product} in {geo}")
                    continue
                
                # Calculate changes
                change = current_price - previous_price
                change_percent = (change / previous_price) * 100
                
                # Create or update the price change record
                price_change_doc = {
                    'product': product,
                    'geo': geo,
                    'currentPrice': current_price,
                    'previousPrice': previous_price,
                    'change': change,
                    'changePercent': change_percent,
                    'currentDate': current['REF_DATE'],
                    'previousDate': previous['REF_DATE'],
                    'lastUpdated': datetime.now()
                }
                
                price_changes_collection.replace_one(
                    {'product': product, 'geo': geo},
                    price_change_doc,
                    upsert=True
                )
                
                # --- Streak Calculation ---
                current_streak = 1
                streak_type = None
                streak_start_idx = len(price_data) - 1
                
                for i in range(len(price_data) - 1, 0, -1):
                    current_val = float(price_data[i]['VALUE']) if price_data[i]['VALUE'] is not None else None
                    previous_val = float(price_data[i-1]['VALUE']) if price_data[i-1]['VALUE'] is not None else None
                    
                    if current_val is None or previous_val is None:
                        break
                    
                    diff = current_val - previous_val
                    
                    if diff > 0:
                        if streak_type == 'increase' or streak_type is None:
                            current_streak += 1
                            streak_type = 'increase'
                            streak_start_idx = i - 1
                        else:
                            break
                    elif diff < 0:
                        if streak_type == 'decrease' or streak_type is None:
                            current_streak += 1
                            streak_type = 'decrease'
                            streak_start_idx = i - 1
                        else:
                            break
                    else:
                        break
                
                if current_streak > 1 and streak_type:
                    # Store streak data
                    streak_data = []
                    for i in range(streak_start_idx, len(price_data)):
                        streak_data.append({
                            'REF_DATE': price_data[i]['REF_DATE'],
                            'VALUE': price_data[i]['VALUE']
                        })
                    
                    streak_doc = {
                        'product': product,
                        'geo': geo,
                        'streakLength': current_streak,
                        'streakType': streak_type,
                        'data': streak_data,
                        'lastUpdated': datetime.now()
                    }
                    
                    price_streaks_collection.replace_one(
                        {'product': product, 'geo': geo},
                        streak_doc,
                        upsert=True
                    )
                else:
                    # Remove streak if no current streak
                    price_streaks_collection.delete_one({'product': product, 'geo': geo})
                
                processed_count += 1
                
                if processed_count % 10 == 0:
                    print(f"✅ Processed {processed_count}/{len(products)} products for {geo}")
                
            except Exception as err:
                print(f"❌ Error processing {product} in {geo}: {err}")
        
        print(f"✅ Completed price change calculation for {geo}: {processed_count} products processed")
        return processed_count
        
    except Exception as err:
        print(f"❌ Error calculating price changes for {geo}: {err}")
        raise err

def recalculate_all_price_changes(client, db_name, collection_name):
    """
    Recalculate price changes and streaks for all geographic locations.
    """
    print("🔄 Starting recalculation of price changes and streaks...")
    
    db = client[db_name]
    statcan_collection = db[collection_name]
    
    # Get all unique geographic locations
    geos = statcan_collection.distinct('GEO')
    print(f"🌍 Found {len(geos)} geographic locations: {geos}")
    
    total_processed = 0
    for geo in geos:
        try:
            processed = calculate_and_store_price_changes(client, db_name, collection_name, geo)
            total_processed += processed
        except Exception as err:
            print(f"❌ Failed to process {geo}: {err}")
    
    print(f"🎉 Recalculation completed! Total products processed: {total_processed}")
    return total_processed

try:
    print("🚀 Starting StatCan data import process...")
    print(f"📊 Table ID: {TABLE_ID}")
    print(f"🌐 API URL: {api_url}")
    print("-" * 50)
    
    # Step 1: Get the download link
    print("📡 Step 1: Fetching download link from StatCan API...")
    response = requests.get(api_url)
    response.raise_for_status()
    data = response.json()
    if 'object' not in data or not data['object']:
        print("❌ No download link found in response.")
        exit(1)
    download_url = data['object']
    print(f"✅ Download URL obtained: {download_url}")

    # Step 2: Download the ZIP file
    print("📥 Step 2: Downloading ZIP file from StatCan...")
    zip_filename = f"statcan_{TABLE_ID}.csv"  # Actually a ZIP file
    with requests.get(download_url, stream=True) as r:
        r.raise_for_status()
        total_size = int(r.headers.get('content-length', 0))
        downloaded = 0
        with open(zip_filename, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
                downloaded += len(chunk)
                if total_size > 0:
                    percent = (downloaded / total_size) * 100
                    print(f"\r📥 Downloading: {percent:.1f}% ({downloaded:,} / {total_size:,} bytes)", end='', flush=True)
    print(f"\n✅ Table {TABLE_ID} downloaded as {zip_filename}")

    # Step 3: Extract the ZIP file
    print("📂 Step 3: Extracting ZIP file...")
    extract_dir = f"statcan_{TABLE_ID}_extracted"
    with zipfile.ZipFile(zip_filename, 'r') as zip_ref:
        file_list = zip_ref.namelist()
        print(f"📁 Found {len(file_list)} files in ZIP archive")
        for file in file_list:
            print(f"   📄 {file}")
        zip_ref.extractall(extract_dir)
    print(f"✅ Files extracted to: {extract_dir}")

    # Step 4: Find the CSV file in the extracted folder
    print("🔍 Step 4: Locating CSV file...")
    csv_file = None
    files_in_dir = os.listdir(extract_dir)
    print(f"📁 Files in extracted directory: {files_in_dir}")
    for fname in files_in_dir:
        if fname.endswith('.csv'):
            csv_file = os.path.join(extract_dir, fname)
            print(f"✅ Found CSV file: {fname}")
            break
    if not csv_file:
        raise FileNotFoundError("❌ No CSV file found in the extracted ZIP.")

    # Step 5: Read only the required columns
    print("📖 Step 5: Reading CSV file...")
    usecols = ['REF_DATE', 'GEO', 'Products', 'VECTOR', 'VALUE']
    print(f"📋 Reading columns: {usecols}")
    try:
        df = pd.read_csv(csv_file, usecols=usecols, encoding='utf-8', low_memory=False)
        print(f"✅ CSV loaded successfully")
        print(f"📊 Total rows: {len(df):,}")
        print(f"📊 Total columns: {len(df.columns)}")
        print(f"📊 Memory usage: {df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB")
        
        # Show sample data
        print(f"📋 Sample data (first 3 rows):")
        print(df.head(3).to_string())
        
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        exit(1)

    # Step 6: Insert into MongoDB with unique index and batch insert
    print("🗄️ Step 6: Connecting to MongoDB...")
    # Use environment variable for MongoDB connection string, fallback to localhost
    mongo_uri = os.getenv('MONGODB_URI', "mongodb://localhost:27017/")
    db_name = "statcan"
    collection_name = f"table_{TABLE_ID}"

    print(f"🔗 Connecting to MongoDB: {mongo_uri.split('@')[1] if '@' in mongo_uri else mongo_uri}")
    client = MongoClient(mongo_uri)
    db = client[db_name]
    collection = db[collection_name]
    print(f"✅ Connected to database: {db_name}")
    print(f"✅ Using collection: {collection_name}")

    # Create a unique index on REF_DATE, GEO, and Products
    print("🔧 Creating database index...")
    collection.create_index(
        [("REF_DATE", 1), ("GEO", 1), ("Products", 1)],
        unique=True
    )
    print("✅ Unique index created on (REF_DATE, GEO, Products)")

    print("🔄 Converting DataFrame to records...")
    records = df.to_dict(orient='records')
    print(f"✅ Converted {len(records):,} records")

    def batch_upsert(collection, records, batch_size=1000):
        total_upserted = 0
        total_batches = (len(records) + batch_size - 1) // batch_size
        print(f"📦 Starting batch upsert: {total_batches} batches of {batch_size} records each")
        
        for i in range(0, len(records), batch_size):
            batch_num = (i // batch_size) + 1
            batch = records[i:i+batch_size]
            batch_upserted = 0
            
            print(f"📦 Processing batch {batch_num}/{total_batches} ({len(batch)} records)...")
            
            for j, rec in enumerate(batch):
                try:
                    if len(bson.BSON.encode(rec)) > 16 * 1024 * 1024:
                        print(f"⚠️ Skipped oversized record in batch {batch_num}")
                        continue
                except Exception as e:
                    print(f"❌ Error encoding record in batch {batch_num}: {e}")
                    continue
                try:
                    # Use upsert: match on REF_DATE, GEO, Products
                    result = collection.replace_one(
                        {"REF_DATE": rec["REF_DATE"], "GEO": rec["GEO"], "Products": rec["Products"]},
                        rec,
                        upsert=True
                    )
                    if result.upserted_id is not None or result.modified_count > 0:
                        total_upserted += 1
                        batch_upserted += 1
                except Exception as e:
                    print(f"❌ Upsert error in batch {batch_num}: {e}")
            
            # Progress update for each batch
            progress = (batch_num / total_batches) * 100
            print(f"✅ Batch {batch_num}/{total_batches} completed: {batch_upserted} records upserted ({progress:.1f}%)")
        
        return total_upserted

    if records:
        print("🚀 Starting database import...")
        print("-" * 50)
        start_time = pd.Timestamp.now()
        
        upserted_count = batch_upsert(collection, records, batch_size=1000)
        
        end_time = pd.Timestamp.now()
        duration = end_time - start_time
        
        print("-" * 50)
        print("🎉 IMPORT COMPLETED!")
        print(f"✅ Total records upserted: {upserted_count:,}")
        print(f"✅ Database: {db_name}.{collection_name}")
        print(f"⏱️ Duration: {duration}")
        print(f"📊 Records per second: {upserted_count / duration.total_seconds():.1f}")
        
        # Step 7: Recalculate price changes and streaks (if enabled)
        if RECALCULATE_PRICE_CHANGES:
            print("\n" + "=" * 50)
            print("🔄 Step 7: Recalculating price changes and streaks...")
            print("=" * 50)
            
            try:
                calculation_start_time = pd.Timestamp.now()
                total_calculated = recalculate_all_price_changes(client, db_name, collection_name)
                calculation_end_time = pd.Timestamp.now()
                calculation_duration = calculation_end_time - calculation_start_time
                
                print("-" * 50)
                print("🎉 CALCULATIONS COMPLETED!")
                print(f"✅ Total products processed: {total_calculated:,}")
                print(f"⏱️ Calculation duration: {calculation_duration}")
                print(f"📊 Products per second: {total_calculated / calculation_duration.total_seconds():.1f}")
            except Exception as calc_err:
                print(f"❌ Error during price change calculations: {calc_err}")
                print("⚠️ Data import was successful, but calculations failed. You may need to run calculations separately.")
        else:
            print("\n" + "=" * 50)
            print("⏭️ Step 7: Skipping price change calculations (RECALCULATE_PRICE_CHANGES=False)")
            print("=" * 50)
        
    else:
        print("❌ No records to upsert.")

    print("🔌 Closing database connection...")
    client.close()
    print("✅ Database connection closed")

    # Step 8: Clean up temporary files
    print("\n" + "=" * 50)
    print("🧹 Step 8: Cleaning up temporary files...")
    print("=" * 50)
    
    try:
        # Remove extracted directory
        if os.path.exists(extract_dir):
            shutil.rmtree(extract_dir)
            print(f"✅ Removed extracted directory: {extract_dir}")
        
        # Remove downloaded ZIP file
        if os.path.exists(zip_filename):
            os.remove(zip_filename)
            print(f"✅ Removed downloaded file: {zip_filename}")
        
        print("✅ Cleanup completed successfully")
    except Exception as cleanup_err:
        print(f"⚠️ Warning: Could not clean up temporary files: {cleanup_err}")
        print("💡 You may need to manually remove:")
        print(f"   - {extract_dir}")
        print(f"   - {zip_filename}")

except Exception as e:
    print(f"❌ Fatal error: {e}")
    print("💡 Check your internet connection and MongoDB credentials")
    
    # Clean up on error too (optional - comment out if you want to keep files for debugging)
    try:
        if 'extract_dir' in locals() and os.path.exists(extract_dir):
            print(f"\n🧹 Cleaning up extracted directory: {extract_dir}")
            shutil.rmtree(extract_dir)
        if 'zip_filename' in locals() and os.path.exists(zip_filename):
            print(f"🧹 Cleaning up downloaded file: {zip_filename}")
            os.remove(zip_filename)
    except:
        pass  # Ignore cleanup errors on fatal errors
    
    exit(1) 