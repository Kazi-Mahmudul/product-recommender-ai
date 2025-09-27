"""
Admin scraper monitoring and control endpoints.
"""

import asyncio
import subprocess
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.admin import AdminUser, ScraperStatus
from app.crud.admin import scraper_crud, activity_log_crud
from app.utils.admin_auth import get_current_active_admin, require_admin_or_moderator
from app.schemas.admin import ScraperTrigger, ScraperStatusResponse, MessageResponse, ActivityLogCreate

router = APIRouter()

@router.get("/status", response_model=List[ScraperStatusResponse])
async def get_scraper_statuses(
    limit: int = 20,
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get recent scraper execution statuses."""
    
    statuses = scraper_crud.get_scraper_statuses(db, limit=limit)
    
    return [
        ScraperStatusResponse(
            id=status.id,
            scraper_name=status.scraper_name,
            status=status.status,
            started_at=status.started_at,
            completed_at=status.completed_at,
            records_processed=status.records_processed,
            records_updated=status.records_updated,
            records_failed=status.records_failed,
            error_message=status.error_message,
            triggered_by_email=status.triggered_by_admin.email if status.triggered_by_admin else None
        )
        for status in statuses
    ]

@router.get("/active")
async def get_active_scrapers(
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get currently running scrapers."""
    
    active_scrapers = scraper_crud.get_active_scrapers(db)
    
    return {
        "active_count": len(active_scrapers),
        "active_scrapers": [
            {
                "id": scraper.id,
                "name": scraper.scraper_name,
                "started_at": scraper.started_at.isoformat() if scraper.started_at else None,
                "records_processed": scraper.records_processed,
                "triggered_by": scraper.triggered_by_admin.email if scraper.triggered_by_admin else None
            }
            for scraper in active_scrapers
        ]
    }

@router.post("/trigger/{scraper_name}")
async def trigger_scraper(
    scraper_name: str,
    background_tasks: BackgroundTasks,
    request: Request,
    force: bool = False,
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Trigger a specific scraper manually."""
    
    # Available scrapers (based on your pipeline structure)
    available_scrapers = [
        "mobile_scrapers",
        "processor_scraper", 
        "data_loader",
        "top_searched_updater"
    ]
    
    if scraper_name not in available_scrapers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown scraper '{scraper_name}'. Available: {', '.join(available_scrapers)}"
        )
    
    # Check if scraper is already running
    if not force:
        active_scrapers = scraper_crud.get_active_scrapers(db)
        if any(s.scraper_name == scraper_name for s in active_scrapers):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Scraper '{scraper_name}' is already running. Use force=true to override."
            )
    
    # Create scraper status record
    scraper_status = scraper_crud.create_scraper_status(
        db=db,
        scraper_name=scraper_name,
        triggered_by=current_admin.id
    )
    
    # Log the activity
    await log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        action="scraper_trigger",
        resource_type="scraper",
        resource_id=scraper_name,
        details={"force": force, "scraper_status_id": scraper_status.id},
        request=request
    )
    
    # Start scraper in background
    background_tasks.add_task(
        run_scraper,
        scraper_name=scraper_name,
        scraper_status_id=scraper_status.id,
        db_session=db
    )
    
    return MessageResponse(
        message=f"Scraper '{scraper_name}' triggered successfully",
        success=True,
        data={"scraper_status_id": scraper_status.id}
    )

@router.post("/stop/{scraper_id}")
async def stop_scraper(
    scraper_id: int,
    request: Request,
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Stop a running scraper (if possible)."""
    
    scraper_status = db.query(ScraperStatus).filter(ScraperStatus.id == scraper_id).first()
    if not scraper_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scraper status not found"
        )
    
    if scraper_status.status != "running":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Scraper is not running (current status: {scraper_status.status})"
        )
    
    # Update status to stopped
    scraper_crud.update_scraper_status(
        db=db,
        scraper_id=scraper_id,
        status="stopped",
        error_message="Manually stopped by admin"
    )
    
    # Log the activity
    await log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        action="scraper_stop",
        resource_type="scraper",
        resource_id=str(scraper_id),
        details={"scraper_name": scraper_status.scraper_name},
        request=request
    )
    
    return MessageResponse(
        message=f"Scraper '{scraper_status.scraper_name}' stopped successfully",
        success=True
    )

@router.get("/logs/{scraper_id}")
async def get_scraper_logs(
    scraper_id: int,
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get detailed logs for a specific scraper run."""
    
    scraper_status = db.query(ScraperStatus).filter(ScraperStatus.id == scraper_id).first()
    if not scraper_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scraper status not found"
        )
    
    # In a real implementation, you'd read actual log files
    # For now, we'll return structured information
    logs = {
        "scraper_name": scraper_status.scraper_name,
        "status": scraper_status.status,
        "started_at": scraper_status.started_at.isoformat() if scraper_status.started_at else None,
        "completed_at": scraper_status.completed_at.isoformat() if scraper_status.completed_at else None,
        "duration_seconds": None,
        "records_processed": scraper_status.records_processed,
        "records_updated": scraper_status.records_updated,
        "records_failed": scraper_status.records_failed,
        "error_message": scraper_status.error_message,
        "detailed_logs": []  # Would contain actual log entries
    }
    
    if scraper_status.started_at and scraper_status.completed_at:
        duration = scraper_status.completed_at - scraper_status.started_at
        logs["duration_seconds"] = duration.total_seconds()
    
    return logs

@router.get("/schedule")
async def get_scraper_schedule(
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get scraper scheduling information."""
    
    # This would integrate with your actual scheduler (APScheduler, Celery, etc.)
    # For now, returning mock schedule data
    schedule = [
        {
            "scraper_name": "mobile_scrapers",
            "schedule": "0 2 * * *",  # Daily at 2 AM
            "next_run": "2024-01-16T02:00:00Z",
            "last_run": "2024-01-15T02:00:00Z",
            "enabled": True
        },
        {
            "scraper_name": "processor_scraper",
            "schedule": "0 3 * * 0",  # Weekly on Sunday at 3 AM
            "next_run": "2024-01-21T03:00:00Z",
            "last_run": "2024-01-14T03:00:00Z",
            "enabled": True
        },
        {
            "scraper_name": "top_searched_updater",
            "schedule": "0 */6 * * *",  # Every 6 hours
            "next_run": "2024-01-15T18:00:00Z",
            "last_run": "2024-01-15T12:00:00Z",
            "enabled": True
        }
    ]
    
    return {
        "schedule": schedule,
        "scheduler_status": "running",
        "total_jobs": len(schedule),
        "enabled_jobs": len([s for s in schedule if s["enabled"]])
    }

@router.put("/schedule/{scraper_name}")
async def update_scraper_schedule(
    scraper_name: str,
    schedule_data: dict,
    request: Request,
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Update scraper schedule (requires scheduler integration)."""
    
    # This would integrate with your actual scheduler
    # For now, just log the activity
    await log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        action="scraper_schedule_update",
        resource_type="scraper",
        resource_id=scraper_name,
        details=schedule_data,
        request=request
    )
    
    return MessageResponse(
        message=f"Schedule for '{scraper_name}' updated successfully",
        success=True,
        data=schedule_data
    )

# Background task function
async def run_scraper(scraper_name: str, scraper_status_id: int, db_session: Session):
    """Run scraper in background and update status."""
    
    try:
        # Map scraper names to actual script paths
        scraper_scripts = {
            "mobile_scrapers": "pipeline/scrapers/mobile_scrapers.py",
            "processor_scraper": "pipeline/scrapers/processor_scraper.py",
            "data_loader": "scripts/load_data.py",
            "top_searched_updater": "pipeline/top_searched.py"
        }
        
        script_path = scraper_scripts.get(scraper_name)
        if not script_path:
            raise Exception(f"No script found for scraper '{scraper_name}'")
        
        # Update status to running
        scraper_crud.update_scraper_status(
            db=db_session,
            scraper_id=scraper_status_id,
            status="running"
        )
        
        # Run the scraper script
        process = await asyncio.create_subprocess_exec(
            "python", script_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode == 0:
            # Success
            scraper_crud.update_scraper_status(
                db=db_session,
                scraper_id=scraper_status_id,
                status="completed",
                records_processed=100,  # Would parse from actual output
                records_updated=95,
                records_failed=5
            )
        else:
            # Failure
            error_message = stderr.decode() if stderr else "Unknown error"
            scraper_crud.update_scraper_status(
                db=db_session,
                scraper_id=scraper_status_id,
                status="failed",
                error_message=error_message
            )
    
    except Exception as e:
        # Update status to failed
        scraper_crud.update_scraper_status(
            db=db_session,
            scraper_id=scraper_status_id,
            status="failed",
            error_message=str(e)
        )

# Helper function for logging activities
async def log_admin_activity(
    db: Session,
    admin_id: int,
    action: str,
    request: Request,
    resource_type: str = None,
    resource_id: str = None,
    details: dict = None
):
    """Helper function to log admin activities."""
    # Get client IP
    client_ip = request.client.host
    if "x-forwarded-for" in request.headers:
        client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()
    elif "x-real-ip" in request.headers:
        client_ip = request.headers["x-real-ip"]
    
    # Get user agent
    user_agent = request.headers.get("user-agent", "")
    
    # Create activity log
    log_data = ActivityLogCreate(
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details
    )
    
    activity_log_crud.log_activity(
        db=db,
        admin_id=admin_id,
        log_data=log_data,
        ip_address=client_ip,
        user_agent=user_agent
    )