"""
Feature Engineer Module

Provides feature engineering functionality for the processing pipeline.
"""

import pandas as pd
import numpy as np
import re
import sys
import os
from typing import Optional, Tuple

# Add data_cleaning to path to use existing functions
data_cleaning_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'data_cleaning')
if data_cleaning_path not in sys.path:
    sys.path.insert(0, data_cleaning_path)

from clean_transform_pipeline import engineer_features


class FeatureEngineer:
    """Feature engineering service for mobile phone data"""
    
    def __init__(self):
        pass
    
    def engineer_features(self, df: pd.DataFrame, processor_df: Optional[pd.DataFrame] = None) -> pd.DataFrame:
        """
        Engineer features for the input dataframe
        
        Args:
            df: Cleaned dataframe to engineer features for
            processor_df: Optional processor rankings dataframe
            
        Returns:
            DataFrame with engineered features
        """
        # Use the existing engineer_features function from clean_transform_pipeline
        return engineer_features(df, processor_df)