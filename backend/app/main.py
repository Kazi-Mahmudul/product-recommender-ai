from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

app = FastAPI(title="PickBD API")

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class QueryRequest(BaseModel):
    query: str

class Phone(BaseModel):
    id: int
    name: str
    brand: str
    price: str
    ram: int
    internal_storage: int
    display_size: float
    battery: int
    camera_score: float
    performance_score: float
    display_score: float
    security_score: float
    connectivity_score: float

@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy"}

def build_query(filters: Dict[str, Any]) -> str:
    """Build SQL query based on filters."""
    conditions = []
    params = {}
    
    if "price_max" in filters:
        conditions.append("price_original <= :price_max")
        params["price_max"] = filters["price_max"]
    
    if "price_min" in filters:
        conditions.append("price_original >= :price_min")
        params["price_min"] = filters["price_min"]
    
    if "ram" in filters:
        conditions.append("ram = :ram")
        params["ram"] = filters["ram"]
    
    if "brand" in filters:
        conditions.append("LOWER(brand) = LOWER(:brand)")
        params["brand"] = filters["brand"]
    
    if "limit" in filters:
        limit = filters["limit"]
    else:
        limit = 5  # Default limit
    
    query = "SELECT * FROM phones"
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += f" LIMIT {limit}"
    
    return query, params

@app.post("/api/v1/natural-language/query", response_model=List[Phone])
async def natural_language_query(request: QueryRequest):
    try:
        # Forward the query to the Gemini service
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.GEMINI_SERVICE_URL}/parse-query",
                json={"query": request.query},
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Error from Gemini service: {response.text}"
                )
            
            # Get the parsed filters from Gemini service
            response_data = response.json()
            
            if "filters" not in response_data:
                raise HTTPException(
                    status_code=500,
                    detail="Invalid response format from Gemini service"
                )
            
            filters = response_data["filters"]
            
            # Build and execute the database query
            query, params = build_query(filters)
            db = SessionLocal()
            try:
                result = db.execute(text(query), params)
                phones = result.fetchall()
                
                if not phones:
                    return []
                
                # Convert to Phone objects
                return [
                    Phone(
                        id=phone.id,
                        name=phone.name,
                        brand=phone.brand,
                        price=phone.price,
                        ram=phone.ram,
                        internal_storage=phone.internal_storage,
                        display_size=phone.display_size,
                        battery=phone.battery,
                        camera_score=phone.camera_score,
                        performance_score=phone.performance_score,
                        display_score=phone.display_score,
                        security_score=phone.security_score,
                        connectivity_score=phone.connectivity_score
                    )
                    for phone in phones
                ]
            finally:
                db.close()
            
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error communicating with Gemini service: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        ) 