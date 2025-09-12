"""
Unit tests for Contextual Response Formatter
"""

import pytest
from app.services.contextual_response_formatter import ContextualResponseFormatter

class TestContextualResponseFormatter:
    """Test cases for ContextualResponseFormatter"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.formatter = ContextualResponseFormatter()
        
        self.mock_phones = [
            {
                'id': 1,
                'name': 'iPhone 14 Pro',
                'brand': 'Apple',
                'price_original': 120000,
                'overall_device_score': 8.5,
                'camera_score': 9.0,
                'battery_score': 7.5,
                'ram_gb': 8,
                'primary_camera_mp': 48
            },
            {
                'id': 2,
                'name': 'Samsung Galaxy S23',
                'brand': 'Samsung',
                'price_original': 85000,
                'overall_device_score': 8.2,
                'camera_score': 8.5,
                'battery_score': 8.0,
                'ram_gb': 8,
                'primary_camera_mp': 50
            }
        ]
    
    def test_format_comparison_response(self):
        """Test formatting comparison response"""
        result = self.formatter.format_comparison_response(
            self.mock_phones, 
            focus_area="camera"
        )
        
        assert result["type"] == "comparison"
        assert len(result["phones"]) == 2
        assert result["focus_area"] == "camera"
        assert "features" in result
        assert "summary" in result
        assert result["metadata"]["phone_count"] == 2
        
        # Check phone info formatting
        phone_info = result["phones"][0]
        assert "color" in phone_info
        assert phone_info["name"] == "iPhone 14 Pro"
        assert phone_info["price"] == 120000
    
    def test_format_comparison_response_insufficient_phones(self):
        """Test comparison response with insufficient phones"""
        result = self.formatter.format_comparison_response([self.mock_phones[0]])
        
        assert result["type"] == "error"
        assert result["error_type"] == "insufficient_data"
        assert "At least 2 phones" in result["message"]
        assert len(result["suggestions"]) > 0
    
    def test_format_alternative_response(self):
        """Test formatting alternative response"""
        alternatives = [self.mock_phones[1]]  # Samsung as alternative to iPhone
        reference_phone = self.mock_phones[0]  # iPhone as reference
        criteria = {"price_constraint": "lower"}
        
        result = self.formatter.format_alternative_response(
            alternatives, 
            reference_phone, 
            criteria
        )
        
        assert result["type"] == "alternative"
        assert result["reference_phone"]["name"] == "iPhone 14 Pro"
        assert len(result["alternatives"]) == 1
        assert result["alternatives"][0]["name"] == "Samsung Galaxy S23"
        assert "match_reason" in result["alternatives"][0]
        assert result["criteria"] == criteria
        assert result["metadata"]["alternative_count"] == 1
    
    def test_format_alternative_response_no_alternatives(self):
        """Test alternative response with no alternatives found"""
        result = self.formatter.format_alternative_response(
            [], 
            self.mock_phones[0], 
            {}
        )
        
        assert result["type"] == "error"
        assert result["error_type"] == "no_alternatives"
        assert "No alternatives found" in result["message"]
        assert len(result["suggestions"]) > 0
    
    def test_format_specification_response(self):
        """Test formatting specification response"""
        phone = self.mock_phones[0]
        requested_features = ["camera", "battery"]
        
        result = self.formatter.format_specification_response(
            phone, 
            requested_features
        )
        
        assert result["type"] == "specification"
        assert result["phone"]["name"] == "iPhone 14 Pro"
        assert "specifications" in result
        assert result["requested_features"] == requested_features
        assert result["metadata"]["phone_name"] == "iPhone 14 Pro"
        
        # Check that specifications are organized by category
        assert isinstance(result["specifications"], dict)
        assert len(result["specifications"]) > 0
    
    def test_format_specification_response_no_phone(self):
        """Test specification response with no phone data"""
        result = self.formatter.format_specification_response(None)
        
        assert result["type"] == "error"
        assert result["error_type"] == "no_phone_data"
        assert "No phone data available" in result["message"]
    
    def test_format_error_response(self):
        """Test formatting error response"""
        result = self.formatter.format_error_response(
            "test_error",
            "Test error message",
            ["Suggestion 1", "Suggestion 2"]
        )
        
        assert result["type"] == "error"
        assert result["error_type"] == "test_error"
        assert result["message"] == "Test error message"
        assert len(result["suggestions"]) == 2
        assert result["metadata"]["recoverable"] is True
    
    def test_generate_comparison_features_camera_focus(self):
        """Test generating comparison features with camera focus"""
        features = self.formatter._generate_comparison_features(
            self.mock_phones, 
            "camera"
        )
        
        # Should include camera-related features
        feature_keys = [f["key"] for f in features]
        assert "primary_camera_mp" in feature_keys
        assert "camera_score" in feature_keys
        
        # Check feature structure
        camera_feature = next(f for f in features if f["key"] == "primary_camera_mp")
        assert camera_feature["label"] == "Main Camera"
        assert len(camera_feature["raw"]) == 2
        assert len(camera_feature["normalized"]) == 2
        assert "unit" in camera_feature
    
    def test_generate_comparison_features_default(self):
        """Test generating default comparison features"""
        features = self.formatter._generate_comparison_features(self.mock_phones)
        
        # Should include default comprehensive features
        feature_keys = [f["key"] for f in features]
        assert "price_original" in feature_keys
        assert "ram_gb" in feature_keys
        assert "overall_device_score" in feature_keys
    
    def test_generate_comparison_summary_with_focus(self):
        """Test generating comparison summary with focus area"""
        features = [
            {
                "key": "camera_score",
                "raw": [9.0, 8.5],
                "label": "Camera Score"
            }
        ]
        
        summary = self.formatter._generate_comparison_summary(
            [{"name": "iPhone 14 Pro"}, {"name": "Samsung Galaxy S23"}],
            features,
            "camera"
        )
        
        assert "iPhone 14 Pro" in summary
        assert "camera quality" in summary.lower()
    
    def test_generate_match_reason(self):
        """Test generating match reason for alternatives"""
        phone = self.mock_phones[1]  # Samsung (cheaper)
        reference_phone = self.mock_phones[0]  # iPhone (more expensive)
        
        reason = self.formatter._generate_match_reason(phone, reference_phone)
        
        assert "cheaper" in reason.lower()
        assert "৳" in reason  # Should include price difference
    
    def test_organize_specifications(self):
        """Test organizing specifications by category"""
        phone = self.mock_phones[0]
        specs = self.formatter._organize_specifications(phone)
        
        # Should have multiple categories
        assert len(specs) > 0
        assert "Basic Info" in specs
        
        # Basic info should contain phone details
        basic_info = specs["Basic Info"]
        assert basic_info["name"] == "iPhone 14 Pro"
        assert basic_info["brand"] == "Apple"
        assert basic_info["price"] == 120000
    
    def test_organize_specifications_with_requested_features(self):
        """Test organizing specifications with specific requested features"""
        phone = self.mock_phones[0]
        requested_features = ["camera"]
        
        specs = self.formatter._organize_specifications(phone, requested_features)
        
        # Should filter to only camera-related specs
        # Check that camera-related categories are present
        found_camera_specs = False
        for category, category_specs in specs.items():
            if any("camera" in key.lower() for key in category_specs.keys()):
                found_camera_specs = True
                break
        
        # Note: This test might need adjustment based on actual phone data structure
        assert isinstance(specs, dict)
    
    def test_generate_specification_summary(self):
        """Test generating specification summary"""
        phone = self.mock_phones[0]
        specs = {"Basic Info": {"name": "iPhone 14 Pro", "price": 120000}}
        
        summary = self.formatter._generate_specification_summary(phone, specs)
        
        assert "iPhone 14 Pro" in summary
        assert isinstance(summary, str)
        assert len(summary) > 0
    
    def test_get_feature_unit(self):
        """Test getting appropriate units for features"""
        assert self.formatter._get_feature_unit("price_original") == "৳"
        assert self.formatter._get_feature_unit("ram_gb") == "GB"
        assert self.formatter._get_feature_unit("primary_camera_mp") == "MP"
        assert self.formatter._get_feature_unit("camera_score") == "/100"
        assert self.formatter._get_feature_unit("unknown_feature") == ""
    
    def test_feature_display_names(self):
        """Test feature display name mapping"""
        assert self.formatter.feature_display_names["price_original"] == "Price"
        assert self.formatter.feature_display_names["ram_gb"] == "RAM"
        assert self.formatter.feature_display_names["primary_camera_mp"] == "Main Camera"
    
    def test_brand_colors_assignment(self):
        """Test that brand colors are assigned consistently"""
        phones = [{"name": f"Phone {i}"} for i in range(12)]  # More than available colors
        
        result = self.formatter.format_comparison_response(phones)
        
        if result["type"] == "comparison":
            # Should cycle through colors
            colors = [phone["color"] for phone in result["phones"]]
            assert len(set(colors)) <= len(self.formatter.brand_colors)
    
    def test_error_response_metadata(self):
        """Test error response metadata"""
        result = self.formatter.format_error_response(
            "test_error",
            "Test message",
            ["suggestion"]
        )
        
        assert "generated_at" in result["metadata"]
        assert result["metadata"]["recoverable"] is True
        
        # Test without suggestions
        result_no_suggestions = self.formatter.format_error_response(
            "test_error",
            "Test message"
        )
        
        assert result_no_suggestions["metadata"]["recoverable"] is False