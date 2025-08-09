"""
Deployment script for contextual query system database migrations
"""

import logging
import sys
import os
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from alembic.config import Config
from alembic import command
import time

# Add the app directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ContextualMigrationDeployer:
    """Deploy contextual query system database migrations"""
    
    def __init__(self, database_url: str = None):
        """Initialize migration deployer"""
        self.database_url = database_url or settings.DATABASE_URL
        self.engine = create_engine(self.database_url)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        
        # Set up Alembic configuration
        self.alembic_cfg = Config("alembic.ini")
        self.alembic_cfg.set_main_option("sqlalchemy.url", self.database_url)
    
    def check_database_connection(self) -> bool:
        """Check if database connection is working"""
        try:
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Database connection successful")
            return True
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            return False
    
    def check_existing_schema(self) -> dict:
        """Check existing database schema"""
        with self.SessionLocal() as db:
            try:
                # Check if phones table exists
                phones_exists = db.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'phones'
                    )
                """)).scalar()
                
                # Check if alembic_version table exists
                alembic_exists = db.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'alembic_version'
                    )
                """)).scalar()
                
                # Get current alembic version if exists
                current_version = None
                if alembic_exists:
                    current_version = db.execute(text("""
                        SELECT version_num FROM alembic_version LIMIT 1
                    """)).scalar()
                
                # Count existing tables
                table_count = db.execute(text("""
                    SELECT COUNT(*) FROM information_schema.tables 
                    WHERE table_schema = 'public'
                """)).scalar()
                
                return {
                    'phones_table_exists': phones_exists,
                    'alembic_initialized': alembic_exists,
                    'current_version': current_version,
                    'total_tables': table_count
                }
                
            except Exception as e:
                logger.error(f"Error checking existing schema: {e}")
                return {'error': str(e)}
    
    def backup_database(self) -> bool:
        """Create a database backup before migration"""
        try:
            import subprocess
            from urllib.parse import urlparse
            
            # Parse database URL
            parsed = urlparse(self.database_url)
            
            # Create backup filename with timestamp
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            backup_filename = f"backup_before_contextual_migration_{timestamp}.sql"
            
            # Build pg_dump command
            cmd = [
                "pg_dump",
                "-h", parsed.hostname,
                "-p", str(parsed.port or 5432),
                "-U", parsed.username,
                "-d", parsed.path.lstrip('/'),
                "-f", backup_filename,
                "--verbose"
            ]
            
            # Set password environment variable
            env = os.environ.copy()
            if parsed.password:
                env['PGPASSWORD'] = parsed.password
            
            # Run backup
            logger.info(f"Creating database backup: {backup_filename}")
            result = subprocess.run(cmd, env=env, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info(f"Database backup created successfully: {backup_filename}")
                return True
            else:
                logger.error(f"Backup failed: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Error creating backup: {e}")
            return False
    
    def run_contextual_migrations(self) -> bool:
        """Run all contextual query system migrations"""
        try:
            logger.info("Starting contextual query system migrations...")
            
            # Check if Alembic is initialized
            schema_info = self.check_existing_schema()
            
            if not schema_info.get('alembic_initialized', False):
                logger.info("Initializing Alembic...")
                command.stamp(self.alembic_cfg, "head")
            
            # Run migrations
            logger.info("Running database migrations...")
            command.upgrade(self.alembic_cfg, "head")
            
            logger.info("Contextual query system migrations completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error running migrations: {e}")
            return False
    
    def verify_migrations(self) -> dict:
        """Verify that migrations were applied correctly"""
        with self.SessionLocal() as db:
            verification_results = {}
            
            try:
                # Check if new tables exist
                tables_to_check = [
                    'phone_aliases',
                    'conversation_sessions',
                    'conversation_context',
                    'query_history',
                    'contextual_references',
                    'user_preferences',
                    'query_metrics',
                    'performance_metrics',
                    'system_health_snapshots',
                    'error_tracking'
                ]
                
                for table in tables_to_check:
                    exists = db.execute(text(f"""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name = '{table}'
                        )
                    """)).scalar()
                    verification_results[f'{table}_exists'] = exists
                
                # Check if new indexes exist
                indexes_to_check = [
                    'idx_phones_name_fuzzy',
                    'idx_phones_brand_fuzzy',
                    'idx_phone_aliases_alias_lower',
                    'idx_conversation_context_session_relevance',
                    'idx_query_metrics_created_status'
                ]
                
                for index in indexes_to_check:
                    exists = db.execute(text(f"""
                        SELECT EXISTS (
                            SELECT FROM pg_indexes 
                            WHERE indexname = '{index}'
                        )
                    """)).scalar()
                    verification_results[f'{index}_exists'] = exists
                
                # Check if phone_aliases table has data
                if verification_results.get('phone_aliases_exists', False):
                    alias_count = db.execute(text("""
                        SELECT COUNT(*) FROM phone_aliases
                    """)).scalar()
                    verification_results['phone_aliases_count'] = alias_count
                
                # Get final table count
                final_table_count = db.execute(text("""
                    SELECT COUNT(*) FROM information_schema.tables 
                    WHERE table_schema = 'public'
                """)).scalar()
                verification_results['final_table_count'] = final_table_count
                
                return verification_results
                
            except Exception as e:
                logger.error(f"Error verifying migrations: {e}")
                return {'error': str(e)}
    
    def optimize_after_migration(self) -> bool:
        """Run optimization after migrations"""
        try:
            logger.info("Running post-migration optimizations...")
            
            with self.SessionLocal() as db:
                # Update table statistics
                tables = [
                    'phones', 'phone_aliases', 'conversation_sessions',
                    'conversation_context', 'query_history', 'query_metrics'
                ]
                
                for table in tables:
                    try:
                        db.execute(text(f"ANALYZE {table}"))
                        logger.info(f"Updated statistics for {table}")
                    except Exception as e:
                        logger.warning(f"Could not analyze {table}: {e}")
                
                db.commit()
            
            logger.info("Post-migration optimizations completed")
            return True
            
        except Exception as e:
            logger.error(f"Error in post-migration optimization: {e}")
            return False
    
    def deploy(self, create_backup: bool = True) -> bool:
        """Deploy all contextual query system migrations"""
        logger.info("Starting contextual query system deployment...")
        
        # Check database connection
        if not self.check_database_connection():
            logger.error("Cannot connect to database. Deployment aborted.")
            return False
        
        # Check existing schema
        schema_info = self.check_existing_schema()
        logger.info(f"Current schema info: {schema_info}")
        
        # Create backup if requested
        if create_backup:
            if not self.backup_database():
                logger.warning("Backup failed, but continuing with deployment...")
        
        # Run migrations
        if not self.run_contextual_migrations():
            logger.error("Migration failed. Deployment aborted.")
            return False
        
        # Verify migrations
        verification_results = self.verify_migrations()
        logger.info(f"Migration verification: {verification_results}")
        
        # Check if verification passed
        failed_verifications = [k for k, v in verification_results.items() 
                              if k.endswith('_exists') and not v]
        
        if failed_verifications:
            logger.error(f"Migration verification failed for: {failed_verifications}")
            return False
        
        # Run post-migration optimizations
        if not self.optimize_after_migration():
            logger.warning("Post-migration optimization failed, but deployment succeeded")
        
        logger.info("Contextual query system deployment completed successfully!")
        return True

def main():
    """Main deployment function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Deploy contextual query system migrations')
    parser.add_argument('--no-backup', action='store_true', 
                       help='Skip database backup before migration')
    parser.add_argument('--database-url', type=str, 
                       help='Database URL (overrides environment variable)')
    
    args = parser.parse_args()
    
    # Initialize deployer
    deployer = ContextualMigrationDeployer(database_url=args.database_url)
    
    # Run deployment
    success = deployer.deploy(create_backup=not args.no_backup)
    
    if success:
        print("\n✅ Contextual query system deployment completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Contextual query system deployment failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()