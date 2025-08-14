"""
Data processing service for mobile phone data.
"""

import logging
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import pandas as pd
from prometheus_client import Counter, Gauge, Histogram, start_http_server

from .config import settings
from .models import ProcessingJob, ProcessingStatus, DataQualityReport, ProcessingMetrics
from .data_cleaner import DataCleaner
from .feature_engineer import FeatureEngineer
from .data_quality import DataQualityValidator

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Prometheus metrics
processing_jobs_total = Counter('processor_jobs_total', 'Total processing jobs', ['status'])
processing_duration = Histogram('processor_duration_seconds', 'Time spent processing')
records_processed_total = Counter('processor_records_total', 'Total records processed')
data_quality_score = Gauge('processor_data_quality_score', 'Current data quality score')
active_processing_jobs = Gauge('processor_active_jobs', 'Number of active processing jobs')


class ProcessorService:
    """
    Main data processing service for mobile phone data.
    """
    
    def __init__(self):
        """Initialize the processor service."""
        self.data_cleaner = DataCleaner()
        self.feature_engineer = FeatureEngineer()
        
        # Initialize Redis connection for data quality validator
        self.redis_client = None
        self._init_redis()
        
        self.data_quality_validator = DataQualityValidator(self.redis_client)
        self.active_jobs: Dict[str, ProcessingJob] = {}
        
        # Start metrics server
        if settings.metrics_port:
            start_http_server(settings.metrics_port)
            logger.info(f"Metrics server started on port {settings.metrics_port}")
        
        logger.info("Processor service initialized")
    
    def _init_redis(self) -> None:
        """Initialize Redis connection."""
        try:
            import redis
            self.redis_client = redis.from_url(settings.redis_url)
            self.redis_client.ping()
            logger.info("Redis connection established for data quality tracking")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.redis_client = None
    
    def start_processing_job(self, input_file: str, 
                           enable_feature_engineering: bool = True,
                           enable_data_validation: bool = True) -> str:
        """
        Start a new processing job.
        
        Args:
            input_file: Path to input CSV file
            enable_feature_engineering: Whether to enable feature engineering
            enable_data_validation: Whether to enable data validation
            
        Returns:
            Job ID
        """
        job_id = str(uuid.uuid4())
        
        # Generate output filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        output_file = os.path.join(
            settings.output_directory, 
            f"processed_mobile_data_{timestamp}.csv"
        )
        
        job = ProcessingJob(
            job_id=job_id,
            input_file=input_file,
            output_file=output_file,
            enable_feature_engineering=enable_feature_engineering,
            enable_data_validation=enable_data_validation,
            start_time=datetime.utcnow()
        )
        
        self.active_jobs[job_id] = job
        active_processing_jobs.set(len(self.active_jobs))
        
        logger.info(f"Started processing job {job_id}")
        return job_id
    
    def get_job_status(self, job_id: str) -> Optional[ProcessingJob]:
        """Get status of a processing job."""
        return self.active_jobs.get(job_id)
    
    def calculate_data_quality(self, df: pd.DataFrame) -> DataQualityReport:
        """Calculate comprehensive data quality metrics."""
        logger.info("Calculating data quality metrics")
        
        total_records = len(df)
        
        # Calculate completeness for required fields
        required_fields_present = 0
        field_completeness = {}
        field_validity = {}
        
        for field in settings.min_required_fields:
            if field in df.columns:
                non_null_count = df[field].notna().sum()
                completeness = non_null_count / total_records if total_records > 0 else 0
                field_completeness[field] = completeness
                
                if completeness > 0.8:  # 80% threshold
                    required_fields_present += 1
        
        # Calculate overall completeness
        all_completeness = []
        for col in df.columns:
            non_null_count = df[col].notna().sum()
            completeness = non_null_count / total_records if total_records > 0 else 0
            field_completeness[col] = completeness
            all_completeness.append(completeness)
        
        completeness_score = sum(all_completeness) / len(all_completeness) if all_completeness else 0
        
        # Calculate validity (basic data type checks)
        validity_scores = []
        for col in df.columns:
            if col in ['price_original', 'storage_gb', 'ram_gb']:
                # Numeric fields should be positive
                if col in df.columns:
                    valid_count = (df[col] >= 0).sum()
                    validity = valid_count / total_records if total_records > 0 else 0
                    field_validity[col] = validity
                    validity_scores.append(validity)
        
        accuracy_score = sum(validity_scores) / len(validity_scores) if validity_scores else 1.0
        
        # Calculate consistency (duplicate detection)
        if 'url' in df.columns:
            unique_urls = df['url'].nunique()
            consistency_score = unique_urls / total_records if total_records > 0 else 1.0
        else:
            consistency_score = 1.0
        
        # Overall score
        overall_score = (completeness_score + accuracy_score + consistency_score) / 3
        
        # Identify issues
        missing_required_fields = [
            field for field in settings.min_required_fields 
            if field not in df.columns
        ]
        
        invalid_data_types = [
            col for col, validity in field_validity.items() 
            if validity < 0.9
        ]
        
        # Generate recommendations
        recommendations = []
        if completeness_score < 0.8:
            recommendations.append("Improve data completeness by filling missing values")
        if accuracy_score < 0.9:
            recommendations.append("Review data validation rules for numeric fields")
        if consistency_score < 0.95:
            recommendations.append("Remove duplicate records")
        
        valid_records = int(total_records * overall_score)
        invalid_records = total_records - valid_records
        
        return DataQualityReport(
            total_records=total_records,
            valid_records=valid_records,
            invalid_records=invalid_records,
            completeness_score=completeness_score,
            accuracy_score=accuracy_score,
            consistency_score=consistency_score,
            overall_score=overall_score,
            field_completeness=field_completeness,
            field_validity=field_validity,
            missing_required_fields=missing_required_fields,
            invalid_data_types=invalid_data_types,
            recommendations=recommendations
        )
    
    def run_processing_job(self, job_id: str) -> ProcessingJob:
        """
        Execute a processing job.
        
        Args:
            job_id: Job ID to execute
            
        Returns:
            Updated job object
        """
        job = self.active_jobs.get(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")
        
        try:
            job.status = ProcessingStatus.RUNNING
            
            with processing_duration.time():
                # Load input data
                logger.info(f"Job {job_id}: Loading input data from {job.input_file}")
                
                if not os.path.exists(job.input_file):
                    raise FileNotFoundError(f"Input file not found: {job.input_file}")
                
                df = pd.read_csv(job.input_file)
                job.records_input = len(df)
                
                logger.info(f"Job {job_id}: Loaded {job.records_input} records")
                
                # Data cleaning
                logger.info(f"Job {job_id}: Starting data cleaning")
                df, cleaning_issues = self.data_cleaner.clean_dataframe(df)
                job.records_processed = len(df)
                
                if cleaning_issues:
                    job.warnings.extend(cleaning_issues)
                
                # Feature engineering
                if job.enable_feature_engineering:
                    logger.info(f"Job {job_id}: Starting feature engineering")
                    df = self.feature_engineer.engineer_features(df)
                
                # Data quality assessment
                if job.enable_data_validation:
                    logger.info(f"Job {job_id}: Performing comprehensive data quality validation")
                    quality_metrics, quality_issues = self.data_quality_validator.validate_data_quality(df)
                    
                    # Convert to DataQualityReport model
                    job.data_quality_report = DataQualityReport(
                        total_records=quality_metrics["total_records"],
                        valid_records=quality_metrics["total_records"] - quality_metrics["total_issues"],
                        invalid_records=quality_metrics["total_issues"],
                        completeness_score=quality_metrics["completeness_score"],
                        accuracy_score=quality_metrics["accuracy_score"],
                        consistency_score=quality_metrics["consistency_score"],
                        overall_score=quality_metrics["overall_score"],
                        field_completeness={},  # Will be populated by validator
                        field_validity={},      # Will be populated by validator
                        missing_required_fields=[issue.column for issue in quality_issues if issue.issue_type == "completeness"],
                        invalid_data_types=[issue.column for issue in quality_issues if issue.issue_type == "format"],
                        outliers_detected=[issue.column for issue in quality_issues if issue.issue_type == "range"],
                        recommendations=self.data_quality_validator._generate_recommendations(quality_metrics, quality_issues, [])
                    )
                    
                    data_quality_score.set(job.data_quality_report.overall_score)
                
                # Save output
                logger.info(f"Job {job_id}: Saving output to {job.output_file}")
                os.makedirs(os.path.dirname(job.output_file), exist_ok=True)
                df.to_csv(job.output_file, index=False)
                job.records_output = len(df)
                
                # Update metrics
                records_processed_total.inc(job.records_processed)
                processing_jobs_total.labels(status='completed').inc()
                
                job.status = ProcessingStatus.COMPLETED
                job.end_time = datetime.utcnow()
                
                logger.info(f"Job {job_id} completed successfully")
                
        except Exception as e:
            job.status = ProcessingStatus.FAILED
            job.end_time = datetime.utcnow()
            error_msg = f"Job failed: {e}"
            job.errors.append(error_msg)
            processing_jobs_total.labels(status='failed').inc()
            logger.error(f"Job {job_id} failed: {e}")
        
        finally:
            active_processing_jobs.set(len(self.active_jobs))
        
        return job
    
    def cleanup_old_jobs(self, max_age_hours: int = 24) -> None:
        """Clean up old completed jobs."""
        from datetime import timedelta
        
        cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)
        
        jobs_to_remove = []
        for job_id, job in self.active_jobs.items():
            if (job.status in [ProcessingStatus.COMPLETED, ProcessingStatus.FAILED] and 
                job.end_time and job.end_time < cutoff_time):
                jobs_to_remove.append(job_id)
        
        for job_id in jobs_to_remove:
            del self.active_jobs[job_id]
            logger.debug(f"Cleaned up old job {job_id}")
        
        active_processing_jobs.set(len(self.active_jobs))
    
    def get_processing_stats(self) -> Dict:
        """Get processing service statistics."""
        return {
            "active_jobs": len(self.active_jobs),
            "total_jobs_completed": processing_jobs_total.labels(status='completed')._value.get(),
            "total_jobs_failed": processing_jobs_total.labels(status='failed')._value.get(),
            "total_records_processed": records_processed_total._value.get(),
            "current_data_quality_score": data_quality_score._value.get(),
            "service_config": {
                "batch_size": settings.batch_size,
                "max_workers": settings.max_workers,
                "data_quality_threshold": settings.data_quality_threshold
            }
        }
    
    def get_health_status(self) -> Dict[str, str]:
        """Get service health status."""
        status = {
            "status": "healthy",
            "data_cleaner": "active",
            "feature_engineer": "active"
        }
        
        # Check if processor rankings are loaded
        if self.feature_engineer.processor_rankings:
            status["processor_rankings"] = "loaded"
        else:
            status["processor_rankings"] = "not_loaded"
        
        return status