from sqlalchemy import inspect
from app.core.database import engine

def check_table_schema():
    inspector = inspect(engine)
    columns = inspector.get_columns('phones')
    print("\nPhone table columns:")
    for column in columns:
        print(f"- {column['name']}: {column['type']}")

if __name__ == "__main__":
    check_table_schema() 