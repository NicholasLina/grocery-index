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

    def batch_insert(collection, records, batch_size=1000):
        total_inserted = 0
        for i in range(0, len(records), batch_size):
            batch = records[i:i+batch_size]
            filtered_batch = []
            for rec in batch:
                try:
                    if len(bson.BSON.encode(rec)) <= 16 * 1024 * 1024:
                        filtered_batch.append(rec)
                    else:
                        print("Skipped oversized record")
                except Exception as e:
                    print(f"Error encoding record: {e}")
            if filtered_batch:
                try:
                    collection.insert_many(filtered_batch, ordered=False)
                    total_inserted += len(filtered_batch)
                except errors.BulkWriteError as bwe:
                    inserted = bwe.details.get('nInserted', 0)
                    total_inserted += inserted
                    print(f"Batch insert error: {bwe.details.get('writeErrors', [])}")
        return total_inserted

    if records:
        inserted_count = batch_insert(collection, records, batch_size=1000)
        print(f"Inserted {inserted_count} records into {db_name}.{collection_name}")
    else:
        print("No records to insert.")

    client.close()

except Exception as e:
    print(f"Error: {e}") 