import pandas as pd
import time
import os
import requests
from bs4 import BeautifulSoup
import urllib3
from tqdm import tqdm 

# Headers for request
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.5'
}

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# -----------------------
# ✅ STEP 1: Get all product links
# -----------------------
def get_product_links(page=1):
    url = f'https://www.mobiledokan.com/mobile-price-list?page={page}'
    res = requests.get(url, headers=headers, verify=False)
    soup = BeautifulSoup(res.text, 'html.parser')

    product_links = []
    for a in soup.select('.product-box a'):
        href = a.get('href')
        if href and href.startswith('https://www.mobiledokan.com/mobile/'):
            product_links.append(href)

    return list(set(product_links))

# -----------------------
# ✅ STEP 2: Extract specs from HTML
# -----------------------
def extract_specs_from_html(html):
    soup = BeautifulSoup(html, 'html.parser')
    spec_dict = {}

    sections = soup.find_all("div", class_="row mb-2 pb-2 border-bottom")

    for section in sections:
        section_name = section.find("h3").text.strip().lower()

        subgroups = section.find_all("div", class_="subgroup")
        tables = section.find_all("table", class_="spec-grp-tbl")

        is_display = section_name == "display"
        is_camera_section = section_name == "cameras"

        if not subgroups:
            # No subgroups: only display gets prefix
            table = tables[0]
            for row in table.find_all("tr"):
                key = row.find("td", class_="td1").text.strip().lower().replace(' ', '_')
                value = row.find("td", class_="td2").text.strip()

                if is_display and key in ["resolution", "video_recording", "aperture"]:
                    key = f"display_{key}"

                spec_dict[key] = value
        else:
            # Subgroups like primary/selfie camera
            for subgroup, table in zip(subgroups, tables):
                subgroup_name = subgroup.text.strip().lower()

                prefix = None
                if is_camera_section:
                    if "primary" in subgroup_name:
                        prefix = "primary_camera"
                    elif "selfie" in subgroup_name:
                        prefix = "selfie_camera"

                for row in table.find_all("tr"):
                    key = row.find("td", class_="td1").text.strip().lower().replace(' ', '_')
                    value = row.find("td", class_="td2").text.strip()

                    if prefix and key in ["resolution", "video_recording", "aperture"]:
                        key = f"{prefix}_{key}"

                    spec_dict[key] = value

    return spec_dict

# -----------------------
# ✅ STEP 3: Parse product page
# -----------------------
def get_product_specs(url):
    res = requests.get(url, headers=headers, verify=False)
    soup = BeautifulSoup(res.text, 'html.parser')

    name_tag = soup.select_one('#product-specs h2')
    name = name_tag.get_text(strip=True).replace(' Full Specifications', '') if name_tag else None

    price_tag = soup.select_one('.price span.h3')
    price = price_tag.get_text(strip=True).replace('৳.', '').split('(')[0].strip() if price_tag else None

    specs_html = str(soup.select_one('#product-specs')) if soup.select_one('#product-specs') else ""
    specs = extract_specs_from_html(specs_html)

    return {
        'name': name,
        'price': price,
        'specs': specs,
        'url': url
    }

# -----------------------
# ✅ STEP 4: Main scraping and merging logic
# -----------------------
def main():
    master_file = "mobiledokan_master.csv"

    if os.path.exists(master_file):
        df_master = pd.read_csv(master_file, converters={"specs": eval})  # specs column is a dict
    else:
        df_master = pd.DataFrame()

    # ✅ Step 1: Scrape all product links
    all_product_links = []
    for page in tqdm(range(1, 253), desc="📄 Fetching product links"):
        links = get_product_links(page)
        all_product_links.extend(links)
        time.sleep(1)
    all_product_links = list(set(all_product_links))  # Deduplicate
    print(f"🔗 Total unique product links: {len(all_product_links)}")

    # ✅ Step 2: Scrape data for each product
    new_data = []
    for link in tqdm(all_product_links, desc="📦 Scraping product specs"):
        data = get_product_specs(link)
        if data['name']:
            new_data.append(data)
        time.sleep(1)

    df_new = pd.DataFrame(new_data)

    # ✅ Step 3: Update master
    if not df_master.empty:
        df_master.set_index("url", inplace=True)
        df_new.set_index("url", inplace=True)

        for idx in df_new.index:
            if idx in df_master.index:
                specs_old = df_master.at[idx, 'specs']
                specs_new = df_new.at[idx, 'specs']
                specs_old.update(specs_new)
                df_master.at[idx, 'specs'] = specs_old
                df_master.at[idx, 'name'] = df_new.at[idx, 'name']
                df_master.at[idx, 'price'] = df_new.at[idx, 'price']
                print(f"🔄 Updated: {df_new.at[idx, 'name']}")
            else:
                df_master.loc[idx] = df_new.loc[idx]
                print(f"🆕 New entry added: {df_new.at[idx, 'name']}")

        combined = df_master.reset_index()
    else:
        combined = df_new.reset_index()

    combined.to_csv('temp_mobiledokan.csv', index=False)
    os.replace('temp_mobiledokan.csv', master_file)
    print(f"\n✅ Master file updated with {len(df_new)} entries.")

if __name__ == "__main__":
    main()
