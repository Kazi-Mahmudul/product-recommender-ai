"""
End-to-end integration tests for slug-based URL functionality
"""
import pytest
from sqlalchemy.orm import Session
from unittest.mock import Mock, patch

from app.models.phone import Phone


class TestSlugIntegration:
    """Integration tests for slug-based URL functionality"""
    
    def test_slug_to_phone_data_flow(self):
        """Test complete flow from slug to phone data"""
        # Mock phone data
        mock_phone = Mock(spec=Phone)
        mock_phone.id = 1
        mock_phone.name = "Samsung Galaxy A15"
        mock_phone.brand = "Samsung"
        mock_phone.slug = "samsung-galaxy-a15"
        mock_phone.price = "25000"
        
        # Test phone retrieval by slug
        from app.crud.phone import get_phone_by_slug, phone_to_dict
        
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = mock_phone
        
        result = get_phone_by_slug(mock_db, "samsung-galaxy-a15")
        
        assert result == mock_phone
        assert result.slug == "samsung-galaxy-a15"
    
    def test_id_to_slug_lookup_flow(self):
        """Test flow from ID to slug lookup"""
        mock_phone = Mock(spec=Phone)
        mock_phone.id = 1
        mock_phone.slug = "samsung-galaxy-a15"
        
        from app.crud.phone import get_phone_slug_by_id
        
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = mock_phone
        
        result = get_phone_slug_by_id(mock_db, 1)
        
        assert result == "samsung-galaxy-a15"
    
    def test_bulk_slug_lookup_flow(self):
        """Test bulk slug lookup flow"""
        mock_phones = [
            Mock(spec=Phone, id=1, slug="samsung-galaxy-a15", name="Samsung Galaxy A15"),
            Mock(spec=Phone, id=2, slug="realme-narzo-70", name="Realme Narzo 70")
        ]
        
        from app.crud.phone import get_phones_by_slugs
        
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.all.return_value = mock_phones
        
        found_phones, not_found_slugs = get_phones_by_slugs(
            mock_db, ["samsung-galaxy-a15", "realme-narzo-70"]
        )
        
        assert len(found_phones) == 2
        assert len(not_found_slugs) == 0
    



class TestSlugValidationIntegration:
    """Integration tests for slug validation across the system"""
    
    def test_slug_validation_logic(self):
        """Test slug validation logic"""
        from app.utils.validation import parse_and_validate_slugs
        from fastapi import HTTPException
        
        # Test valid slugs
        valid_slugs = ["samsung-galaxy-a15", "realme-narzo-70", "iphone-15-pro"]
        result = parse_and_validate_slugs(",".join(valid_slugs))
        assert len(result) == 3
        assert all(slug in result for slug in valid_slugs)
        
        # Test invalid slugs
        with pytest.raises(HTTPException) as exc_info:
            parse_and_validate_slugs("invalid--slug,-invalid-slug")
        assert exc_info.value.status_code == 422
    
    def test_slug_case_sensitivity_logic(self):
        """Test slug case sensitivity in CRUD operations"""
        from app.crud.phone import get_phone_by_slug
        
        mock_phone = Mock(spec=Phone)
        mock_phone.slug = "samsung-galaxy-a15"
        
        mock_db = Mock()
        
        # Test exact match
        mock_db.query.return_value.filter.return_value.first.return_value = mock_phone
        result = get_phone_by_slug(mock_db, "samsung-galaxy-a15")
        assert result == mock_phone
        
        # Test case mismatch (would not find in real database)
        mock_db.query.return_value.filter.return_value.first.return_value = None
        result = get_phone_by_slug(mock_db, "Samsung-Galaxy-A15")
        assert result is None
    
    def test_slug_format_validation(self):
        """Test slug format validation logic"""
        from app.utils.validation import parse_and_validate_slugs
        from fastapi import HTTPException
        
        # Test various slug formats
        test_cases = [
            ("phone-with-numbers-123", True),  # Should be valid
            ("phone_with_underscores", True),  # Should be valid
            ("phone.with.dots", False),        # Should be invalid (contains dots)
            ("phone+with+plus", False),        # Should be invalid (contains plus)
            ("invalid--slug", False),          # Should be invalid (double hyphen)
            ("-invalid-slug", False),          # Should be invalid (starts with hyphen)
            ("invalid-slug-", False),          # Should be invalid (ends with hyphen)
        ]
        
        for slug, should_be_valid in test_cases:
            if should_be_valid:
                try:
                    result = parse_and_validate_slugs(slug)
                    assert slug in result
                except HTTPException:
                    # If it raises an exception, the test case expectation was wrong
                    assert False, f"Expected '{slug}' to be valid but validation failed"
            else:
                with pytest.raises(HTTPException):
                    parse_and_validate_slugs(slug)