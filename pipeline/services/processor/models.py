"""
Data models for the processor service.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class ProcessingStatus(str, Enum):
    """Status of processing operation."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class DataQualityReport(BaseModel):
    """Data quality assessment report."""
    
    total_records: int
    valid_records: int
    invalid_records: int
    completeness_score: float
    accuracy_score: float
    consistency_score: float
    overall_score: float
    
    # Field-level quality metrics
    field_completeness: Dict[str, float] = Field(default_factory=dict)
    field_validity: Dict[str, float] = Field(default_factory=dict)
    
    # Issues found
    missing_required_fields: List[str] = Field(default_factory=list)
    invalid_data_types: List[str] = Field(default_factory=list)
    outliers_detected: List[str] = Field(default_factory=list)
    
    # Recommendations
    recommendations: List[str] = Field(default_factory=list)


class ProcessingJob(BaseModel):
    """Model for data processing job."""
    
    job_id: str
    status: ProcessingStatus = ProcessingStatus.PENDING
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    
    # Input/Output
    input_file: str
    output_file: Optional[str] = None
    
    # Processing statistics
    records_input: int = 0
    records_processed: int = 0
    records_output: int = 0
    
    # Quality metrics
    data_quality_report: Optional[DataQualityReport] = None
    
    # Error tracking
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    
    # Configuration
    enable_feature_engineering: bool = True
    enable_data_validation: bool = True
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class FeatureEngineeringConfig(BaseModel):
    """Configuration for feature engineering."""
    
    # Price-based features
    enable_price_categories: bool = True
    enable_price_per_gb: bool = True
    
    # Display-based features
    enable_display_scores: bool = True
    enable_resolution_parsing: bool = True
    
    # Camera-based features
    enable_camera_scores: bool = True
    enable_camera_count: bool = True
    
    # Battery-based features
    enable_battery_scores: bool = True
    enable_charging_features: bool = True
    
    # Performance-based features
    enable_performance_scores: bool = True
    enable_processor_ranking: bool = True
    
    # Security-based features
    enable_security_scores: bool = True
    
    # Connectivity-based features
    enable_connectivity_scores: bool = True
    
    # Brand-based features
    enable_brand_features: bool = True
    
    # Release-based features
    enable_release_features: bool = True
    
    # Composite features
    enable_overall_scores: bool = True


class ProcessingMetrics(BaseModel):
    """Processing performance metrics."""
    
    processing_time_seconds: float = 0.0
    records_per_second: float = 0.0
    memory_usage_mb: float = 0.0
    cpu_usage_percent: float = 0.0
    
    # Feature engineering metrics
    features_created: int = 0
    features_failed: int = 0
    
    # Data transformation metrics
    transformations_applied: int = 0
    validation_checks_passed: int = 0
    validation_checks_failed: int = 0


class HealthCheck(BaseModel):
    """Health check response model."""
    
    status: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    version: str = "1.0.0"
    dependencies: Dict[str, str] = Field(default_factory=dict)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }