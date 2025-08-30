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

# Note: This service is deprecated - feature engineering is now embedded in process_data.py
# This file is kept for backward compatibility but should not be used in production

def engineer_features(df, processor_df=None):
    """Deprecated: Use the embedded feature engineering in process_data.py instead"""
    import warnings
    warnings.warn("This feature_engineer service is deprecated. Use embedded logic in process_data.py", DeprecationWarning)
    return df


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