from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
import os

from app.crud import phone as phone_crud
from app.schemas.phone import Phone
from app.core.database import get_db
from app.core.config import settings

router = APIRouter()

@router.post("/query", response_model=List[Phone])
async def process_natural_language_query(
    query: str,
    db: Session = Depends(get_db)
):
    """
    Process a natural language query and return relevant phone recommendations
    """
    try:
        # Call Gemini service to parse the query
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.GEMINI_SERVICE_URL}/parse-query",
                json={"query": query}
            )
            response.raise_for_status()
            filters = response.json()["filters"]

        # If user requests full specification, return all columns for the matched phone
        if filters.get("full_spec") and filters.get("name"):
            from app.models.phone import Phone as PhoneModel
            import logging
            logging.warning(f"Full spec query: filters={filters}")
            phone = db.query(PhoneModel).filter(PhoneModel.name.ilike(f"%{filters['name']}%"))
            results = phone.all()
            logging.warning(f"Full spec DB results count: {len(results)}")
            if not results:
                # Try matching by model as fallback
                if hasattr(PhoneModel, 'model'):
                    phone = db.query(PhoneModel).filter(PhoneModel.model.ilike(f"%{filters['name']}%"))
                    results = phone.all()
                    logging.warning(f"Full spec fallback by model results count: {len(results)}")
            return results

        # Use the parsed filters to get recommendations
        recommendations = phone_crud.get_smart_recommendations(
            db=db,
            min_display_score=filters.get("min_display_score"),
            min_camera_score=filters.get("min_camera_score"),
            min_battery_score=filters.get("min_battery_score"),
            max_price=filters.get("max_price"),
            min_ram_gb=filters.get("min_ram_gb"),
            brand=filters.get("brand"),
            limit=filters.get("limit")
        )

        # If limit is not specified in the query but we have results, return top 5 by default
        if filters.get("limit") is None and recommendations:
            return recommendations[:5]
        return recommendations

    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error communicating with Gemini service: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing query: {str(e)}"
        )