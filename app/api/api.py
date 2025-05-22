from fastapi import APIRouter

from app.api.endpoints import phones

api_router = APIRouter()
api_router.include_router(phones.router, prefix="/phones", tags=["phones"])

# Add more routers here as your API grows