"""
Unit tests for Contextual Models and Type Definitions
"""

import pytest
from datetime import datetime, timedelta
from app.models.contextual_models import (
    QueryType, MatchType, RelationshipType, FocusArea,
    PhoneReference, ResolvedPhone, ContextualIntent, ConversationContext,
    ContextualResponse, FilterCriteria, QueryAnalytics,
    validate_phone_data, validate_session_id, validate_confidence_score,
    validate_price_range, create_contextual_intent, create_resolved_phone,
    create_contextual_response
)

class TestEnums:
    """Test cases for enum definitions"""
    
    def test_query_type_enum(self):
        """Test QueryType enum values"""
        assert QueryType.COMPARISON.value == "comparison"
        assert QueryType.ALTERNATIVE.value == "alternative"
        assert QueryType.SPECIFICATION.value == "specification"
        assert QueryType.CONTEXTUAL_RECOMMENDATION.value == "contextual_recommendation"
    
    def test_match_type_enum(self):
        """Test MatchType enum values"""
        assert MatchType.EXACT.value == "exact"
        assert MatchType.FUZZY.value == "fuzzy"
        assert MatchType.ALIAS.value == "alias"
        assert MatchType.BRAND_MODEL.value == "brand_model"
    
    def test_relationship_type_enum(self):
        """Test RelationshipType enum values"""
        assert RelationshipType.BETTER_THAN.value == "better_than"
        assert RelationshipType.CHEAPER_THAN.value == "cheaper_than"
        assert RelationshipType.SIMILAR_TO.value == "similar_to"
    
    def test_focus_area_enum(self):
        """Test FocusArea enum values"""
        assert FocusArea.CAMERA.value == "camera"
        assert FocusArea.BATTERY.value == "battery"
        assert FocusArea.PERFORMANCE.value == "performance"

class TestPhoneReference:
    """Test cases for PhoneReference dataclass"""
    
    def test_valid_phone_reference(self):
        """Test creating valid phone reference"""
        ref = PhoneReference(
            brand="Apple",
            model="iPhone 14 Pro",
            full_name="iPhone 14 Pro",
            position=0,
            confidence=0.9
        )
        
        assert ref.brand == "Apple"
        assert ref.model == "iPhone 14 Pro"
        assert ref.full_name == "iPhone 14 Pro"
        assert ref.position == 0
        assert ref.confidence == 0.9
    
    def test_phone_reference_validation(self):
        """Test phone reference validation"""
        # Test empty full_name
        with pytest.raises(ValueError, match="must have a full_name"):
            PhoneReference(
                brand="Apple",
                model="iPhone",
                full_name="",
                position=0
            )
        
        # Test negative position
        with pytest.raises(ValueError, match="Position must be non-negative"):
            PhoneReference(
                brand="Apple",
                model="iPhone",
                full_name="iPhone",
                position=-1
            )
        
        # Test invalid confidence
        with pytest.raises(ValueError, match="Confidence must be between 0 and 1"):
            PhoneReference(
                brand="Apple",
                model="iPhone",
                full_name="iPhone",
                position=0,
                confidence=1.5
            )

class TestResolvedPhone:
    """Test cases for ResolvedPhone dataclass"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.mock_phone_data = {
            'id': 1,
            'name': 'iPhone 14 Pro',
            'brand': 'Apple',
            'price_original': 120000
        }
    
    def test_valid_resolved_phone(self):
        """Test creating valid resolved phone"""
        resolved = ResolvedPhone(
            original_reference="iPhone 14 Pro",
            matched_phone=self.mock_phone_data,
            confidence_score=0.95,
            match_type=MatchType.EXACT
        )
        
        assert resolved.original_reference == "iPhone 14 Pro"
        assert resolved.matched_phone == self.mock_phone_data
        assert resolved.confidence_score == 0.95
        assert resolved.match_type == MatchType.EXACT
    
    def test_resolved_phone_string_match_type(self):
        """Test resolved phone with string match type (auto-conversion)"""
        resolved = ResolvedPhone(
            original_reference="iPhone 14 Pro",
            matched_phone=self.mock_phone_data,
            confidence_score=0.95,
            match_type="exact"  # String instead of enum
        )
        
        assert resolved.match_type == MatchType.EXACT
    
    def test_resolved_phone_properties(self):
        """Test resolved phone properties"""
        resolved = ResolvedPhone(
            original_reference="iPhone 14 Pro",
            matched_phone=self.mock_phone_data,
            confidence_score=0.95,
            match_type=MatchType.EXACT
        )
        
        assert resolved.phone_id == 1
        assert resolved.phone_name == 'iPhone 14 Pro'
        assert resolved.phone_brand == 'Apple'
    
    def test_resolved_phone_validation(self):
        """Test resolved phone validation"""
        # Test empty original reference
        with pytest.raises(ValueError, match="Original reference is required"):
            ResolvedPhone(
                original_reference="",
                matched_phone=self.mock_phone_data,
                confidence_score=0.95,
                match_type=MatchType.EXACT
            )
        
        # Test empty matched phone
        with pytest.raises(ValueError, match="Matched phone data is required"):
            ResolvedPhone(
                original_reference="iPhone",
                matched_phone={},
                confidence_score=0.95,
                match_type=MatchType.EXACT
            )

class TestContextualIntent:
    """Test cases for ContextualIntent dataclass"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.mock_phone_data = {
            'id': 1,
            'name': 'iPhone 14 Pro',
            'brand': 'Apple'
        }
        
        self.resolved_phone = ResolvedPhone(
            original_reference="iPhone 14 Pro",
            matched_phone=self.mock_phone_data,
            confidence_score=0.95,
            match_type=MatchType.EXACT
        )
    
    def test_valid_contextual_intent(self):
        """Test creating valid contextual intent"""
        intent = ContextualIntent(
            query_type=QueryType.COMPARISON,
            confidence=0.9,
            resolved_phones=[self.resolved_phone],
            relationship=RelationshipType.BETTER_THAN,
            focus_area=FocusArea.CAMERA
        )
        
        assert intent.query_type == QueryType.COMPARISON
        assert intent.confidence == 0.9
        assert len(intent.resolved_phones) == 1
        assert intent.relationship == RelationshipType.BETTER_THAN
        assert intent.focus_area == FocusArea.CAMERA
    
    def test_contextual_intent_string_enums(self):
        """Test contextual intent with string enum values (auto-conversion)"""
        intent = ContextualIntent(
            query_type="comparison",  # String instead of enum
            confidence=0.9,
            resolved_phones=[self.resolved_phone],
            relationship="better_than",  # String instead of enum
            focus_area="camera"  # String instead of enum
        )
        
        assert intent.query_type == QueryType.COMPARISON
        assert intent.relationship == RelationshipType.BETTER_THAN
        assert intent.focus_area == FocusArea.CAMERA
    
    def test_contextual_intent_properties(self):
        """Test contextual intent properties"""
        intent = ContextualIntent(
            query_type=QueryType.COMPARISON,
            confidence=0.9,
            resolved_phones=[self.resolved_phone, self.resolved_phone]
        )
        
        assert intent.phone_count == 2
        assert intent.is_multi_phone_query is True
        assert intent.primary_phone == self.resolved_phone
    
    def test_contextual_intent_validation(self):
        """Test contextual intent validation"""
        # Test invalid confidence
        with pytest.raises(ValueError, match="Confidence must be between 0 and 1"):
            ContextualIntent(
                query_type=QueryType.COMPARISON,
                confidence=1.5,
                resolved_phones=[self.resolved_phone]
            )

class TestConversationContext:
    """Test cases for ConversationContext dataclass"""
    
    def test_valid_conversation_context(self):
        """Test creating valid conversation context"""
        now = datetime.now()
        expires = now + timedelta(hours=1)
        
        context = ConversationContext(
            session_id="test_session",
            recent_phones=[],
            recent_queries=[],
            user_preferences={},
            last_updated=now,
            expires_at=expires,
            query_count=5
        )
        
        assert context.session_id == "test_session"
        assert context.query_count == 5
        assert context.phone_count == 0
        assert context.is_expired is False
    
    def test_conversation_context_serialization(self):
        """Test conversation context to/from dict conversion"""
        now = datetime.now()
        expires = now + timedelta(hours=1)
        
        context = ConversationContext(
            session_id="test_session",
            recent_phones=[{"id": 1, "name": "iPhone"}],
            recent_queries=[{"query": "test"}],
            user_preferences={"brand": "Apple"},
            last_updated=now,
            expires_at=expires,
            query_count=3
        )
        
        # Test to_dict
        context_dict = context.to_dict()
        assert context_dict["session_id"] == "test_session"
        assert context_dict["query_count"] == 3
        assert "last_updated" in context_dict
        assert "expires_at" in context_dict
        
        # Test from_dict
        restored_context = ConversationContext.from_dict(context_dict)
        assert restored_context.session_id == "test_session"
        assert restored_context.query_count == 3
        assert isinstance(restored_context.last_updated, datetime)
    
    def test_conversation_context_validation(self):
        """Test conversation context validation"""
        now = datetime.now()
        
        # Test empty session ID
        with pytest.raises(ValueError, match="Session ID is required"):
            ConversationContext(
                session_id="",
                recent_phones=[],
                recent_queries=[],
                user_preferences={},
                last_updated=now,
                expires_at=now + timedelta(hours=1)
            )
        
        # Test invalid expiration time
        with pytest.raises(ValueError, match="Expiration time must be after"):
            ConversationContext(
                session_id="test",
                recent_phones=[],
                recent_queries=[],
                user_preferences={},
                last_updated=now,
                expires_at=now - timedelta(hours=1)  # Expires before last updated
            )

class TestContextualResponse:
    """Test cases for ContextualResponse dataclass"""
    
    def test_valid_contextual_response(self):
        """Test creating valid contextual response"""
        response = ContextualResponse(
            response_type="comparison",
            data={"phones": []},
            processing_time=0.5,
            confidence=0.9,
            session_id="test_session"
        )
        
        assert response.response_type == "comparison"
        assert response.data == {"phones": []}
        assert response.processing_time == 0.5
        assert response.confidence == 0.9
        assert response.session_id == "test_session"
    
    def test_contextual_response_serialization(self):
        """Test contextual response to_dict conversion"""
        response = ContextualResponse(
            response_type="comparison",
            data={"phones": []},
            metadata={"count": 2},
            context_info={"session": "test"},
            processing_time=0.5,
            confidence=0.9,
            session_id="test_session"
        )
        
        response_dict = response.to_dict()
        
        assert response_dict["type"] == "comparison"
        assert response_dict["data"] == {"phones": []}
        assert response_dict["metadata"] == {"count": 2}
        assert response_dict["context_info"] == {"session": "test"}
        assert response_dict["processing_time"] == 0.5
        assert response_dict["confidence"] == 0.9
        assert response_dict["session_id"] == "test_session"

class TestFilterCriteria:
    """Test cases for FilterCriteria dataclass"""
    
    def test_valid_filter_criteria(self):
        """Test creating valid filter criteria"""
        criteria = FilterCriteria(
            min_price=10000,
            max_price=50000,
            brand="Apple",
            min_camera_score=8.0,
            has_fast_charging=True,
            exclude_ids=[1, 2, 3],
            limit=10
        )
        
        assert criteria.min_price == 10000
        assert criteria.max_price == 50000
        assert criteria.brand == "Apple"
        assert criteria.min_camera_score == 8.0
        assert criteria.has_fast_charging is True
        assert criteria.exclude_ids == [1, 2, 3]
        assert criteria.limit == 10
    
    def test_filter_criteria_serialization(self):
        """Test filter criteria to/from dict conversion"""
        criteria = FilterCriteria(
            min_price=10000,
            max_price=50000,
            brand="Apple"
        )
        
        # Test to_dict (should exclude None values)
        criteria_dict = criteria.to_dict()
        assert "min_price" in criteria_dict
        assert "max_price" in criteria_dict
        assert "brand" in criteria_dict
        assert "min_camera_score" not in criteria_dict  # Should be excluded (None)
        
        # Test from_dict
        restored_criteria = FilterCriteria.from_dict(criteria_dict)
        assert restored_criteria.min_price == 10000
        assert restored_criteria.max_price == 50000
        assert restored_criteria.brand == "Apple"
        assert restored_criteria.min_camera_score is None

class TestValidationFunctions:
    """Test cases for validation functions"""
    
    def test_validate_phone_data(self):
        """Test phone data validation"""
        # Valid phone data
        valid_phone = {'id': 1, 'name': 'iPhone', 'brand': 'Apple'}
        assert validate_phone_data(valid_phone) is True
        
        # Invalid phone data (missing required field)
        invalid_phone = {'id': 1, 'name': 'iPhone'}  # Missing brand
        assert validate_phone_data(invalid_phone) is False
    
    def test_validate_session_id(self):
        """Test session ID validation"""
        assert validate_session_id("valid_session_123") is True
        assert validate_session_id("short") is False
        assert validate_session_id("") is False
        assert validate_session_id(None) is False
    
    def test_validate_confidence_score(self):
        """Test confidence score validation"""
        assert validate_confidence_score(0.5) is True
        assert validate_confidence_score(0.0) is True
        assert validate_confidence_score(1.0) is True
        assert validate_confidence_score(-0.1) is False
        assert validate_confidence_score(1.1) is False
    
    def test_validate_price_range(self):
        """Test price range validation"""
        assert validate_price_range(10000, 50000) is True
        assert validate_price_range(None, 50000) is True
        assert validate_price_range(10000, None) is True
        assert validate_price_range(None, None) is True
        assert validate_price_range(-1000, 50000) is False  # Negative min price
        assert validate_price_range(10000, -50000) is False  # Negative max price
        assert validate_price_range(50000, 10000) is False  # Min > Max

class TestFactoryFunctions:
    """Test cases for factory functions"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.mock_phone_data = {
            'id': 1,
            'name': 'iPhone 14 Pro',
            'brand': 'Apple'
        }
    
    def test_create_contextual_intent(self):
        """Test contextual intent factory function"""
        resolved_phone = create_resolved_phone(
            "iPhone 14 Pro",
            self.mock_phone_data,
            0.95,
            "exact"
        )
        
        intent = create_contextual_intent(
            "comparison",
            0.9,
            [resolved_phone],
            relationship="better_than",
            focus_area="camera"
        )
        
        assert intent.query_type == QueryType.COMPARISON
        assert intent.confidence == 0.9
        assert len(intent.resolved_phones) == 1
        assert intent.relationship == RelationshipType.BETTER_THAN
        assert intent.focus_area == FocusArea.CAMERA
    
    def test_create_resolved_phone(self):
        """Test resolved phone factory function"""
        resolved = create_resolved_phone(
            "iPhone 14 Pro",
            self.mock_phone_data,
            0.95,
            "exact"
        )
        
        assert resolved.original_reference == "iPhone 14 Pro"
        assert resolved.matched_phone == self.mock_phone_data
        assert resolved.confidence_score == 0.95
        assert resolved.match_type == MatchType.EXACT
    
    def test_create_contextual_response(self):
        """Test contextual response factory function"""
        response = create_contextual_response(
            "comparison",
            {"phones": []},
            processing_time=0.5,
            confidence=0.9
        )
        
        assert response.response_type == "comparison"
        assert response.data == {"phones": []}
        assert response.processing_time == 0.5
        assert response.confidence == 0.9