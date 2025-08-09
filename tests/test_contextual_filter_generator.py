"""
Unit tests for Contextual Filter Generator
"""

import pytest
from app.services.contextual_filter_generator import (
    ContextualFilterGenerator, 
    ContextualIntent
)
from app.services.phone_name_resolver import ResolvedPhone

class TestContextualFilterGenerator:
    """Test cases for ContextualFilterGenerator"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.generator = ContextualFilterGenerator()
        
        # Mock phone data
        self.mock_phone_data = {
            'id': 1,
            'name': 'iPhone 14 Pro',
            'brand': 'Apple',
            'price_original': 120000,
            'overall_device_score': 8.5,
            'camera_score': 9.0,
            'battery_score': 7.5,
            'performance_score': 8.8,
            'display_score': 8.2,
            'ram_gb': 8,
            'storage_gb': 256,
            'battery_capacity_numeric': 3200,
            'primary_camera_mp': 48,
            'refresh_rate_numeric': 120
        }
        
        self.resolved_phone = ResolvedPhone(
            original_reference="iPhone 14 Pro",
            matched_phone=self.mock_phone_data,
            confidence_score=1.0,
            match_type="exact",
            alternative_matches=[]
        )
    
    def test_better_than_filters_overall(self):
        """Test generating filters for phones better than reference (overall)"""
        intent = ContextualIntent(
            query_type="contextual_recommendation",
            confidence=0.9,
            resolved_phones=[self.resolved_phone],
            relationship="better_than",
            focus_area=None,
            filters={},
            context_metadata={},
            original_query="phones better than iPhone 14 Pro",
            processed_query="phones better than iPhone 14 Pro"
        )
        
        filters = self.generator.generate_filters(intent, [self.resolved_phone])
        
        assert 'min_overall_device_score' in filters
        assert filters['min_overall_device_score'] > self.mock_phone_data['overall_device_score']
        assert 'exclude_ids' in filters
        assert self.mock_phone_data['id'] in filters['exclude_ids']
    
    def test_better_than_filters_camera_focus(self):
        """Test generating filters for phones with better camera"""
        intent = ContextualIntent(
            query_type="contextual_recommendation",
            confidence=0.9,
            resolved_phones=[self.resolved_phone],
            relationship="better_than",
            focus_area="camera",
            filters={},
            context_metadata={},
            original_query="phones with better camera than iPhone 14 Pro",
            processed_query="phones with better camera than iPhone 14 Pro"
        )
        
        filters = self.generator.generate_filters(intent, [self.resolved_phone])
        
        assert 'min_camera_score' in filters
        assert filters['min_camera_score'] > self.mock_phone_data['camera_score']
        assert 'min_primary_camera_mp' in filters
        assert filters['min_primary_camera_mp'] > self.mock_phone_data['primary_camera_mp']
    
    def test_cheaper_than_filters(self):
        """Test generating filters for phones cheaper than reference"""
        intent = ContextualIntent(
            query_type="contextual_recommendation",
            confidence=0.9,
            resolved_phones=[self.resolved_phone],
            relationship="cheaper_than",
            focus_area=None,
            filters={},
            context_metadata={},
            original_query="phones cheaper than iPhone 14 Pro",
            processed_query="phones cheaper than iPhone 14 Pro"
        )
        
        filters = self.generator.generate_filters(intent, [self.resolved_phone])
        
        assert 'max_price' in filters
        assert filters['max_price'] < self.mock_phone_data['price_original']
    
    def test_similar_to_filters(self):
        """Test generating filters for phones similar to reference"""
        intent = ContextualIntent(
            query_type="contextual_recommendation",
            confidence=0.9,
            resolved_phones=[self.resolved_phone],
            relationship="similar_to",
            focus_area=None,
            filters={},
            context_metadata={},
            original_query="phones similar to iPhone 14 Pro",
            processed_query="phones similar to iPhone 14 Pro"
        )
        
        filters = self.generator.generate_filters(intent, [self.resolved_phone])
        
        assert 'min_price' in filters
        assert 'max_price' in filters
        assert filters['min_price'] < self.mock_phone_data['price_original']
        assert filters['max_price'] > self.mock_phone_data['price_original']
        
        assert 'min_ram_gb' in filters
        assert 'max_ram_gb' in filters
    
    def test_comparison_filters(self):
        """Test generating filters for phone comparisons"""
        phone2_data = {
            'id': 2,
            'name': 'Samsung Galaxy S23',
            'brand': 'Samsung',
            'price_original': 85000
        }
        
        resolved_phone2 = ResolvedPhone(
            original_reference="Samsung Galaxy S23",
            matched_phone=phone2_data,
            confidence_score=1.0,
            match_type="exact",
            alternative_matches=[]
        )
        
        intent = ContextualIntent(
            query_type="comparison",
            confidence=0.9,
            resolved_phones=[self.resolved_phone, resolved_phone2],
            relationship=None,
            focus_area="camera",
            filters={},
            context_metadata={},
            original_query="compare iPhone 14 Pro vs Samsung Galaxy S23 camera",
            processed_query="compare iPhone 14 Pro vs Samsung Galaxy S23 camera"
        )
        
        filters = self.generator.generate_filters(intent, [self.resolved_phone, resolved_phone2])
        
        assert filters['comparison_mode'] is True
        assert 'phone_ids' in filters
        assert len(filters['phone_ids']) == 2
        assert filters['focus_area'] == 'camera'
        assert 'include_features' in filters
        assert 'camera_score' in filters['include_features']
    
    def test_alternative_filters_with_criteria(self):
        """Test generating filters for alternatives with specific criteria"""
        criteria = {
            'price_constraint': 'lower',
            'camera_constraint': 'better'
        }
        
        intent = ContextualIntent(
            query_type="alternative",
            confidence=0.9,
            resolved_phones=[self.resolved_phone],
            relationship=None,
            focus_area=None,
            filters={},
            context_metadata={'criteria': criteria},
            original_query="cheaper alternatives to iPhone 14 Pro with better camera",
            processed_query="cheaper alternatives to iPhone 14 Pro with better camera"
        )
        
        filters = self.generator.generate_filters(intent, [self.resolved_phone])
        
        assert 'max_price' in filters
        assert filters['max_price'] < self.mock_phone_data['price_original']
        assert 'min_camera_score' in filters
        assert filters['min_camera_score'] > self.mock_phone_data['camera_score']
    
    def test_battery_focus_filters(self):
        """Test generating filters with battery focus"""
        intent = ContextualIntent(
            query_type="contextual_recommendation",
            confidence=0.9,
            resolved_phones=[self.resolved_phone],
            relationship="better_than",
            focus_area="battery",
            filters={},
            context_metadata={},
            original_query="phones with better battery than iPhone 14 Pro",
            processed_query="phones with better battery than iPhone 14 Pro"
        )
        
        filters = self.generator.generate_filters(intent, [self.resolved_phone])
        
        assert 'min_battery_score' in filters
        assert filters['min_battery_score'] > self.mock_phone_data['battery_score']
        assert 'min_battery_capacity_numeric' in filters
        assert filters['min_battery_capacity_numeric'] > self.mock_phone_data['battery_capacity_numeric']
    
    def test_performance_focus_filters(self):
        """Test generating filters with performance focus"""
        intent = ContextualIntent(
            query_type="contextual_recommendation",
            confidence=0.9,
            resolved_phones=[self.resolved_phone],
            relationship="better_than",
            focus_area="performance",
            filters={},
            context_metadata={},
            original_query="phones with better performance than iPhone 14 Pro",
            processed_query="phones with better performance than iPhone 14 Pro"
        )
        
        filters = self.generator.generate_filters(intent, [self.resolved_phone])
        
        assert 'min_performance_score' in filters
        assert filters['min_performance_score'] > self.mock_phone_data['performance_score']
        assert 'min_ram_gb' in filters
        assert filters['min_ram_gb'] > self.mock_phone_data['ram_gb']
    
    def test_display_focus_filters(self):
        """Test generating filters with display focus"""
        intent = ContextualIntent(
            query_type="contextual_recommendation",
            confidence=0.9,
            resolved_phones=[self.resolved_phone],
            relationship="better_than",
            focus_area="display",
            filters={},
            context_metadata={},
            original_query="phones with better display than iPhone 14 Pro",
            processed_query="phones with better display than iPhone 14 Pro"
        )
        
        filters = self.generator.generate_filters(intent, [self.resolved_phone])
        
        assert 'min_display_score' in filters
        assert filters['min_display_score'] > self.mock_phone_data['display_score']
        assert 'min_refresh_rate_numeric' in filters
        assert filters['min_refresh_rate_numeric'] > self.mock_phone_data['refresh_rate_numeric']
    
    def test_worse_than_filters(self):
        """Test generating filters for phones worse than reference"""
        intent = ContextualIntent(
            query_type="contextual_recommendation",
            confidence=0.9,
            resolved_phones=[self.resolved_phone],
            relationship="worse_than",
            focus_area="camera",
            filters={},
            context_metadata={},
            original_query="phones with worse camera than iPhone 14 Pro",
            processed_query="phones with worse camera than iPhone 14 Pro"
        )
        
        filters = self.generator.generate_filters(intent, [self.resolved_phone])
        
        assert 'max_camera_score' in filters
        assert filters['max_camera_score'] < self.mock_phone_data['camera_score']
    
    def test_more_expensive_than_filters(self):
        """Test generating filters for phones more expensive than reference"""
        intent = ContextualIntent(
            query_type="contextual_recommendation",
            confidence=0.9,
            resolved_phones=[self.resolved_phone],
            relationship="more_expensive_than",
            focus_area=None,
            filters={},
            context_metadata={},
            original_query="phones more expensive than iPhone 14 Pro",
            processed_query="phones more expensive than iPhone 14 Pro"
        )
        
        filters = self.generator.generate_filters(intent, [self.resolved_phone])
        
        assert 'min_price' in filters
        assert filters['min_price'] > self.mock_phone_data['price_original']
    
    def test_empty_resolved_phones(self):
        """Test handling of empty resolved phones list"""
        intent = ContextualIntent(
            query_type="contextual_recommendation",
            confidence=0.9,
            resolved_phones=[],
            relationship="better_than",
            focus_area=None,
            filters={},
            context_metadata={},
            original_query="phones better than unknown phone",
            processed_query="phones better than unknown phone"
        )
        
        filters = self.generator.generate_filters(intent, [])
        
        assert filters == {}
    
    def test_filter_confidence_calculation(self):
        """Test confidence calculation for generated filters"""
        filters = {'min_price': 50000, 'min_camera_score': 8.0}
        confidence = self.generator.calculate_filter_confidence(filters, self.mock_phone_data)
        
        assert 0.0 <= confidence <= 1.0
        assert confidence > 0.5  # Should be above base confidence due to available data
    
    def test_filter_optimization(self):
        """Test filter optimization to prevent overly restrictive queries"""
        # Test price range optimization
        restrictive_filters = {
            'min_price': 49000,
            'max_price': 51000,  # Very narrow range
            'min_camera_score': 9.5  # Very high score
        }
        
        optimized = self.generator.optimize_filters(restrictive_filters)
        
        # Price range should be expanded
        assert optimized['max_price'] - optimized['min_price'] >= 10000
        
        # High scores should be capped
        assert optimized['min_camera_score'] <= 9.0
    
    def test_comparison_filters_with_focus_areas(self):
        """Test comparison filters with different focus areas"""
        focus_areas = ['camera', 'battery', 'performance', 'display', 'price']
        
        for focus_area in focus_areas:
            filters = self.generator.generate_comparison_filters([self.resolved_phone], focus_area)
            
            assert filters['comparison_mode'] is True
            assert filters['focus_area'] == focus_area
            assert 'include_features' in filters
            assert len(filters['include_features']) > 0
    
    def test_similar_filters_generation(self):
        """Test generation of similarity filters"""
        filters = self.generator.generate_similar_filters(self.resolved_phone)
        
        # Should have price range
        assert 'min_price' in filters
        assert 'max_price' in filters
        
        # Should have RAM range
        assert 'min_ram_gb' in filters
        assert 'max_ram_gb' in filters
        
        # Should exclude reference phone
        assert 'exclude_ids' in filters
        assert self.mock_phone_data['id'] in filters['exclude_ids']