from sqlalchemy import create_engine, text
from app.core.config import settings

# Create engine
engine = create_engine(settings.DATABASE_URL)

# Connect and execute query
with engine.connect() as connection:
    # Get count of rows
    result = connection.execute(text("SELECT COUNT(*) FROM phones"))
    count = result.scalar()
    
    print(f"\nNumber of phones in the database: {count}")
    
    # Get sample of phones
    result = connection.execute(text("SELECT name, brand, price FROM phones LIMIT 5"))
    phones = result.fetchall()
    
    print("\nSample phones:")
    print("-" * 50)
    for phone in phones:
        print(f"Name: {phone[0]}")
        print(f"Brand: {phone[1]}")
        print(f"Price: ${phone[2]:,.2f}")
        print("-" * 50) 