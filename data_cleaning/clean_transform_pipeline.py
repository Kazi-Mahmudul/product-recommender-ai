
"""
clean_transform_pipeline.py

End-to-end cleaning & scoring pipeline that merges:
1) Processor ranking scraper (all pages) from NanoReview SoC list
2) Mobiledokan cleaning + feature engineering + scoring (with all derived columns)

"""

import argparse
import math
import os
import re
import sys
import time
from typing import Optional, Tuple

import numpy as np
import pandas as pd

# -----------------------------
# Processor rankings scraping
# -----------------------------

def _init_selenium():
    """Initialize a headless Selenium Chrome driver if available, else return None."""
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.service import Service
        from webdriver_manager.chrome import ChromeDriverManager
        from selenium.webdriver.chrome.options import Options

        chrome_options = Options()
        chrome_options.add_argument('--headless=new')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_argument('--disable-extensions')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36')

        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
        return driver
    except Exception as e:
        print(f"[WARN] Selenium not available: {e}")
        return None


def scrape_processor_rankings(max_pages: int = 2, sleep_sec: float = 1.0) -> pd.DataFrame:
    """
    Scrape all pages of NanoReview SoC rankings into a DataFrame.
    Columns: ['rank','processor','rating','antutu10','geekbench6','cores','clock','gpu','company','processor_key']
    """
    driver = _init_selenium()
    if driver is None:
        raise RuntimeError("Selenium/Chrome not available. Install or provide --cache_processor_csv.")

    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC

    all_rows = []
    page = 1

    try:
        while page <= max_pages:
            url = f"https://nanoreview.net/en/soc-list/rating?page={page}"
            print(f"[INFO] Scraping {url}")
            driver.get(url)

            wait = WebDriverWait(driver, 20)
            table = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "table-list")))
            time.sleep(0.5)

            rows = table.find_elements(By.TAG_NAME, "tr")
            if len(rows) <= 1:
                print("[INFO] No more rows found; stopping.")
                break

            new_count = 0
            for row in rows[1:]:
                try:
                    cols = row.find_elements(By.TAG_NAME, "td")
                    if len(cols) >= 8:
                        all_rows.append({
                            "rank": cols[0].text.split('\\n')[0].strip(),
                            "processor": cols[1].text.split('\\n')[0].strip(),
                            "rating": cols[2].text.strip(),
                            "antutu10": cols[3].text.split('\\n')[0].strip(),
                            "geekbench6": cols[4].text.split('\\n')[0].strip(),
                            "cores": cols[5].text.strip(),
                            "clock": cols[6].text.strip(),
                            "gpu": cols[7].text.strip(),
                        })
                        new_count += 1
                except Exception:
                    continue

            print(f"[INFO] Page {page}: +{new_count} rows")
            if new_count == 0:
                break
            page += 1
            time.sleep(sleep_sec)
    finally:
        try:
            driver.quit()
        except Exception:
            pass

    df = pd.DataFrame(all_rows)
    if df.empty:
        raise RuntimeError("Failed to scrape processor rankings.")
    # Clean
    df["rank"] = pd.to_numeric(df["rank"], errors="coerce")
    df["antutu10"] = pd.to_numeric(df["antutu10"].str.replace(",", "", regex=False), errors="coerce")

    def _company(p):
        p = str(p)
        if "Snapdragon" in p: return "Qualcomm"
        if "Dimensity" in p or "Helio" in p: return "MediaTek"
        if "Exynos" in p: return "Samsung"
        if "Apple" in p: return "Apple"
        if "Kirin" in p: return "Huawei"
        if "Tensor" in p: return "Google"
        if "Unisoc" in p or "Tiger" in p: return "Unisoc"
        return "Other"
    df["company"] = df["processor"].apply(_company)
    df["processor_key"] = (
        df["processor"]
        .astype(str).str.lower()
        .str.replace(r"[^a-z0-9]+", " ", regex=True)
        .str.replace(r"\s+", " ", regex=True)
        .str.strip()
    )
    return df

# -----------------------------
# Cleaning helpers
# -----------------------------

def _to_float(x) -> Optional[float]:
    try:
        if pd.isna(x): return None
        return float(str(x).strip())
    except Exception:
        return None

# Function to convert storage to GB
def convert_to_gb(value):
    if pd.isna(value):
        return None
    value = str(value).lower()
    if 'gb' in value:
        return float(value.replace('gb', '').strip())
    elif 'mb' in value:
        return float(value.replace('mb', '').strip()) / 1024
    else:
        return None

def convert_ram_to_gb(value):
    if pd.isna(value):
        return None
    value = str(value).lower()
    # Extract numbers from the string
    import re
    numbers = re.findall(r'\d+', value)
    if numbers:
        num = float(numbers[0])
        if 'gb' in value:
            return num
        elif 'mb' in value:
            return num / 1024
        else:
            # If no unit specified, assume GB
            return num
    return None

def _extract_resolution_wh(res: str) -> Optional[Tuple[int,int]]:
    if pd.isna(res): return None
    s = str(res).lower()
    m = re.search(r'(\\d{3,5})\\s*[x×]\\s*(\\d{3,5})', s)
    if not m: return None
    return int(m.group(1)), int(m.group(2))

def _extract_ppi(value) -> Optional[float]:
    if pd.isna(value): return None
    m = re.search(r'(\\d+(?:\\.\\d+)?)\\s*ppi', str(value).lower())
    if not m: return None
    return float(m.group(1))

def _extract_refresh_rate(value) -> Optional[float]:
    if pd.isna(value): return None
    m = re.search(r'(\\d+(?:\\.\\d+)?)\\s*hz', str(value).lower())
    if not m: return None
    return float(m.group(1))

def get_camera_count(value, main_camera=None) -> Optional[int]:
    """Try several patterns: 'triple camera', '3 cameras', fallback to list-likes."""
    if not pd.isna(value):
        s = str(value).lower()
        if 'single' in s: return 1
        if 'dual' in s: return 2
        if 'triple' in s: return 3
        if 'quad' in s: return 4
        if 'penta' in s: return 5
        m = re.search(r'(\\d+)\\s*(cameras?|lens|lenses)', s)
        if m: return int(m.group(1))
    if main_camera is not None and not pd.isna(main_camera):
        mps = re.findall(r'(\\d+(?:\\.\\d+)?)\\s*mp', str(main_camera).lower())
        if mps: return max(1, len(mps))
    return None

def extract_camera_mp(value):
    """
    Extract megapixel value from camera specification string.
    Works with both main_camera and front_camera columns.
    """
    if pd.isna(value):
        return None
    
    value_str = str(value).strip()
    if not value_str:
        return None

    # For formats like "48+8+2MP" or "48MP"
    if '+' in value_str:
        # Extract the first (main) camera MP value
        first_camera = value_str.split('+')[0]
        mp_match = re.search(r'(\d+\.?\d*)', first_camera)
        if mp_match:
            return float(mp_match.group(1))
    else:
        # For single camera format like "48MP"
        mp_match = re.search(r'(\d+\.?\d*)\s*MP', value_str, re.IGNORECASE)
        if mp_match:
            return float(mp_match.group(1))
        
        # Try without the MP suffix (some entries might just have the number)
        mp_match = re.search(r'(\d+\.?\d*)', value_str)
        if mp_match:
            return float(mp_match.group(1))

    return None

# Enhanced camera score calculation
def get_camera_score(phone):
    """
    Calculate camera score out of 100 based on camera count, primary camera MP, and selfie camera MP.
    Uses main_camera and front_camera columns when available.
    """
    score = 0
    weights = {
        'camera_count': 20,      # 20 points for number of cameras
        'primary_camera_mp': 50,  # 50 points for primary camera resolution
        'selfie_camera_mp': 30    # 30 points for selfie camera resolution
    }
    
    # Camera Count Score (0-20 points)
    if not pd.isna(phone['camera_count']) and phone['camera_count'] > 0:
        # Scale camera count score to 20 points
        # Assuming 4+ cameras is considered high-end
        camera_count_score = min(phone['camera_count'], 4) / 4 * 100
        score += camera_count_score * weights['camera_count'] / 100

    # Primary Camera Score (0-50 points)
    if not pd.isna(phone['primary_camera_mp']):
        # Scale primary camera MP score to 50 points
        # Assuming 200MP is the highest resolution
        primary_camera_score = min(phone['primary_camera_mp'] / 200 * 100, 100)
        score += primary_camera_score * weights['primary_camera_mp'] / 100

    # Selfie Camera Score (0-30 points)
    if not pd.isna(phone['selfie_camera_mp']):
        # Scale selfie camera MP score to 30 points
        # Assuming 64MP is the highest resolution
        selfie_camera_score = min(phone['selfie_camera_mp'] / 64 * 100, 100)
        score += selfie_camera_score * weights['selfie_camera_mp'] / 100

    return round(score, 2)  # Round to 2 decimal places

# Function to extract wattage from quick_charging string
# Function to extract wattage from quick_charging string
def extract_wattage(value):
    if pd.isna(value):
        return None
    
    value_str = str(value).strip()
    if not value_str:
        return None
    
    # Use regex to find a number (integer or float) followed by 'W'
    wattage_match = re.search(r'(\d+\.?\d*)\s*W', value_str, re.IGNORECASE)
    if wattage_match:
        return float(wattage_match.group(1))
    
    return None

def get_battery_score_percentile(phone: pd.Series) -> float:
    """Battery score using capacity (mAh) + charge wattage (W)."""
    cap = None
    if not pd.isna(phone.get("battery_capacity_numeric")):
        cap = phone["battery_capacity_numeric"]
    elif not pd.isna(phone.get("battery_capacity")):
        m = re.search(r'(\\d{3,5})\\s*m?ah', str(phone["battery_capacity"]).lower())
        if m:
            cap = int(m.group(1))
    # wattage
    watts = None
    for cand in ["charging_wattage","speed","quick_charging","charging","charger"]:
        v = phone.get(cand)
        w = extract_wattage(v) if not pd.isna(v) else None
        if w:
            watts = w
            break
    score = 0.0
    if cap:
        score += min(cap/6000*100, 100) * 0.7
    if watts:
        score += min(watts/120*100, 100) * 0.3
    return round(score, 2)

def _normalize_processor_name(name: str) -> str:
    return (
        str(name).lower()
        .replace("qualcomm", "")
        .replace("mediatek", "")
        .replace("apple", "")
        .replace("samsung", "")
        .replace("google", "")
        .replace("huawei", "")
        .replace("hisilicon", "")
        .replace("kirin", "")
        .replace("unisoc", "")
        .strip()
    )

def get_processor_rank(proc_df: pd.DataFrame, processor_name: str) -> Optional[int]:
    """Fuzzy-ish lookup: exact/contains match over normalized 'processor_key'."""
    if pd.isna(processor_name): return None
    key = _normalize_processor_name(processor_name)
    key = re.sub(r'[^a-z0-9]+', ' ', key).strip()
    if not key:
        return None
    exact = proc_df.loc[proc_df["processor_key"] == key, "rank"]
    if len(exact):
        return int(exact.iloc[0])
    cand = proc_df[proc_df["processor_key"].str.contains(key, na=False)]
    if len(cand):
        return int(cand.iloc[0]["rank"])
    cand2 = proc_df[proc_df["processor_key"].apply(lambda s: key in str(s))]
    if len(cand2):
        return int(cand2.iloc[0]["rank"])
    return None

def calculate_performance_score(phone: pd.Series, proc_df: pd.DataFrame) -> float:
    """
    Performance score (0-100) primarily from SoC rank (lower rank = better),
    plus small boosts from RAM and storage type.
    """
    rank = get_processor_rank(proc_df, phone.get("processor") or phone.get("chipset"))
    ram_gb = phone.get("ram_gb")
    score = 0.0
    if rank is not None:
        max_rank = max(300, int(proc_df["rank"].max() or 300))
        score_soc = 100 * (1 - (min(rank, max_rank)-1) / (max_rank-1))
        score += max(0.0, min(100.0, score_soc)) * 0.85
    if ram_gb:
        score += min(float(ram_gb)/16*100, 100) * 0.10
    store = str(phone.get("storage") or phone.get("internal") or phone.get("internal_storage") or "")
    s = store.lower()
    if "ufs 4" in s:
        score += 5
    elif "ufs 3" in s:
        score += 3
    return round(min(score,100.0), 2)

def calculate_security_score(phone: pd.Series) -> float:
    """Crude security score based on fingerprint type & face unlock mentions."""
    s = str(phone.get("finger_sensor_type") or phone.get("fingerprint") or "").lower()
    score = 30.0  # base
    if "ultrasonic" in s: score += 40
    elif "optical" in s: score += 25
    elif "side" in s or "rear" in s or "front" in s: score += 15
    if "face" in str(phone.get("biometrics") or phone.get("security") or "").lower():
        score += 10
    return round(min(score, 100.0), 2)

def calculate_connectivity_score(phone: pd.Series) -> float:
    """Combine 5G, Wi-Fi version, NFC, Bluetooth version into 0-100."""
    score = 0.0
    # 5G
    if "5g" in str(phone.get("network") or phone.get("technology") or "").lower():
        score += 40
    # Wi-Fi
    wifi = str(phone.get("wlan") or phone.get("wifi") or "").lower()
    if "wifi 7" in wifi or "802.11be" in wifi:
        score += 30
    elif "wifi 6" in wifi or "802.11ax" in wifi:
        score += 24
    elif "wifi 5" in wifi or "802.11ac" in wifi:
        score += 18
    elif "802.11n" in wifi:
        score += 10
    # NFC
    if "nfc" in (str(phone.get("nfc") or "") + " " + wifi).lower():
        score += 15
    # Bluetooth
    bt = str(phone.get("bluetooth") or "").lower()
    m = re.search(r'(\\d+\\.\\d+|\\d+)', bt)
    if m:
        try:
            ver = float(m.group(1))
            score += min(15, max(5, (ver-4.0)*5))
        except Exception:
            score += 8
    return round(min(score,100.0), 2)

def is_popular_brand(name: str) -> bool:
    if pd.isna(name): return False
    brands = ["samsung","apple","xiaomi","redmi","poco","realme","oppo","vivo","oneplus","infinix","tecno","motorola","google","huawei","nokia"]
    return any(b in str(name).lower() for b in brands)

def clean_release_date(value) -> Optional[pd.Timestamp]:
    try:
        return pd.to_datetime(value, errors="coerce")
    except Exception:
        return None

def is_new_release(release_date) -> Optional[bool]:
    if pd.isna(release_date): return None
    try:
        return (pd.Timestamp("today") - pd.to_datetime(release_date)).days <= 365
    except Exception:
        return None

def calculate_age_in_months(release_date) -> Optional[int]:
    if pd.isna(release_date): return None
    d = pd.to_datetime(release_date, errors="coerce")
    if pd.isna(d): return None
    delta = pd.Timestamp("today") - d
    return max(0, int(delta.days // 30))

def is_upcoming(status) -> Optional[bool]:
    s = str(status).lower()
    return "upcoming" in s or "rumored" in s or "not released" in s

def get_display_score(phone: pd.Series) -> float:
    """Score from resolution, PPI, refresh rate (0-100)."""
    score = 0.0
    weights = {"resolution":0.4,"ppi":0.3,"refresh":0.3}
    # resolution
    wh = _extract_resolution_wh(phone.get("display_resolution") or phone.get("resolution"))
    if wh:
        w,h = wh
        pixels_m = (w*h)/1_000_000
        res_score = min(pixels_m/8.3*100, 100)  # 4K=8.3 MP as 100
        score += res_score*weights["resolution"]
    # ppi
    ppi = phone.get("ppi_numeric") or _extract_ppi(phone.get("pixel_density_ppi") or phone.get("display"))
    if ppi:
        score += min(ppi/500*100, 100)*weights["ppi"]
    # refresh
    ref = phone.get("refresh_rate_numeric") or _extract_refresh_rate(phone.get("refresh_rate_hz") or phone.get("display"))
    if ref:
        score += min(float(ref)/120*100, 100)*weights["refresh"]
    return round(score, 2)

# -----------------------------
# Feature engineering (ALL derived columns)
# -----------------------------

def engineer_features(raw: pd.DataFrame, proc_df: pd.DataFrame) -> pd.DataFrame:
    df = raw.copy()

    # === Price cleanup & categories ===
    if "price" in df:
        # Remove currency prefix like '৳', '?.', 'à§³.', 'à§³', etc.
        df["price"] = (
            df["price"]
            .astype(str)
            .str.replace('?.', '', regex=False)
            .str.replace('৳.', '', regex=False)
            .str.replace('৳', '', regex=False)
            .str.replace('à§³.', '', regex=False)
            .str.replace('à§³', '', regex=False)
            .str.strip()
        )
        df["price_original"] = (
            df["price"]
            .astype(str)
            .str.replace(",", "", regex=False)
            .str.extract(r'(\d+(?:\.\d+)?)')[0]
            .astype(float)
        )
        # Price categories (BDT)
        df["price_category"] = pd.cut(
            df["price_original"],
            bins=[0, 20000, 40000, 60000, 100000, float('inf')],
            labels=["Budget", "Mid-range", "Upper Mid-range", "Premium", "Flagship"]
        )

    # === Storage & RAM in GB ===
    # Prefer 'internal_storage', else 'storage'/'internal'
    storage_source = None
    for cand in ["internal_storage", "storage", "internal"]:
        if cand in df.columns:
            storage_source = cand
            break
    if storage_source:
        df["storage_gb"] = df[storage_source].apply(convert_to_gb)
    else:
        df["storage_gb"] = np.nan

    if "ram" in df:
        df["ram_gb"] = df["ram"].apply(convert_ram_to_gb)
    else:
        df["ram_gb"] = np.nan

    # === Price per GB ===
    if "price_original" in df:
        df["price_per_gb"] = (df["price_original"] / df["storage_gb"]).replace([np.inf, -np.inf], np.nan).round(2)
        df["price_per_gb_ram"] = (df["price_original"] / df["ram_gb"]).replace([np.inf, -np.inf], np.nan).round(2)

    # === Screen size numeric ===
    if "screen_size_inches" in df:
        df['screen_size_numeric'] = df['screen_size_inches'].str.extract('(\d+\.?\d*)').astype(float)

    # === Resolution numeric ===
    res_src = None
    for cand in ["display_resolution"]:
        if cand in df.columns:
            res_src = cand
            break
    if res_src:
        df["resolution_width"]  = df[res_src].str.extract('(\d+)x').astype(float)
        df["resolution_height"] = df[res_src].str.extract('x(\d+)').astype(float)

    # === PPI numeric ===
    if "pixel_density_ppi" in df:
        df['ppi_numeric'] = df['pixel_density_ppi'].str.extract('(\d+)').astype(float)

    # === Refresh rate numeric ===
    if "refresh_rate_hz" in df:
        df['refresh_rate_numeric'] = df['refresh_rate_hz'].str.extract('(\d+)').astype(float)

    # === Battery capacity numeric ===
    if "capacity" in df:
        df['battery_capacity_numeric'] = df['capacity'].str.extract('(\d+)').astype(float)

    # === Quick/Wireless charging flags ===
    if "quick_charging" in df:
        df["has_fast_charging"] = df["quick_charging"].notna()
    else:
        # fallback: detect in text fields
        df["has_fast_charging"] = df.get("charging", pd.Series([""]*len(df))).astype(str).str.contains(r'(fast|quick|turbo|dart|super)', case=False, regex=True)

    if "wireless_charging" in df:
        df["has_wireless_charging"] = df["wireless_charging"].notna()
    else:
        df["has_wireless_charging"] = df.get("charging", pd.Series([""]*len(df))).astype(str).str.contains("wireless", case=False, regex=False)

    # === Charging wattage numeric ===
    cand_cols = [c for c in ["quick_charging"] if c in df.columns]
    if cand_cols:
        src = cand_cols[0]
        df["charging_wattage"] = df[src].apply(extract_wattage)
        
    try:
        from slugify import slugify
    except ImportError:
        # Fallback slugify implementation
        def slugify(text):
            import re
            text = str(text).lower()
            text = re.sub(r'[^a-z0-9]+', '-', text)
            return text.strip('-')
    
    # Generate slugs from the "name" column
    df['slug'] = df['name'].apply(lambda x: slugify(str(x)))

    # === Cameras ===
    # Primary/selfie MPs from text fields if present
    if "primary_camera_mp" not in df:
        df['primary_camera_mp'] = df.apply(
        lambda row: extract_camera_mp(row['main_camera']) if not pd.isna(row['main_camera']) 
        else extract_camera_mp(row['primary_camera_resolution']), 
        axis=1
)

    if "selfie_camera_mp" not in df:
       df['selfie_camera_mp'] = df.apply(
       lambda row: extract_camera_mp(row['front_camera']) if not pd.isna(row['front_camera']) 
       else extract_camera_mp(row['selfie_camera_resolution']), 
       axis=1
)
    # camera count
    if "camera_count" not in df:
        df["camera_count"] = df.get("camera_setup", df.get("main_camera", pd.Series([np.nan]*len(df)))).apply(get_camera_count)

    # === Brand & popularity ===
    if "brand" not in df and "company" in df:
        df["brand"] = df["company"]
    if "brand" in df:
        df["is_popular_brand"] = df["brand"].apply(is_popular_brand)
    else:
        df["is_popular_brand"] = False

    # === Release & status ===
    if "release_date" in df:
        df["release_date_clean"] = pd.to_datetime(df["release_date"], errors="coerce")
        df["is_new_release"] = df["release_date_clean"].apply(is_new_release)
        df["age_in_months"] = df["release_date_clean"].apply(calculate_age_in_months)
    if "status" in df:
        df["is_upcoming"] = df["status"].apply(is_upcoming)

    # === Scores ===
    # Display
    df["display_score"] = df.apply(get_display_score, axis=1)

    # Connectivity & security
    df["connectivity_score"] = df.apply(calculate_connectivity_score, axis=1)
    df["security_score"] = df.apply(calculate_security_score, axis=1)

    # Battery
    df["battery_score"] = df.apply(get_battery_score_percentile, axis=1)

    # Camera
    df["camera_score"] = df.apply(get_camera_score, axis=1)

    # Performance (uses processor rankings)
    df["performance_score"] = df.apply(lambda r: calculate_performance_score(r, proc_df), axis=1)

    # Overall score
    df["overall_device_score"] = (
        df["performance_score"].fillna(0) * 0.35 +
        df["display_score"].fillna(0)     * 0.20 +
        df["camera_score"].fillna(0)      * 0.20 +
        df["battery_score"].fillna(0)     * 0.15 +
        df["connectivity_score"].fillna(0)* 0.10
    ).round(2)

    # Final rounding
    for col in ["performance_score","display_score","battery_score","connectivity_score","security_score","camera_score","overall_device_score",
                "price_per_gb","price_per_gb_ram","screen_size_numeric","resolution_width","resolution_height","ppi_numeric","refresh_rate_numeric","battery_capacity_numeric","charging_wattage",
                "storage_gb","ram_gb"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").round(2)

    return df

# -----------------------------
# Orchestration
# -----------------------------

def run_pipeline(input_csv: str, output_csv: str, cache_processor_csv: Optional[str] = None) -> None:
    # Processor ranking DF: from cache or scrape
    proc_df = None
    if cache_processor_csv and os.path.exists(cache_processor_csv):
        print(f"[INFO] Loading processor rankings from cache: {cache_processor_csv}")
        proc_df = pd.read_csv(cache_processor_csv)
        if "processor_key" not in proc_df:
            proc_df["processor_key"] = (
                proc_df["processor"]
                .astype(str).str.lower()
                .str.replace(r"[^a-z0-9]+"," ", regex=True)
                .str.replace(r"\s+"," ", regex=True)
                .str.strip()
            )
    else:
        print("[INFO] Scraping processor rankings...")
        proc_df = scrape_processor_rankings()
        if cache_processor_csv:
            proc_df.to_csv(cache_processor_csv, index=False)
            print(f"[INFO] Processor rankings cached at: {cache_processor_csv}")

    # Load raw mobiledokan CSV
    print(f"[INFO] Reading raw dataset: {input_csv}")
    raw = pd.read_csv(input_csv)

    # Engineer features & scores
    print("[INFO] Cleaning & engineering features...")
    ready = engineer_features(raw, proc_df)

    # Save
    os.makedirs(os.path.dirname(output_csv) or ".", exist_ok=True)
    ready.to_csv(output_csv, index=False)
    print(f"[SUCCESS] Saved cleaned dataset to: {output_csv}")

def parse_args():
    ap = argparse.ArgumentParser(description="Mobiledokan cleaner + processor ranking scraper pipeline")
    ap.add_argument(
        "--input_csv",
        default="C:/Users/mahmu/Downloads/DataAnalyticsProjects/product-recommender-ai/data/mobiledokan_products.csv",
        help="Path to input CSV"
    )
    ap.add_argument(
        "--output_csv",
        default="C:/Users/mahmu/Downloads/DataAnalyticsProjects/product-recommender-ai/data_cleaning/mobile_data.csv",
        help="Path to output cleaned CSV"
    )
    ap.add_argument(
        "--cache_processor_csv",
        default="C:/Users/mahmu/Downloads/DataAnalyticsProjects/product-recommender-ai/data_cleaning/processor_rankings.csv",
        help="Path to cached processor ranking CSV"
    )
    return ap.parse_args()

if __name__ == "__main__":
    args = parse_args()
    run_pipeline(args.input_csv, args.output_csv, args.cache_processor_csv)
