from fastapi import APIRouter

from app.api.endpoints import phones, natural_language, auth, comparison, chat
from app.api.endpoints import top_searched, admin
# from app.api import health  # Health check moved to main.py

api_router = APIRouter()
api_router.include_router(phones.router, prefix="/phones", tags=["phones"])
api_router.include_router(natural_language.router, prefix="/natural-language", tags=["natural-language"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(comparison.router, prefix="/comparison", tags=["comparison"])
api_router.include_router(top_searched.router, prefix="/top-searched", tags=["top-searched"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat", "rag-pipeline"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])

# Add more routers here as your API grows