import logging
from typing import List, Optional, Union

from app.core.cache import Cache

logger = logging.getLogger(__name__)

class CacheInvalidationService:
    """Service for invalidating cache entries when data changes"""
    
    @staticmethod
    def invalidate_phone_recommendations(phone_id: Optional[int] = None) -> bool:
        """
        Invalidate recommendation cache for a specific phone or all phones
        
        Args:
            phone_id: ID of the phone to invalidate cache for, or None to invalidate all
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if phone_id is not None:
                # Invalidate cache for a specific phone
                pattern = f"phone:{phone_id}:recommendations:*"
                logger.info(f"Invalidating recommendation cache for phone ID {phone_id}")
            else:
                # Invalidate cache for all phones
                pattern = "phone:*:recommendations:*"
                logger.info("Invalidating recommendation cache for all phones")
                
            return Cache.delete_pattern(pattern)
        except Exception as e:
            logger.error(f"Error invalidating recommendation cache: {str(e)}")
            return False
    
    @staticmethod
    def invalidate_related_phones(phone_ids: List[int]) -> bool:
        """
        Invalidate recommendation cache for phones that might be affected by changes
        to the specified phones
        
        When a phone is updated, we need to invalidate not only its own recommendations
        but also recommendations for phones that might include the updated phone
        in their recommendations.
        
        Args:
            phone_ids: List of phone IDs that were updated
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # For now, we'll just invalidate all phone recommendations
            # In a more sophisticated implementation, we could track which phones
            # are recommended for which other phones and only invalidate those
            logger.info(f"Invalidating recommendation cache for phones related to {phone_ids}")
            return Cache.delete_pattern("phone:*:recommendations:*")
        except Exception as e:
            logger.error(f"Error invalidating related phone cache: {str(e)}")
            return False