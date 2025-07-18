"""
Script to test the recommendation service directly.
This helps identify issues with the recommendation generation process.
"""
import sys
import os
import logging
import json

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.services.recommendation_service import RecommendationService
from app.crud.phone import get_phone

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def test_recommendation_service(phone_id: int = 3):
    """Test the recommendation service for a specific phone ID"""
    db = SessionLocal()
    try:
        # Get the target phone
        target_phone = get_phone(db, phone_id)
        if not target_phone:
            logger.error(f"Phone with ID {phone_id} not found")
            return
        
        logger.info(f"Testing recommendations for phone: {target_phone.brand} {target_phone.name} (ID: {target_phone.id})")
        
        # Create recommendation service
        service = RecommendationService(db)
        
        # Get recommendations
        recommendations = service.get_smart_recommendations(phone_id, limit=8)
        
        # Print results
        logger.info(f"Generated {len(recommendations)} recommendations")
        
        for i, rec in enumerate(recommendations):
            logger.info(f"Recommendation {i+1}:")
            logger.info(f"  Phone: {rec.phone.get('brand', 'Unknown')} {rec.phone.get('name', 'Unknown')} (ID: {rec.phone.get('id', 0)})")
            logger.info(f"  Similarity Score: {rec.similarity_score:.4f}")
            logger.info(f"  Highlights: {rec.highlights}")
            logger.info(f"  Badges: {rec.badges}")
            logger.info(f"  Match Reasons: {rec.match_reasons}")
            logger.info(f"  Similarity Metrics: price={rec.similarity_metrics.price_similarity:.2f}, "
                       f"spec={rec.similarity_metrics.spec_similarity:.2f}, "
                       f"score={rec.similarity_metrics.score_similarity:.2f}, "
                       f"ai={rec.similarity_metrics.ai_similarity:.2f}")
            logger.info("---")
        
        # Test highlight generation directly
        logger.info("Testing highlight generation directly:")
        if len(recommendations) > 0:
            candidate_phone = get_phone(db, recommendations[0].phone.get('id', 0))
            if candidate_phone:
                highlights = service.highlight_generator.generate_highlights(target_phone, candidate_phone, limit=2)
                logger.info(f"Direct highlight generation result: {highlights}")
                
                # Test badge generation directly
                badges = service.badge_generator.generate_badges(candidate_phone)
                logger.info(f"Direct badge generation result: {badges}")
                
                # Test match reason generation directly
                match_reasons = service._generate_match_reasons(recommendations[0].similarity_metrics)
                logger.info(f"Direct match reason generation result: {match_reasons}")
            else:
                logger.error("Could not find candidate phone for direct testing")
        
    finally:
        db.close()

if __name__ == "__main__":
    # Use command line argument for phone ID if provided
    phone_id = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    test_recommendation_service(phone_id)