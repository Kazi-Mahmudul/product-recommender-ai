"""update price per gb ram calculation

Revision ID: b18c8b623344
Revises: 0fb52c317ed0
Create Date: 2024-03-21 10:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text
import re


# revision identifiers, used by Alembic.
revision = 'b18c8b623344'
down_revision = '0fb52c317ed0'
branch_labels = None
depends_on = None


def extract_ram_gb(ram_str):
    """Extract RAM value in GB from string."""
    if not ram_str:
        return 0
    
    # Remove any non-numeric characters except decimal point
    numbers = re.findall(r'\d+(?:\.\d+)?', ram_str)
    if not numbers:
        return 0
    
    # Get the first number found
    ram_value = float(numbers[0])
    
    # Convert to GB if needed
    if 'MB' in ram_str.upper():
        ram_value /= 1024
    elif 'KB' in ram_str.upper():
        ram_value /= (1024 * 1024)
    
    return ram_value


def upgrade() -> None:
    # Create a connection
    connection = op.get_bind()
    
    # Get all phones
    phones = connection.execute(text("SELECT id, price, ram FROM phones")).fetchall()
    
    # Update price_per_gb_ram for each phone
    for phone in phones:
        if phone.price and phone.ram:
            ram_gb = extract_ram_gb(phone.ram)
            if ram_gb > 0:
                price_per_gb = phone.price / ram_gb
                connection.execute(
                    text("UPDATE phones SET price_per_gb_ram = :price_per_gb WHERE id = :id"),
                    {"price_per_gb": price_per_gb, "id": phone.id}
                )


def downgrade() -> None:
    # Create a connection
    connection = op.get_bind()
    
    # Reset price_per_gb_ram to NULL
    connection.execute(text("UPDATE phones SET price_per_gb_ram = NULL"))