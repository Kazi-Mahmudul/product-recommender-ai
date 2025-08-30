#!/usr/bin/env python3
"""
Dynamic Update Field Generator

This module generates comprehensive lists of fields to update in database operations,
replacing hardcoded field lists with dynamic detection based on DataFrame content.
"""

import logging
from typing import Dict, List, Tuple, Any
import pandas as pd
from .column_classifier import ColumnClassifier
from .database_schema_inspector import SchemaCompatibilityValidator


class UpdateFieldGenerator:
    """
    Generates comprehensive and dynamic lists of fields for database update operations.
    """
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.column_classifier = ColumnClassifier()
        self.schema_validator = SchemaCompatibilityValidator(database_url)
        self.logger = logging.getLogger(__name__)
    
    def generate_updatable_fields(self, df: pd.DataFrame, record: pd.Series, 
                                cursor=None, table_name: str = 'phones') -> List[str]:
        """
        Generate comprehensive list of fields to update for a specific record.
        
        Args:
            df: DataFrame schema reference
            record: Specific record to analyze
            cursor: Database cursor for schema validation (optional)
            table_name: Target table name
            
        Returns:
            List of field names that should be updated
        """
        # Get all columns that have data in this record
        columns_with_data = self.column_classifier.get_columns_with_data(df, record)
        
        if not columns_with_data:
            self.logger.warning("⚠️ No columns with data found for record")
            return []
        
        # If we have database access, validate against schema
        if cursor is not None:
            try:
                updatable_columns, skipped_columns = self.schema_validator.inspector.get_updatable_columns(
                    cursor, table_name, columns_with_data
                )
                
                if skipped_columns:
                    self.logger.debug(f"🔍 Skipping {len(skipped_columns)} columns not in database schema")
                
                return updatable_columns
                
            except Exception as e:
                self.logger.warning(f"⚠️ Schema validation failed, using all available columns: {str(e)}")
                return columns_with_data
        
        # Fallback: return all columns with data
        return columns_with_data
    
    def generate_batch_updatable_fields(self, df: pd.DataFrame, cursor=None, 
                                      table_name: str = 'phones') -> Dict[str, Any]:
        """
        Generate updatable fields analysis for entire DataFrame batch.
        
        Args:
            df: DataFrame to analyze
            cursor: Database cursor for schema validation (optional)
            table_name: Target table name
            
        Returns:
            Dictionary with batch field analysis
        """
        # Get comprehensive column classification
        column_classification = self.column_classifier.classify_columns(df)
        
        # Get all potentially updatable columns
        all_updatable = self.column_classifier.get_all_updatable_columns(df)
        
        batch_analysis = {
            'total_columns': len(df.columns),
            'all_updatable_columns': all_updatable,
            'column_classification': column_classification,
            'updatable_count': len(all_updatable),
            'feature_engineered_count': len(column_classification['feature_engineered']),
            'basic_fields_count': len(column_classification['basic_fields']),
            'metadata_fields_count': len(column_classification['metadata_fields']),
            'unknown_fields_count': len(column_classification['unknown_fields'])
        }
        
        # If we have database access, validate against schema
        if cursor is not None:
            try:
                validation_report = self.schema_validator.validate_update_compatibility(
                    cursor, table_name, all_updatable
                )
                
                batch_analysis.update({
                    'schema_validation': validation_report,
                    'schema_compatible_columns': validation_report['updatable_columns'],
                    'schema_incompatible_columns': validation_report['skipped_columns'],
                    'final_updatable_columns': validation_report['updatable_columns']
                })
                
            except Exception as e:
                self.logger.warning(f"⚠️ Schema validation failed for batch: {str(e)}")
                batch_analysis['final_updatable_columns'] = all_updatable
                batch_analysis['schema_validation_error'] = str(e)
        else:
            batch_analysis['final_updatable_columns'] = all_updatable
        
        self.logger.info(f"📊 Batch Field Analysis:")
        self.logger.info(f"   Total columns: {batch_analysis['total_columns']}")
        self.logger.info(f"   Updatable columns: {batch_analysis['updatable_count']}")
        self.logger.info(f"   Feature-engineered: {batch_analysis['feature_engineered_count']}")
        self.logger.info(f"   Basic fields: {batch_analysis['basic_fields_count']}")
        
        return batch_analysis
    
    def validate_database_compatibility(self, fields: List[str], cursor, 
                                      table_name: str = 'phones') -> Tuple[List[str], List[str]]:
        """
        Validate which fields exist in database schema.
        
        Args:
            fields: List of field names to validate
            cursor: Database cursor
            table_name: Target table name
            
        Returns:
            Tuple of (compatible_fields, incompatible_fields)
        """
        try:
            return self.schema_validator.inspector.get_updatable_columns(
                cursor, table_name, fields
            )
        except Exception as e:
            self.logger.error(f"❌ Database compatibility validation failed: {str(e)}")
            return fields, []
    
    def get_priority_fields(self, df: pd.DataFrame) -> Dict[str, List[str]]:
        """
        Get fields organized by update priority.
        
        Args:
            df: DataFrame to analyze
            
        Returns:
            Dictionary with fields organized by priority
        """
        classification = self.column_classifier.classify_columns(df)
        
        priority_fields = {
            'high_priority': classification['feature_engineered'],  # Feature-engineered data is most important
            'medium_priority': classification['basic_fields'],     # Basic phone attributes
            'low_priority': classification['metadata_fields'],     # Pipeline metadata
            'review_required': classification['unknown_fields']    # Unknown fields need review
        }
        
        return priority_fields
    
    def generate_update_strategy(self, df: pd.DataFrame, cursor=None, 
                               table_name: str = 'phones') -> Dict[str, Any]:
        """
        Generate comprehensive update strategy with field prioritization.
        
        Args:
            df: DataFrame to analyze
            cursor: Database cursor for validation (optional)
            table_name: Target table name
            
        Returns:
            Dictionary with complete update strategy
        """
        # Get batch analysis
        batch_analysis = self.generate_batch_updatable_fields(df, cursor, table_name)
        
        # Get priority organization
        priority_fields = self.get_priority_fields(df)
        
        # Calculate statistics
        total_updatable = len(batch_analysis['final_updatable_columns'])
        feature_percentage = (batch_analysis['feature_engineered_count'] / total_updatable * 100) if total_updatable > 0 else 0
        
        update_strategy = {
            'batch_analysis': batch_analysis,
            'priority_fields': priority_fields,
            'final_updatable_columns': batch_analysis['final_updatable_columns'],
            'statistics': {
                'total_updatable_columns': total_updatable,
                'feature_engineered_percentage': round(feature_percentage, 2),
                'basic_fields_percentage': round((batch_analysis['basic_fields_count'] / total_updatable * 100) if total_updatable > 0 else 0, 2),
                'metadata_percentage': round((batch_analysis['metadata_fields_count'] / total_updatable * 100) if total_updatable > 0 else 0, 2)
            },
            'recommendations': []
        }
        
        # Generate recommendations
        if batch_analysis['feature_engineered_count'] == 0:
            update_strategy['recommendations'].append("⚠️ No feature-engineered columns detected - verify processing pipeline")
        
        if batch_analysis['unknown_fields_count'] > 0:
            update_strategy['recommendations'].append(f"🔍 Review {batch_analysis['unknown_fields_count']} unknown columns for classification")
        
        if cursor and 'schema_validation' in batch_analysis:
            schema_validation = batch_analysis['schema_validation']
            if schema_validation['skipped_count'] > 0:
                update_strategy['recommendations'].append(f"📋 Consider adding {schema_validation['skipped_count']} missing columns to database schema")
        
        self.logger.info(f"🎯 Update Strategy Generated:")
        self.logger.info(f"   Final updatable columns: {total_updatable}")
        self.logger.info(f"   Feature-engineered: {feature_percentage:.1f}%")
        self.logger.info(f"   Recommendations: {len(update_strategy['recommendations'])}")
        
        return update_strategy