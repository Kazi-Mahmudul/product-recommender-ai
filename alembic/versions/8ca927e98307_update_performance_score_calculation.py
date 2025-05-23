"""update performance score calculation

Revision ID: 8ca927e98307
Revises: f9e602160539
Create Date: 2024-03-21 10:50:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text
import re
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# revision identifiers, used by Alembic.
revision = '8ca927e98307'
down_revision = 'f9e602160539'
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
    
    logger.info(f"Extracted RAM value: {ram_value}GB from '{ram_str}'")
    return ram_value


def extract_battery_mah(battery_str):
    """Extract battery capacity in mAh from string."""
    if not battery_str:
        return 0
    
    # Remove any non-numeric characters except decimal point
    numbers = re.findall(r'\d+(?:\.\d+)?', battery_str)
    if not numbers:
        return 0
    
    # Get the first number found
    battery_value = float(numbers[0])
    
    # Convert to mAh if needed
    if 'WH' in battery_str.upper():
        # Approximate conversion: 1 Wh ≈ 270 mAh at 3.7V
        battery_value *= 270
    elif 'AH' in battery_str.upper():
        battery_value *= 1000  # Convert Ah to mAh
    
    logger.info(f"Extracted battery value: {battery_value}mAh from '{battery_str}'")
    return battery_value


def calculate_performance_score(ram_gb, battery_mah, price):
    """Calculate performance score based on RAM, battery, and price."""
    if not all([ram_gb > 0, battery_mah > 0, price > 0]):
        logger.warning(f"Invalid values for score calculation: RAM={ram_gb}GB, Battery={battery_mah}mAh, Price={price}")
        return 0
    
    # Normalize the values
    normalized_ram = ram_gb / 16  # Assuming 16GB is max
    normalized_battery = battery_mah / 10000  # Assuming 10000mAh is max
    normalized_price = price / 200000  # Assuming 200,000 is max price
    
    # Calculate score: (RAM × Battery) / Price
    # Higher RAM and battery with lower price gives better score
    score = (normalized_ram * normalized_battery) / normalized_price
    
    # Scale the score to a more readable range (0-100)
    final_score = min(100, max(0, score * 50))
    
    logger.info(f"Calculated performance score: {final_score} (RAM={ram_gb}GB, Battery={battery_mah}mAh, Price={price})")
    return final_score


def upgrade() -> None:
    # Create a connection
    connection = op.get_bind()
    
    # Get all phones
    phones = connection.execute(text("SELECT id, price, ram, capacity FROM phones")).fetchall()
    logger.info(f"Found {len(phones)} phones to process")
    
    # Update performance_score for each phone
    for phone in phones:
        try:
            if phone.price and phone.ram and phone.capacity:
                ram_gb = extract_ram_gb(phone.ram)
                battery_mah = extract_battery_mah(phone.capacity)
                performance_score = calculate_performance_score(ram_gb, battery_mah, phone.price)
                
                connection.execute(
                    text("UPDATE phones SET performance_score = :score WHERE id = :id"),
                    {"score": performance_score, "id": phone.id}
                )
                logger.info(f"Updated phone ID {phone.id} with score {performance_score}")
            else:
                logger.warning(f"Skipping phone ID {phone.id} due to missing values: price={phone.price}, ram={phone.ram}, capacity={phone.capacity}")
        except Exception as e:
            logger.error(f"Error processing phone ID {phone.id}: {str(e)}")


def downgrade() -> None:
    # Create a connection
    connection = op.get_bind()
    
    # Reset performance_score to NULL
    connection.execute(text("UPDATE phones SET performance_score = NULL"))