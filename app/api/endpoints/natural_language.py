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
        # Call Grok-3 service to parse the query
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.GROK_SERVICE_URL}/parse-query",
                json={"query": query}
            )
            response.raise_for_status()
            filters = response.json()["filters"]

        # Use the parsed filters to get recommendations
        recommendations = phone_crud.get_smart_recommendations(
            db,
            min_performance_score=filters.get("min_performance_score"),
            min_display_score=filters.get("min_display_score"),
            min_camera_score=filters.get("min_camera_score"),
            min_storage_score=filters.get("min_storage_score"),
            min_battery_efficiency=filters.get("min_battery_efficiency"),
            max_price=filters.get("max_price")
        )

        return recommendations[:5]  # Return top 5 recommendations

    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error communicating with Grok-3 service: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing query: {str(e)}"
        ) 