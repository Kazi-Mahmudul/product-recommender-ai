"""
Database utility functions for managing sequences and table operations.
"""
import logging
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Utility class for database operations and sequence management."""
    
    def __init__(self, database_url: str):
        """Initialize database manager with connection URL."""
        self.database_url = database_url
        self.engine = create_engine(
            database_url,
            pool_pre_ping=True,
            connect_args={"sslmode": "require"} if not database_url.startswith("postgresql://localhost") else {}
        )
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def reset_sequence(self, table_name: str, sequence_name: Optional[str] = None) -> bool:
        """
        Reset a sequence to start from the maximum ID in the table.
        
        Args:
            table_name: Name of the table
            sequence_name: Name of the sequence (defaults to {table_name}_id_seq)
            
        Returns:
            True if successful, False otherwise
        """
        if sequence_name is None:
            sequence_name = f"{table_name}_id_seq"
            
        try:
            with self.engine.connect() as connection:
                # Get the maximum ID from the table
                result = connection.execute(text(f"SELECT COALESCE(MAX(id), 0) FROM {table_name}"))
                max_id = result.scalar()
                
                # Reset the sequence to start from max_id + 1
                connection.execute(text(f"SELECT setval('{sequence_name}', {max_id + 1})"))
                connection.commit()
                
                logger.info(f"Reset sequence {sequence_name} to start from {max_id + 1}")
                return True
                
        except SQLAlchemyError as e:
            logger.error(f"Error resetting sequence {sequence_name}: {str(e)}")
            return False
    
    def create_sequence_if_not_exists(self, table_name: str, sequence_name: Optional[str] = None) -> bool:
        """
        Create a sequence if it doesn't exist and set it as default for the ID column.
        
        Args:
            table_name: Name of the table
            sequence_name: Name of the sequence (defaults to {table_name}_id_seq)
            
        Returns:
            True if successful, False otherwise
        """
        if sequence_name is None:
            sequence_name = f"{table_name}_id_seq"
            
        try:
            with self.engine.connect() as connection:
                # Check if sequence exists
                result = connection.execute(text("""
                    SELECT EXISTS (
                        SELECT 1 FROM pg_sequences 
                        WHERE sequencename = :seq_name
                    )
                """), {"seq_name": sequence_name})
                
                sequence_exists = result.scalar()
                
                if not sequence_exists:
                    # Create the sequence
                    connection.execute(text(f"CREATE SEQUENCE {sequence_name}"))
                    logger.info(f"Created sequence {sequence_name}")
                
                # Set the sequence as default for the id column
                connection.execute(text(f"""
                    ALTER TABLE {table_name} 
                    ALTER COLUMN id SET DEFAULT nextval('{sequence_name}')
                """))
                
                # Make sure the sequence is owned by the column
                connection.execute(text(f"""
                    ALTER SEQUENCE {sequence_name} OWNED BY {table_name}.id
                """))
                
                connection.commit()
                logger.info(f"Configured sequence {sequence_name} for table {table_name}")
                return True
                
        except SQLAlchemyError as e:
            logger.error(f"Error creating/configuring sequence {sequence_name}: {str(e)}")
            return False
    
    def validate_table_structure(self, table_name: str, expected_columns: List[str]) -> bool:
        """
        Validate that a table has the expected structure.
        
        Args:
            table_name: Name of the table to validate
            expected_columns: List of expected column names
            
        Returns:
            True if table structure is valid, False otherwise
        """
        try:
            inspector = inspect(self.engine)
            
            # Check if table exists
            if not inspector.has_table(table_name):
                logger.error(f"Table {table_name} does not exist")
                return False
            
            # Get actual columns
            columns = inspector.get_columns(table_name)
            actual_columns = [col['name'] for col in columns]
            
            # Check for missing columns
            missing_columns = set(expected_columns) - set(actual_columns)
            if missing_columns:
                logger.error(f"Table {table_name} missing columns: {missing_columns}")
                return False
            
            # Check if id column exists and is properly configured
            id_column = next((col for col in columns if col['name'] == 'id'), None)
            if not id_column:
                logger.error(f"Table {table_name} missing id column")
                return False
            
            logger.info(f"Table {table_name} structure validation passed")
            return True
            
        except SQLAlchemyError as e:
            logger.error(f"Error validating table structure for {table_name}: {str(e)}")
            return False
    
    def truncate_table(self, table_name: str) -> bool:
        """
        Truncate a table while preserving its structure.
        
        Args:
            table_name: Name of the table to truncate
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with self.engine.connect() as connection:
                # Use TRUNCATE with RESTART IDENTITY to reset sequences
                connection.execute(text(f"TRUNCATE TABLE {table_name} RESTART IDENTITY"))
                connection.commit()
                logger.info(f"Truncated table {table_name}")
                return True
                
        except SQLAlchemyError as e:
            logger.error(f"Error truncating table {table_name}: {str(e)}")
            return False
    
    def get_table_info(self, table_name: str) -> Dict[str, Any]:
        """
        Get detailed information about a table.
        
        Args:
            table_name: Name of the table
            
        Returns:
            Dictionary with table information
        """
        try:
            inspector = inspect(self.engine)
            
            if not inspector.has_table(table_name):
                return {"exists": False}
            
            columns = inspector.get_columns(table_name)
            primary_keys = inspector.get_pk_constraint(table_name)
            indexes = inspector.get_indexes(table_name)
            
            with self.engine.connect() as connection:
                # Get row count
                result = connection.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                row_count = result.scalar()
            
            return {
                "exists": True,
                "columns": columns,
                "primary_keys": primary_keys,
                "indexes": indexes,
                "row_count": row_count
            }
            
        except SQLAlchemyError as e:
            logger.error(f"Error getting table info for {table_name}: {str(e)}")
            return {"exists": False, "error": str(e)}
    
    def test_auto_increment(self, table_name: str) -> bool:
        """
        Test that auto-increment functionality is working for a table.
        
        Args:
            table_name: Name of the table to test
            
        Returns:
            True if auto-increment is working, False otherwise
        """
        try:
            with self.engine.connect() as connection:
                # Insert a test record without specifying ID
                connection.execute(text(f"""
                    INSERT INTO {table_name} (name, brand, model, price, url) 
                    VALUES ('Test Phone', 'Test Brand', 'Test Model', 'Test Price', 'Test URL')
                """))
                
                # Get the ID of the inserted record
                result = connection.execute(text(f"""
                    SELECT id FROM {table_name} 
                    WHERE name = 'Test Phone' AND brand = 'Test Brand'
                """))
                test_id = result.scalar()
                
                # Clean up the test record
                connection.execute(text(f"""
                    DELETE FROM {table_name} 
                    WHERE name = 'Test Phone' AND brand = 'Test Brand'
                """))
                
                connection.commit()
                
                if test_id is not None:
                    logger.info(f"Auto-increment test passed for {table_name}, assigned ID: {test_id}")
                    return True
                else:
                    logger.error(f"Auto-increment test failed for {table_name}, no ID assigned")
                    return False
                    
        except SQLAlchemyError as e:
            logger.error(f"Error testing auto-increment for {table_name}: {str(e)}")
            return False