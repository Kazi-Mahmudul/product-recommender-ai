"""
Feature versioning and validation module.
"""

import logging
import pandas as pd
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class FeatureVersionManager:
    """
    Manages feature versioning and validation.
    """
    
    def __init__(self):
        """Initialize the feature version manager."""
        self.feature_definitions = {
            'price_features': ['price_original', 'price_category', 'price_per_gb'],
            'display_features': ['display_score', 'screen_size_numeric', 'ppi_numeric'],
            'camera_features': ['camera_score', 'primary_camera_mp', 'camera_count'],
            'battery_features': ['battery_score', 'battery_capacity_numeric', 'charging_wattage'],
            'performance_features': ['performance_score', 'ram_gb', 'storage_gb'],
            'overall_features': ['overall_device_score', 'is_popular_brand', 'slug']
        }
        logger.info("Feature version manager initialized")
    
    def validate_feature_consistency(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Validate feature consistency across the dataset."""
        validation_report = {
            'validation_passed': True,
            'missing_features': [],
            'inconsistent_features': [],
            'feature_completeness': {}
        }
        
        # Check for missing features
        all_expected_features = []
        for feature_group in self.feature_definitions.values():
            all_expected_features.extend(feature_group)
        
        for feature in all_expected_features:
            if feature not in df.columns:
                validation_report['missing_features'].append(feature)
                validation_report['validation_passed'] = False
            else:
                # Calculate completeness
                completeness = df[feature].notna().sum() / len(df)
                validation_report['feature_completeness'][feature] = completeness
        
        return validation_report
    
    def calculate_feature_importance(self, df: pd.DataFrame) -> Dict[str, float]:
        """Calculate feature importance scores."""
        importance_scores = {}
        
        # Simple importance based on completeness and variance
        for column in df.columns:
            if df[column].dtype in ['int64', 'float64']:
                completeness = df[column].notna().sum() / len(df)
                variance = df[column].var() if completeness > 0 else 0
                importance_scores[column] = completeness * (1 + min(variance / 1000, 1))
            else:
                completeness = df[column].notna().sum() / len(df)
                importance_scores[column] = completeness
        
        return importance_scores
    
    def generate_feature_documentation(self) -> Dict[str, Any]:
        """Generate comprehensive feature documentation."""
        documentation = {
            'feature_groups': self.feature_definitions,
            'total_features': sum(len(features) for features in self.feature_definitions.values()),
            'version': '1.0.0',
            'last_updated': pd.Timestamp.now().isoformat()
        }
        
        return documentation
    
    def get_feature_lineage(self, feature_name: str) -> Dict[str, Any]:
        """Get lineage information for a specific feature."""
        lineage = {
            'feature_name': feature_name,
            'feature_group': None,
            'dependencies': [],
            'derived_from': []
        }
        
        # Find feature group
        for group_name, features in self.feature_definitions.items():
            if feature_name in features:
                lineage['feature_group'] = group_name
                break
        
        # Define common dependencies (simplified)
        dependencies_map = {
            'price_original': ['price'],
            'camera_score': ['primary_camera_mp', 'camera_count', 'selfie_camera_mp'],
            'overall_device_score': ['performance_score', 'display_score', 'camera_score', 'battery_score'],
            'slug': ['name']
        }
        
        if feature_name in dependencies_map:
            lineage['dependencies'] = dependencies_map[feature_name]
        
        return lineage