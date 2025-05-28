import pandas as pd
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def clean_csv(input_file: str, output_file: str):
    try:
        # Read the CSV file with a more lenient parser
        df = pd.read_csv(input_file, encoding='utf-8', on_bad_lines='warn')
        
        # Log the number of columns
        logger.info(f"Number of columns in DataFrame: {len(df.columns)}")
        
        # Save the cleaned DataFrame
        df.to_csv(output_file, index=False, encoding='utf-8')
        logger.info(f"Successfully cleaned CSV and saved to {output_file}")
        
    except Exception as e:
        logger.error(f"Error cleaning CSV: {str(e)}")
        raise

if __name__ == "__main__":
    input_file = "data_cleaning/mobiledokan_data.csv"
    output_file = "mobiledokan_data.csv"
    clean_csv(input_file, output_file) 