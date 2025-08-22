import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import SessionLocal
from app.models.top_searched import TopSearchedPhone

def test_pipeline():
    print("Testing top searched phones pipeline...")
    db = SessionLocal()
    try:
        count = db.query(TopSearchedPhone).count()
        print(f"Found {count} records in top_searched table")
        if count > 0:
            top_phones = db.query(TopSearchedPhone).order_by(TopSearchedPhone.rank).limit(5).all()
            print("\nTop 5 searched phones:")
            for phone in top_phones:
                print(f"  {phone.rank}. {phone.brand} {phone.model} (Index: {phone.search_index:.2f})")
            print("\nPipeline test PASSED")
            return True
        else:
            print("Pipeline test FAILED: No data found in top_searched table")
            return False
    except Exception as e:
        print(f"Pipeline test FAILED with error: {str(e)}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    test_pipeline()