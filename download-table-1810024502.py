import requests
import zipfile
import pandas as pd
import os
from pymongo import MongoClient, errors
import bson

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
    else:
        print("❌ No records to upsert.")

    print("🔌 Closing database connection...")
    client.close()
    print("✅ Database connection closed")

except Exception as e:
    print(f"❌ Fatal error: {e}")
    print("💡 Check your internet connection and MongoDB credentials")
    exit(1) 