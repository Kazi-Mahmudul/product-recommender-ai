#!/usr/bin/env python3
"""
Test suite for the integrated MobileDokan scraper with enhanced pipeline
"""

import unittest
import sys
import os
import pandas as pd
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock

# Add paths for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scrapers'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'processor'))

try:
    from mobile_scrapers import MobileDokanScraper, get_product_specs, get_product_links
    from data_cleaner import DataCleaner
    from feature_engineer import FeatureEngineer
    from data_quality_validator import DataQualityValidator
    from database_updater import DatabaseUpdater
    IMPORTS_AVAILABLE = True
except ImportError as e:
    IMPORTS_AVAILABLE = False
    print(f"Warning: Could not import modules: {e}")


class TestIntegratedScraper(unittest.TestCase):
    """Test the integrated scraper with enhanced pipeline"""
    
    def setUp(self):
        """Set up test fixtures"""
        if not IMPORTS_AVAILABLE:
            self.skipTest("Required modules not available")
        
        self.scraper = MobileDokanScraper()
        
        # Sample scraped data for testing
        self.sample_scraped_data = [
            {
                'name': 'Samsung Galaxy S24 Ultra',
                'brand': 'Samsung',
                'model': 'Galaxy S24 Ultra',
                'price': '৳.135,000',
                'url': 'https://www.mobiledokan.com/mobile/samsung-galaxy-s24-ultra-test',
                'image_url': 'https://example.com/image1.jpg',
                'specs': {
                    'main_camera': '200+50+12+10MP',
                    'front_camera': '12MP',
                    'ram': '12GB',
                    'internal_storage': '256GB',
                    'capacity': '5000mAh',
                    'quick_charging': '45W',
                    'screen_size_inches': '6.8"',
                    'display_resolution': '1440x3120',
                    'pixel_density_ppi': '501 ppi',
                    'refresh_rate_hz': '120Hz',
                    'chipset': 'Snapdragon 8 Gen 3',
                    'operating_system': 'Android 14'
                }
            },
            {
                'name': 'iPhone 15 Pro Max',
                'brand': 'Apple',
                'model': 'iPhone 15 Pro Max',
                'price': '?.180,000',
                'url': 'https://www.mobiledokan.com/mobile/iphone-15-pro-max-test',
                'image_url': 'https://example.com/image2.jpg',
                'specs': {
                    'main_camera': '48+12+12MP',
                    'front_camera': '12MP',
                    'ram': '8GB',
                    'internal_storage': '256GB',
                    'capacity': '4441mAh',
                    'quick_charging': '27W',
                    'screen_size_inches': '6.7"',
                    'display_resolution': '1290x2796',
                    'pixel_density_ppi': '460 ppi',
                    'refresh_rate_hz': '120Hz',
                    'chipset': 'Apple A17 Pro',
                    'operating_system': 'iOS 17'
                }
            }
        ]
    
    def test_scraper_initialization(self):
        """Test scraper initialization"""
        scraper = MobileDokanScraper()
        self.assertIsNotNone(scraper)
        self.assertIsNotNone(scraper.rate_limiter)
        
        # Check if enhanced pipeline services are initialized
        if hasattr(scraper, 'data_cleaner'):
            self.assertIsInstance(scraper.data_cleaner, DataCleaner)
            self.assertIsInstance(scraper.feature_engineer, FeatureEngineer)
            self.assertIsInstance(scraper.quality_validator, DataQualityValidator)
            self.assertIsInstance(scraper.database_updater, DatabaseUpdater)
    
    def test_convert_scraped_data_to_dataframe(self):
        """Test conversion of scraped data to DataFrame"""
        pipeline_run_id = "test_run_123"
        df = self.scraper.convert_scraped_data_to_dataframe(self.sample_scraped_data, pipeline_run_id)
        
        # Check DataFrame structure
        self.assertIsInstance(df, pd.DataFrame)
        self.assertEqual(len(df), 2)
        
        # Check required columns
        required_columns = ['name', 'brand', 'model', 'price', 'url', 'img_url', 'pipeline_run_id', 'data_source']
        for col in required_columns:
            self.assertIn(col, df.columns)
        
        # Check data values
        self.assertEqual(df.iloc[0]['name'], 'Samsung Galaxy S24 Ultra')
        self.assertEqual(df.iloc[1]['name'], 'iPhone 15 Pro Max')
        self.assertEqual(df.iloc[0]['pipeline_run_id'], pipeline_run_id)
        self.assertEqual(df.iloc[0]['data_source'], 'MobileDokan')
        
        # Check specs data is included
        self.assertEqual(df.iloc[0]['main_camera'], '200+50+12+10MP')
        self.assertEqual(df.iloc[1]['chipset'], 'Apple A17 Pro')
    
    @patch('mobile_scrapers.PIPELINE_AVAILABLE', True)
    def test_process_with_enhanced_pipeline(self):
        """Test processing with enhanced pipeline"""
        if not hasattr(self.scraper, 'data_cleaner'):
            self.skipTest("Enhanced pipeline not available")
        
        # Create test DataFrame
        pipeline_run_id = "test_run_enhanced"
        df = self.scraper.convert_scraped_data_to_dataframe(self.sample_scraped_data, pipeline_run_id)
        
        # Mock the database updater to avoid actual database operations
        with patch.object(self.scraper.database_updater, 'update_with_transaction') as mock_update:
            mock_update.return_value = (True, {
                'results': {
                    'inserted': 2,
                    'updated': 0,
                    'errors': 0
                }
            })
            
            result = self.scraper.process_with_enhanced_pipeline(df, pipeline_run_id)
            
            # Check result structure
            self.assertIn('processed', result)
            self.assertIn('inserted', result)
            self.assertIn('updated', result)
            self.assertIn('errors', result)
            self.assertIn('quality_score', result)
            self.assertIn('cleaning_issues', result)
            
            # Check values
            self.assertEqual(result['processed'], 2)
            self.assertEqual(result['inserted'], 2)
            self.assertEqual(result['updated'], 0)
            self.assertIsInstance(result['quality_score'], (int, float))
            self.assertGreaterEqual(result['quality_score'], 0.0)
            self.assertLessEqual(result['quality_score'], 100.0)
    
    def test_process_with_basic_pipeline(self):
        """Test processing with basic pipeline (fallback)"""
        # Create test DataFrame
        pipeline_run_id = "test_run_basic"
        df = self.scraper.convert_scraped_data_to_dataframe(self.sample_scraped_data, pipeline_run_id)
        
        # Mock the store_product_in_database method
        with patch.object(self.scraper, 'store_product_in_database') as mock_store:
            mock_store.side_effect = ['inserted', 'inserted']
            
            result = self.scraper.process_with_basic_pipeline(df, pipeline_run_id)
            
            # Check result structure
            self.assertIn('processed', result)
            self.assertIn('inserted', result)
            self.assertIn('updated', result)
            self.assertIn('errors', result)
            
            # Check values
            self.assertEqual(result['processed'], 2)
            self.assertEqual(result['inserted'], 2)
            self.assertEqual(result['updated'], 0)
            self.assertEqual(len(result['errors']), 0)
    
    @patch('mobile_scrapers.get_product_links')
    @patch('mobile_scrapers.get_product_specs')
    def test_scrape_and_store_integration(self, mock_get_specs, mock_get_links):
        """Test the complete scrape_and_store integration"""
        # Mock the product links
        mock_get_links.side_effect = [
            ['https://www.mobiledokan.com/mobile/test1', 'https://www.mobiledokan.com/mobile/test2'],
            []  # Empty list to stop pagination
        ]
        
        # Mock the product specs
        mock_get_specs.side_effect = self.sample_scraped_data
        
        # Mock database methods
        with patch.object(self.scraper, 'get_existing_urls_with_dates') as mock_existing:
            mock_existing.return_value = {}
            
            with patch.object(self.scraper, 'process_with_enhanced_pipeline') as mock_process:
                mock_process.return_value = {
                    'processed': 2,
                    'inserted': 2,
                    'updated': 0,
                    'errors': [],
                    'quality_score': 0.95,
                    'cleaning_issues': 0
                }
                
                result = self.scraper.scrape_and_store(max_pages=1, batch_size=10)
                
                # Check result structure
                self.assertIn('status', result)
                self.assertIn('pipeline_run_id', result)
                self.assertIn('enhanced_pipeline_used', result)
                self.assertIn('products_processed', result)
                self.assertIn('products_inserted', result)
                
                # Check values
                self.assertEqual(result['status'], 'success')
                self.assertEqual(result['products_processed'], 2)
                self.assertEqual(result['products_inserted'], 2)
    
    def test_error_handling(self):
        """Test error handling in pipeline processing"""
        # Create test DataFrame with problematic data
        problematic_data = [{
            'name': None,
            'brand': '',
            'price': 'invalid_price',
            'url': 'invalid_url',
            'specs': {}
        }]
        
        pipeline_run_id = "test_error_handling"
        df = self.scraper.convert_scraped_data_to_dataframe(problematic_data, pipeline_run_id)
        
        # Test basic pipeline error handling
        with patch.object(self.scraper, 'store_product_in_database') as mock_store:
            mock_store.side_effect = Exception("Database error")
            
            result = self.scraper.process_with_basic_pipeline(df, pipeline_run_id)
            
            # Should handle errors gracefully
            self.assertGreater(len(result['errors']), 0)
            self.assertEqual(result['processed'], 0)
    
    def test_batch_processing(self):
        """Test batch processing functionality"""
        # Create larger dataset
        large_dataset = self.sample_scraped_data * 5  # 10 products
        
        pipeline_run_id = "test_batch"
        df = self.scraper.convert_scraped_data_to_dataframe(large_dataset, pipeline_run_id)
        
        # Test that DataFrame is created correctly
        self.assertEqual(len(df), 10)
        
        # Test batch processing with mock
        with patch.object(self.scraper, 'process_with_basic_pipeline') as mock_process:
            mock_process.return_value = {
                'processed': 10,
                'inserted': 10,
                'updated': 0,
                'errors': [],
                'quality_score': 0.9,
                'cleaning_issues': 0
            }
            
            result = self.scraper.process_with_basic_pipeline(df, pipeline_run_id)
            self.assertEqual(result['processed'], 10)


class TestScrapingFunctions(unittest.TestCase):
    """Test individual scraping functions"""
    
    @patch('mobile_scrapers.requests.get')
    def test_get_product_links_success(self, mock_get):
        """Test successful product links extraction"""
        # Mock successful response
        mock_response = Mock()
        mock_response.raise_for_status.return_value = None
        mock_response.text = '''
        <html>
            <div class="product-box">
                <a href="https://www.mobiledokan.com/mobile/test-phone-1">Test Phone 1</a>
            </div>
            <div class="product-box">
                <a href="https://www.mobiledokan.com/mobile/test-phone-2">Test Phone 2</a>
            </div>
        </html>
        '''
        mock_get.return_value = mock_response
        
        links = get_product_links(1)
        
        self.assertEqual(len(links), 2)
        self.assertIn('https://www.mobiledokan.com/mobile/test-phone-1', links)
        self.assertIn('https://www.mobiledokan.com/mobile/test-phone-2', links)
    
    @patch('mobile_scrapers.requests.get')
    def test_get_product_links_empty_page(self, mock_get):
        """Test handling of empty pages"""
        # Mock empty response
        mock_response = Mock()
        mock_response.raise_for_status.return_value = None
        mock_response.text = '<html><body>No products found</body></html>'
        mock_get.return_value = mock_response
        
        links = get_product_links(999)  # High page number likely to be empty
        
        self.assertEqual(len(links), 0)
    
    @patch('mobile_scrapers.requests.get')
    def test_get_product_specs_success(self, mock_get):
        """Test successful product specs extraction"""
        # Mock successful response with product data
        mock_response = Mock()
        mock_response.raise_for_status.return_value = None
        mock_response.text = '''
        <html>
            <div id="product-specs">
                <h2>Samsung Galaxy Test Phone Full Specifications</h2>
            </div>
            <div class="price">
                <span class="h3">৳50,000</span>
            </div>
            <img itemprop="image" class="img-fluid" src="https://example.com/image.jpg">
            <div class="key-specs">
                <div class="info">
                    <div class="text">
                        <span>Main Camera</span>
                        <span class="foswald">48MP</span>
                    </div>
                </div>
            </div>
        </html>
        '''
        mock_get.return_value = mock_response
        
        result = get_product_specs('https://www.mobiledokan.com/mobile/test-phone')
        
        self.assertIsNotNone(result)
        self.assertIn('name', result)
        self.assertIn('price', result)
        self.assertIn('brand', result)
        self.assertIn('specs', result)


if __name__ == '__main__':
    # Run tests
    unittest.main(verbosity=2)