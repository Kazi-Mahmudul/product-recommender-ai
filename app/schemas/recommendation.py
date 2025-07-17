from typing import List, Dict, Any
from pydantic import BaseModel

class SimilarityMetrics(BaseModel):
    """Metrics for different types of similarity calculations"""
    price_similarity: float
    spec_similarity: float
    score_similarity: float
    ai_similarity: float
    overall_similarity: float

class SmartRecommendation(BaseModel):
    """Smart recommendation response model for API"""
    phone: Dict[str, Any]  # Phone data as dict
    similarity_score: float
    highlights: List[str]
    badges: List[str]
    match_reasons: List[str]

class RecommendationRequest(BaseModel):
    """Request model for recommendations"""
    phone_id: int
    limit: int = 8