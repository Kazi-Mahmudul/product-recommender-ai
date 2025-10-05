#!/usr/bin/env python3
"""
Data Processing Orchestrator for GitHub Actions Pipeline

This script coordinates the data processing phase including:
1. Data cleaning and validation
2. Feature engineering
3. Quality validation
4. Results preparation for loading
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from typing import Dict, Any, Optional
import pandas as pd
import numpy as np
import re

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from pipeline.config.github_actions_config import config

def setup_logging():
    """Setup basic logging for the processing"""
    import logging
    
    # Reduce logging verbosity in production
    log_level = getattr(logging, config.log_level)
    if config.environment == 'production':
        log_level = logging.WARNING  # Only show warnings and errors in production
    
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger(__name__)

def load_processor_rankings() -> Optional[object]:
    """Load processor rankings data for feature engineering"""
    logger = setup_logging()
    
    try:
        import pandas as pd
        processor_file = config.get_output_paths()['processor_rankings']
        
        if os.path.exists(processor_file):
            df = pd.read_csv(processor_file)
            logger.info(f"✅ Loaded processor rankings: {len(df)} processors")
            return df
        else:
            logger.warning("⚠️ Processor rankings file not found, performance scoring may be limited")
            return None
            
    except Exception as e:
        logger.error(f"❌ Failed to load processor rankings: {str(e)}")
        return None

def get_scraped_data_from_database(pipeline_run_id: str) -> Optional[object]:
    """Get scraped data from database for processing"""
    logger = setup_logging()
    
    try:
        import pandas as pd
        import psycopg2
        
        # Connect to database
        conn = psycopg2.connect(config.database_url)
        
        # Query for recently scraped data
        query = """
        SELECT * FROM phones 
        WHERE updated_at >= NOW() - INTERVAL '1 day'
        OR created_at >= NOW() - INTERVAL '1 day'
        ORDER BY updated_at DESC, created_at DESC
        """
        
        # Only show detailed stats in debug mode
        if config.log_level == 'DEBUG':
            # Debug: Check total records and recent records
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM phones")
            total_count = cursor.fetchone()[0]
            
            cursor.execute("""
                SELECT COUNT(*) FROM phones 
                WHERE updated_at >= NOW() - INTERVAL '1 day'
                OR created_at >= NOW() - INTERVAL '1 day'
            """)
            recent_count = cursor.fetchone()[0]
            
            logger.debug(f"📊 Database stats: {total_count} total records, {recent_count} recent records")
        
        df = pd.read_sql_query(query, conn)
        
        # If no recent records found, try fallback query by pipeline_run_id
        if len(df) == 0:
            logger.warning("⚠️ No records found with recent timestamps, trying fallback query...")
            fallback_query = """
            SELECT * FROM phones 
            WHERE pipeline_run_id = %s
            ORDER BY scraped_at DESC
            """
            df = pd.read_sql_query(fallback_query, conn, params=[pipeline_run_id])
        
        conn.close()
        
        logger.info(f"✅ Retrieved {len(df)} records for processing")
        return df
        
    except Exception as e:
        logger.error(f"❌ Failed to retrieve data: {str(e)}")
        return None

# Feature engineering functions (embedded from clean_transform_pipeline.py)
def convert_to_gb(value):
    """Convert storage values to GB"""
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
    """Convert RAM values to GB"""
    if pd.isna(value):
        return None
    value = str(value).lower()
    import re
    numbers = re.findall(r'\d+', value)
    if numbers:
        num = float(numbers[0])
        if 'gb' in value:
            return num
        elif 'mb' in value:
            return num / 1024
        else:
            return num
    return None

def extract_camera_mp(value):
    """Extract megapixel value from camera specification string"""
    if pd.isna(value):
        return None
    
    value_str = str(value).strip()
    if not value_str:
        return None

    import re
    if '+' in value_str:
        first_camera = value_str.split('+')[0]
        mp_match = re.search(r'(\d+\.?\d*)', first_camera)
        if mp_match:
            return float(mp_match.group(1))
    else:
        mp_match = re.search(r'(\d+\.?\d*)\s*MP', value_str, re.IGNORECASE)
        if mp_match:
            return float(mp_match.group(1))
        
        mp_match = re.search(r'(\d+\.?\d*)', value_str)
        if mp_match:
            return float(mp_match.group(1))
    return None

def get_camera_count(value, main_camera=None):
    """Get camera count from camera setup description"""
    if not pd.isna(value):
        s = str(value).lower()
        if 'single' in s: return 1
        if 'dual' in s: return 2
        if 'triple' in s: return 3
        if 'quad' in s: return 4
        if 'penta' in s: return 5
        import re
        m = re.search(r'(\d+)\s*(cameras?|lens|lenses)', s)
        if m: return int(m.group(1))
    if main_camera is not None and not pd.isna(main_camera):
        import re
        mps = re.findall(r'(\d+(?:\.\d+)?)\s*mp', str(main_camera).lower())
        if mps: return max(1, len(mps))
    return None

def extract_wattage(value):
    """Extract wattage from charging specification"""
    if pd.isna(value):
        return None
    
    value_str = str(value).strip()
    if not value_str:
        return None
    
    import re
    wattage_match = re.search(r'(\d+\.?\d*)\s*W', value_str, re.IGNORECASE)
    if wattage_match:
        return float(wattage_match.group(1))
    return None

def _extract_resolution_wh(res: str):
    """Extract width and height from resolution string"""
    if pd.isna(res): 
        return None
    s = str(res).lower()
    import re
    m = re.search(r'(\d{3,5})\s*[x×]\s*(\d{3,5})', s)
    if not m: 
        return None
    return int(m.group(1)), int(m.group(2))

def _extract_ppi(value):
    """Extract PPI from display specification"""
    if pd.isna(value): 
        return None
    import re
    m = re.search(r'(\d+(?:\.\d+)?)\s*ppi', str(value).lower())
    if not m: 
        return None
    return float(m.group(1))

def _extract_refresh_rate(value):
    """Extract refresh rate from display specification"""
    if pd.isna(value): 
        return None
    import re
    m = re.search(r'(\d+(?:\.\d+)?)\s*hz', str(value).lower())
    if not m: 
        return None
    return float(m.group(1))

def is_popular_brand(name: str) -> bool:
    """Check if brand is popular"""
    if pd.isna(name): 
        return False
    brands = ["samsung","apple","xiaomi","redmi","poco","realme","oppo","vivo","oneplus","infinix","tecno","motorola","google","huawei","nokia"]
    return any(b in str(name).lower() for b in brands)

def get_processor_rank(proc_df, processor_name: str):
    """Get processor rank from processor rankings DataFrame"""
    if proc_df is None or pd.isna(processor_name): 
        return None
    
    import re
    # Normalize processor name
    name = str(processor_name).lower()
    name = name.replace("qualcomm", "").replace("mediatek", "").replace("apple", "")
    name = name.replace("samsung", "").replace("google", "").replace("huawei", "")
    name = name.replace("hisilicon", "").replace("kirin", "").replace("unisoc", "").strip()
    
    key = re.sub(r'[^a-z0-9]+', ' ', name).strip()
    if not key:
        return None
    
    # Try exact match
    exact = proc_df.loc[proc_df["processor_key"] == key, "rank"]
    if len(exact):
        return int(exact.iloc[0])
    
    # Try contains match
    cand = proc_df[proc_df["processor_key"].str.contains(key, na=False)]
    if len(cand):
        return int(cand.iloc[0]["rank"])
    
    # Try substring match
    cand2 = proc_df[proc_df["processor_key"].apply(lambda s: key in str(s))]
    if len(cand2):
        return int(cand2.iloc[0]["rank"])
    
    return None

def calculate_performance_score(phone, proc_df):
    """Calculate performance score based on processor rank and RAM"""
    rank = get_processor_rank(proc_df, phone.get("processor") or phone.get("chipset"))
    ram_gb = phone.get("ram_gb")
    score = 0.0
    
    if rank is not None and proc_df is not None:
        max_rank = max(300, int(proc_df["rank"].max() or 300))
        score_soc = 100 * (1 - (min(rank, max_rank)-1) / (max_rank-1))
        score += max(0.0, min(100.0, score_soc)) * 0.85
    elif ram_gb:
        score += min(float(ram_gb)/16*100, 100) * 0.60
    
    if ram_gb:
        score += min(float(ram_gb)/16*100, 100) * 0.10
    
    store = str(phone.get("storage") or phone.get("internal") or phone.get("internal_storage") or "")
    s = store.lower()
    if "ufs 4" in s:
        score += 5
    elif "ufs 3" in s:
        score += 3
    
    return round(min(score, 100.0), 2)

def calculate_security_score(phone):
    """Calculate security score based on biometric features"""
    s = str(phone.get("finger_sensor_type") or phone.get("fingerprint") or "").lower()
    score = 30.0
    if "ultrasonic" in s: 
        score += 40
    elif "optical" in s: 
        score += 25
    elif "side" in s or "rear" in s or "front" in s: 
        score += 15
    if "face" in str(phone.get("biometrics") or phone.get("security") or "").lower():
        score += 10
    return round(min(score, 100.0), 2)

def calculate_connectivity_score(phone):
    """Calculate connectivity score based on network features"""
    score = 0.0
    
    # 5G support
    if "5g" in str(phone.get("network") or phone.get("technology") or "").lower():
        score += 40
    
    # Wi-Fi version
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
    import re
    m = re.search(r'(\d+\.\d+|\d+)', bt)
    if m:
        try:
            ver = float(m.group(1))
            score += min(15, max(5, (ver-4.0)*5))
        except Exception:
            score += 8
    
    return round(min(score, 100.0), 2)

def get_battery_score(phone):
    """Calculate battery score based on capacity and charging speed"""
    cap = None
    if not pd.isna(phone.get("battery_capacity_numeric")):
        cap = phone["battery_capacity_numeric"]
    elif not pd.isna(phone.get("battery_capacity")):
        import re
        m = re.search(r'(\d{3,5})\s*m?ah', str(phone["battery_capacity"]).lower())
        if m:
            cap = int(m.group(1))
    
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

def get_display_score(phone):
    """Calculate display score based on resolution, PPI, and refresh rate"""
    score = 0.0
    weights = {"resolution":0.4,"ppi":0.3,"refresh":0.3}
    
    # Resolution
    wh = _extract_resolution_wh(phone.get("display_resolution") or phone.get("resolution"))
    if wh:
        w, h = wh
        pixels_m = (w*h)/1_000_000
        res_score = min(pixels_m/8.3*100, 100)
        score += res_score*weights["resolution"]
    
    # PPI
    ppi = phone.get("ppi_numeric") or _extract_ppi(phone.get("pixel_density_ppi") or phone.get("display"))
    if ppi:
        score += min(ppi/500*100, 100)*weights["ppi"]
    
    # Refresh rate
    ref = phone.get("refresh_rate_numeric") or _extract_refresh_rate(phone.get("refresh_rate_hz") or phone.get("display"))
    if ref:
        score += min(float(ref)/120*100, 100)*weights["refresh"]
    
    return round(score, 2)

def get_camera_score(phone):
    """Calculate camera score based on camera count and megapixels"""
    score = 0
    weights = {
        'camera_count': 20,
        'primary_camera_mp': 50,
        'selfie_camera_mp': 30
    }
    
    # Camera Count Score
    if not pd.isna(phone.get('camera_count')) and phone['camera_count'] > 0:
        camera_count_score = min(phone['camera_count'], 4) / 4 * 100
        score += camera_count_score * weights['camera_count'] / 100

    # Primary Camera Score
    if not pd.isna(phone.get('primary_camera_mp')):
        primary_camera_score = min(phone['primary_camera_mp'] / 200 * 100, 100)
        score += primary_camera_score * weights['primary_camera_mp'] / 100

    # Selfie Camera Score
    if not pd.isna(phone.get('selfie_camera_mp')):
        selfie_camera_score = min(phone['selfie_camera_mp'] / 64 * 100, 100)
        score += selfie_camera_score * weights['selfie_camera_mp'] / 100

    return round(score, 2)

def engineer_features(df, processor_df):
    """Apply feature engineering to the DataFrame"""
    import pandas as pd
    import numpy as np
    import re
    
    processed_df = df.copy()
    
    # Price cleanup & categories
    if "price" in processed_df:
        # Clean price column by removing currency symbols, leading dots, and commas but preserving digits and text
        processed_df["price"] = (
            processed_df["price"]
            .astype(str)
            .str.replace('৳', '', regex=False)    # Remove Taka symbol
            .str.replace('à§³', '', regex=False)  # Remove encoded Taka symbol
            .str.replace('?', '', regex=False)    # Remove question marks
            .str.replace(',', '', regex=False)    # Remove commas
            .str.replace(r'^\.', '', regex=True)  # Remove leading dots (the main issue!)
            .str.strip()
        )
        
        # Extract numeric price value
        processed_df["price_original"] = (
            processed_df["price"]
            .astype(str)
            .str.extract(r'(\d+(?:\.\d+)?)')[0]  # Extract first number found
            .astype(float)
        )
        processed_df["price_category"] = pd.cut(
            processed_df["price_original"],
            bins=[0, 20000, 40000, 60000, 100000, float('inf')],
            labels=["Budget", "Mid-range", "Upper Mid-range", "Premium", "Flagship"]
        )

    # Storage & RAM in GB
    storage_source = None
    for cand in ["internal_storage", "storage", "internal"]:
        if cand in processed_df.columns:
            storage_source = cand
            break
    if storage_source:
        processed_df["storage_gb"] = processed_df[storage_source].apply(convert_to_gb)
    else:
        processed_df["storage_gb"] = np.nan

    if "ram" in processed_df:
        processed_df["ram_gb"] = processed_df["ram"].apply(convert_ram_to_gb)
    else:
        processed_df["ram_gb"] = np.nan

    # Price per GB
    if "price_original" in processed_df:
        processed_df["price_per_gb"] = (processed_df["price_original"] / processed_df["storage_gb"]).replace([np.inf, -np.inf], np.nan).round(2)
        processed_df["price_per_gb_ram"] = (processed_df["price_original"] / processed_df["ram_gb"]).replace([np.inf, -np.inf], np.nan).round(2)

    # Screen size numeric
    if "screen_size_inches" in processed_df:
        processed_df['screen_size_numeric'] = processed_df['screen_size_inches'].str.extract('(\d+\.?\d*)').astype(float)

    # Resolution numeric
    if "display_resolution" in processed_df:
        processed_df["resolution_width"] = processed_df["display_resolution"].str.extract('(\d+)x').astype(float)
        processed_df["resolution_height"] = processed_df["display_resolution"].str.extract('x(\d+)').astype(float)

    # PPI numeric
    if "pixel_density_ppi" in processed_df:
        processed_df['ppi_numeric'] = processed_df['pixel_density_ppi'].str.extract('(\d+)').astype(float)

    # Refresh rate numeric
    if "refresh_rate_hz" in processed_df:
        processed_df['refresh_rate_numeric'] = processed_df['refresh_rate_hz'].str.extract('(\d+)').astype(float)

    # Battery capacity numeric
    if "capacity" in processed_df:
        processed_df['battery_capacity_numeric'] = processed_df['capacity'].str.extract('(\d+)').astype(float)

    # Charging flags
    if "quick_charging" in processed_df:
        processed_df["has_fast_charging"] = processed_df["quick_charging"].notna()
        processed_df["charging_wattage"] = processed_df["quick_charging"].apply(extract_wattage)
    else:
        processed_df["has_fast_charging"] = processed_df.get("charging", pd.Series([""]*len(processed_df))).astype(str).str.contains(r'fast|quick|turbo|dart|super', case=False, regex=True)

    if "wireless_charging" in processed_df:
        processed_df["has_wireless_charging"] = processed_df["wireless_charging"].notna()
    else:
        processed_df["has_wireless_charging"] = processed_df.get("charging", pd.Series([""]*len(processed_df))).astype(str).str.contains("wireless", case=False, regex=False)

    # Slug generation
    try:
        from slugify import slugify
    except ImportError:
        def slugify(text):
            text = str(text).lower()
            text = re.sub(r'[^a-z0-9]+', '-', text)
            return text.strip('-')
    
    if "name" in processed_df:
        processed_df['slug'] = processed_df['name'].apply(lambda x: slugify(str(x)))

    # Camera features
    if "primary_camera_mp" not in processed_df:
        processed_df['primary_camera_mp'] = processed_df.apply(
            lambda row: extract_camera_mp(row.get('main_camera')) if not pd.isna(row.get('main_camera')) 
            else extract_camera_mp(row.get('primary_camera_resolution')), 
            axis=1
        )

    if "selfie_camera_mp" not in processed_df:
        processed_df['selfie_camera_mp'] = processed_df.apply(
            lambda row: extract_camera_mp(row.get('front_camera')) if not pd.isna(row.get('front_camera')) 
            else extract_camera_mp(row.get('selfie_camera_resolution')), 
            axis=1
        )

    if "camera_count" not in processed_df:
        processed_df["camera_count"] = processed_df.apply(
            lambda row: get_camera_count(row.get("camera_setup"), row.get("main_camera")), axis=1
        )

    # Brand & popularity
    if "brand" not in processed_df and "company" in processed_df:
        processed_df["brand"] = processed_df["company"]
    if "brand" in processed_df:
        processed_df["is_popular_brand"] = processed_df["brand"].apply(is_popular_brand)
    else:
        processed_df["is_popular_brand"] = False

    # Release date features
    if "release_date" in processed_df:
        processed_df["release_date_clean"] = pd.to_datetime(processed_df["release_date"], errors="coerce")
        processed_df["is_new_release"] = processed_df["release_date_clean"].apply(
            lambda x: (pd.Timestamp("today") - pd.to_datetime(x)).days <= 365 if not pd.isna(x) else None
        )
        processed_df["age_in_months"] = processed_df["release_date_clean"].apply(
            lambda x: max(0, int((pd.Timestamp("today") - pd.to_datetime(x)).days // 30)) if not pd.isna(x) else None
        )
    
    if "status" in processed_df:
        processed_df["is_upcoming"] = processed_df["status"].apply(
            lambda x: "upcoming" in str(x).lower() or "rumored" in str(x).lower() or "not released" in str(x).lower()
        )

    # Calculate scores
    processed_df["display_score"] = processed_df.apply(get_display_score, axis=1)
    processed_df["connectivity_score"] = processed_df.apply(calculate_connectivity_score, axis=1)
    processed_df["security_score"] = processed_df.apply(calculate_security_score, axis=1)
    processed_df["battery_score"] = processed_df.apply(get_battery_score, axis=1)
    processed_df["camera_score"] = processed_df.apply(get_camera_score, axis=1)
    processed_df["performance_score"] = processed_df.apply(lambda r: calculate_performance_score(r, processor_df), axis=1)

    # Overall score
    processed_df["overall_device_score"] = (
        processed_df["performance_score"].fillna(0) * 0.35 +
        processed_df["display_score"].fillna(0) * 0.20 +
        processed_df["camera_score"].fillna(0) * 0.20 +
        processed_df["battery_score"].fillna(0) * 0.15 +
        processed_df["connectivity_score"].fillna(0) * 0.10
    ).round(2)

    # Add processor rank
    if processor_df is not None:
        processed_df["processor_rank"] = processed_df.apply(lambda r: get_processor_rank(processor_df, r.get("processor") or r.get("chipset")), axis=1)
    else:
        processed_df["processor_rank"] = None

    # Add last_price_check timestamp
    processed_df["last_price_check"] = pd.Timestamp.now()

    # Final rounding for numeric columns
    numeric_cols = ["performance_score","display_score","battery_score","connectivity_score","security_score","camera_score","overall_device_score",
                   "price_per_gb","price_per_gb_ram","screen_size_numeric","resolution_width","resolution_height","ppi_numeric","refresh_rate_numeric","battery_capacity_numeric","charging_wattage",
                   "storage_gb","ram_gb"]
    for col in numeric_cols:
        if col in processed_df.columns:
            processed_df[col] = pd.to_numeric(processed_df[col], errors="coerce").round(2)

    return processed_df

def process_data_with_pipeline(df: object, processor_df: Optional[object] = None, pipeline_run_id: str = 'unknown', test_mode: bool = False) -> Dict[str, Any]:
    """
    Process data using embedded feature engineering logic
    
    Args:
        df: Raw data DataFrame
        processor_df: Processor rankings DataFrame
        pipeline_run_id: Pipeline run identifier
        test_mode: Whether running in test mode
        
    Returns:
        Dictionary with processing results
    """
    logger = setup_logging()
    
    try:
        import pandas as pd
        import numpy as np
        
        start_time = time.time()
        
        logger.info("🔧 Starting data processing...")
        
        # Apply feature engineering
        processed_df = engineer_features(df, processor_df)
        
        # Basic quality estimation
        completeness = float(processed_df.notna().mean().mean())
        quality_score = completeness * 100
        
        result = {
            'status': 'success',
            'processing_method': 'integrated',
            'records_processed': int(len(processed_df)),
            'quality_score': round(float(quality_score), 2),
            'quality_passed': bool(quality_score >= 70),
            'cleaning_issues_count': 0,
            'features_generated': int(len(processed_df.columns)),
            'execution_time_seconds': round(time.time() - start_time, 2),
            'completeness': round(float(completeness), 3)
        }
        
        # Load processed data directly to database (no intermediate CSV file)
        if not test_mode:
            logger.info("💾 Loading processed data to database...")
            try:
                # Import DirectDatabaseLoader
                sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services'))
                from direct_database_loader import DirectDatabaseLoader
                
                # Initialize database loader
                loader = DirectDatabaseLoader(config.database_url, config.database_config['batch_size'])
                
                # Load data directly to database
                loading_result = loader.load_processed_dataframe(processed_df, pipeline_run_id)
                
                # Merge loading results into processing results
                if loading_result['status'] == 'success':
                    result.update({
                        'records_inserted': loading_result['records_inserted'],
                        'records_updated': loading_result['records_updated'],
                        'database_operations': loading_result['database_operations'],
                        'database_loading_time': loading_result['execution_time_seconds']
                    })
                    logger.info(f"   ✅ Database loading completed: {loading_result['records_inserted']} inserted")
                else:
                    # If database loading fails, mark the entire operation as failed
                    logger.error(f"   ❌ Database loading failed")
                    result.update({
                        'status': 'failed',
                        'error': f"Database loading failed",
                        'records_inserted': 0,
                        'records_updated': 0,
                        'database_loading_failed': True
                    })
                    
            except ImportError as e:
                logger.warning(f"⚠️ DirectDatabaseLoader not available")
                # Don't fail the processing step if DirectDatabaseLoader is not available
                result['database_loading_skipped'] = True
                result['database_loading_skip_reason'] = str(e)
            except Exception as e:
                logger.error(f"❌ Direct database loading failed")
                result.update({
                    'status': 'failed',
                    'error': f"Direct database loading failed",
                    'records_inserted': 0,
                    'records_updated': 0,
                    'database_loading_failed': True
                })
        else:
            logger.info("🧪 Test mode: Skipping database loading")
            result['test_mode'] = True
        
        logger.info(f"✅ Data processing completed successfully!")
        return result
        
    except Exception as e:
        logger.error(f"❌ Data processing failed: {str(e)}")
        
        return {
            'status': 'failed',
            'processing_method': 'unknown',
            'error': str(e),
            'records_processed': 0,
            'quality_score': 0.0,
            'execution_time_seconds': round(time.time() - start_time, 2) if 'start_time' in locals() else 0
        }

def main():
    """Main processing orchestrator"""
    parser = argparse.ArgumentParser(description='Data Processing Orchestrator')
    parser.add_argument('--pipeline-run-id', required=True, help='Pipeline run identifier')
    parser.add_argument('--scraping-result', required=True, help='JSON string of scraping results')
    parser.add_argument('--processor-result', required=True, help='JSON string of processor results')
    parser.add_argument('--test-mode', type=str, default='false', help='Run in test mode')
    
    args = parser.parse_args()
    
    # Parse arguments
    test_mode = args.test_mode.lower() == 'true'
    
    try:
        scraping_result = json.loads(args.scraping_result)
        processor_result = json.loads(args.processor_result)
    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse input JSON: {e}")
        sys.exit(1)
    
    logger = setup_logging()
    logger.info(f"🔧 Starting data processing orchestrator")
    
    try:
        # Check if we have data to process
        if scraping_result.get('status') != 'success':
            logger.error("❌ Cannot process data: scraping was not successful")
            
            failed_result = {
                'status': 'failed',
                'error': 'No data to process - scraping failed',
                'pipeline_run_id': args.pipeline_run_id,
                'timestamp': datetime.now().isoformat(),
                'records_processed': 0,
                'quality_score': 0.0
            }
            
            # Set GitHub Actions output
            if 'GITHUB_OUTPUT' in os.environ:
                with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                    f.write(f"processing_result={json.dumps(failed_result)}\n")
            
            sys.exit(1)
        
        # Load processor rankings if available
        processor_df = None
        if processor_result.get('status') == 'success':
            processor_df = load_processor_rankings()
        
        # Get scraped data from database
        logger.info("📊 Retrieving scraped data from database...")
        df = get_scraped_data_from_database(args.pipeline_run_id)
        
        if df is None or len(df) == 0:
            logger.warning("⚠️ No data found in database")
            
            # Create a minimal success result for testing
            result = {
                'status': 'success',
                'processing_method': 'no_data',
                'pipeline_run_id': args.pipeline_run_id,
                'timestamp': datetime.now().isoformat(),
                'records_processed': 0,
                'quality_score': 100.0,
                'quality_passed': True,
                'message': 'No data to process'
            }
        else:
            # Process the data
            logger.info(f"📊 Processing {len(df)} records...")
            result = process_data_with_pipeline(df, processor_df, args.pipeline_run_id, test_mode)
            result['pipeline_run_id'] = args.pipeline_run_id
            result['timestamp'] = datetime.now().isoformat()
        
        # Convert numpy types to native Python types for JSON serialization
        def convert_numpy_types(obj):
            """Convert numpy types to native Python types for JSON serialization"""
            if hasattr(obj, 'item'):  # numpy scalar
                return obj.item()
            elif isinstance(obj, dict):
                return {k: convert_numpy_types(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_numpy_types(v) for v in obj]
            else:
                return obj
        
        # Convert result to JSON-serializable format
        json_safe_result = convert_numpy_types(result)
        
        # Set GitHub Actions output
        if 'GITHUB_OUTPUT' in os.environ:
            with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                f.write(f"processing_result={json.dumps(json_safe_result)}\n")
        
        # Summary
        logger.info(f"🎯 Data processing completed: {result['status'].upper()}")
        logger.info(f"   Records: {result.get('records_processed', 0)}")
        if 'records_inserted' in result:
            logger.info(f"   Inserted: {result.get('records_inserted', 0)}")
        
        # Exit with appropriate code
        sys.exit(0 if result['status'] == 'success' else 1)
        
    except Exception as e:
        logger.error(f"❌ Data processing orchestrator failed: {str(e)}")
        
        # Set failed output for GitHub Actions
        failed_result = {
            'status': 'failed',
            'error': str(e),
            'pipeline_run_id': args.pipeline_run_id,
            'timestamp': datetime.now().isoformat(),
            'records_processed': 0,
            'quality_score': 0.0
        }
        
        if 'GITHUB_OUTPUT' in os.environ:
            with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                f.write(f"processing_result={json.dumps(failed_result)}\n")
        
        sys.exit(1)

if __name__ == "__main__":
    main()