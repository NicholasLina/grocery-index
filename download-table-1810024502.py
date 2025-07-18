import requests
import zipfile
import pandas as pd
import os
from pymongo import MongoClient, errors
import bson

TABLE_ID = "18100245"
LANG = "en"
api_url = f"https://www150.statcan.gc.ca/t1/wds/rest/getFullTableDownloadCSV/{TABLE_ID}/{LANG}"

try:
    # Step 1: Get the download link
    response = requests.get(api_url)
    response.raise_for_status()
    data = response.json()
    if 'object' not in data or not data['object']:
        print("No download link found in response.")
        exit(1)
    download_url = data['object']
    print(f"Download URL: {download_url}")

    # Step 2: Download the ZIP file
    zip_filename = f"statcan_{TABLE_ID}.csv"  # Actually a ZIP file
    with requests.get(download_url, stream=True) as r:
        r.raise_for_status()
        with open(zip_filename, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
    print(f"Table {TABLE_ID} downloaded as {zip_filename}")

    # Step 3: Extract the ZIP file
    extract_dir = f"statcan_{TABLE_ID}_extracted"
    with zipfile.ZipFile(zip_filename, 'r') as zip_ref:
        zip_ref.extractall(extract_dir)

    # Step 4: Find the CSV file in the extracted folder
    csv_file = None
    for fname in os.listdir(extract_dir):
        if fname.endswith('.csv'):
            csv_file = os.path.join(extract_dir, fname)
            break
    if not csv_file:
        raise FileNotFoundError("No CSV file found in the extracted ZIP.")

    # Step 5: Read only the required columns
    usecols = ['REF_DATE', 'GEO', 'Products', 'VECTOR', 'VALUE']
    try:
        df = pd.read_csv(csv_file, usecols=usecols, encoding='utf-8', low_memory=False)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        exit(1)

    # Step 6: Insert into MongoDB with unique index and batch insert
    mongo_uri = "mongodb://localhost:27017/"
    db_name = "statcan"
    collection_name = f"table_{TABLE_ID}"

    client = MongoClient(mongo_uri)
    db = client[db_name]
    collection = db[collection_name]

    # Create a unique index on REF_DATE, GEO, and Products
    collection.create_index(
        [("REF_DATE", 1), ("GEO", 1), ("Products", 1)],
        unique=True
    )

    records = df.to_dict(orient='records')

    def batch_upsert(collection, records, batch_size=1000):
        total_upserted = 0
        for i in range(0, len(records), batch_size):
            batch = records[i:i+batch_size]
            for rec in batch:
                try:
                    if len(bson.BSON.encode(rec)) > 16 * 1024 * 1024:
                        print("Skipped oversized record")
                        continue
                except Exception as e:
                    print(f"Error encoding record: {e}")
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
                except Exception as e:
                    print(f"Upsert error: {e}")
        return total_upserted

    if records:
        upserted_count = batch_upsert(collection, records, batch_size=1000)
        print(f"Upserted {upserted_count} records into {db_name}.{collection_name}")
    else:
        print("No records to upsert.")

    client.close()

except Exception as e:
    print(f"Error: {e}") 