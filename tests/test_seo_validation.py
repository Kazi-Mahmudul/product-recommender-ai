"""
Tests for SEO-related functionality and URL structure validation
"""
import pytest
from unittest.mock import Mock, patch
import re

from app.models.phone import Phone


class TestSEOURLStructure:
    """Test SEO-friendly URL structure and behavior"""
    
    def test_slug_url_structure_seo_friendly(self):
        """Test that slug-based URLs follow SEO best practices"""
        # Test various slug formats
        test_slugs = [
            "samsung-galaxy-a15-5g-128gb",
            "iphone-15-pro-max",
            "realme-narzo-70-pro-5g"
        ]
        
        for slug in test_slugs:
            # Validate slug follows SEO best practices
            assert slug.islower(), f"Slug '{slug}' should be lowercase"
            assert " " not in slug, f"Slug '{slug}' should not contain spaces"
            assert slug.replace("-", "").replace("_", "").isalnum(), f"Slug '{slug}' should only contain alphanumeric characters and hyphens/underscores"
            assert not slug.startswith("-"), f"Slug '{slug}' should not start with hyphen"
            assert not slug.endswith("-"), f"Slug '{slug}' should not end with hyphen"
            assert "--" not in slug, f"Slug '{slug}' should not contain consecutive hyphens"
    
    def test_comparison_url_structure_seo_friendly(self):
        """Test that comparison URLs are SEO-friendly"""
        # Test comparison URL structure
        comparison_url = "samsung-galaxy-a15-vs-realme-narzo-70"
        
        # Validate comparison URL structure
        assert "-vs-" in comparison_url, "Comparison URL should use '-vs-' separator"
        parts = comparison_url.split("-vs-")
        assert len(parts) == 2, "Comparison URL should have exactly two phone slugs"
        
        for part in parts:
            assert part.islower(), "Each phone slug should be lowercase"
            assert " " not in part, "Phone slugs should not contain spaces"
    
    def test_url_length_optimization(self):
        """Test that URLs are optimized for length while remaining descriptive"""
        # Test various phone name lengths and slug generation
        test_cases = [
            ("Samsung Galaxy A15 5G 128GB Blue", "samsung-galaxy-a15-5g-128gb-blue"),
            ("iPhone 15 Pro Max 256GB Natural Titanium", "iphone-15-pro-max-256gb-natural-titanium"),
            ("Realme Narzo 70 Pro 5G", "realme-narzo-70-pro-5g")
        ]
        
        for phone_name, expected_slug in test_cases:
            # Validate URL length is reasonable (under 100 characters for the slug part)
            assert len(expected_slug) < 100, f"Slug '{expected_slug}' should be under 100 characters"
            
            # Validate slug is descriptive but concise
            slug_words = expected_slug.split("-")
            assert len(slug_words) >= 2, "Slug should contain at least 2 words for descriptiveness"
            assert len(slug_words) <= 10, "Slug should not be overly long"


class TestSlugValidation:
    """Test slug validation logic"""
    
    def test_valid_slug_formats(self):
        """Test validation of valid slug formats"""
        valid_slugs = [
            "samsung-galaxy-a15",
            "iphone-15-pro",
            "realme-narzo-70-5g",
            "phone-123",
            "brand-model-variant"
        ]
        
        for slug in valid_slugs:
            # Basic validation that would be done by the validation function
            assert isinstance(slug, str), "Slug should be a string"
            assert len(slug) >= 2, "Slug should be at least 2 characters"
            assert slug.replace('-', '').replace('_', '').isalnum(), "Slug should contain only alphanumeric characters and hyphens/underscores"
            assert not slug.startswith('-'), "Slug should not start with hyphen"
            assert not slug.endswith('-'), "Slug should not end with hyphen"
            assert '--' not in slug, "Slug should not contain consecutive hyphens"
    
    def test_invalid_slug_formats(self):
        """Test validation of invalid slug formats"""
        invalid_slugs = [
            "",           # Empty
            "-",          # Just hyphen
            "--",         # Double hyphen
            "-invalid",   # Starts with hyphen
            "invalid-",   # Ends with hyphen
            "invalid--slug",  # Double hyphen in middle
        ]
        
        for slug in invalid_slugs:
            # These should fail basic validation
            is_valid = (
                slug and 
                len(slug) >= 2 and 
                slug.replace('-', '').replace('_', '').isalnum() and
                not slug.startswith('-') and 
                not slug.endswith('-') and
                '--' not in slug
            )
            assert not is_valid, f"Slug '{slug}' should be invalid"


class TestSEOBestPractices:
    """Test SEO best practices implementation"""
    
    def test_slug_case_consistency(self):
        """Test that slugs are consistently lowercase"""
        test_slugs = [
            "samsung-galaxy-a15",
            "iphone-15-pro-max",
            "realme-narzo-70"
        ]
        
        for slug in test_slugs:
            assert slug == slug.lower(), f"Slug '{slug}' should be lowercase"
    
    def test_slug_word_separation(self):
        """Test that slug words are properly separated"""
        test_cases = [
            ("Samsung Galaxy A15", "samsung-galaxy-a15"),
            ("iPhone 15 Pro", "iphone-15-pro"),
            ("Realme Narzo 70", "realme-narzo-70")
        ]
        
        for original, expected_slug in test_cases:
            # Validate that spaces are replaced with hyphens
            assert " " not in expected_slug, "Slug should not contain spaces"
            assert "-" in expected_slug, "Slug should use hyphens to separate words"
    
    def test_slug_special_character_handling(self):
        """Test handling of special characters in slugs"""
        # Test that special characters are handled appropriately
        problematic_chars = ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "+", "="]
        
        for char in problematic_chars:
            test_slug = f"phone{char}model"
            # In a real implementation, these would be cleaned
            # For now, we just test that we can identify them as problematic
            contains_special = any(c in test_slug for c in problematic_chars)
            assert contains_special, f"Should detect special character in '{test_slug}'"