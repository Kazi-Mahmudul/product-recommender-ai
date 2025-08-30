#!/usr/bin/env python3
"""
Enhanced Logging System for Database Update Operations

This module provides comprehensive logging and tracking for database update operations,
with detailed field-level reporting and error analysis.
"""

import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import pandas as pd


@dataclass
class UpdateResult:
    """Comprehensive result tracking for database update operations."""
    total_records: int
    successful_updates: int
    failed_updates: int
    updated_field_counts: Dict[str, int]
    skipped_fields: List[str]
    error_details: List[Dict[str, Any]]
    execution_time_seconds: float
    feature_engineered_updates: int
    basic_field_updates: int
    metadata_updates: int


class UpdateLogger:
    """
    Enhanced logging system for database update operations with detailed field tracking.
    """
    
    def __init__(self, logger_name: str = __name__):
        self.logger = logging.getLogger(logger_name)
        self.update_session_id = None
        self.session_start_time = None
    
    def start_update_session(self, session_description: str) -> str:
        """
        Start a new update session with tracking.
        
        Args:
            session_description: Description of the update session
            
        Returns:
            Session ID for tracking
        """
        import uuid
        self.update_session_id = str(uuid.uuid4())[:8]
        self.session_start_time = datetime.now()
        
        self.logger.info(f"🚀 Starting Update Session [{self.update_session_id}]: {session_description}")
        self.logger.info(f"   Session started at: {self.session_start_time}")
        
        return self.update_session_id
    
    def log_field_update_summary(self, results: UpdateResult) -> None:
        """
        Log comprehensive summary of field update operations.
        
        Args:
            results: Update operation results
        """
        session_info = f"[{self.update_session_id}] " if self.update_session_id else ""
        
        self.logger.info(f"📊 {session_info}Field Update Summary:")
        self.logger.info(f"   Total records processed: {results.total_records}")
        self.logger.info(f"   Successful updates: {results.successful_updates}")
        self.logger.info(f"   Failed updates: {results.failed_updates}")
        self.logger.info(f"   Success rate: {(results.successful_updates / results.total_records * 100):.1f}%" if results.total_records > 0 else "N/A")
        self.logger.info(f"   Execution time: {results.execution_time_seconds:.2f} seconds")
        
        # Field category breakdown
        self.logger.info(f"   📈 Field Category Updates:")
        self.logger.info(f"      Feature-engineered fields: {results.feature_engineered_updates}")
        self.logger.info(f"      Basic phone fields: {results.basic_field_updates}")
        self.logger.info(f"      Metadata fields: {results.metadata_updates}")
        
        # Top updated fields
        if results.updated_field_counts:
            sorted_fields = sorted(results.updated_field_counts.items(), key=lambda x: x[1], reverse=True)
            self.logger.info(f"   🔝 Top Updated Fields:")
            for field, count in sorted_fields[:5]:
                percentage = (count / results.successful_updates * 100) if results.successful_updates > 0 else 0
                self.logger.info(f"      {field}: {count} updates ({percentage:.1f}%)")
        
        # Skipped fields warning
        if results.skipped_fields:
            self.logger.warning(f"⚠️ {session_info}Skipped Fields: {len(results.skipped_fields)} fields not updated")
            self.logger.warning(f"   Skipped: {results.skipped_fields[:10]}{'...' if len(results.skipped_fields) > 10 else ''}")
    
    def log_schema_compatibility_issues(self, compatibility_report: Dict[str, Any]) -> None:
        """
        Log database schema compatibility problems.
        
        Args:
            compatibility_report: Schema compatibility analysis results
        """
        session_info = f"[{self.update_session_id}] " if self.update_session_id else ""
        
        self.logger.info(f"🔍 {session_info}Schema Compatibility Report:")
        self.logger.info(f"   Compatible columns: {len(compatibility_report['compatible_columns'])}")
        self.logger.info(f"   Missing in database: {len(compatibility_report['missing_in_database'])}")
        self.logger.info(f"   Compatibility rate: {compatibility_report['compatibility_rate']:.2%}")
        
        if compatibility_report['missing_in_database']:
            self.logger.warning(f"⚠️ {session_info}Missing Database Columns:")
            missing_columns = compatibility_report['missing_in_database']
            for i in range(0, len(missing_columns), 10):
                batch = missing_columns[i:i+10]
                self.logger.warning(f"   {', '.join(batch)}")
        
        # Recommendations
        if compatibility_report.get('recommendations'):
            self.logger.info(f"💡 {session_info}Recommendations:")
            for recommendation in compatibility_report['recommendations']:
                self.logger.info(f"   {recommendation}")
    
    def log_feature_column_status(self, feature_columns: List[str], updated_columns: List[str]) -> None:
        """
        Log status of feature-engineered column updates.
        
        Args:
            feature_columns: List of feature-engineered columns available
            updated_columns: List of columns that were actually updated
        """
        session_info = f"[{self.update_session_id}] " if self.update_session_id else ""
        
        feature_set = set(feature_columns)
        updated_set = set(updated_columns)
        
        updated_features = list(feature_set & updated_set)
        missing_features = list(feature_set - updated_set)
        
        self.logger.info(f"🎯 {session_info}Feature-Engineered Column Status:")
        self.logger.info(f"   Total feature columns: {len(feature_columns)}")
        self.logger.info(f"   Successfully updated: {len(updated_features)}")
        self.logger.info(f"   Missing/skipped: {len(missing_features)}")
        self.logger.info(f"   Feature update rate: {(len(updated_features) / len(feature_columns) * 100):.1f}%" if feature_columns else "N/A")
        
        if missing_features:
            self.logger.warning(f"⚠️ {session_info}Missing Feature Columns:")
            self.logger.warning(f"   {missing_features[:10]}{'...' if len(missing_features) > 10 else ''}")
        
        if updated_features:
            self.logger.info(f"✅ {session_info}Updated Feature Columns:")
            self.logger.info(f"   {updated_features[:10]}{'...' if len(updated_features) > 10 else ''}")
    
    def log_batch_progress(self, batch_num: int, total_batches: int, batch_size: int, 
                          batch_success_count: int, batch_error_count: int) -> None:
        """
        Log progress for batch operations.
        
        Args:
            batch_num: Current batch number
            total_batches: Total number of batches
            batch_size: Size of current batch
            batch_success_count: Successful operations in this batch
            batch_error_count: Failed operations in this batch
        """
        session_info = f"[{self.update_session_id}] " if self.update_session_id else ""
        
        progress_percentage = (batch_num / total_batches * 100) if total_batches > 0 else 0
        batch_success_rate = (batch_success_count / batch_size * 100) if batch_size > 0 else 0
        
        self.logger.info(f"📦 {session_info}Batch {batch_num}/{total_batches} ({progress_percentage:.1f}%): "
                        f"{batch_success_count}/{batch_size} successful ({batch_success_rate:.1f}%)")
        
        if batch_error_count > 0:
            self.logger.warning(f"   ⚠️ {batch_error_count} errors in this batch")
    
    def log_error_details(self, error_details: List[Dict[str, Any]]) -> None:
        """
        Log detailed error information.
        
        Args:
            error_details: List of error detail dictionaries
        """
        session_info = f"[{self.update_session_id}] " if self.update_session_id else ""
        
        if not error_details:
            return
        
        self.logger.error(f"❌ {session_info}Error Details ({len(error_details)} errors):")
        
        # Group errors by type
        error_types = {}
        for error in error_details:
            error_type = error.get('type', 'unknown')
            if error_type not in error_types:
                error_types[error_type] = []
            error_types[error_type].append(error)
        
        for error_type, errors in error_types.items():
            self.logger.error(f"   {error_type}: {len(errors)} occurrences")
            
            # Show first few examples
            for i, error in enumerate(errors[:3]):
                self.logger.error(f"      Example {i+1}: {error.get('message', 'No message')}")
            
            if len(errors) > 3:
                self.logger.error(f"      ... and {len(errors) - 3} more similar errors")
    
    def log_performance_metrics(self, records_per_second: float, fields_per_second: float, 
                              memory_usage_mb: Optional[float] = None) -> None:
        """
        Log performance metrics for update operations.
        
        Args:
            records_per_second: Processing rate in records per second
            fields_per_second: Field update rate per second
            memory_usage_mb: Memory usage in MB (optional)
        """
        session_info = f"[{self.update_session_id}] " if self.update_session_id else ""
        
        self.logger.info(f"⚡ {session_info}Performance Metrics:")
        self.logger.info(f"   Records/second: {records_per_second:.2f}")
        self.logger.info(f"   Fields/second: {fields_per_second:.2f}")
        
        if memory_usage_mb is not None:
            self.logger.info(f"   Memory usage: {memory_usage_mb:.1f} MB")
    
    def end_update_session(self, final_results: Optional[UpdateResult] = None) -> None:
        """
        End the current update session and log final summary.
        
        Args:
            final_results: Final update results (optional)
        """
        if not self.update_session_id:
            return
        
        session_duration = (datetime.now() - self.session_start_time).total_seconds() if self.session_start_time else 0
        
        self.logger.info(f"🏁 Update Session [{self.update_session_id}] Complete:")
        self.logger.info(f"   Total session duration: {session_duration:.2f} seconds")
        
        if final_results:
            self.log_field_update_summary(final_results)
        
        self.update_session_id = None
        self.session_start_time = None


class FieldUpdateTracker:
    """
    Tracks field-level update statistics and provides analysis.
    """
    
    def __init__(self):
        self.field_stats = {}
        self.error_stats = {}
        self.category_stats = {
            'feature_engineered': 0,
            'basic_fields': 0,
            'metadata': 0,
            'unknown': 0
        }
    
    def track_field_update(self, field_name: str, category: str = 'unknown') -> None:
        """
        Track a successful field update.
        
        Args:
            field_name: Name of the updated field
            category: Category of the field (feature_engineered, basic_fields, etc.)
        """
        if field_name not in self.field_stats:
            self.field_stats[field_name] = 0
        self.field_stats[field_name] += 1
        
        if category in self.category_stats:
            self.category_stats[category] += 1
    
    def track_field_error(self, field_name: str, error_message: str) -> None:
        """
        Track a field update error.
        
        Args:
            field_name: Name of the field that failed to update
            error_message: Error message
        """
        if field_name not in self.error_stats:
            self.error_stats[field_name] = []
        self.error_stats[field_name].append(error_message)
    
    def get_update_summary(self) -> Dict[str, Any]:
        """
        Get comprehensive update summary.
        
        Returns:
            Dictionary with update statistics
        """
        total_updates = sum(self.field_stats.values())
        total_errors = sum(len(errors) for errors in self.error_stats.values())
        
        return {
            'total_field_updates': total_updates,
            'total_field_errors': total_errors,
            'unique_fields_updated': len(self.field_stats),
            'unique_fields_with_errors': len(self.error_stats),
            'field_update_counts': dict(self.field_stats),
            'field_error_counts': {field: len(errors) for field, errors in self.error_stats.items()},
            'category_stats': dict(self.category_stats),
            'success_rate': (total_updates / (total_updates + total_errors) * 100) if (total_updates + total_errors) > 0 else 0
        }
    
    def reset(self) -> None:
        """Reset all tracking statistics."""
        self.field_stats.clear()
        self.error_stats.clear()
        for key in self.category_stats:
            self.category_stats[key] = 0