from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os

app = FastAPI(title="PickBD API")

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get Gemini service URL from environment variable
GEMINI_SERVICE_URL = os.getenv("GEMINI_SERVICE_URL", "http://localhost:3000")

class QueryRequest(BaseModel):
    query: str

class Phone(BaseModel):
    id: int
    name: str
    brand: str
    price: float
    ram: int
    internal_storage: int
    display_size: float
    battery: int
    camera_score: float
    performance_score: float
    display_score: float
    storage_score: float
    battery_efficiency: float

@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/v1/natural-language/query", response_model=List[Phone])
async def natural_language_query(request: QueryRequest):
    try:
        # Forward the query to the Gemini service
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{GEMINI_SERVICE_URL}/parse-query",
                json={"query": request.query},
                timeout=30.0  # Add timeout
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
            
            # TODO: Use these filters to query your database
            # For now, return mock data
            return [
                Phone(
                    id=1,
                    name="Sample Phone",
                    brand="Sample Brand",
                    price=20000.0,
                    ram=8,
                    internal_storage=128,
                    display_size=6.5,
                    battery=5000,
                    camera_score=8.5,
                    performance_score=8.0,
                    display_score=8.0,
                    storage_score=8.0,
                    battery_efficiency=8.0
                )
            ]
            
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