#!/usr/bin/env python3
"""
Manual Runner for Top Searched Phones Pipeline
This script manually executes the top searched phones pipeline to update the top_searched table
in the database with the latest trending phone data.
"""

import os
import sys
import logging
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def run_top_searched_pipeline():
    """
    Run the top searched phones pipeline manually
    """
    try:
        logger.info("🚀 Starting manual top searched phones pipeline execution")
        logger.info(f"   Timestamp: {datetime.now().isoformat()}")
        
        # Import the top searched pipeline
        from pipeline.top_searched import TopSearchedPipeline
        
        # Get database URL from environment
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            logger.error("❌ DATABASE_URL environment variable is required")
            logger.info("Please set DATABASE_URL in your environment or .env file")
            return False
        
        logger.info("🔧 Initializing TopSearchedPipeline...")
        
        # Create and run the pipeline
        pipeline = TopSearchedPipeline(database_url=database_url)
        
        logger.info("🔍 Executing pipeline to fetch and update top searched phones...")
        pipeline.run(limit=20)  # Update top 20 searched phones
        
        logger.info("✅ Top searched phones pipeline completed successfully!")
        return True
        
    except ImportError as e:
        logger.error(f"❌ Failed to import TopSearchedPipeline: {str(e)}")
        logger.info("Make sure all required dependencies are installed")
        return False
        
    except Exception as e:
        logger.error(f"❌ Error running top searched pipeline: {str(e)}")
        logger.exception("Detailed error traceback:")
        return False

def display_top_searched_results(database_url: str):
    """
    Display the current top searched phones from the database
    """
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        
        logger.info("📊 Fetching current top searched phones from database...")
        
        # Connect to database
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get top searched phones
        cursor.execute("""
            SELECT phone_id, phone_name, brand, model, search_index, rank, created_at, updated_at
            FROM top_searched
            ORDER BY rank ASC
            LIMIT 20
        """)
        
        results = cursor.fetchall()
        
        if not results:
            logger.info("⚠️  No top searched phones found in database")
            return
        
        logger.info(f"📈 Top {len(results)} searched phones:")
        logger.info("=" * 80)
        logger.info(f"{'Rank':<6} {'Brand':<15} {'Model':<25} {'Search Index':<12}")
        logger.info("-" * 80)
        
        for row in results:
            logger.info(
                f"{row['rank']:<6} {row['brand']:<15} {row['model']:<25} {row['search_index']:<12}"
            )
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        logger.error(f"❌ Error displaying top searched results: {str(e)}")

def main():
    """
    Main execution function
    """
    logger.info("🚀 Manual Top Searched Phones Pipeline Runner")
    logger.info("=" * 50)
    
    # Load environment variables if .env file exists
    env_file_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    if os.path.exists(env_file_path):
        from dotenv import load_dotenv
        load_dotenv(env_file_path)
        logger.info("✅ Loaded environment variables from .env file")
    
    # Get database URL
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        logger.error("❌ DATABASE_URL not found in environment")
        logger.info("Please ensure you have a .env file with DATABASE_URL configured")
        sys.exit(1)
    
    # Run the pipeline
    success = run_top_searched_pipeline()
    
    if success:
        logger.info("✅ Pipeline execution completed successfully")
        # Display the results
        display_top_searched_results(database_url)
    else:
        logger.error("❌ Pipeline execution failed")
        sys.exit(1)

if __name__ == "__main__":
    main()