# Enhanced Pipeline Transformation Guide

## Overview

The Enhanced Pipeline Transformation system provides comprehensive data cleaning, feature engineering, and quality validation for mobile phone data scraped from MobileDokan. This system transforms raw scraped data into rich, scored, and validated datasets ready for recommendation systems and analytics.

## Architecture

```
Raw Data → Enhanced Cleaner → Feature Engineer → Quality Validator → Database Updater → Transformed Data
                ↓
        Processor Rankings Service (NanoReview)
```

## Core Components

### 1. Enhanced Data Cleaner (`data_cleaner.py`)

**Purpose**: Comprehensive data cleaning with all transformations from the manual pipeline.

**Key Features**:
- Price data cleaning with currency symbol removal
- Storage and RAM normalization to GB
- Display metrics extraction (screen size, resolution, PPI, refresh rate)
- Camera data normalization (MP extraction, camera count)
- Battery data cleaning (capacity, charging wattage)
- SEO-friendly slug generation

**Usage**:
```python
from data_cleaner import DataCleaner

cleaner = DataCleaner()
cleaned_df, issues = cleaner.clean_dataframe(raw_df)
```

### 2. Processor Rankings Service (`processor_rankings_service.py`)

**Purpose**: Manage processor performance rankings from NanoReview for accurate performance scoring.

**Key Features**:
- Scrapes processor rankings from NanoReview SoC list
- Caches rankings with 7-day expiration
- Fuzzy processor name matching
- Company detection and normalization

**Usage**:
```python
from processor_rankings_service import ProcessorRankingsService

service = ProcessorRankingsService()
rankings_df = service.get_or_refresh_rankings()
rank = service.get_processor_rank(rankings_df, "Snapdragon 8 Gen 3")
```

### 3. Enhanced Feature Engineer (`feature_engineer.py`)

**Purpose**: Generate all derived features and scores using complete logic from manual pipeline.

**Key Features**:
- Display score (resolution, PPI, refresh rate weighted)
- Camera score (count, primary MP, selfie MP weighted)
- Battery score (capacity + charging speed)
- Performance score (processor rankings + RAM + storage)
- Connectivity score (5G, WiFi, NFC, Bluetooth)
- Security score (biometric features)
- Overall device score (weighted average)

**Scoring Weights**:
- Performance Score: 35%
- Display Score: 20%
- Camera Score: 20%
- Battery Score: 15%
- Connectivity Score: 10%

**Usage**:
```python
from feature_engineer import FeatureEngineer

engineer = FeatureEngineer()
processed_df = engineer.engineer_features(cleaned_df)
```

### 4. Data Quality Validator (`data_quality_validator.py`)

**Purpose**: Validate data completeness and quality with comprehensive reporting.

**Key Features**:
- Required fields validation
- Data range validation
- Anomaly detection (outliers, suspicious values)
- Completeness scoring
- Quality reporting with recommendations

**Usage**:
```python
from data_quality_validator import DataQualityValidator

validator = DataQualityValidator()
validation_passed, quality_report = validator.validate_pipeline_data(df)
```

### 5. Database Updater (`database_updater.py`)

**Purpose**: Efficiently update database with transformed data using batch operations.

**Key Features**:
- Schema validation
- Batch update operations (500 records per batch)
- Data type handling and conversion
- Transaction management with rollback
- Metadata and timestamp updates

**Usage**:
```python
from database_updater import DatabaseUpdater

updater = DatabaseUpdater()
success, results = updater.update_with_transaction(df, pipeline_run_id)
```

## Database Schema

### New Tables

#### processor_rankings
```sql
CREATE TABLE processor_rankings (
    id SERIAL PRIMARY KEY,
    processor_name VARCHAR(255) NOT NULL,
    processor_key VARCHAR(255) NOT NULL, -- normalized for matching
    rank INTEGER NOT NULL,
    rating DECIMAL(5,2),
    antutu10 INTEGER,
    geekbench6 INTEGER,
    cores VARCHAR(50),
    clock VARCHAR(50),
    gpu VARCHAR(255),
    company VARCHAR(100),
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(processor_key)
);
```

### Enhanced Phone Columns

**Price Features**:
- `price_original` (DECIMAL): Numeric price value
- `price_category` (VARCHAR): Budget/Mid-range/Premium/Flagship
- `price_per_gb` (DECIMAL): Price per GB of storage
- `price_per_gb_ram` (DECIMAL): Price per GB of RAM

**Display Features**:
- `screen_size_numeric` (DECIMAL): Screen size in inches
- `resolution_width` (INTEGER): Display width in pixels
- `resolution_height` (INTEGER): Display height in pixels
- `ppi_numeric` (INTEGER): Pixels per inch
- `refresh_rate_numeric` (INTEGER): Refresh rate in Hz
- `display_score` (DECIMAL): Calculated display score (0-100)

**Camera Features**:
- `camera_count` (INTEGER): Number of cameras
- `primary_camera_mp` (DECIMAL): Primary camera megapixels
- `selfie_camera_mp` (DECIMAL): Selfie camera megapixels
- `camera_score` (DECIMAL): Calculated camera score (0-100)

**Performance Features**:
- `ram_gb` (DECIMAL): RAM in GB
- `storage_gb` (DECIMAL): Storage in GB
- `processor_rank` (INTEGER): Processor ranking from NanoReview
- `performance_score` (DECIMAL): Calculated performance score (0-100)

**Battery Features**:
- `battery_capacity_numeric` (INTEGER): Battery capacity in mAh
- `charging_wattage` (DECIMAL): Fast charging wattage
- `has_fast_charging` (BOOLEAN): Fast charging support
- `has_wireless_charging` (BOOLEAN): Wireless charging support
- `battery_score` (DECIMAL): Calculated battery score (0-100)

**Overall Features**:
- `overall_device_score` (DECIMAL): Weighted overall score (0-100)
- `is_popular_brand` (BOOLEAN): Popular brand flag
- `slug` (VARCHAR): SEO-friendly URL slug
- `data_quality_score` (DECIMAL): Data completeness score (0-1)

## Configuration

### Environment Variables

```bash
# Database connection
DATABASE_URL=postgresql://user:pass@host:port/db

# Pipeline settings
PIPELINE_BATCH_SIZE=500
PIPELINE_QUALITY_THRESHOLD=0.80

# Processor rankings cache
PROCESSOR_RANKINGS_CACHE_DAYS=7
```

### Pipeline Configuration

```python
PIPELINE_CONFIG = {
    'processor': {
        'timeout': 600,
        'batch_size': 1000,
        'quality_threshold': 0.95,
    }
}
```

## Usage Examples

### Complete Pipeline Execution

```python
import pandas as pd
from data_cleaner import DataCleaner
from feature_engineer import FeatureEngineer
from data_quality_validator import DataQualityValidator
from database_updater import DatabaseUpdater

# Load raw data
raw_df = pd.read_csv('raw_mobile_data.csv')

# Step 1: Clean data
cleaner = DataCleaner()
cleaned_df, cleaning_issues = cleaner.clean_dataframe(raw_df)
print(f"Cleaning completed: {len(cleaning_issues)} issues found")

# Step 2: Engineer features
engineer = FeatureEngineer()
processed_df = engineer.engineer_features(cleaned_df)
print(f"Feature engineering completed: {len(processed_df.columns)} columns")

# Step 3: Validate quality
validator = DataQualityValidator()
validation_passed, quality_report = validator.validate_pipeline_data(processed_df)
print(f"Quality validation: {'PASSED' if validation_passed else 'FAILED'}")
print(f"Quality score: {quality_report['overall_quality_score']}")

# Step 4: Update database
updater = DatabaseUpdater()
success, results = updater.update_with_transaction(processed_df, 'run_123')
print(f"Database update: {'SUCCESS' if success else 'FAILED'}")
print(f"Records updated: {results['results']['updated']}")
```

### Individual Component Usage

#### Price Cleaning
```python
cleaner = DataCleaner()
df = cleaner.clean_price_data(df)
df = cleaner.create_price_categories(df)
df = cleaner.calculate_price_per_gb(df)
```

#### Camera Feature Extraction
```python
engineer = FeatureEngineer()
df = engineer.create_camera_features(df)

# Access individual scores
camera_score = engineer.get_camera_score(phone_series)
```

#### Performance Scoring
```python
# Get processor rankings
service = ProcessorRankingsService()
proc_df = service.get_or_refresh_rankings()

# Calculate performance score
engineer = FeatureEngineer()
perf_score = engineer.calculate_performance_score(phone_series, proc_df)
```

## Error Handling

### Graceful Degradation

The system is designed to handle errors gracefully:

1. **Missing Processor Rankings**: Uses cached rankings or fallback scoring
2. **Individual Record Failures**: Logs errors and continues processing
3. **Database Update Failures**: Implements rollback and retry logic
4. **Feature Calculation Errors**: Uses default values and logs issues

### Error Recovery

```python
try:
    processed_df = engineer.engineer_features(cleaned_df)
except Exception as e:
    logger.error(f"Feature engineering failed: {e}")
    # Fallback to basic processing
    processed_df = basic_feature_engineering(cleaned_df)
```

## Performance Optimization

### Batch Processing

```python
# Process large datasets in batches
batch_size = 500
for i in range(0, len(large_df), batch_size):
    batch = large_df.iloc[i:i + batch_size]
    processed_batch = engineer.engineer_features(batch)
    # Process batch...
```

### Memory Management

```python
# Clear intermediate DataFrames
del cleaned_df
import gc
gc.collect()
```

### Parallel Processing

```python
import multiprocessing as mp

def process_chunk(chunk):
    engineer = FeatureEngineer()
    return engineer.engineer_features(chunk)

# Split data into chunks for parallel processing
chunks = np.array_split(df, mp.cpu_count())
with mp.Pool() as pool:
    results = pool.map(process_chunk, chunks)
```

## Monitoring and Alerting

### Key Metrics

1. **Processing Speed**: Records processed per minute
2. **Data Quality**: Completeness and accuracy scores
3. **Error Rates**: Failed records and error types
4. **Resource Usage**: CPU, memory, and database load

### Quality Thresholds

- **Minimum Completeness**: 80%
- **Maximum Error Rate**: 5%
- **Processing Speed**: >10 records/second

### Alerting Setup

```python
# Quality score below threshold
if quality_report['overall_quality_score'] < 80:
    send_alert("Data quality below threshold", quality_report)

# High error rate
error_rate = results['errors'] / results['total_records']
if error_rate > 0.05:
    send_alert("High error rate detected", results)
```

## Troubleshooting

### Common Issues

1. **Processor Rankings Not Loading**
   - Check internet connection for NanoReview scraping
   - Verify cache file permissions
   - Check Selenium/Chrome installation

2. **Database Connection Errors**
   - Verify DATABASE_URL environment variable
   - Check database connectivity
   - Ensure proper permissions

3. **Memory Issues with Large Datasets**
   - Use batch processing
   - Increase available memory
   - Process in chunks

4. **Slow Performance**
   - Check database indexes
   - Optimize batch sizes
   - Use parallel processing

### Debug Mode

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Enable detailed logging
cleaner = DataCleaner()
# Will show detailed processing information
```

## Best Practices

1. **Always validate data quality** before database updates
2. **Use batch processing** for large datasets (>1000 records)
3. **Monitor processor rankings cache** and refresh regularly
4. **Implement proper error handling** with fallback mechanisms
5. **Test with sample data** before processing full datasets
6. **Monitor resource usage** during processing
7. **Keep processor rankings updated** for accurate performance scores