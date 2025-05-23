"""update price per gb storage calculation

Revision ID: f9e602160539
Revises: b18c8b623344
Create Date: 2024-03-21 10:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text
import re


# revision identifiers, used by Alembic.
revision = 'f9e602160539'
down_revision = 'b18c8b623344'
branch_labels = None
depends_on = None


def extract_storage_gb(storage_str):
    """Extract storage value in GB from string."""
    if not storage_str:
        return 0
    
    # Remove any non-numeric characters except decimal point
    numbers = re.findall(r'\d+(?:\.\d+)?', storage_str)
    if not numbers:
        return 0
    
    # Get the first number found
    storage_value = float(numbers[0])
    
    # Convert to GB if needed
    if 'TB' in storage_str.upper():
        storage_value *= 1024  # Convert TB to GB
    elif 'MB' in storage_str.upper():
        storage_value /= 1024  # Convert MB to GB
    elif 'KB' in storage_str.upper():
        storage_value /= (1024 * 1024)  # Convert KB to GB
    
    return storage_value


def upgrade() -> None:
    # Create a connection
    connection = op.get_bind()
    
    # Get all phones
    phones = connection.execute(text("SELECT id, price, internal_storage FROM phones")).fetchall()
    
    # Update price_per_gb_storage for each phone
    for phone in phones:
        if phone.price and phone.internal_storage:
            storage_gb = extract_storage_gb(phone.internal_storage)
            if storage_gb > 0:
                price_per_gb = phone.price / storage_gb
                connection.execute(
                    text("UPDATE phones SET price_per_gb_storage = :price_per_gb WHERE id = :id"),
                    {"price_per_gb": price_per_gb, "id": phone.id}
                )


def downgrade() -> None:
    # Create a connection
    connection = op.get_bind()
    
    # Reset price_per_gb_storage to NULL
    connection.execute(text("UPDATE phones SET price_per_gb_storage = NULL"))