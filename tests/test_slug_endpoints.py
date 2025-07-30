"""
Tests for slug-based API endpoints
"""
import pytest
from sqlalchemy.orm import Session
from unittest.mock import Mock, patch

from app.models.phone import Phone
from app.crud import phone as phone_crud


class TestSlugBasedCRUD:
    """Test class for slug-based CRUD operations"""
    
    def test_get_phone_by_slug_success(self):
        """Test successful phone retrieval by slug"""
        mock_phone = Mock(spec=Phone)
        mock_phone.id = 1
        mock_phone.name = "Samsung Galaxy A15"
        mock_phone.slug = "samsung-galaxy-a15"
        
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = mock_phone
        
        result = phone_crud.get_phone_by_slug(mock_db, "samsung-galaxy-a15")
        
        assert result == mock_phone
        mock_db.query.assert_called_once_with(Phone)
    
    def test_get_phone_by_slug_not_found(self):
        """Test phone not found by slug"""
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        result = phone_crud.get_phone_by_slug(mock_db, "nonexistent-phone")
        
        assert result is None
    
    def test_get_phones_by_slugs_success(self):
        """Test successful bulk phone retrieval by slugs"""
        mock_phones = [
            Mock(spec=Phone, id=1, slug="samsung-galaxy-a15"),
            Mock(spec=Phone, id=2, slug="realme-narzo-70")
        ]
        
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.all.return_value = mock_phones
        
        found_phones, not_found_slugs = phone_crud.get_phones_by_slugs(
            mock_db, ["samsung-galaxy-a15", "realme-narzo-70"]
        )
        
        assert len(found_phones) == 2
        assert len(not_found_slugs) == 0
    
    def test_get_phones_by_slugs_partial_found(self):
        """Test bulk phone retrieval with some slugs not found"""
        mock_phones = [
            Mock(spec=Phone, id=1, slug="samsung-galaxy-a15")
        ]
        
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.all.return_value = mock_phones
        
        found_phones, not_found_slugs = phone_crud.get_phones_by_slugs(
            mock_db, ["samsung-galaxy-a15", "nonexistent-phone"]
        )
        
        assert len(found_phones) == 1
        assert "nonexistent-phone" in not_found_slugs
    
    def test_get_phone_slug_by_id_success(self):
        """Test successful slug retrieval by ID"""
        mock_phone = Mock(spec=Phone)
        mock_phone.slug = "samsung-galaxy-a15"
        
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = mock_phone
        
        result = phone_crud.get_phone_slug_by_id(mock_db, 1)
        
        assert result == "samsung-galaxy-a15"
    
    def test_get_phone_slug_by_id_not_found(self):
        """Test slug retrieval when phone not found"""
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        result = phone_crud.get_phone_slug_by_id(mock_db, 999)
        
        assert result is None


class TestSlugValidation:
    """Test class for slug validation utilities"""
    
    def test_parse_and_validate_slugs_valid(self):
        """Test parsing and validation of valid slugs"""
        from app.utils.validation import parse_and_validate_slugs
        
        slugs = parse_and_validate_slugs("samsung-galaxy-a15,realme-narzo-70")
        assert len(slugs) == 2
        assert "samsung-galaxy-a15" in slugs
        assert "realme-narzo-70" in slugs
    
    def test_parse_and_validate_slugs_invalid(self):
        """Test parsing and validation of invalid slugs"""
        from app.utils.validation import parse_and_validate_slugs
        from fastapi import HTTPException
        
        # Test empty input
        with pytest.raises(HTTPException) as exc_info:
            parse_and_validate_slugs("")
        assert exc_info.value.status_code == 400
        
        # Test invalid slug format
        with pytest.raises(HTTPException) as exc_info:
            parse_and_validate_slugs("invalid--slug,another-invalid-")
        assert exc_info.value.status_code == 422
    
    def test_parse_and_validate_slugs_rate_limit(self):
        """Test rate limiting for slug validation"""
        from app.utils.validation import parse_and_validate_slugs
        from fastapi import HTTPException
        
        # Create more than 50 slugs
        many_slugs = ",".join([f"phone-{i}" for i in range(51)])
        
        with pytest.raises(HTTPException) as exc_info:
            parse_and_validate_slugs(many_slugs)
        assert exc_info.value.status_code == 400
        assert "Maximum 50 slugs allowed" in str(exc_info.value.detail)


