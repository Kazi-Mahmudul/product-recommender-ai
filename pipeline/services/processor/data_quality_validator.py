"""
Data Quality Validator Service for mobile phone data.
"""

import logging
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)


class DataQualityValidator:
    """
    Handles data quality validation and metrics calculation.
    """
    
    def __init__(self):
        """Initialize the data quality validator."""
        self.required_fields = [
            'name', 'brand', 'price', 'main_camera', 'ram', 'internal_storage'
        ]
        self.quality_thresholds = {
            'minimum_completeness': 0.80,
            'price_min': 1000,
            'price_max': 500000,
            'ram_min': 1,
            'ram_max': 32,
            'storage_min': 8,
            'storage_max': 2048
        }
        logger.info("Data quality validator initialized")
    
    def validate_required_fields(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
        """Validate that required fields are present and have acceptable completeness."""
        logger.info("Validating required fields")
        
        issues = []
        
        for field in self.required_fields:
            if field not in df.columns:
                issues.append(f"Missing required column: {field}")
            else:
                missing_count = df[field].isna().sum()
                if missing_count > 0:
                    missing_pct = (missing_count / len(df)) * 100
                    issues.append(f"Column '{field}' has {missing_count} missing values ({missing_pct:.1f}%)")
                    
                    # Check if completeness is below threshold
                    completeness = 1 - (missing_count / len(df))
                    if completeness < self.quality_thresholds['minimum_completeness']:
                        issues.append(f"Column '{field}' completeness ({completeness:.2f}) below threshold ({self.quality_thresholds['minimum_completeness']})")
        
        return df, issues
    
    def calculate_completeness_score(self, df: pd.DataFrame) -> Dict[str, float]:
        """Calculate field completeness percentages."""
        logger.info("Calculating completeness scores")
        
        completeness = {}
        for col in df.columns:
            non_null_count = df[col].notna().sum()
            completeness[col] = non_null_count / len(df) if len(df) > 0 else 0
        
        overall_completeness = np.mean(list(completeness.values()))
        
        return {
            'field_completeness': completeness,
            'overall_completeness': overall_completeness
        }
    
    def validate_data_ranges(self, df: pd.DataFrame) -> List[str]:
        """Check numeric values are within expected ranges."""
        logger.info("Validating data ranges")
        
        issues = []
        
        # Price validation
        if 'price_original' in df.columns:
            price_issues = df[
                (df['price_original'] < self.quality_thresholds['price_min']) |
                (df['price_original'] > self.quality_thresholds['price_max'])
            ]
            if len(price_issues) > 0:
                issues.append(f"Found {len(price_issues)} records with price outside expected range ({self.quality_thresholds['price_min']}-{self.quality_thresholds['price_max']})")
        
        # RAM validation
        if 'ram_gb' in df.columns:
            ram_issues = df[
                (df['ram_gb'] < self.quality_thresholds['ram_min']) |
                (df['ram_gb'] > self.quality_thresholds['ram_max'])
            ]
            if len(ram_issues) > 0:
                issues.append(f"Found {len(ram_issues)} records with RAM outside expected range ({self.quality_thresholds['ram_min']}-{self.quality_thresholds['ram_max']} GB)")
        
        # Storage validation
        if 'storage_gb' in df.columns:
            storage_issues = df[
                (df['storage_gb'] < self.quality_thresholds['storage_min']) |
                (df['storage_gb'] > self.quality_thresholds['storage_max'])
            ]
            if len(storage_issues) > 0:
                issues.append(f"Found {len(storage_issues)} records with storage outside expected range ({self.quality_thresholds['storage_min']}-{self.quality_thresholds['storage_max']} GB)")
        
        return issues
    
    def detect_anomalies(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Identify outliers and suspicious values."""
        logger.info("Detecting anomalies")
        
        anomalies = {
            'outliers': {},
            'suspicious_values': [],
            'duplicate_names': []
        }
        
        # Detect price outliers using IQR method
        if 'price_original' in df.columns:
            price_data = df['price_original'].dropna()
            if len(price_data) > 0:
                Q1 = price_data.quantile(0.25)
                Q3 = price_data.quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                
                outliers = df[
                    (df['price_original'] < lower_bound) | 
                    (df['price_original'] > upper_bound)
                ]
                anomalies['outliers']['price'] = len(outliers)
        
        # Detect suspicious camera values (too high MP)
        if 'primary_camera_mp' in df.columns:
            high_mp = df[df['primary_camera_mp'] > 200]
            if len(high_mp) > 0:
                anomalies['suspicious_values'].append(f"Found {len(high_mp)} records with primary camera > 200MP")
        
        # Detect duplicate phone names
        if 'name' in df.columns:
            duplicates = df[df.duplicated(subset=['name'], keep=False)]
            if len(duplicates) > 0:
                anomalies['duplicate_names'] = duplicates['name'].unique().tolist()
        
        return anomalies
    
    def generate_quality_report(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generate comprehensive quality assessment."""
        logger.info("Generating quality report")
        
        # Validate required fields
        df, field_issues = self.validate_required_fields(df)
        
        # Calculate completeness
        completeness_data = self.calculate_completeness_score(df)
        
        # Validate data ranges
        range_issues = self.validate_data_ranges(df)
        
        # Detect anomalies
        anomalies = self.detect_anomalies(df)
        
        # Calculate overall quality score
        overall_quality = self._calculate_overall_quality_score(
            completeness_data['overall_completeness'],
            len(field_issues),
            len(range_issues),
            sum(anomalies['outliers'].values()) if anomalies['outliers'] else 0
        )
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_records': len(df),
            'total_columns': len(df.columns),
            'overall_quality_score': overall_quality,
            'completeness': completeness_data,
            'validation_issues': {
                'field_issues': field_issues,
                'range_issues': range_issues
            },
            'anomalies': anomalies,
            'quality_passed': overall_quality >= self.quality_thresholds['minimum_completeness'],
            'recommendations': self._generate_recommendations(field_issues, range_issues, anomalies)
        }
        
        return report
    
    def _calculate_overall_quality_score(self, completeness: float, field_issues: int, 
                                       range_issues: int, outliers: int) -> float:
        """Calculate overall quality score based on various factors."""
        # Start with completeness as base score
        score = completeness * 100
        
        # Penalize for issues
        score -= field_issues * 5  # 5 points per field issue
        score -= range_issues * 2  # 2 points per range issue
        score -= outliers * 0.1    # 0.1 points per outlier
        
        return max(0, min(100, round(score, 2)))
    
    def _generate_recommendations(self, field_issues: List[str], range_issues: List[str], 
                                anomalies: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on quality issues."""
        recommendations = []
        
        if field_issues:
            recommendations.append("Review data collection process to ensure required fields are captured")
        
        if range_issues:
            recommendations.append("Implement data validation rules to catch out-of-range values during collection")
        
        if anomalies['outliers']:
            recommendations.append("Review outlier detection and consider data cleaning for extreme values")
        
        if anomalies['duplicate_names']:
            recommendations.append("Implement duplicate detection and resolution process")
        
        if not recommendations:
            recommendations.append("Data quality is good - maintain current processes")
        
        return recommendations
    
    def validate_pipeline_data(self, df: pd.DataFrame, 
                             quality_threshold: float = 0.80) -> Tuple[bool, Dict[str, Any]]:
        """
        Main validation method for pipeline integration.
        
        Returns:
            Tuple of (validation_passed, quality_report)
        """
        logger.info(f"Validating pipeline data with threshold: {quality_threshold}")
        
        # Generate comprehensive quality report
        quality_report = self.generate_quality_report(df)
        
        # Check if quality meets threshold
        validation_passed = quality_report['overall_quality_score'] >= (quality_threshold * 100)
        
        if not validation_passed:
            logger.warning(f"Data quality validation failed. Score: {quality_report['overall_quality_score']}, Threshold: {quality_threshold * 100}")
        else:
            logger.info(f"Data quality validation passed. Score: {quality_report['overall_quality_score']}")
        
        return validation_passed, quality_report