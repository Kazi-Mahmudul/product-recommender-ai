"""
Data Quality Validator Module

Provides data quality validation functionality for the processing pipeline.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple


class DataQualityValidator:
    """Data quality validation service for mobile phone data"""
    
    def __init__(self):
        self.quality_thresholds = {
            'completeness_threshold': 0.7,  # 70% completeness required
            'accuracy_threshold': 0.8,      # 80% accuracy required
            'consistency_threshold': 0.9    # 90% consistency required
        }
    
    def validate_pipeline_data(self, df: pd.DataFrame) -> Tuple[bool, Dict[str, Any]]:
        """
        Validate the quality of processed data
        
        Args:
            df: Processed dataframe to validate
            
        Returns:
            Tuple of (passed, quality_report)
        """
        quality_report = {}
        
        # Calculate completeness score
        completeness_score = self._calculate_completeness(df)
        quality_report['completeness_score'] = completeness_score
        
        # Calculate accuracy score
        accuracy_score = self._calculate_accuracy(df)
        quality_report['accuracy_score'] = accuracy_score
        
        # Calculate consistency score
        consistency_score = self._calculate_consistency(df)
        quality_report['consistency_score'] = consistency_score
        
        # Calculate overall quality score
        overall_score = (
            completeness_score * 0.4 +
            accuracy_score * 0.4 +
            consistency_score * 0.2
        )
        quality_report['overall_quality_score'] = overall_score
        
        # Determine if validation passed
        passed = (
            completeness_score >= self.quality_thresholds['completeness_threshold'] * 100 and
            accuracy_score >= self.quality_thresholds['accuracy_threshold'] * 100 and
            consistency_score >= self.quality_thresholds['consistency_threshold'] * 100
        )
        
        # Add detailed metrics
        quality_report.update({
            'total_records': len(df),
            'total_columns': len(df.columns),
            'missing_values_count': int(df.isna().sum().sum()),
            'duplicate_records': int(df.duplicated().sum()),
            'validation_passed': passed,
            'quality_issues': self._identify_quality_issues(df)
        })
        
        return passed, quality_report
    
    def _calculate_completeness(self, df: pd.DataFrame) -> float:
        """Calculate data completeness score (0-100)"""
        if df.empty:
            return 0.0
        
        # Calculate overall completeness
        total_cells = df.size
        non_null_cells = df.notna().sum().sum()
        completeness = (non_null_cells / total_cells) * 100
        
        return round(completeness, 2)
    
    def _calculate_accuracy(self, df: pd.DataFrame) -> float:
        """Calculate data accuracy score (0-100)"""
        accuracy_score = 100.0  # Start with perfect score
        
        # Check for invalid price values
        if 'price_original' in df.columns:
            invalid_prices = df['price_original'] < 0
            if invalid_prices.any():
                accuracy_score -= 5
        
        # Check for invalid storage values
        if 'storage_gb' in df.columns:
            invalid_storage = (df['storage_gb'] < 0) | (df['storage_gb'] > 2000)  # > 2TB seems invalid
            if invalid_storage.any():
                accuracy_score -= 5
        
        # Check for invalid RAM values
        if 'ram_gb' in df.columns:
            invalid_ram = (df['ram_gb'] < 0) | (df['ram_gb'] > 64)  # > 64GB seems invalid for phones
            if invalid_ram.any():
                accuracy_score -= 5
        
        # Check for invalid screen sizes
        if 'screen_size_numeric' in df.columns:
            invalid_screen = (df['screen_size_numeric'] < 3) | (df['screen_size_numeric'] > 15)
            if invalid_screen.any():
                accuracy_score -= 5
        
        # Check for invalid battery capacity
        if 'battery_capacity_numeric' in df.columns:
            invalid_battery = (df['battery_capacity_numeric'] < 1000) | (df['battery_capacity_numeric'] > 10000)
            if invalid_battery.any():
                accuracy_score -= 5
        
        return max(0.0, round(accuracy_score, 2))
    
    def _calculate_consistency(self, df: pd.DataFrame) -> float:
        """Calculate data consistency score (0-100)"""
        consistency_score = 100.0  # Start with perfect score
        
        # Check for consistent price formatting
        if 'price' in df.columns and 'price_original' in df.columns:
            price_consistency = df['price'].notna() == df['price_original'].notna()
            if not price_consistency.all():
                consistency_score -= 10
        
        # Check for consistent brand naming
        if 'brand' in df.columns:
            # Check for variations in brand names (case sensitivity, etc.)
            brand_variations = df['brand'].str.lower().nunique() / df['brand'].nunique()
            if brand_variations < 0.9:  # More than 10% variation
                consistency_score -= 10
        
        # Check for consistent processor naming
        if 'processor' in df.columns:
            # Check for empty processor names when other specs are present
            has_specs = df[['ram_gb', 'storage_gb']].notna().any(axis=1)
            missing_processor = df['processor'].isna()
            inconsistent_processor = has_specs & missing_processor
            if inconsistent_processor.any():
                consistency_score -= 5
        
        return max(0.0, round(consistency_score, 2))
    
    def _identify_quality_issues(self, df: pd.DataFrame) -> list:
        """Identify specific quality issues in the data"""
        issues = []
        
        # Check for high missing value columns
        missing_percentages = (df.isna().sum() / len(df)) * 100
        high_missing_cols = missing_percentages[missing_percentages > 50].index.tolist()
        if high_missing_cols:
            issues.append({
                'type': 'high_missing_values',
                'columns': high_missing_cols,
                'message': f'Columns with >50% missing values: {", ".join(high_missing_cols)}'
            })
        
        # Check for duplicate records
        duplicate_count = df.duplicated().sum()
        if duplicate_count > 0:
            issues.append({
                'type': 'duplicate_records',
                'count': int(duplicate_count),
                'message': f'Found {duplicate_count} duplicate records'
            })
        
        # Check for outliers in numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if col.endswith('_score') or col in ['price_original', 'storage_gb', 'ram_gb']:
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                outliers = df[(df[col] < (Q1 - 1.5 * IQR)) | (df[col] > (Q3 + 1.5 * IQR))]
                if len(outliers) > len(df) * 0.05:  # More than 5% outliers
                    issues.append({
                        'type': 'outliers',
                        'column': col,
                        'count': len(outliers),
                        'message': f'Column {col} has {len(outliers)} potential outliers'
                    })
        
        return issues