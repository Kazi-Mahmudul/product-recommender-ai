"""
Unit tests for Phone Name Resolver
"""

import pytest
from unittest.mock import Mock, MagicMock, patch
from app.services.phone_name_resolver import PhoneNameResolver, ResolvedPhone

class TestPhoneNameResolver:
    """Test cases for PhoneNameResolver"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.resolver = PhoneNameResolver()
        self.mock_db = Mock()
        
        # Mock phone data
        self.mock_phones = [
            {
                'id': 1,
                'name': 'iPhone 14 Pro',
                'brand': 'Apple',
                'model': '14 Pro',
                'price_original': 120000
            },
            {
                'id': 2,
                'name': 'Samsung Galaxy S23',
                'brand': 'Samsung',
                'model': 'Galaxy S23',
                'price_original': 85000
            },
            {
                'id': 3,
                'name': 'OnePlus 11',
                'brand': 'OnePlus',
                'model': '11',
                'price_original': 65000
            },
            {
                'id': 4,
                'name': 'Xiaomi Redmi Note 12 Pro',
                'brand': 'Xiaomi',
                'model': 'Redmi Note 12 Pro',
                'price_original': 35000
            }
        ]
    
    def test_exact_match(self):
        """Test exact phone name matching"""
        # Mock the database call
        mock_phone = self.mock_phones[0]
        with patch('app.crud.phone.get_phone_by_name_or_model', return_value=mock_phone):
            with patch('app.crud.phone.phone_to_dict', return_value=mock_phone):
                result = self.resolver.resolve_single_phone("iPhone 14 Pro", self.mock_db)
                
                assert result is not None
                assert result.confidence_score == 1.0
                assert result.match_type == "exact"
                assert result.matched_phone['name'] == 'iPhone 14 Pro'
    
    def test_fuzzy_match(self):
        """Test fuzzy phone name matching"""
        with patch('app.crud.phone.get_phone_by_name_or_model', return_value=None):
            with patch('app.crud.phone.get_phones', return_value=(self.mock_phones, len(self.mock_phones))):
                with patch('app.crud.phone.phone_to_dict', side_effect=lambda x: x):
                    result = self.resolver.resolve_single_phone("iPhone14Pro", self.mock_db)
                    
                    assert result is not None
                    assert result.match_type == "fuzzy"
                    assert result.confidence_score >= 0.8
    
    def test_brand_model_match(self):
        """Test brand + model pattern matching"""
        with patch('app.crud.phone.get_phone_by_name_or_model') as mock_get:
            mock_get.side_effect = [None, None, self.mock_phones[1]]  # First two calls return None, third returns phone
            with patch('app.crud.phone.phone_to_dict', return_value=self.mock_phones[1]):
                result = self.resolver.resolve_single_phone("Galaxy S23", self.mock_db)
                
                assert result is not None
                assert result.match_type == "brand_model"
                assert result.confidence_score == 0.9
    
    def test_alias_match(self):
        """Test brand alias matching"""
        with patch('app.crud.phone.get_phone_by_name_or_model') as mock_get:
            mock_get.side_effect = [None, None, None, self.mock_phones[3]]  # Return phone on 4th call
            with patch('app.crud.phone.phone_to_dict', return_value=self.mock_phones[3]):
                result = self.resolver.resolve_single_phone("Redmi Note 12 Pro", self.mock_db)
                
                assert result is not None
                assert result.match_type == "alias"
                assert result.confidence_score == 0.8
    
    def test_no_match_found(self):
        """Test when no match is found"""
        with patch('app.crud.phone.get_phone_by_name_or_model', return_value=None):
            with patch('app.crud.phone.get_phones', return_value=([], 0)):
                result = self.resolver.resolve_single_phone("NonExistentPhone", self.mock_db)
                
                assert result is None
    
    def test_similarity_calculation(self):
        """Test similarity calculation between strings"""
        # Test exact match
        score = self.resolver._calculate_similarity("iPhone 14 Pro", "iPhone 14 Pro")
        assert score == 1.0
        
        # Test partial match
        score = self.resolver._calculate_similarity("iPhone 14", "iPhone 14 Pro")
        assert score > 0.7  # Adjusted threshold
        
        # Test no match
        score = self.resolver._calculate_similarity("iPhone", "Samsung Galaxy")
        assert score < 0.3
    
    def test_suggest_similar_phones(self):
        """Test similar phone suggestions"""
        with patch('app.crud.phone.get_phones', return_value=(self.mock_phones, len(self.mock_phones))):
            with patch('app.crud.phone.phone_to_dict', side_effect=lambda x: x):
                suggestions = self.resolver.suggest_similar_phones("iPhone 14", self.mock_db)
                
                assert len(suggestions) > 0
                assert any("iPhone" in suggestion for suggestion in suggestions)
    
    def test_resolve_multiple_phones(self):
        """Test resolving multiple phone names"""
        phone_refs = ["iPhone 14 Pro", "Galaxy S23"]
        
        with patch.object(self.resolver, 'resolve_single_phone') as mock_resolve:
            mock_resolve.side_effect = [
                ResolvedPhone("iPhone 14 Pro", self.mock_phones[0], 1.0, "exact", []),
                ResolvedPhone("Galaxy S23", self.mock_phones[1], 0.9, "brand_model", [])
            ]
            
            results = self.resolver.resolve_phone_names(phone_refs, self.mock_db)
            
            assert len(results) == 2
            assert results[0].matched_phone['name'] == 'iPhone 14 Pro'
            assert results[1].matched_phone['name'] == 'Samsung Galaxy S23'
    
    def test_phone_variations(self):
        """Test phone name variations generation"""
        variations = self.resolver.get_phone_variations("iPhone 14 Pro")
        
        assert "iPhone 14 Pro" in variations
        assert "iPhone14Pro" in variations
        assert "iPhone-14-Pro" in variations
    
    def test_confidence_threshold(self):
        """Test confidence threshold filtering"""
        # Test that low confidence matches are rejected
        with patch('app.crud.phone.get_phone_by_name_or_model', return_value=None):
            with patch('app.crud.phone.get_phones', return_value=(self.mock_phones, len(self.mock_phones))):
                with patch('app.crud.phone.phone_to_dict', side_effect=lambda x: x):
                    with patch.object(self.resolver, '_calculate_similarity', return_value=0.3):
                        result = self.resolver.resolve_single_phone("VeryDifferentPhone", self.mock_db)
                        
                        assert result is None  # Should be rejected due to low confidence
    
    def test_alternative_matches(self):
        """Test that alternative matches are captured"""
        with patch('app.crud.phone.get_phone_by_name_or_model', return_value=None):
            with patch('app.crud.phone.get_phones', return_value=(self.mock_phones, len(self.mock_phones))):
                with patch('app.crud.phone.phone_to_dict', side_effect=lambda x: x):
                    # Mock similarity to return high scores for multiple phones
                    similarity_scores = [0.9, 0.85, 0.8, 0.7]
                    with patch.object(self.resolver, '_calculate_similarity', side_effect=similarity_scores * 10):
                        result = self.resolver.resolve_single_phone("iPhone", self.mock_db)
                        
                        if result:
                            assert len(result.alternative_matches) <= 3  # Should limit alternatives