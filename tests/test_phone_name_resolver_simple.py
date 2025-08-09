"""
Simplified unit tests for Phone Name Resolver
"""

import pytest
from app.services.phone_name_resolver import PhoneNameResolver, ResolvedPhone

class TestPhoneNameResolverSimple:
    """Simplified test cases for PhoneNameResolver"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.resolver = PhoneNameResolver()
    
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
    
    def test_phone_variations(self):
        """Test phone name variations generation"""
        variations = self.resolver.get_phone_variations("iPhone 14 Pro")
        
        assert "iPhone 14 Pro" in variations
        assert "iPhone14Pro" in variations
        assert "iPhone-14-Pro" in variations
    
    def test_brand_aliases(self):
        """Test brand aliases are properly configured"""
        assert "apple" in self.resolver.brand_aliases
        assert "samsung" in self.resolver.brand_aliases
        assert "xiaomi" in self.resolver.brand_aliases
        
        # Test that iPhone is an alias for Apple
        assert "iphone" in self.resolver.brand_aliases["apple"]
        assert "galaxy" in self.resolver.brand_aliases["samsung"]
    
    def test_model_patterns(self):
        """Test model patterns are properly configured"""
        patterns = self.resolver.model_patterns
        assert len(patterns) > 0
        
        # Check that iPhone patterns exist
        iphone_patterns = [p for p in patterns if "iPhone" in p["pattern"]]
        assert len(iphone_patterns) > 0
        
        # Check that Samsung patterns exist
        samsung_patterns = [p for p in patterns if "Galaxy" in p["pattern"]]
        assert len(samsung_patterns) > 0
    
    def test_abbreviations(self):
        """Test common abbreviations are configured"""
        abbrevs = self.resolver.common_abbreviations
        assert "pro" in abbrevs
        assert "max" in abbrevs
        assert "plus" in abbrevs
        assert abbrevs["pro"] == "Pro"
    
    def test_confidence_thresholds(self):
        """Test confidence thresholds are reasonable"""
        assert 0 < self.resolver.min_confidence_threshold < 1
        assert 0 < self.resolver.fuzzy_threshold < 1
        assert self.resolver.fuzzy_threshold > self.resolver.min_confidence_threshold
    
    def test_resolved_phone_creation(self):
        """Test ResolvedPhone object creation"""
        mock_phone_data = {
            'id': 1,
            'name': 'iPhone 14 Pro',
            'brand': 'Apple',
            'price_original': 120000
        }
        
        resolved = ResolvedPhone(
            original_reference="iPhone 14 Pro",
            matched_phone=mock_phone_data,
            confidence_score=0.95,
            match_type="exact",
            alternative_matches=[]
        )
        
        assert resolved.original_reference == "iPhone 14 Pro"
        assert resolved.matched_phone == mock_phone_data
        assert resolved.confidence_score == 0.95
        assert resolved.match_type == "exact"
    
    def test_resolved_phone_validation(self):
        """Test ResolvedPhone basic functionality"""
        mock_phone_data = {
            'id': 1,
            'name': 'iPhone 14 Pro',
            'brand': 'Apple'
        }
        
        # Test valid creation
        resolved = ResolvedPhone(
            original_reference="iPhone 14 Pro",
            matched_phone=mock_phone_data,
            confidence_score=0.95,
            match_type="exact",
            alternative_matches=[]
        )
        
        assert resolved.confidence_score == 0.95
        assert resolved.match_type == "exact"
        
        # Test with different confidence scores
        resolved2 = ResolvedPhone(
            original_reference="iPhone",
            matched_phone=mock_phone_data,
            confidence_score=0.7,
            match_type="fuzzy",
            alternative_matches=[]
        )
        
        assert resolved2.confidence_score == 0.7
        assert resolved2.match_type == "fuzzy"
    
    def test_phone_name_patterns_coverage(self):
        """Test that phone name patterns cover major brands"""
        patterns = self.resolver.model_patterns
        pattern_text = " ".join([p["pattern"] for p in patterns])
        
        # Check major brands are covered
        assert "iPhone" in pattern_text
        assert "Galaxy" in pattern_text
        assert "OnePlus" in pattern_text
        assert "Xiaomi" in pattern_text
        assert "Pixel" in pattern_text
    
    def test_feature_mappings_exist(self):
        """Test that feature mappings are properly configured"""
        # This tests the internal structure without database dependencies
        assert hasattr(self.resolver, 'brand_aliases')
        assert hasattr(self.resolver, 'model_patterns')
        assert hasattr(self.resolver, 'common_abbreviations')
        
        # Test that mappings are not empty
        assert len(self.resolver.brand_aliases) > 0
        assert len(self.resolver.model_patterns) > 0
        assert len(self.resolver.common_abbreviations) > 0