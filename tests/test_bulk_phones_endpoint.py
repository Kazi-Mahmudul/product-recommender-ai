"""
Tests for the bulk phones endpoint components
"""
import pytest
from sqlalchemy.orm import Session
from unittest.mock import Mock, patch
from fastapi import HTTPException

from app.crud.phone import get_phones_by_ids
from app.utils.validation import parse_and_validate_ids
from app.models.phone import Phone





class TestValidationFunction:
    """Unit tests for the validation helper function"""
    
    def test_valid_ids_parsing(self):
        """Test parsing of valid comma-separated IDs"""
        result = parse_and_validate_ids("1,2,3,4")
        assert result == [1, 2, 3, 4]
    
    def test_duplicate_removal(self):
        """Test that duplicates are removed while preserving order"""
        result = parse_and_validate_ids("1,2,1,3,2")
        assert result == [1, 2, 3]
    
    def test_whitespace_handling(self):
        """Test proper whitespace handling"""
        result = parse_and_validate_ids(" 1 , 2 , 3 ")
        assert result == [1, 2, 3]
    
    def test_empty_string_error(self):
        """Test error for empty string"""
        with pytest.raises(HTTPException) as exc_info:
            parse_and_validate_ids("")
        assert exc_info.value.status_code == 400
        assert exc_info.value.detail["error_code"] == "VALIDATION_ERROR"
        assert "No phone IDs provided" in exc_info.value.detail["message"]
    
    def test_invalid_format_error(self):
        """Test error for invalid ID format"""
        with pytest.raises(HTTPException) as exc_info:
            parse_and_validate_ids("1,abc,3")
        assert exc_info.value.status_code == 422
        assert exc_info.value.detail["error_code"] == "VALIDATION_ERROR"
        assert "Invalid phone IDs provided" in exc_info.value.detail["message"]
        assert "abc" in exc_info.value.detail["invalid_ids"]
    
    def test_rate_limit_error(self):
        """Test rate limiting error"""
        ids = ",".join(str(i) for i in range(1, 52))  # 51 IDs
        with pytest.raises(HTTPException) as exc_info:
            parse_and_validate_ids(ids)
        assert exc_info.value.status_code == 400
        assert exc_info.value.detail["error_code"] == "RATE_LIMIT_ERROR"
        assert "Maximum 50 IDs allowed" in exc_info.value.detail["message"]


class TestCRUDFunction:
    """Unit tests for the CRUD function"""
    
    def test_get_phones_by_ids_success(self):
        """Test successful bulk phone retrieval from database"""
        # Mock database session and query
        mock_session = Mock(spec=Session)
        mock_query = Mock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        
        # Mock phone objects
        mock_phone1 = Mock(spec=Phone)
        mock_phone1.id = 1
        mock_phone2 = Mock(spec=Phone)
        mock_phone2.id = 2
        
        mock_query.all.return_value = [mock_phone1, mock_phone2]
        
        # Test the function
        found_phones, not_found_ids = get_phones_by_ids(mock_session, [1, 2, 3])
        
        # Verify results
        assert len(found_phones) == 2
        assert not_found_ids == [3]
        
        # Verify database query was called correctly
        mock_session.query.assert_called_once()
        mock_query.filter.assert_called_once()
    
    def test_get_phones_by_ids_empty_result(self):
        """Test bulk retrieval with no phones found"""
        mock_session = Mock(spec=Session)
        mock_query = Mock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = []
        
        found_phones, not_found_ids = get_phones_by_ids(mock_session, [999, 1000])
        
        assert len(found_phones) == 0
        assert not_found_ids == [999, 1000]
    
    def test_get_phones_by_ids_maintains_order(self):
        """Test that returned phones maintain the order of requested IDs"""
        mock_session = Mock(spec=Session)
        mock_query = Mock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        
        # Mock phones returned in different order than requested
        mock_phone2 = Mock(spec=Phone)
        mock_phone2.id = 2
        mock_phone1 = Mock(spec=Phone)
        mock_phone1.id = 1
        
        mock_query.all.return_value = [mock_phone2, mock_phone1]  # Different order
        
        found_phones, not_found_ids = get_phones_by_ids(mock_session, [1, 2])
        
        # Should return in requested order
        assert found_phones[0].id == 1
        assert found_phones[1].id == 2


if __name__ == "__main__":
    pytest.main([__file__])