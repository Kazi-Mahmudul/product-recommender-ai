"""
Admin phone data management endpoints.
"""

import csv
import io
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from app.core.database import get_db
from app.models.admin import AdminUser
from app.models.phone import Phone
from app.crud.phone import get_phone, get_phones, phone_to_dict, create_phone, get_phone_by_slug, get_phone_by_name_and_brand
from app.crud.admin import activity_log_crud
from app.utils.admin_auth import get_current_active_admin, require_admin_or_moderator
from app.schemas.admin import PhoneUpdate, PhoneBulkUpdate, MessageResponse, ActivityLogCreate
from app.schemas.phone import Phone as PhoneResponse

router = APIRouter()

@router.get("/list")
async def list_phones(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None, description="Search in name, brand, or model"),
    brand: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    is_active: Optional[bool] = Query(None),
    sort_by: str = Query("created_at", description="Sort by field"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """List phones with advanced filtering and search."""
    
    query = db.query(Phone)
    
    # Apply filters
    if search:
        search_filter = or_(
            Phone.name.ilike(f"%{search}%"),
            Phone.brand.ilike(f"%{search}%"),
            Phone.model.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    if brand:
        query = query.filter(Phone.brand.ilike(f"%{brand}%"))
    
    if min_price is not None:
        query = query.filter(Phone.price_taka >= min_price)
    
    if max_price is not None:
        query = query.filter(Phone.price_taka <= max_price)
    
    if is_active is not None:
        # Assuming there's an is_active field or similar
        pass  # Add filter when field exists
    
    # Apply sorting
    if hasattr(Phone, sort_by):
        if sort_order.lower() == "desc":
            query = query.order_by(desc(getattr(Phone, sort_by)))
        else:
            query = query.order_by(getattr(Phone, sort_by))
    else:
        query = query.order_by(desc(Phone.created_at))
    
    # Get total count for pagination
    total_count = query.count()
    
    # Apply pagination
    phones = query.offset(skip).limit(limit).all()
    
    return {
        "phones": [PhoneResponse.from_orm(phone) for phone in phones],
        "total_count": total_count,
        "skip": skip,
        "limit": limit,
        "has_more": (skip + limit) < total_count
    }

@router.get("/{phone_id}")
async def get_phone_details(
    phone_id: int,
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific phone."""
    
    phone = get_phone(db, phone_id)
    if not phone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phone not found"
        )
    
    return PhoneResponse.from_orm(phone)

@router.put("/{phone_id}")
async def update_phone(
    phone_id: int,
    phone_update: PhoneUpdate,
    request: Request,
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Update phone information."""
    
    phone = get_phone(db, phone_id)
    if not phone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phone not found"
        )
    
    # Store original values for logging
    original_values = {
        "name": phone.name,
        "brand": phone.brand,
        "price_taka": phone.price_taka
    }
    
    # Update phone
    update_data = phone_update.dict(exclude_unset=True)
    # Update phone attributes directly since no update_phone function exists
    for key, value in update_data.items():
        if hasattr(phone, key):
            setattr(phone, key, value)
    db.commit()
    db.refresh(phone)
    updated_phone = phone
    
    # Log the activity
    changes = {}
    for key, new_value in update_data.items():
        if key in original_values and original_values[key] != new_value:
            changes[key] = {"from": original_values[key], "to": new_value}
    
    await log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        action="phone_update",
        resource_type="phone",
        resource_id=str(phone_id),
        details={"changes": changes, "phone_name": phone.name},
        request=request
    )
    
    return {
        "message": f"Phone '{phone.name}' updated successfully",
        "success": True,
        "phone": PhoneResponse.from_orm(updated_phone)
    }

@router.delete("/{phone_id}")
async def delete_phone(
    phone_id: int,
    request: Request,
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Delete a phone (soft delete recommended)."""
    
    phone = get_phone(db, phone_id)
    if not phone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phone not found"
        )
    
    # Store phone info for logging
    phone_info = {"name": phone.name, "brand": phone.brand, "id": phone.id}
    
    # Delete phone (actual deletion since no soft delete function exists)
    db.delete(phone)
    db.commit()
    
    # Log the activity
    await log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        action="phone_delete",
        resource_type="phone",
        resource_id=str(phone_id),
        details=phone_info,
        request=request
    )
    
    return MessageResponse(
        message=f"Phone '{phone.name}' deleted successfully",
        success=True
    )

@router.post("/bulk-update")
async def bulk_update_phones(
    bulk_update: PhoneBulkUpdate,
    request: Request,
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Bulk update multiple phones."""
    
    if not bulk_update.phone_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No phone IDs provided"
        )
    
    # Verify all phones exist
    phones = db.query(Phone).filter(Phone.id.in_(bulk_update.phone_ids)).all()
    if len(phones) != len(bulk_update.phone_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some phone IDs not found"
        )
    
    # Update all phones
    update_data = bulk_update.updates.dict(exclude_unset=True)
    updated_phones = []
    
    for phone_id in bulk_update.phone_ids:
        phone = get_phone(db, phone_id)
        if phone:
            # Update phone attributes directly
            for key, value in update_data.items():
                if hasattr(phone, key):
                    setattr(phone, key, value)
            db.commit()
            db.refresh(phone)
            updated_phones.append(phone)
    
    # Log the activity
    await log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        action="phone_bulk_update",
        resource_type="phone",
        resource_id=",".join(map(str, bulk_update.phone_ids)),
        details={
            "phone_count": len(bulk_update.phone_ids),
            "updates": update_data,
            "phone_names": [phone.name for phone in phones]
        },
        request=request
    )
    
    return {
        "message": f"Successfully updated {len(updated_phones)} phones",
        "success": True,
        "updated_count": len(updated_phones)
    }

@router.post("/upload-csv")
async def upload_phone_data(
    request: Request,
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
    file: UploadFile = File(...)
):
    """Upload phone data from CSV file."""
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV file"
        )
    
    try:
        content = await file.read()
        csv_content = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_content))
        
        created_count = 0
        updated_count = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):  # Start from row 2 (after header)
            try:
                # Validate required fields
                required_fields = ['name', 'brand', 'price_taka']
                missing_fields = [field for field in required_fields if not row.get(field)]
                
                if missing_fields:
                    errors.append(f"Row {row_num}: Missing required fields: {', '.join(missing_fields)}")
                    continue
                
                # Check if phone exists
                existing_phone = get_phone_by_name_and_brand(
                    db, row['name'], row['brand']
                )
                
                phone_data = {
                    'name': row['name'],
                    'brand': row['brand'],
                    'price_taka': float(row['price_taka']),
                    'model': row.get('model', ''),
                    # Add more fields as needed based on your Phone model
                }
                
                if existing_phone:
                    # Update existing phone
                    for key, value in phone_data.items():
                        if hasattr(existing_phone, key):
                            setattr(existing_phone, key, value)
                    db.commit()
                    db.refresh(existing_phone)
                    updated_count += 1
                else:
                    # Create new phone
                    from app.models.phone import Phone
                    new_phone = Phone(**phone_data)
                    db.add(new_phone)
                    db.commit()
                    db.refresh(new_phone)
                    created_count += 1
                    
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        # Log the activity
        await log_admin_activity(
            db=db,
            admin_id=current_admin.id,
            action="phone_csv_upload",
            resource_type="phone",
            details={
                "filename": file.filename,
                "created_count": created_count,
                "updated_count": updated_count,
                "error_count": len(errors)
            },
            request=request
        )
        
        result = {
            "message": f"CSV processed: {created_count} created, {updated_count} updated",
            "success": True,
            "created_count": created_count,
            "updated_count": updated_count,
            "error_count": len(errors)
        }
        
        if errors:
            result["errors"] = errors[:10]  # Return first 10 errors
            if len(errors) > 10:
                result["errors"].append(f"... and {len(errors) - 10} more errors")
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error processing CSV file: {str(e)}"
        )

@router.get("/export/csv")
async def export_phones_csv(
    brand: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Export phones data as CSV."""
    
    query = db.query(Phone)
    
    # Apply filters
    if brand:
        query = query.filter(Phone.brand.ilike(f"%{brand}%"))
    if min_price is not None:
        query = query.filter(Phone.price_taka >= min_price)
    if max_price is not None:
        query = query.filter(Phone.price_taka <= max_price)
    
    phones = query.all()
    
    # Create CSV content
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'id', 'name', 'brand', 'model', 'price_taka', 'created_at',
        'ram', 'storage', 'display_size', 'battery_capacity'
        # Add more fields as needed
    ])
    
    # Write data
    for phone in phones:
        writer.writerow([
            phone.id,
            phone.name,
            phone.brand,
            getattr(phone, 'model', ''),
            phone.price_taka,
            phone.created_at.isoformat() if phone.created_at else '',
            getattr(phone, 'ram', ''),
            getattr(phone, 'storage', ''),
            getattr(phone, 'display_size', ''),
            getattr(phone, 'battery_capacity', '')
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=phones_export.csv"}
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