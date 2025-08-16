"""
Feature engineering module for mobile phone data.
"""

import logging
import pandas as pd
import numpy as np
import re
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta

try:
    from .config import settings
    from .performance_scorer import PerformanceScorer
    from .feature_versioning import FeatureVersionManager
    from .processor_rankings_service import ProcessorRankingsService
except ImportError:
    from config import settings
    from performance_scorer import PerformanceScorer
    from feature_versioning import FeatureVersionManager
    from processor_rankings_service import ProcessorRankingsService

logger = logging.getLogger(__name__)


class FeatureEngineer:
    """
    Handles feature engineering operations for mobile phone data.
    """
    
    def __init__(self):
        """Initialize the feature engineer."""
        self.performance_scorer = PerformanceScorer()
        self.version_manager = FeatureVersionManager()
        self.processor_rankings_service = ProcessorRankingsService()
        logger.info("Feature engineer initialized")
    
    def create_performance_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create performance-based features using the performance scorer."""
        logger.info("Creating performance-based features")
        
        # Calculate performance scores for each device
        performance_data = []
        for _, row in df.iterrows():
            breakdown = self.performance_scorer.get_performance_breakdown(row)
            performance_data.append(breakdown)
        
        # Convert to DataFrame and merge
        performance_df = pd.DataFrame(performance_data)
        
        # Add performance scores to main DataFrame
        for col in performance_df.columns:
            df[col] = performance_df[col]
        
        # For backward compatibility, also set 'performance_score'
        df['performance_score'] = df['overall_score']
        
        return df
    
    def create_price_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create price-based features."""
        logger.info("Creating price-based features")
        
        # Storage and RAM conversion functions
        def convert_to_gb(value):
            if pd.isna(value):
                return None
            value_str = str(value).lower()
            
            # Extract numeric value
            numbers = re.findall(r'\d+', value_str)
            if not numbers:
                return None
            
            num = float(numbers[0])
            
            if 'gb' in value_str:
                return num
            elif 'mb' in value_str:
                return num / 1024
            elif 'tb' in value_str:
                return num * 1024
            else:
                # Assume GB if no unit specified
                return num
        
        def convert_ram_to_gb(value):
            if pd.isna(value):
                return None
            value_str = str(value).lower()
            
            # Extract numbers from the string
            numbers = re.findall(r'\d+', value_str)
            if numbers:
                num = float(numbers[0])
                if 'gb' in value_str:
                    return num
                elif 'mb' in value_str:
                    return num / 1024
                else:
                    # If no unit specified, assume GB
                    return num
            return None
        
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

        if "ram" in df.columns:
            df["ram_gb"] = df["ram"].apply(convert_ram_to_gb)
        else:
            df["ram_gb"] = np.nan

        # === Price per GB ===
        if "price_original" in df.columns:
            df["price_per_gb"] = (df["price_original"] / df["storage_gb"]).replace([np.inf, -np.inf], np.nan).round(2)
            df["price_per_gb_ram"] = (df["price_original"] / df["ram_gb"]).replace([np.inf, -np.inf], np.nan).round(2)
        
        return df
    
    def create_display_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create display-based features."""
        logger.info("Creating display-based features")
        
        # === Screen size numeric ===
        if "screen_size_inches" in df.columns:
            df['screen_size_numeric'] = df['screen_size_inches'].str.extract(r'(\d+\.?\d*)').astype(float)

        # === Resolution numeric ===
        res_src = None
        for cand in ["display_resolution"]:
            if cand in df.columns:
                res_src = cand
                break
        if res_src:
            df["resolution_width"]  = df[res_src].str.extract(r'(\d+)x').astype(float)
            df["resolution_height"] = df[res_src].str.extract(r'x(\d+)').astype(float)

        # === PPI numeric ===
        if "pixel_density_ppi" in df.columns:
            df['ppi_numeric'] = df['pixel_density_ppi'].str.extract(r'(\d+)').astype(float)

        # === Refresh rate numeric ===
        if "refresh_rate_hz" in df.columns:
            df['refresh_rate_numeric'] = df['refresh_rate_hz'].str.extract(r'(\d+)').astype(float)
        
        # Calculate display score
        df["display_score"] = df.apply(self.get_display_score, axis=1)
        
        return df
    
    def get_display_score(self, phone: pd.Series) -> float:
        """Score from resolution, PPI, refresh rate (0-100)."""
        score = 0.0
        weights = {"resolution":0.4,"ppi":0.3,"refresh":0.3}
        
        # resolution
        wh = self._extract_resolution_wh(phone.get("display_resolution") or phone.get("resolution"))
        if wh:
            w,h = wh
            pixels_m = (w*h)/1_000_000
            res_score = min(pixels_m/8.3*100, 100)  # 4K=8.3 MP as 100
            score += res_score*weights["resolution"]
        
        # ppi
        ppi = phone.get("ppi_numeric") or self._extract_ppi(phone.get("pixel_density_ppi") or phone.get("display"))
        if ppi:
            score += min(ppi/500*100, 100)*weights["ppi"]
        
        # refresh
        ref = phone.get("refresh_rate_numeric") or self._extract_refresh_rate(phone.get("refresh_rate_hz") or phone.get("display"))
        if ref:
            score += min(float(ref)/120*100, 100)*weights["refresh"]
        
        return round(score, 2)
    
    def _extract_resolution_wh(self, res: str) -> Optional[Tuple[int,int]]:
        if pd.isna(res): return None
        s = str(res).lower()
        m = re.search(r'(\d{3,5})\s*[x×]\s*(\d{3,5})', s)
        if not m: return None
        return int(m.group(1)), int(m.group(2))

    def _extract_ppi(self, value) -> Optional[float]:
        if pd.isna(value): return None
        m = re.search(r'(\d+(?:\.\d+)?)\s*ppi', str(value).lower())
        if not m: return None
        return float(m.group(1))

    def _extract_refresh_rate(self, value) -> Optional[float]:
        if pd.isna(value): return None
        m = re.search(r'(\d+(?:\.\d+)?)\s*hz', str(value).lower())
        if not m: return None
        return float(m.group(1))
    
    def create_camera_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create camera-based features."""
        logger.info("Creating camera-based features")
        
        # Camera count function
        def get_camera_count(value, main_camera=None):
            """Try several patterns: 'triple camera', '3 cameras', fallback to list-likes."""
            if not pd.isna(value):
                s = str(value).lower()
                if 'single' in s: return 1
                if 'dual' in s: return 2
                if 'triple' in s: return 3
                if 'quad' in s: return 4
                if 'penta' in s: return 5
                m = re.search(r'(\d+)\s*(cameras?|lens|lenses)', s)
                if m: return int(m.group(1))
            
            # Enhanced MP-based detection for formats like "50+12+10MP"
            if main_camera is not None and not pd.isna(main_camera):
                camera_str = str(main_camera).lower()
                
                # Count cameras by '+' separators (e.g., "50+12+10MP" = 3 cameras)
                if '+' in camera_str and 'mp' in camera_str:
                    # Split by '+' and count valid MP values
                    parts = camera_str.split('+')
                    valid_cameras = 0
                    for part in parts:
                        if re.search(r'\d+', part):  # Contains a number
                            valid_cameras += 1
                    if valid_cameras > 0:
                        return valid_cameras
                
                # Fallback: count MP occurrences
                mps = re.findall(r'(\d+(?:\.\d+)?)\s*mp', camera_str)
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
        
        # === Cameras ===
        # Primary/selfie MPs from text fields if present
        if "primary_camera_mp" not in df.columns:
            df['primary_camera_mp'] = df.apply(
                lambda row: extract_camera_mp(row['main_camera']) if not pd.isna(row.get('main_camera')) 
                else extract_camera_mp(row.get('primary_camera_resolution')), 
                axis=1
            )

        if "selfie_camera_mp" not in df.columns:
           df['selfie_camera_mp'] = df.apply(
               lambda row: extract_camera_mp(row['front_camera']) if not pd.isna(row.get('front_camera')) 
               else extract_camera_mp(row.get('selfie_camera_resolution')), 
               axis=1
           )
        # camera count
        if "camera_count" not in df.columns:
            df["camera_count"] = df.apply(
                lambda row: get_camera_count(
                    row.get('camera_setup'), 
                    row.get('main_camera')
                ), axis=1
            )

        # Camera score
        df["camera_score"] = df.apply(self.get_camera_score, axis=1)
        
        return df
    
    def get_camera_score(self, phone):
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
        if not pd.isna(phone.get('camera_count')) and phone['camera_count'] > 0:
            # Scale camera count score to 20 points
            # Assuming 4+ cameras is considered high-end
            camera_count_score = min(phone['camera_count'], 4) / 4 * 100
            score += camera_count_score * weights['camera_count'] / 100

        # Primary Camera Score (0-50 points)
        if not pd.isna(phone.get('primary_camera_mp')):
            # Scale primary camera MP score to 50 points
            # Assuming 200MP is the highest resolution
            primary_camera_score = min(phone['primary_camera_mp'] / 200 * 100, 100)
            score += primary_camera_score * weights['primary_camera_mp'] / 100

        # Selfie Camera Score (0-30 points)
        if not pd.isna(phone.get('selfie_camera_mp')):
            # Scale selfie camera MP score to 30 points
            # Assuming 64MP is the highest resolution
            selfie_camera_score = min(phone['selfie_camera_mp'] / 64 * 100, 100)
            score += selfie_camera_score * weights['selfie_camera_mp'] / 100

        return round(score, 2)  # Round to 2 decimal places
    
    def create_battery_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create battery-based features."""
        logger.info("Creating battery-based features")
        
        # Battery capacity in numeric format
        if 'capacity' in df.columns:
            df['battery_capacity_numeric'] = df['capacity'].str.extract(r'(\d+)').astype(float)
        
        # Has fast charging
        if 'quick_charging' in df.columns:
            df['has_fast_charging'] = df['quick_charging'].notna()
        
        # Has wireless charging
        if 'wireless_charging' in df.columns:
            df['has_wireless_charging'] = df['wireless_charging'].notna()
        else:
            # Fallback: detect wireless charging in text fields
            df['has_wireless_charging'] = df.get('charging', pd.Series([""]*len(df))).astype(str).str.contains('wireless', case=False, regex=False)
        
        # Extract charging wattage
        def extract_wattage(value):
            if pd.isna(value):
                return None
            
            value_str = str(value).strip()
            if not value_str:
                return None
            
            wattage_match = re.search(r'(\d+\.?\d*)\s*W', value_str, re.IGNORECASE)
            if wattage_match:
                return float(wattage_match.group(1))
            
            return None
        
        if 'quick_charging' in df.columns:
            df['charging_wattage'] = df['quick_charging'].apply(extract_wattage)
        
        # Calculate battery score
        df['battery_score'] = df.apply(self.get_battery_score_percentile, axis=1)
        
        return df
    
    def get_battery_score_percentile(self, phone: pd.Series) -> float:
        """Battery score using capacity (mAh) + charge wattage (W)."""
        cap = None
        if not pd.isna(phone.get("battery_capacity_numeric")):
            cap = phone["battery_capacity_numeric"]
        elif not pd.isna(phone.get("battery_capacity")):
            m = re.search(r'(\d{3,5})\s*m?ah', str(phone["battery_capacity"]).lower())
            if m:
                cap = int(m.group(1))
        # wattage
        watts = None
        for cand in ["charging_wattage","speed","quick_charging","charging","charger"]:
            v = phone.get(cand)
            w = self.extract_wattage(v) if not pd.isna(v) else None
            if w:
                watts = w
                break
        score = 0.0
        if cap:
            score += min(cap/6000*100, 100) * 0.7
        if watts:
            score += min(watts/120*100, 100) * 0.3
        return round(score, 2)
    
    def extract_wattage(self, value):
        if pd.isna(value):
            return None
        
        # If it's already a numeric value, return it directly
        if isinstance(value, (int, float)):
            return float(value)
        
        value_str = str(value).strip()
        if not value_str:
            return None
        
        # Try to convert to float directly (for numeric strings)
        try:
            return float(value_str)
        except ValueError:
            pass
        
        # Use regex to find a number (integer or float) followed by 'W'
        wattage_match = re.search(r'(\d+\.?\d*)\s*W', value_str, re.IGNORECASE)
        if wattage_match:
            return float(wattage_match.group(1))
        
        return None
    
    def calculate_performance_score(self, phone: pd.Series, proc_df: pd.DataFrame) -> float:
        """
        Performance score (0-100) primarily from SoC rank (lower rank = better),
        plus small boosts from RAM and storage type.
        """
        rank = self.processor_rankings_service.get_processor_rank(proc_df, phone.get("processor") or phone.get("chipset"))
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

    def calculate_security_score(self, phone: pd.Series) -> float:
        """Crude security score based on fingerprint type & face unlock mentions."""
        s = str(phone.get("finger_sensor_type") or phone.get("fingerprint") or "").lower()
        score = 30.0  # base
        if "ultrasonic" in s: score += 40
        elif "optical" in s: score += 25
        elif "side" in s or "rear" in s or "front" in s: score += 15
        if "face" in str(phone.get("biometrics") or phone.get("security") or "").lower():
            score += 10
        return round(min(score, 100.0), 2)

    def calculate_connectivity_score(self, phone: pd.Series) -> float:
        """Combine 5G, Wi-Fi version, NFC, Bluetooth version into 0-100."""
        score = 0.0
        # 5G
        if "5g" in str(phone.get("network") or phone.get("technology") or "").lower():
            score += 40
        # Wi-Fi
        wifi = str(phone.get("wlan") or phone.get("wifi") or "").lower()
        if "wifi 7" in wifi or "wi-fi 7" in wifi or "802.11be" in wifi:
            score += 30
        elif "wifi 6" in wifi or "wi-fi 6" in wifi or "802.11ax" in wifi:
            score += 24
        elif "wifi 5" in wifi or "wi-fi 5" in wifi or "802.11ac" in wifi:
            score += 18
        elif "802.11n" in wifi:
            score += 10
        # NFC
        nfc_value = str(phone.get("nfc") or "").lower()
        if "nfc" in nfc_value or "yes" in nfc_value:
            score += 15
        # Bluetooth
        bt = str(phone.get("bluetooth") or "").lower()
        m = re.search(r'(\d+\.\d+|\d+)', bt)
        if m:
            try:
                ver = float(m.group(1))
                score += min(15, max(5, (ver-4.0)*5))
            except Exception:
                score += 8
        return round(min(score,100.0), 2)
    
    def create_brand_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create brand-based features."""
        logger.info("Creating brand-based features")
        
        def is_popular_brand(name: str) -> bool:
            if pd.isna(name): return False
            brands = ["samsung","apple","xiaomi","redmi","poco","realme","oppo","vivo","oneplus","infinix","tecno","motorola","google","huawei","nokia"]
            return any(b in str(name).lower() for b in brands)
        
        # === Brand & popularity ===
        if "brand" not in df.columns and "company" in df.columns:
            df["brand"] = df["company"]
        if "brand" in df.columns:
            df["is_popular_brand"] = df["brand"].apply(is_popular_brand)
        else:
            df["is_popular_brand"] = False
        
        return df
    
    def create_release_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create release-based features."""
        logger.info("Creating release-based features")
        
        def clean_release_date(value):
            try:
                return pd.to_datetime(value, errors="coerce")
            except Exception:
                return None

        def is_new_release(release_date):
            if pd.isna(release_date): return None
            try:
                return (pd.Timestamp("today") - pd.to_datetime(release_date)).days <= 365
            except Exception:
                return None

        def calculate_age_in_months(release_date):
            if pd.isna(release_date): return None
            d = pd.to_datetime(release_date, errors="coerce")
            if pd.isna(d): return None
            delta = pd.Timestamp("today") - d
            return max(0, int(delta.days // 30))

        def is_upcoming(status):
            s = str(status).lower()
            return "upcoming" in s or "rumored" in s or "not released" in s
        
        # === Release & status ===
        if "release_date" in df.columns:
            df["release_date_clean"] = pd.to_datetime(df["release_date"], errors="coerce")
            df["is_new_release"] = df["release_date_clean"].apply(is_new_release)
            df["age_in_months"] = df["release_date_clean"].apply(calculate_age_in_months)
        if "status" in df.columns:
            df["is_upcoming"] = df["status"].apply(is_upcoming)
        
        return df
    
    def create_composite_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create composite features."""
        logger.info("Creating composite features")
        
        # Overall score
        df["overall_device_score"] = (
            df["performance_score"].fillna(0) * 0.35 +
            df["display_score"].fillna(0)     * 0.20 +
            df["camera_score"].fillna(0)      * 0.20 +
            df["battery_score"].fillna(0)     * 0.15 +
            df["connectivity_score"].fillna(0)* 0.10
        ).round(2)
        
        return df
    
    def engineer_features(self, df: pd.DataFrame, config: Optional[Dict[str, bool]] = None) -> pd.DataFrame:
        """
        Main feature engineering pipeline.
        
        Args:
            df: Input DataFrame
            config: Feature engineering configuration
            
        Returns:
            DataFrame with engineered features
        """
        logger.info(f"Starting feature engineering for {len(df)} records")
        
        if config is None:
            config = {
                'enable_price_categories': True,
                'enable_display_scores': True,
                'enable_camera_scores': True,
                'enable_battery_scores': True,
                'enable_brand_features': True,
                'enable_release_features': True,
                'enable_overall_scores': True,
            }
        
        try:
            # Price-based features
            if config.get('enable_price_categories', True):
                df = self.create_price_features(df)
            
            # Display-based features
            if config.get('enable_display_scores', True):
                df = self.create_display_features(df)
            
            # Camera-based features
            if config.get('enable_camera_scores', True):
                df = self.create_camera_features(df)
            
            # Battery-based features
            if config.get('enable_battery_scores', True):
                df = self.create_battery_features(df)
            
            # Performance-based features (with processor rankings)
            if config.get('enable_performance_scores', True):
                # Get processor rankings
                proc_df = self.processor_rankings_service.get_or_refresh_rankings()
                
                # Calculate performance scores
                df["performance_score"] = df.apply(lambda r: self.calculate_performance_score(r, proc_df), axis=1)
                
                # Calculate connectivity & security scores
                df["connectivity_score"] = df.apply(self.calculate_connectivity_score, axis=1)
                df["security_score"] = df.apply(self.calculate_security_score, axis=1)
            
            # Brand-based features
            if config.get('enable_brand_features', True):
                df = self.create_brand_features(df)
            
            # Release-based features
            if config.get('enable_release_features', True):
                df = self.create_release_features(df)
            
            # Composite features
            if config.get('enable_overall_scores', True):
                df = self.create_composite_features(df)
            
            # Validate feature consistency
            validation_report = self.version_manager.validate_feature_consistency(df)
            if not validation_report["validation_passed"]:
                logger.warning(f"Feature validation issues detected: {validation_report}")
            
            # Calculate feature importance
            importance_scores = self.version_manager.calculate_feature_importance(df)
            logger.info(f"Calculated importance scores for {len(importance_scores)} features")
            
            # Final rounding
            for col in ["performance_score","display_score","battery_score","connectivity_score","security_score","camera_score","overall_device_score",
                        "price_per_gb","price_per_gb_ram","screen_size_numeric","resolution_width","resolution_height","ppi_numeric","refresh_rate_numeric","battery_capacity_numeric","charging_wattage",
                        "storage_gb","ram_gb"]:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors="coerce").round(2)
            
            logger.info(f"Feature engineering completed: {len(df.columns)} total columns")
            
        except Exception as e:
            logger.error(f"Error during feature engineering: {e}")
            raise
        
        return df
    
    def get_feature_documentation(self) -> Dict[str, Any]:
        """Get comprehensive feature documentation."""
        return self.version_manager.generate_feature_documentation()
    
    def get_feature_lineage(self, feature_name: str) -> Dict[str, Any]:
        """Get lineage information for a specific feature."""
        return self.version_manager.get_feature_lineage(feature_name)