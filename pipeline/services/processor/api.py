"""
FastAPI application for the processor service.
"""

import logging
from typing import Dict, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
import os

from .config import settings
from .models import ProcessingJob, HealthCheck
from .processor_service import ProcessorService

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Mobile Phone Data Processor Service",
    description="Data processing and feature engineering service for mobile phone data",
    version="1.0.0"
)

# Initialize processor service
processor = ProcessorService()


@app.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint."""
    health_status = processor.get_health_status()
    
    return HealthCheck(
        status=health_status["status"],
        dependencies={
            "data_cleaner": health_status["data_cleaner"],
            "feature_engineer": health_status["feature_engineer"],
            "processor_rankings": health_status["processor_rankings"]
        }
    )


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    return JSONResponse(
        content=generate_latest().decode('utf-8'),
        media_type=CONTENT_TYPE_LATEST
    )


@app.post("/process/start")
async def start_processing(
    background_tasks: BackgroundTasks,
    input_file: str,
    enable_feature_engineering: bool = True,
    enable_data_validation: bool = True
):
    """Start a new processing job."""
    try:
        # Validate input file exists
        if not os.path.exists(input_file):
            raise HTTPException(status_code=404, detail=f"Input file not found: {input_file}")
        
        job_id = processor.start_processing_job(
            input_file=input_file,
            enable_feature_engineering=enable_feature_engineering,
            enable_data_validation=enable_data_validation
        )
        
        # Run processing in background
        background_tasks.add_task(processor.run_processing_job, job_id)
        
        return {
            "job_id": job_id,
            "status": "started",
            "message": f"Processing job {job_id} started"
        }
        
    except Exception as e:
        logger.error(f"Failed to start processing job: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/process/upload")
async def upload_and_process(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    enable_feature_engineering: bool = True,
    enable_data_validation: bool = True
):
    """Upload a file and start processing."""
    try:
        # Save uploaded file
        upload_dir = os.path.join(settings.input_directory, "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, file.filename)
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Start processing
        job_id = processor.start_processing_job(
            input_file=file_path,
            enable_feature_engineering=enable_feature_engineering,
            enable_data_validation=enable_data_validation
        )
        
        # Run processing in background
        background_tasks.add_task(processor.run_processing_job, job_id)
        
        return {
            "job_id": job_id,
            "status": "started",
            "uploaded_file": file.filename,
            "message": f"File uploaded and processing job {job_id} started"
        }
        
    except Exception as e:
        logger.error(f"Failed to upload and process file: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/process/status/{job_id}")
async def get_job_status(job_id: str):
    """Get status of a processing job."""
    job = processor.get_job_status(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    return job


@app.get("/process/jobs")
async def list_jobs():
    """List all active processing jobs."""
    return {
        "jobs": list(processor.active_jobs.values()),
        "total": len(processor.active_jobs)
    }


@app.get("/process/download/{job_id}")
async def download_result(job_id: str):
    """Download the result file of a completed job."""
    job = processor.get_job_status(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    if job.status != "completed":
        raise HTTPException(status_code=400, detail=f"Job {job_id} is not completed")
    
    if not job.output_file or not os.path.exists(job.output_file):
        raise HTTPException(status_code=404, detail="Output file not found")
    
    return FileResponse(
        job.output_file,
        media_type='text/csv',
        filename=os.path.basename(job.output_file)
    )


@app.delete("/process/jobs/cleanup")
async def cleanup_jobs(max_age_hours: int = 24):
    """Clean up old completed jobs."""
    try:
        processor.cleanup_old_jobs(max_age_hours)
        return {"message": f"Cleaned up jobs older than {max_age_hours} hours"}
    except Exception as e:
        logger.error(f"Failed to cleanup jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats")
async def get_stats():
    """Get processor statistics."""
    return processor.get_processing_stats()


@app.get("/data-quality/{job_id}")
async def get_data_quality_report(job_id: str):
    """Get data quality report for a specific job."""
    job = processor.get_job_status(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    if not job.data_quality_report:
        raise HTTPException(status_code=400, detail="Data quality report not available")
    
    return job.data_quality_report


@app.post("/validate")
async def validate_data(file_path: str):
    """Validate data quality without full processing."""
    try:
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
        
        import pandas as pd
        df = pd.read_csv(file_path)
        
        # Comprehensive data quality validation
        quality_report = processor.data_quality_validator.generate_quality_report(df)
        
        return {
            "file_path": file_path,
            "records": len(df),
            "columns": len(df.columns),
            "quality_report": quality_report
        }
        
    except Exception as e:
        logger.error(f"Failed to validate data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/quality/trends")
async def get_quality_trends(days: int = 7):
    """Get data quality trends over time."""
    try:
        trends = processor.data_quality_validator.get_quality_trends(days)
        return {
            "trends": [
                {
                    "metric": trend.metric_name,
                    "current_value": trend.current_value,
                    "previous_value": trend.previous_value,
                    "trend_direction": trend.trend_direction,
                    "change_percentage": trend.change_percentage
                }
                for trend in trends
            ],
            "period_days": days
        }
    except Exception as e:
        logger.error(f"Failed to get quality trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/quality/anomalies")
async def detect_anomalies(file_path: str):
    """Detect anomalies in the specified dataset."""
    try:
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
        
        import pandas as pd
        df = pd.read_csv(file_path)
        
        anomalies = processor.data_quality_validator.detect_anomalies(df)
        
        return {
            "file_path": file_path,
            "total_records": len(df),
            "anomalies_detected": len(anomalies),
            "anomalies": anomalies
        }
        
    except Exception as e:
        logger.error(f"Failed to detect anomalies: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/quality/report/{job_id}")
async def get_comprehensive_quality_report(job_id: str):
    """Get comprehensive quality report for a specific job."""
    job = processor.get_job_status(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    if not job.output_file or not os.path.exists(job.output_file):
        raise HTTPException(status_code=404, detail="Output file not found")
    
    try:
        import pandas as pd
        df = pd.read_csv(job.output_file)
        
        comprehensive_report = processor.data_quality_validator.generate_quality_report(df)
        
        return {
            "job_id": job_id,
            "job_status": job.status,
            "output_file": job.output_file,
            "comprehensive_report": comprehensive_report
        }
        
    except Exception as e:
        logger.error(f"Failed to generate comprehensive quality report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/features/documentation")
async def get_feature_documentation():
    """Get comprehensive feature documentation."""
    try:
        documentation = processor.feature_engineer.get_feature_documentation()
        return documentation
    except Exception as e:
        logger.error(f"Failed to get feature documentation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/features/lineage/{feature_name}")
async def get_feature_lineage(feature_name: str):
    """Get lineage information for a specific feature."""
    try:
        lineage = processor.feature_engineer.get_feature_lineage(feature_name)
        return lineage
    except Exception as e:
        logger.error(f"Failed to get feature lineage: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/features/importance/{job_id}")
async def get_feature_importance(job_id: str):
    """Get feature importance scores for a specific job."""
    job = processor.get_job_status(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    if not job.output_file or not os.path.exists(job.output_file):
        raise HTTPException(status_code=404, detail="Output file not found")
    
    try:
        import pandas as pd
        df = pd.read_csv(job.output_file)
        
        importance_scores = processor.feature_engineer.version_manager.calculate_feature_importance(df)
        
        return {
            "job_id": job_id,
            "feature_importance": importance_scores,
            "total_features": len(importance_scores)
        }
        
    except Exception as e:
        logger.error(f"Failed to calculate feature importance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/features/performance-breakdown")
async def get_performance_breakdown(chipset: str, cpu: str = None, gpu: str = None, 
                                  ram_gb: float = None, ram_type: str = None,
                                  storage_gb: float = None, storage_type: str = None):
    """Get detailed performance breakdown for given specifications."""
    try:
        # Create a mock row with the provided specifications
        import pandas as pd
        row = pd.Series({
            'chipset': chipset,
            'cpu': cpu,
            'gpu': gpu,
            'ram_gb': ram_gb,
            'ram_type': ram_type,
            'storage_gb': storage_gb,
            'storage_type': storage_type
        })
        
        breakdown = processor.feature_engineer.performance_scorer.get_performance_breakdown(row)
        
        return {
            "input_specifications": {
                "chipset": chipset,
                "cpu": cpu,
                "gpu": gpu,
                "ram_gb": ram_gb,
                "ram_type": ram_type,
                "storage_gb": storage_gb,
                "storage_type": storage_type
            },
            "performance_breakdown": breakdown
        }
        
    except Exception as e:
        logger.error(f"Failed to get performance breakdown: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=settings.service_port,
        log_level=settings.log_level.lower(),
        reload=settings.debug
    )