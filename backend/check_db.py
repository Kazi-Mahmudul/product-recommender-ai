from sqlalchemy import inspect
from pathlib import Path
import sys
# Ensure the project root is in sys.path so 'app' is importable
backend_dir = Path(__file__).resolve().parent
project_root = backend_dir.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))
from app.core.database import engine

def check_table_schema():
    inspector = inspect(engine)
    columns = inspector.get_columns('phones')
    print("\nPhone table columns:")
    for column in columns:
        print(f"- {column['name']}: {column['type']}")

if __name__ == "__main__":
    check_table_schema() 