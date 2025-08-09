"""
Data Models and Type Definitions for Contextual Query System
"""

from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

class QueryType(Enum):
    """Enumeration of query types"""
    COMPARISON = "comparison"
    ALTERNATIVE = "alternative"
    SPECIFICATION = "specification"
    CONTEXTUAL_RECOMMENDATION = "contextual_recommendation"
    RECOMMENDATION = "recommendation"
    QA = "qa"
    CHAT = "chat"

class MatchType(Enum):
    """Enumeration of phone name match types"""
    EXACT = "exact"
    FUZZY = "fuzzy"
    ALIAS = "alias"
    BRAND_MODEL = "brand_model"

class RelationshipType(Enum):
    """Enumeration of contextual relationship types"""
    BETTER_THAN = "better_than"
    CHEAPER_THAN = "cheaper_than"
    SIMILAR_TO = "similar_to"
    ALTERNATIVE_TO = "alternative_to"
    MORE_EXPENSIVE_THAN = "more_expensive_than"
    WORSE_THAN = "worse_than"

class FocusArea(Enum):
    """Enumeration of query focus areas"""
    CAMERA = "camera"
    BATTERY = "battery"
    PERFORMANCE = "performance"
    DISPLAY = "display"
    PRICE = "price"
    DESIGN = "design"
    CONNECTIVITY = "connectivity"
    SECURITY = "security"

@dataclass
class PhoneReference:
    """Represents a phone reference extracted from query"""
    brand: str
    model: str
    full_name: str
    position: int
    confidence: float = 0.0
    
    def __post_init__(self):
        """Validate phone reference data"""
        if not self.full_name:
            raise ValueError("Phone reference must have a full_name")
        if self.position < 0:
            raise ValueError("Position must be non-negative")
        if not 0 <= self.confidence <= 1:
            raise ValueError("Confidence must be between 0 and 1")

@dataclass
class ResolvedPhone:
    """Represents a resolved phone with matching information"""
    original_reference: str
    matched_phone: Dict[str, Any]
    confidence_score: float
    match_type: MatchType
    alternative_matches: List[Dict[str, Any]] = field(default_factory=list)
    
    def __post_init__(self):
        """Validate resolved phone data"""
        if not self.original_reference:
            raise ValueError("Original reference is required")
        if not self.matched_phone:
            raise ValueError("Matched phone data is required")
        if not 0 <= self.confidence_score <= 1:
            raise ValueError("Confidence score must be between 0 and 1")
        if not isinstance(self.match_type, MatchType):
            if isinstance(self.match_type, str):
                self.match_type = MatchType(self.match_type)
            else:
                raise ValueError("Match type must be a MatchType enum")
    
    @property
    def phone_id(self) -> Optional[int]:
        """Get the phone ID from matched phone data"""
        return self.matched_phone.get('id')
    
    @property
    def phone_name(self) -> Optional[str]:
        """Get the phone name from matched phone data"""
        return self.matched_phone.get('name')
    
    @property
    def phone_brand(self) -> Optional[str]:
        """Get the phone brand from matched phone data"""
        return self.matched_phone.get('brand')

@dataclass
class ContextualIntent:
    """Enhanced contextual intent with resolved phones and metadata"""
    query_type: QueryType
    confidence: float
    resolved_phones: List[ResolvedPhone]
    relationship: Optional[RelationshipType] = None
    focus_area: Optional[FocusArea] = None
    filters: Dict[str, Any] = field(default_factory=dict)
    context_metadata: Dict[str, Any] = field(default_factory=dict)
    original_query: str = ""
    processed_query: str = ""
    
    def __post_init__(self):
        """Validate contextual intent data"""
        if not isinstance(self.query_type, QueryType):
            if isinstance(self.query_type, str):
                self.query_type = QueryType(self.query_type)
            else:
                raise ValueError("Query type must be a QueryType enum")
        
        if not 0 <= self.confidence <= 1:
            raise ValueError("Confidence must be between 0 and 1")
        
        if self.relationship and not isinstance(self.relationship, RelationshipType):
            if isinstance(self.relationship, str):
                self.relationship = RelationshipType(self.relationship)
            else:
                raise ValueError("Relationship must be a RelationshipType enum")
        
        if self.focus_area and not isinstance(self.focus_area, FocusArea):
            if isinstance(self.focus_area, str):
                self.focus_area = FocusArea(self.focus_area)
            else:
                raise ValueError("Focus area must be a FocusArea enum")
    
    @property
    def phone_count(self) -> int:
        """Get the number of resolved phones"""
        return len(self.resolved_phones)
    
    @property
    def is_multi_phone_query(self) -> bool:
        """Check if this is a multi-phone query"""
        return len(self.resolved_phones) > 1
    
    @property
    def primary_phone(self) -> Optional[ResolvedPhone]:
        """Get the primary (first) resolved phone"""
        return self.resolved_phones[0] if self.resolved_phones else None

@dataclass
class ConversationContext:
    """Represents conversation context for a user session"""
    session_id: str
    recent_phones: List[Dict[str, Any]]
    recent_queries: List[Dict[str, Any]]
    user_preferences: Dict[str, Any]
    last_updated: datetime
    expires_at: datetime
    query_count: int = 0
    
    def __post_init__(self):
        """Validate conversation context data"""
        if not self.session_id:
            raise ValueError("Session ID is required")
        if self.query_count < 0:
            raise ValueError("Query count must be non-negative")
        if self.expires_at <= self.last_updated:
            raise ValueError("Expiration time must be after last updated time")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'session_id': self.session_id,
            'recent_phones': self.recent_phones,
            'recent_queries': self.recent_queries,
            'user_preferences': self.user_preferences,
            'last_updated': self.last_updated.isoformat(),
            'expires_at': self.expires_at.isoformat(),
            'query_count': self.query_count
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ConversationContext':
        """Create from dictionary"""
        return cls(
            session_id=data['session_id'],
            recent_phones=data['recent_phones'],
            recent_queries=data['recent_queries'],
            user_preferences=data['user_preferences'],
            last_updated=datetime.fromisoformat(data['last_updated']),
            expires_at=datetime.fromisoformat(data['expires_at']),
            query_count=data.get('query_count', 0)
        )
    
    @property
    def is_expired(self) -> bool:
        """Check if the context has expired"""
        return datetime.now() > self.expires_at
    
    @property
    def phone_count(self) -> int:
        """Get the number of recent phones"""
        return len(self.recent_phones)

@dataclass
class ContextualResponse:
    """Represents a contextual response with metadata"""
    response_type: str
    data: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)
    context_info: Optional[Dict[str, Any]] = None
    processing_time: float = 0.0
    confidence: float = 0.0
    session_id: Optional[str] = None
    
    def __post_init__(self):
        """Validate contextual response data"""
        if not self.response_type:
            raise ValueError("Response type is required")
        if self.processing_time < 0:
            raise ValueError("Processing time must be non-negative")
        if not 0 <= self.confidence <= 1:
            raise ValueError("Confidence must be between 0 and 1")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            'type': self.response_type,
            'data': self.data,
            'metadata': self.metadata,
            'processing_time': self.processing_time,
            'confidence': self.confidence
        }
        
        if self.context_info:
            result['context_info'] = self.context_info
        
        if self.session_id:
            result['session_id'] = self.session_id
        
        return result

@dataclass
class FilterCriteria:
    """Represents filter criteria for contextual queries"""
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    brand: Optional[str] = None
    min_overall_score: Optional[float] = None
    max_overall_score: Optional[float] = None
    min_camera_score: Optional[float] = None
    max_camera_score: Optional[float] = None
    min_battery_score: Optional[float] = None
    max_battery_score: Optional[float] = None
    min_performance_score: Optional[float] = None
    max_performance_score: Optional[float] = None
    min_display_score: Optional[float] = None
    max_display_score: Optional[float] = None
    min_ram_gb: Optional[int] = None
    max_ram_gb: Optional[int] = None
    min_storage_gb: Optional[int] = None
    max_storage_gb: Optional[int] = None
    has_fast_charging: Optional[bool] = None
    has_wireless_charging: Optional[bool] = None
    exclude_ids: List[int] = field(default_factory=list)
    limit: Optional[int] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary, excluding None values"""
        result = {}
        for key, value in self.__dict__.items():
            if value is not None:
                if isinstance(value, list) and not value:
                    continue  # Skip empty lists
                result[key] = value
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'FilterCriteria':
        """Create from dictionary"""
        # Filter out keys that don't exist in the dataclass
        valid_keys = {field.name for field in cls.__dataclass_fields__.values()}
        filtered_data = {k: v for k, v in data.items() if k in valid_keys}
        return cls(**filtered_data)

@dataclass
class QueryAnalytics:
    """Represents analytics data for a query"""
    query_id: str
    session_id: Optional[str]
    query_text: str
    query_type: QueryType
    processing_time: float
    confidence: float
    phone_count: int
    success: bool
    error_type: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)
    
    def __post_init__(self):
        """Validate analytics data"""
        if not self.query_id:
            raise ValueError("Query ID is required")
        if not self.query_text:
            raise ValueError("Query text is required")
        if self.processing_time < 0:
            raise ValueError("Processing time must be non-negative")
        if not 0 <= self.confidence <= 1:
            raise ValueError("Confidence must be between 0 and 1")
        if self.phone_count < 0:
            raise ValueError("Phone count must be non-negative")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        return {
            'query_id': self.query_id,
            'session_id': self.session_id,
            'query_text': self.query_text,
            'query_type': self.query_type.value,
            'processing_time': self.processing_time,
            'confidence': self.confidence,
            'phone_count': self.phone_count,
            'success': self.success,
            'error_type': self.error_type,
            'timestamp': self.timestamp.isoformat()
        }

# Type aliases for better code readability
PhoneData = Dict[str, Any]
FilterDict = Dict[str, Any]
ContextDict = Dict[str, Any]
ResponseDict = Dict[str, Any]

# Validation functions
def validate_phone_data(phone_data: PhoneData) -> bool:
    """Validate phone data structure"""
    required_fields = ['id', 'name', 'brand']
    return all(field in phone_data for field in required_fields)

def validate_session_id(session_id: str) -> bool:
    """Validate session ID format"""
    return bool(session_id and len(session_id) >= 8)

def validate_confidence_score(score: float) -> bool:
    """Validate confidence score range"""
    return 0.0 <= score <= 1.0

def validate_price_range(min_price: Optional[float], max_price: Optional[float]) -> bool:
    """Validate price range"""
    if min_price is not None and min_price < 0:
        return False
    if max_price is not None and max_price < 0:
        return False
    if min_price is not None and max_price is not None and min_price > max_price:
        return False
    return True

# Factory functions for creating common objects
def create_contextual_intent(
    query_type: str,
    confidence: float,
    resolved_phones: List[ResolvedPhone],
    **kwargs
) -> ContextualIntent:
    """Factory function to create ContextualIntent"""
    return ContextualIntent(
        query_type=QueryType(query_type),
        confidence=confidence,
        resolved_phones=resolved_phones,
        **kwargs
    )

def create_resolved_phone(
    original_reference: str,
    matched_phone: PhoneData,
    confidence_score: float,
    match_type: str,
    **kwargs
) -> ResolvedPhone:
    """Factory function to create ResolvedPhone"""
    return ResolvedPhone(
        original_reference=original_reference,
        matched_phone=matched_phone,
        confidence_score=confidence_score,
        match_type=MatchType(match_type),
        **kwargs
    )

def create_contextual_response(
    response_type: str,
    data: Dict[str, Any],
    **kwargs
) -> ContextualResponse:
    """Factory function to create ContextualResponse"""
    return ContextualResponse(
        response_type=response_type,
        data=data,
        **kwargs
    )