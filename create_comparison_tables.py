#!/usr/bin/env python3
"""
Script to create comparison tables manually
"""

from sqlalchemy import create_engine, text
from app.core.config import settings
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_comparison_tables():
    # Create database engine
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Create comparison_sessions table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS comparison_sessions (
                session_id UUID PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 day')
            );
        """))
        
        # Create comparison_items table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS comparison_items (
                id SERIAL PRIMARY KEY,
                session_id UUID REFERENCES comparison_sessions(session_id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                slug VARCHAR(255) NOT NULL,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT check_session_or_user CHECK (
                    (session_id IS NOT NULL AND user_id IS NULL) OR 
                    (session_id IS NULL AND user_id IS NOT NULL)
                )
            );
        """))
        
        # Create indexes for better performance
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_comparison_items_session_id 
            ON comparison_items(session_id);
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_comparison_items_user_id 
            ON comparison_items(user_id);
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_comparison_items_slug 
            ON comparison_items(slug);
        """))
        
        conn.commit()
        print("✅ Comparison tables created successfully!")

if __name__ == "__main__":
    create_comparison_tables()