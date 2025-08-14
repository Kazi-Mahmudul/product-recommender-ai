"""
Pipeline-specific SQLAlchemy models for data pipeline tracking
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Numeric, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class PipelineRun(Base):
    """Track pipeline execution runs"""
    __tablename__ = "pipeline_runs"

    id = Column(Integer, primary_key=True, index=True)
    dag_id = Column(String(100), nullable=False, index=True)
    run_id = Column(String(255), nullable=False, index=True)
    execution_date = Column(DateTime, nullable=False, index=True)
    started_at = Column(DateTime)
    ended_at = Column(DateTime)
    status = Column(String(50), default='running', index=True)
    records_scraped = Column(Integer, default=0)
    records_processed = Column(Integer, default=0)
    records_synced = Column(Integer, default=0)
    quality_score = Column(Numeric(3, 2))
    error_message = Column(Text)
    run_metadata = Column(JSONB)

    # Relationships
    quality_metrics = relationship("DataQualityMetric", back_populates="pipeline_run")

    def __repr__(self):
        return f"<PipelineRun {self.dag_id}:{self.run_id}>"


class PriceTracking(Base):
    """Track price history for phones"""
    __tablename__ = "price_tracking"

    id = Column(Integer, primary_key=True, index=True)
    phone_id = Column(Integer, ForeignKey("phones.id", ondelete="CASCADE"), nullable=False, index=True)
    price_text = Column(String(1024))  # Original price text from scraping
    price_numeric = Column(Numeric(10, 2))  # Parsed numeric price
    currency = Column(String(3), default='BDT')
    source_url = Column(Text)
    data_source = Column(String(100), index=True)  # Which website
    recorded_at = Column(DateTime, index=True)
    pipeline_run_id = Column(String(255), index=True)
    availability_status = Column(String(50))
    is_official_price = Column(Boolean, default=False)
    price_change_from_previous = Column(Numeric(10, 2))

    # Relationship
    phone = relationship("Phone")

    def __repr__(self):
        return f"<PriceTracking phone_id={self.phone_id} price={self.price_numeric}>"


class DataQualityMetric(Base):
    """Track data quality metrics for pipeline runs"""
    __tablename__ = "data_quality_metrics"

    id = Column(Integer, primary_key=True, index=True)
    pipeline_run_id = Column(String(255), nullable=False, index=True)
    table_name = Column(String(100), nullable=False, index=True)
    metric_name = Column(String(100), nullable=False, index=True)
    metric_value = Column(Numeric(10, 4))
    threshold_value = Column(Numeric(10, 4))
    passed = Column(Boolean)
    details = Column(JSONB)
    measured_at = Column(DateTime)

    # Relationship (Note: This assumes pipeline_run_id matches PipelineRun.run_id)
    pipeline_run = relationship("PipelineRun", back_populates="quality_metrics")

    def __repr__(self):
        return f"<DataQualityMetric {self.table_name}.{self.metric_name}>"


class ScrapingSource(Base):
    """Track scraping sources and their statistics"""
    __tablename__ = "scraping_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    base_url = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, index=True)
    last_scraped_at = Column(DateTime, index=True)
    scraping_frequency_hours = Column(Integer, default=24)
    success_rate = Column(Numeric(5, 2), default=100.00)
    total_requests = Column(Integer, default=0)
    successful_requests = Column(Integer, default=0)
    configuration = Column(JSONB)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

    def __repr__(self):
        return f"<ScrapingSource {self.name}>"