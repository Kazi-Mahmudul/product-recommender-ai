#!/usr/bin/env python3
"""
Check if phones have slugs populated
"""

from sqlalchemy import create_engine, text
from app.core.config import settings
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_phone_slugs():
    # Create database engine
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Check total phones
        result = conn.execute(text("SELECT COUNT(*) FROM phones"))
        total_phones = result.scalar()
        print(f"Total phones in database: {total_phones}")
        
        # Check phones with slugs
        result = conn.execute(text("SELECT COUNT(*) FROM phones WHERE slug IS NOT NULL AND slug != ''"))
        phones_with_slugs = result.scalar()
        print(f"Phones with slugs: {phones_with_slugs}")
        
        # Show some sample slugs
        result = conn.execute(text("SELECT name, brand, slug FROM phones WHERE slug IS NOT NULL AND slug != '' LIMIT 10"))
        sample_phones = result.fetchall()
        
        print("\nSample phones with slugs:")
        for phone in sample_phones:
            print(f"  - {phone.brand} {phone.name} -> {phone.slug}")
        
        # Check if we need to generate slugs
        if phones_with_slugs == 0:
            print("\n⚠️  No phones have slugs! You need to generate them.")
            print("Run the slug generation script to populate phone slugs.")
        elif phones_with_slugs < total_phones:
            print(f"\n⚠️  Only {phones_with_slugs}/{total_phones} phones have slugs.")
            print("Consider running the slug generation script to populate missing slugs.")
        else:
            print("\n✅ All phones have slugs!")

if __name__ == "__main__":
    check_phone_slugs()