from fastapi import APIRouter

from app.api.endpoints import phones, natural_language, auth, comparison, chat, analytics
from app.api.endpoints import top_searched, admin, reviews, admin_auth, admin_users, admin_phones, admin_comparisons, admin_analytics, admin_settings
from app.api.endpoints import auth_health  # Health check for auth system

api_router = APIRouter()
api_router.include_router(phones.router, prefix="/phones", tags=["phones"])
api_router.include_router(natural_language.router, prefix="/natural-language", tags=["natural-language"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(auth_health.router, prefix="/auth", tags=["authentication"])
api_router.include_router(comparison.router, prefix="/comparison", tags=["comparison"])
api_router.include_router(top_searched.router, prefix="/top-searched", tags=["top-searched"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat", "rag-pipeline"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(admin_auth.router, prefix="/admin/auth", tags=["admin-auth"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])

api_router.include_router(admin_users.router, prefix="/admin/users", tags=["admin-users"])
api_router.include_router(admin_phones.router, prefix="/admin/phones", tags=["admin-phones"])
api_router.include_router(admin_comparisons.router, prefix="/admin/comparisons", tags=["admin-comparisons"])
api_router.include_router(admin_analytics.router, prefix="/admin/analytics", tags=["admin-analytics"])
api_router.include_router(admin_settings.router, prefix="/admin", tags=["admin-settings"])

# Add more routers here as your API grows