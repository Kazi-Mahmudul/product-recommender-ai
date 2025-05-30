from fastapi import APIRouter

from app.api.endpoints import phones, natural_language

api_router = APIRouter()
api_router.include_router(phones.router, prefix="/phones", tags=["phones"])
api_router.include_router(natural_language.router, prefix="/natural-language", tags=["natural-language"])

# Add more routers here as your API grows