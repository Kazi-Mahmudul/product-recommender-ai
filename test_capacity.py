from app.utils.derived_columns import extract_numeric_value
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_capacity_extraction():
    # Test cases with different formats
    test_cases = [
        "5000 mAh",
        "5000mAh",
        "5000 MAH",
        "5000mah",
        "5000 mAh (Typical)",
        "5000 mAh, Non-removable",
        "5000",
        "5000.5 mAh",
        "5000,000 mAh",
        "5000.000 mAh",
        None,
        "",
        "Invalid",
    ]
    
    logger.info("Testing battery capacity extraction:")
    for test_case in test_cases:
        numeric_value = extract_numeric_value(test_case)
        logger.info(f"Input: {test_case} -> Extracted value: {numeric_value}")

if __name__ == "__main__":
    test_capacity_extraction() 