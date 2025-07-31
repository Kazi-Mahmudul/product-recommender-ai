from fastapi import APIRouter

from app.api.endpoints import phones, natural_language, auth, monitoring, comparison

api_router = APIRouter()
api_router.include_router(phones.router, prefix="/phones", tags=["phones"])
api_router.include_router(natural_language.router, prefix="/natural-language", tags=["natural-language"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(monitoring.router, prefix="/monitoring", tags=["monitoring"])
api_router.include_router(comparison.router, prefix="/comparison", tags=["comparison"])

# Add more routers here as your API grows