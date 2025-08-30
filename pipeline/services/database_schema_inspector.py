#!/usr/bin/env python3
"""
Database Schema Inspector for Column Compatibility Validation

This module provides database schema inspection capabilities to validate
column compatibility between DataFrames and database tables.
"""

import logging
from typing import Dict, List, Tuple, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor


class DatabaseSchemaInspector:
    """
    Inspects database schema and validates column compatibility for updates.
    """
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.logger = logging.getLogger(__name__)
        self._schema_cache = {}  # Cache schema information
    
    def get_table_columns(self, cursor, table_name: str) -> List[str]:
        """
        Get list of columns available in the target table.
        
        Args:
            cursor: Database cursor
            table_name: Name of the table to inspect
            
        Returns:
            List of column names in the table
        """
        if table_name in self._schema_cache:
            return self._schema_cache[table_name]['columns']
        
        try:
            # Query PostgreSQL information_schema for column information
            query = """
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = %s 
            ORDER BY ordinal_position
            """
            
            cursor.execute(query, (table_name,))
            columns_info = cursor.fetchall()
            
            if not columns_info:
                self.logger.warning(f"⚠️ No columns found for table '{table_name}'")
                return []
            
            columns = [col['column_name'] for col in columns_info]
            
            # Cache the schema information
            self._schema_cache[table_name] = {
                'columns': columns,
                'column_details': {col['column_name']: col for col in columns_info}
            }
            
            self.logger.info(f"📋 Retrieved {len(columns)} columns from table '{table_name}'")
            return columns
            
        except Exception as e:
            self.logger.error(f"❌ Failed to get table columns for '{table_name}': {str(e)}")
            return []
    
    def get_column_details(self, cursor, table_name: str) -> Dict[str, Dict[str, Any]]:
        """
        Get detailed column information including data types and constraints.
        
        Args:
            cursor: Database cursor
            table_name: Name of the table to inspect
            
        Returns:
            Dictionary mapping column names to their details
        """
        # Ensure we have the schema cached
        self.get_table_columns(cursor, table_name)
        
        if table_name in self._schema_cache:
            return self._schema_cache[table_name]['column_details']
        
        return {}
    
    def validate_column_compatibility(self, df_columns: List[str], db_columns: List[str]) -> Dict[str, Any]:
        """
        Check compatibility between DataFrame columns and database schema.
        
        Args:
            df_columns: List of DataFrame column names
            db_columns: List of database column names
            
        Returns:
            Dictionary with compatibility analysis results
        """
        df_columns_set = set(df_columns)
        db_columns_set = set(db_columns)
        
        # Find compatible and incompatible columns
        compatible_columns = list(df_columns_set & db_columns_set)
        missing_in_db = list(df_columns_set - db_columns_set)
        extra_in_db = list(db_columns_set - df_columns_set)
        
        compatibility_report = {
            'compatible_columns': sorted(compatible_columns),
            'missing_in_database': sorted(missing_in_db),
            'extra_in_database': sorted(extra_in_db),
            'total_df_columns': len(df_columns),
            'total_db_columns': len(db_columns),
            'compatibility_rate': len(compatible_columns) / len(df_columns) if df_columns else 0.0
        }
        
        self.logger.info(f"🔍 Column Compatibility Analysis:")
        self.logger.info(f"   Compatible columns: {len(compatible_columns)}")
        self.logger.info(f"   Missing in database: {len(missing_in_db)}")
        self.logger.info(f"   Compatibility rate: {compatibility_report['compatibility_rate']:.2%}")
        
        if missing_in_db:
            self.logger.warning(f"⚠️ Columns missing in database: {missing_in_db[:10]}{'...' if len(missing_in_db) > 10 else ''}")
        
        return compatibility_report
    
    def get_updatable_columns(self, cursor, table_name: str, df_columns: List[str]) -> Tuple[List[str], List[str]]:
        """
        Get lists of updatable and skipped columns based on database schema.
        
        Args:
            cursor: Database cursor
            table_name: Name of the target table
            df_columns: List of DataFrame column names
            
        Returns:
            Tuple of (updatable_columns, skipped_columns)
        """
        db_columns = self.get_table_columns(cursor, table_name)
        compatibility_report = self.validate_column_compatibility(df_columns, db_columns)
        
        updatable_columns = compatibility_report['compatible_columns']
        skipped_columns = compatibility_report['missing_in_database']
        
        return updatable_columns, skipped_columns
    
    def validate_data_types(self, cursor, table_name: str, df_columns: List[str]) -> Dict[str, Any]:
        """
        Validate data type compatibility between DataFrame and database columns.
        
        Args:
            cursor: Database cursor
            table_name: Name of the target table
            df_columns: List of DataFrame column names to validate
            
        Returns:
            Dictionary with data type validation results
        """
        column_details = self.get_column_details(cursor, table_name)
        
        type_validation = {
            'validated_columns': [],
            'type_warnings': [],
            'nullable_columns': [],
            'non_nullable_columns': []
        }
        
        for column in df_columns:
            if column in column_details:
                col_info = column_details[column]
                type_validation['validated_columns'].append(column)
                
                # Check nullable constraints
                if col_info['is_nullable'] == 'YES':
                    type_validation['nullable_columns'].append(column)
                else:
                    type_validation['non_nullable_columns'].append(column)
                
                # Log potential type issues for common problematic types
                data_type = col_info['data_type'].lower()
                if data_type in ['json', 'jsonb', 'array']:
                    type_validation['type_warnings'].append({
                        'column': column,
                        'type': data_type,
                        'warning': f'Complex data type {data_type} may require special handling'
                    })
        
        if type_validation['type_warnings']:
            self.logger.warning(f"⚠️ Data type warnings for {len(type_validation['type_warnings'])} columns")
        
        return type_validation
    
    def clear_cache(self):
        """Clear the schema cache to force fresh schema inspection."""
        self._schema_cache.clear()
        self.logger.info("🗑️ Schema cache cleared")


class SchemaCompatibilityValidator:
    """
    High-level validator that combines schema inspection with compatibility checking.
    """
    
    def __init__(self, database_url: str):
        self.inspector = DatabaseSchemaInspector(database_url)
        self.logger = logging.getLogger(__name__)
    
    def validate_update_compatibility(self, cursor, table_name: str, df_columns: List[str]) -> Dict[str, Any]:
        """
        Perform comprehensive compatibility validation for database updates.
        
        Args:
            cursor: Database cursor
            table_name: Target table name
            df_columns: DataFrame columns to validate
            
        Returns:
            Comprehensive validation report
        """
        self.logger.info(f"🔍 Validating update compatibility for table '{table_name}'")
        
        # Get updatable and skipped columns
        updatable_columns, skipped_columns = self.inspector.get_updatable_columns(
            cursor, table_name, df_columns
        )
        
        # Validate data types for updatable columns
        type_validation = self.inspector.validate_data_types(
            cursor, table_name, updatable_columns
        )
        
        # Create comprehensive report
        validation_report = {
            'table_name': table_name,
            'total_df_columns': len(df_columns),
            'updatable_columns': updatable_columns,
            'skipped_columns': skipped_columns,
            'updatable_count': len(updatable_columns),
            'skipped_count': len(skipped_columns),
            'success_rate': len(updatable_columns) / len(df_columns) if df_columns else 0.0,
            'type_validation': type_validation,
            'recommendations': []
        }
        
        # Generate recommendations
        if skipped_columns:
            validation_report['recommendations'].append(
                f"Consider adding {len(skipped_columns)} missing columns to database schema"
            )
        
        if type_validation['type_warnings']:
            validation_report['recommendations'].append(
                f"Review {len(type_validation['type_warnings'])} columns with complex data types"
            )
        
        self.logger.info(f"✅ Validation complete: {validation_report['updatable_count']}/{validation_report['total_df_columns']} columns updatable")
        
        return validation_report