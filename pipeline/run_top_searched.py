#!/usr/bin/env python3
"""
Script to manually run the top searched phones pipeline
"""

import sys
import os
import argparse

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline.top_searched import TopSearchedPipeline

def main():
    parser = argparse.ArgumentParser(description='Run the top searched phones pipeline')
    parser.add_argument('--limit', type=int, default=10, help='Number of top phones to fetch (default: 10)')
    parser.add_argument('--verbose', action='store_true', help='Enable verbose logging')
    
    args = parser.parse_args()
    
    print(f"Running Top Searched Phones Pipeline (limit: {args.limit})...")
    
    # Create and run the pipeline
    pipeline = TopSearchedPipeline()
    pipeline.run(limit=args.limit)
    
    print("Pipeline execution completed.")

if __name__ == "__main__":
    main()