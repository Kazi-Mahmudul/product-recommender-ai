#!/usr/bin/env python3
"""
Column Classification System for Database Updates

This module provides automatic detection and classification of DataFrame columns
to ensure comprehensive database updates including all feature-engineered data.
"""

import logging
import re
from typing import Dict, List, Set
import pandas as pd


class ColumnClassifier:
    """
    Classifies DataFrame columns into categories for comprehensive database updates.
    Automatically detects feature-engineered columns, basic phone fields, and metadata.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Define patterns for feature-engineered columns
        self.feature_patterns = [
            r'.*_score$',           # All score columns (performance_score, display_score, etc.)
            r'.*_gb$',              # Storage/RAM in GB (storage_gb, ram_gb)
            r'.*_mp$',              # Camera megapixels (primary_camera_mp, selfie_camera_mp)
            r'.*_numeric$',         # Numeric extracted values (ppi_numeric, refresh_rate_numeric)
            r'.*_wattage$',         # Power/charging wattage
            r'.*_count$',           # Count fields (camera_count)
            r'price_per_.*',        # Price ratios (price_per_gb, price_per_gb_ram)
            r'.*_width$|.*_height$', # Resolution dimensions
            r'has_.*',              # Boolean feature flags (has_fast_charging, has_wireless_charging)
            r'is_.*',               # Boolean status flags (is_popular_brand, is_new_release, is_upcoming)
            r'.*_category$',        # Category classifications (price_category)
            r'.*_rank$',            # Rankings (processor_rank)
            r'age_in_.*',           # Age calculations (age_in_months)
            r'.*_original$',        # Original/cleaned values (price_original)
            r'.*_clean$',           # Cleaned values (release_date_clean)
            r'overall_.*',          # Overall scores (overall_device_score)
            r'slug$'                # URL slugs
        ]
        
        # Basic phone fields that should always be updated
        self.basic_phone_fields = {
            'name', 'brand', 'model', 'price', 'url', 'img_url',
            'ram', 'internal_storage', 'storage', 'internal',
            'main_camera', 'front_camera', 'primary_camera_resolution', 'selfie_camera_resolution',
            'display_resolution', 'screen_size_inches', 'pixel_density_ppi', 'refresh_rate_hz',
            'capacity', 'battery_capacity', 'quick_charging', 'wireless_charging', 'charging',
            'processor', 'chipset', 'network', 'technology', 'wlan', 'wifi', 'bluetooth', 'nfc',
            'fingerprint', 'finger_sensor_type', 'biometrics', 'security',
            'release_date', 'status', 'camera_setup', 'company'
        }
        
        # Metadata fields for pipeline management
        self.metadata_fields = {
            'pipeline_run_id', 'scraped_at', 'data_source', 'data_quality_score',
            'is_pipeline_managed', 'created_at', 'updated_at', 'last_price_check'
        }
        
        # Fields that should typically be excluded from updates (system fields)
        self.excluded_fields = {
            'id'  # Primary key should never be updated
        }
    
    def classify_columns(self, df: pd.DataFrame) -> Dict[str, List[str]]:
        """
        Classify DataFrame columns into categories for update operations.
        
        Args:
            df: DataFrame to analyze
            
        Returns:
            Dictionary with categorized column lists
        """
        all_columns = set(df.columns)
        
        # Remove excluded fields
        available_columns = all_columns - self.excluded_fields
        
        # Classify columns
        feature_engineered = self.get_feature_engineered_columns(df)
        basic_fields = list(available_columns & self.basic_phone_fields)
        metadata_fields = list(available_columns & self.metadata_fields)
        
        # Find unknown columns (not in any predefined category)
        classified_columns = set(feature_engineered + basic_fields + metadata_fields)
        unknown_fields = list(available_columns - classified_columns)
        
        classification = {
            'feature_engineered': feature_engineered,
            'basic_fields': basic_fields,
            'metadata_fields': metadata_fields,
            'unknown_fields': unknown_fields,
            'excluded_fields': list(all_columns & self.excluded_fields)
        }
        
        self.logger.info(f"📊 Column Classification Results:")
        self.logger.info(f"   Feature-engineered: {len(feature_engineered)} columns")
        self.logger.info(f"   Basic phone fields: {len(basic_fields)} columns")
        self.logger.info(f"   Metadata fields: {len(metadata_fields)} columns")
        self.logger.info(f"   Unknown fields: {len(unknown_fields)} columns")
        self.logger.info(f"   Excluded fields: {len(classification['excluded_fields'])} columns")
        
        if unknown_fields:
            self.logger.warning(f"⚠️ Unknown columns detected: {unknown_fields}")
        
        return classification
    
    def get_feature_engineered_columns(self, df: pd.DataFrame) -> List[str]:
        """
        Identify columns that contain computed/engineered features.
        
        Args:
            df: DataFrame to analyze
            
        Returns:
            List of feature-engineered column names
        """
        feature_columns = []
        
        for column in df.columns:
            # Skip excluded fields
            if column in self.excluded_fields:
                continue
                
            # Check if column matches any feature pattern
            for pattern in self.feature_patterns:
                if re.match(pattern, column, re.IGNORECASE):
                    feature_columns.append(column)
                    break
        
        return sorted(feature_columns)
    
    def get_basic_phone_fields(self) -> List[str]:
        """
        Get standard phone attribute fields.
        
        Returns:
            List of basic phone field names
        """
        return sorted(list(self.basic_phone_fields))
    
    def get_all_updatable_columns(self, df: pd.DataFrame) -> List[str]:
        """
        Get comprehensive list of all columns that should be updated in database.
        
        Args:
            df: DataFrame to analyze
            
        Returns:
            List of all updatable column names
        """
        classification = self.classify_columns(df)
        
        # Combine all updatable categories
        updatable_columns = (
            classification['feature_engineered'] +
            classification['basic_fields'] +
            classification['metadata_fields'] +
            classification['unknown_fields']  # Include unknown fields but log them
        )
        
        return sorted(updatable_columns)
    
    def get_columns_with_data(self, df: pd.DataFrame, record: pd.Series) -> List[str]:
        """
        Get list of columns that have non-null data for a specific record.
        
        Args:
            df: DataFrame schema reference
            record: Specific record to check
            
        Returns:
            List of column names with non-null values
        """
        all_updatable = self.get_all_updatable_columns(df)
        
        # Filter to columns that have non-null values in this record
        columns_with_data = []
        for column in all_updatable:
            if column in record and pd.notna(record[column]):
                columns_with_data.append(column)
        
        return columns_with_data