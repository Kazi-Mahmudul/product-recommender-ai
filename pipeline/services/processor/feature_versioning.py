"""
Feature versioning and validation module.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class FeatureVersionManager:
    """
    Manages feature versioning, validation, and documentation.
    """
    
    def __init__(self):
        """Initialize the feature version manager."""
        self.feature_registry = self._initialize_feature_registry()
        logger.info("Feature version manager initialized")
    
    def _initialize_feature_registry(self) -> Dict[str, Dict[str, Any]]:
        """Initialize the feature registry with metadata."""
        return {
            # Price features
            'price_original': {
                'type': 'numeric',
                'description': 'Numeric price extracted from price string',
                'dependencies': ['price'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            'price_category': {
                'type': 'categorical',
                'description': 'Price category based on price ranges',
                'dependencies': ['price_original'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            'price_per_gb': {
                'type': 'numeric',
                'description': 'Price per GB of storage',
                'dependencies': ['price_original', 'storage_gb'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            'price_per_gb_ram': {
                'type': 'numeric',
                'description': 'Price per GB of RAM',
                'dependencies': ['price_original', 'ram_gb'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            
            # Storage features
            'storage_gb': {
                'type': 'numeric',
                'description': 'Storage capacity in GB',
                'dependencies': ['internal_storage'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            'ram_gb': {
                'type': 'numeric',
                'description': 'RAM capacity in GB',
                'dependencies': ['ram'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            
            # Display features
            'screen_size_numeric': {
                'type': 'numeric',
                'description': 'Screen size in inches (numeric)',
                'dependencies': ['screen_size_inches'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            'resolution_width': {
                'type': 'numeric',
                'description': 'Display resolution width in pixels',
                'dependencies': ['display_resolution'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            'resolution_height': {
                'type': 'numeric',
                'description': 'Display resolution height in pixels',
                'dependencies': ['display_resolution'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            'ppi_numeric': {
                'type': 'numeric',
                'description': 'Pixel density in PPI (numeric)',
                'dependencies': ['pixel_density_ppi'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            'refresh_rate_numeric': {
                'type': 'numeric',
                'description': 'Refresh rate in Hz (numeric)',
                'dependencies': ['refresh_rate_hz'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            'display_score': {
                'type': 'numeric',
                'description': 'Composite display quality score (0-100)',
                'dependencies': ['resolution_width', 'resolution_height', 'ppi_numeric', 'refresh_rate_numeric'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            
            # Camera features
            'camera_count': {
                'type': 'numeric',
                'description': 'Number of rear cameras',
                'dependencies': ['camera_setup', 'main_camera'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            'primary_camera_mp': {
                'type': 'numeric',
                'description': 'Primary camera resolution in MP',
                'dependencies': ['main_camera', 'primary_camera_resolution'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            'selfie_camera_mp': {
                'type': 'numeric',
                'description': 'Selfie camera resolution in MP',
                'dependencies': ['front_camera', 'selfie_camera_resolution'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            'camera_score': {
                'type': 'numeric',
                'description': 'Composite camera quality score (0-100)',
                'dependencies': ['camera_count', 'primary_camera_mp', 'selfie_camera_mp'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            
            # Battery features
            'battery_capacity_numeric': {
                'type': 'numeric',
                'description': 'Battery capacity in mAh (numeric)',
                'dependencies': ['capacity'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            'has_fast_charging': {
                'type': 'boolean',
                'description': 'Whether device supports fast charging',
                'dependencies': ['quick_charging'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            'has_wireless_charging': {
                'type': 'boolean',
                'description': 'Whether device supports wireless charging',
                'dependencies': ['wireless_charging'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            'charging_wattage': {
                'type': 'numeric',
                'description': 'Fast charging wattage',
                'dependencies': ['quick_charging'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            'battery_score': {
                'type': 'numeric',
                'description': 'Composite battery score (0-100)',
                'dependencies': ['battery_capacity_numeric', 'charging_wattage', 'has_wireless_charging'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            
            # Performance features
            'performance_score': {
                'type': 'numeric',
                'description': 'Overall performance score (0-100)',
                'dependencies': ['chipset', 'cpu', 'gpu', 'ram', 'internal_storage'],
                'version': '2.0',
                'created_date': '2024-01-01'
            },
            
            # Brand features
            'is_popular_brand': {
                'type': 'boolean',
                'description': 'Whether brand is considered popular',
                'dependencies': ['brand'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            
            # Release features
            'release_date_clean': {
                'type': 'datetime',
                'description': 'Cleaned and parsed release date',
                'dependencies': ['release_date'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            'is_new_release': {
                'type': 'boolean',
                'description': 'Whether device was released in last 6 months',
                'dependencies': ['release_date_clean'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            'age_in_months': {
                'type': 'numeric',
                'description': 'Age of device in months since release',
                'dependencies': ['release_date_clean'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            'is_upcoming': {
                'type': 'boolean',
                'description': 'Whether device is upcoming/rumored',
                'dependencies': ['status'],
                'version': '1.0',
                'created_date': '2024-01-01'
            },
            
            # Composite features
            'overall_device_score': {
                'type': 'numeric',
                'description': 'Overall device quality score (0-100)',
                'dependencies': ['performance_score', 'camera_score', 'battery_score', 'display_score'],
                'version': '1.0',
                'created_date': '2024-01-01'
            }
        }
    
    def validate_feature_consistency(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Validate feature consistency and dependencies."""
        validation_report = {
            'validation_passed': True,
            'missing_dependencies': [],
            'type_mismatches': [],
            'value_range_issues': [],
            'recommendations': []
        }
        
        for feature_name, feature_info in self.feature_registry.items():
            if feature_name in df.columns:
                # Check dependencies
                for dependency in feature_info.get('dependencies', []):
                    if dependency not in df.columns:
                        validation_report['missing_dependencies'].append({
                            'feature': feature_name,
                            'missing_dependency': dependency
                        })
                        validation_report['validation_passed'] = False
                
                # Check data types
                expected_type = feature_info.get('type')
                if expected_type == 'numeric':
                    if not pd.api.types.is_numeric_dtype(df[feature_name]):
                        validation_report['type_mismatches'].append({
                            'feature': feature_name,
                            'expected_type': expected_type,
                            'actual_type': str(df[feature_name].dtype)
                        })
                
                # Check value ranges for scores
                if 'score' in feature_name.lower() and expected_type == 'numeric':
                    invalid_scores = df[feature_name][(df[feature_name] < 0) | (df[feature_name] > 100)]
                    if len(invalid_scores) > 0:
                        validation_report['value_range_issues'].append({
                            'feature': feature_name,
                            'issue': f'{len(invalid_scores)} values outside 0-100 range'
                        })
        
        # Generate recommendations
        if validation_report['missing_dependencies']:
            validation_report['recommendations'].append(
                'Consider running feature engineering with all required source columns'
            )
        
        if validation_report['type_mismatches']:
            validation_report['recommendations'].append(
                'Review data cleaning process to ensure proper type conversion'
            )
        
        return validation_report
    
    def calculate_feature_importance(self, df: pd.DataFrame) -> Dict[str, float]:
        """Calculate feature importance scores based on completeness and variance."""
        importance_scores = {}
        
        for column in df.columns:
            if column in self.feature_registry:
                # Completeness score (0-1)
                completeness = df[column].notna().sum() / len(df)
                
                # Variance score (normalized)
                if pd.api.types.is_numeric_dtype(df[column]):
                    variance_score = min(df[column].var() / df[column].mean() if df[column].mean() != 0 else 0, 1)
                else:
                    # For categorical, use number of unique values
                    unique_ratio = df[column].nunique() / len(df)
                    variance_score = min(unique_ratio * 2, 1)  # Scale up for categorical
                
                # Combined importance (weighted average)
                importance = (completeness * 0.7) + (variance_score * 0.3)
                importance_scores[column] = round(importance, 3)
        
        # Sort by importance
        return dict(sorted(importance_scores.items(), key=lambda x: x[1], reverse=True))
    
    def generate_feature_documentation(self) -> Dict[str, Any]:
        """Generate comprehensive feature documentation."""
        documentation = {
            'total_features': len(self.feature_registry),
            'feature_types': {},
            'feature_categories': {},
            'features': {}
        }
        
        # Count feature types
        for feature_name, feature_info in self.feature_registry.items():
            feature_type = feature_info.get('type', 'unknown')
            documentation['feature_types'][feature_type] = documentation['feature_types'].get(feature_type, 0) + 1
        
        # Categorize features
        categories = {
            'price': ['price_original', 'price_category', 'price_per_gb', 'price_per_gb_ram'],
            'display': ['screen_size_numeric', 'resolution_width', 'resolution_height', 'ppi_numeric', 'refresh_rate_numeric', 'display_score'],
            'camera': ['camera_count', 'primary_camera_mp', 'selfie_camera_mp', 'camera_score'],
            'battery': ['battery_capacity_numeric', 'has_fast_charging', 'has_wireless_charging', 'charging_wattage', 'battery_score'],
            'performance': ['performance_score'],
            'brand': ['is_popular_brand'],
            'release': ['release_date_clean', 'is_new_release', 'age_in_months', 'is_upcoming'],
            'composite': ['overall_device_score']
        }
        
        for category, features in categories.items():
            documentation['feature_categories'][category] = len(features)
        
        # Detailed feature information
        documentation['features'] = self.feature_registry
        
        return documentation
    
    def get_feature_lineage(self, feature_name: str) -> Dict[str, Any]:
        """Get lineage information for a specific feature."""
        if feature_name not in self.feature_registry:
            return {'error': f'Feature {feature_name} not found in registry'}
        
        feature_info = self.feature_registry[feature_name]
        
        lineage = {
            'feature_name': feature_name,
            'description': feature_info.get('description'),
            'type': feature_info.get('type'),
            'version': feature_info.get('version'),
            'created_date': feature_info.get('created_date'),
            'direct_dependencies': feature_info.get('dependencies', []),
            'dependency_chain': []
        }
        
        # Build dependency chain
        def get_dependencies(feature):
            deps = self.feature_registry.get(feature, {}).get('dependencies', [])
            chain = []
            for dep in deps:
                chain.append(dep)
                chain.extend(get_dependencies(dep))
            return list(set(chain))  # Remove duplicates
        
        lineage['dependency_chain'] = get_dependencies(feature_name)
        
        return lineage