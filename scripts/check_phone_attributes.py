"""
Script to check and fix missing attributes in the phone database.
This helps ensure that all phones have the necessary attributes for recommendation generation.
"""
import sys
import os
import logging
from sqlalchemy import func

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.phone import Phone

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_and_fix_attributes():
    """Check for missing attributes in the phone database and fix them with default values"""
    db = SessionLocal()
    try:
        # Get total number of phones
        total_phones = db.query(func.count(Phone.id)).scalar()
        logger.info(f"Total phones in database: {total_phones}")
        
        # Check for missing display_score
        missing_display_score = db.query(func.count(Phone.id)).filter(Phone.display_score.is_(None)).scalar()
        logger.info(f"Phones missing display_score: {missing_display_score} ({missing_display_score/total_phones*100:.1f}%)")
        
        # Check for missing battery_score
        missing_battery_score = db.query(func.count(Phone.id)).filter(Phone.battery_score.is_(None)).scalar()
        logger.info(f"Phones missing battery_score: {missing_battery_score} ({missing_battery_score/total_phones*100:.1f}%)")
        
        # Check for missing camera_score
        missing_camera_score = db.query(func.count(Phone.id)).filter(Phone.camera_score.is_(None)).scalar()
        logger.info(f"Phones missing camera_score: {missing_camera_score} ({missing_camera_score/total_phones*100:.1f}%)")
        
        # Check for missing performance_score
        missing_performance_score = db.query(func.count(Phone.id)).filter(Phone.performance_score.is_(None)).scalar()
        logger.info(f"Phones missing performance_score: {missing_performance_score} ({missing_performance_score/total_phones*100:.1f}%)")
        
        # Check for missing overall_device_score
        missing_overall_score = db.query(func.count(Phone.id)).filter(Phone.overall_device_score.is_(None)).scalar()
        logger.info(f"Phones missing overall_device_score: {missing_overall_score} ({missing_overall_score/total_phones*100:.1f}%)")
        
        # Check for missing is_popular_brand
        missing_is_popular_brand = db.query(func.count(Phone.id)).filter(Phone.is_popular_brand.is_(None)).scalar()
        logger.info(f"Phones missing is_popular_brand: {missing_is_popular_brand} ({missing_is_popular_brand/total_phones*100:.1f}%)")
        
        # Check for missing price_original
        missing_price_original = db.query(func.count(Phone.id)).filter(Phone.price_original.is_(None)).scalar()
        logger.info(f"Phones missing price_original: {missing_price_original} ({missing_price_original/total_phones*100:.1f}%)")
        
        # Fix missing attributes if needed
        if input("Do you want to fix missing attributes with default values? (y/n): ").lower() == 'y':
            # Fix missing display_score
            if missing_display_score > 0:
                db.query(Phone).filter(Phone.display_score.is_(None)).update({Phone.display_score: 5.0})
                logger.info(f"Fixed {missing_display_score} phones with missing display_score")
            
            # Fix missing battery_score
            if missing_battery_score > 0:
                db.query(Phone).filter(Phone.battery_score.is_(None)).update({Phone.battery_score: 5.0})
                logger.info(f"Fixed {missing_battery_score} phones with missing battery_score")
            
            # Fix missing camera_score
            if missing_camera_score > 0:
                db.query(Phone).filter(Phone.camera_score.is_(None)).update({Phone.camera_score: 5.0})
                logger.info(f"Fixed {missing_camera_score} phones with missing camera_score")
            
            # Fix missing performance_score
            if missing_performance_score > 0:
                db.query(Phone).filter(Phone.performance_score.is_(None)).update({Phone.performance_score: 5.0})
                logger.info(f"Fixed {missing_performance_score} phones with missing performance_score")
            
            # Fix missing overall_device_score
            if missing_overall_score > 0:
                db.query(Phone).filter(Phone.overall_device_score.is_(None)).update({Phone.overall_device_score: 5.0})
                logger.info(f"Fixed {missing_overall_score} phones with missing overall_device_score")
            
            # Fix missing is_popular_brand
            if missing_is_popular_brand > 0:
                # Set is_popular_brand based on brand name
                popular_brands = ['Samsung', 'Apple', 'Xiaomi', 'Google', 'OnePlus', 'Oppo', 'Vivo', 'Realme', 'Huawei']
                for brand in popular_brands:
                    db.query(Phone).filter(
                        Phone.is_popular_brand.is_(None),
                        func.lower(Phone.brand) == func.lower(brand)
                    ).update({Phone.is_popular_brand: True})
                
                # Set remaining to False
                db.query(Phone).filter(Phone.is_popular_brand.is_(None)).update({Phone.is_popular_brand: False})
                logger.info(f"Fixed {missing_is_popular_brand} phones with missing is_popular_brand")
            
            # Commit changes
            db.commit()
            logger.info("All fixes committed to database")
            
            # Invalidate recommendation cache
            from app.services.cache_invalidation import CacheInvalidationService
            CacheInvalidationService.invalidate_phone_recommendations()
            logger.info("Recommendation cache invalidated")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_and_fix_attributes()