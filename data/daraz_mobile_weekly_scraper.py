import requests
import pandas as pd
import time
import os

# ------------ Configuration ------------
CSV_FILE = "daraz_mobile_master.csv"

# Headers for request
headers = ({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36', 'Accept-Language':'en-US, en;q=0.5'})

# ------------ Discount Calculation ------------
def calculate_discount(original, current):
    try:
        return f"{round((int(original) - int(current)) / int(original) * 100)}%"
    except:
        return ""

# ------------ Load Existing Data ------------
if os.path.exists(CSV_FILE):
    df_existing = pd.read_csv(CSV_FILE)
    df_existing['Item ID'] = df_existing['Item ID'].astype(str)
else:
    df_existing = pd.DataFrame()

existing_ids = set(df_existing['Item ID']) if not df_existing.empty else set()
print(f"🧾 Found {len(existing_ids)} existing products.\n")

# ------------ Start Scraping ------------
page = 1
new_data = []

while True:
    print(f"📄 Scraping page {page}...")
    url = f"https://www.daraz.com.bd/catalog/?ajax=true&page={page}&q=mobile"
    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        print(f"❌ Failed to fetch page {page}.")
        break

    data = response.json()
    items = data.get('mods', {}).get('listItems', [])

    if not items:
        print("✅ No more products found.")
        break

    new_items_in_page = 0

    for item in items:
        item_id = str(item.get('itemId'))

        product_info = {
            'Item ID': item_id,
            'Title': item.get('name', ''),
            'Price (Raw)': item.get('price', ''),
            'Original Price': item.get('originalPrice', ''),
            'Discount': calculate_discount(item.get('originalPrice', ''), item.get('price', '')) if item.get('originalPrice') else '',
            'Rating': item.get('ratingScore', ''),
            'Reviews': item.get('review', ''),
            'Seller': item.get('sellerName', ''),
            'Location': item.get('location', ''),
            'Brand': item.get('brandName', ''),
            'Product URL': f"https:{item.get('itemUrl')}" if item.get('itemUrl') else '',
            'Image URL': item.get('image', '')
        }

        if item_id in existing_ids:
            # Update existing product info
            for key, value in product_info.items():
                df_existing.loc[df_existing['Item ID'] == item_id, key] = value
        else:
            new_data.append(product_info)
            existing_ids.add(item_id)
            new_items_in_page += 1

    print(f"✅ Page {page} scraped. New items: {new_items_in_page}")

    if new_items_in_page == 0:
        print("🛑 No new items found. Stopping.")
        break

    page += 1
    time.sleep(2)

# ------------ Combine and Save ------------
if new_data:
    df_new = pd.DataFrame(new_data)
    df_combined = pd.concat([df_existing, df_new], ignore_index=True)
else:
    df_combined = df_existing

df_combined.to_csv("temp_daraz.csv", index=False)
os.replace("temp_daraz.csv", CSV_FILE)

print(f"\n🎉 Scraping complete. Total products saved: {len(df_combined)}")
