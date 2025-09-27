from fastapi import APIRouter

from app.api.endpoints import phones, natural_language, auth, comparison, chat
from app.api.endpoints import top_searched
from app.api.endpoints import admin_auth, admin_dashboard, admin_phones, admin_scrapers, admin_management
# from app.api import health  # Health check moved to main.py

api_router = APIRouter()
api_router.include_router(phones.router, prefix="/phones", tags=["phones"])
api_router.include_router(natural_language.router, prefix="/natural-language", tags=["natural-language"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(comparison.router, prefix="/comparison", tags=["comparison"])
api_router.include_router(top_searched.router, prefix="/top-searched", tags=["top-searched"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat", "rag-pipeline"])

# Admin panel endpoints
api_router.include_router(admin_auth.router, prefix="/admin/auth", tags=["admin-auth"])
api_router.include_router(admin_dashboard.router, prefix="/admin/dashboard", tags=["admin-dashboard"])
api_router.include_router(admin_phones.router, prefix="/admin/phones", tags=["admin-phones"])
api_router.include_router(admin_scrapers.router, prefix="/admin/scrapers", tags=["admin-scrapers"])
api_router.include_router(admin_management.router, prefix="/admin", tags=["admin-management"])
# api_router.include_router(health.router, tags=["health"])  # Health check moved to main.py

# Add more routers here as your API grows