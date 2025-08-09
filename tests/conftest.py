"""
Pytest configuration and fixtures for contextual query tests
"""
import pytest
import asyncio
from unittest.mock import Mock, patch
from sqlalchemy.orm import Session
from tests.fixtures.test_data import TestDataFactory, MockServiceResponses


@pytest.fixture
def mock_db_session():
    """Provide a mock database session"""
    session = Mock(spec=Session)
    session.query.return_value.filter.return_value.all.return_value = []
    session.query.return_value.filter.return_value.first.return_value = None
    session.commit.return_value = None
    session.rollback.return_value = None
    session.close.return_value = None
    return session


@pytest.fixture
def sample_phones():
    """Provide sample phone data for testing"""
    return TestDataFactory.create_sample_phones()


@pytest.fixture
def mock_context():
    """Provide a mock user context"""
    return TestDataFactory.create_mock_context("test_session", "test_user")


@pytest.fixture
def successful_integration_response():
    """Provide a successful integration service response"""
    return MockServiceResponses.successful_integration_response()


@pytest.fixture
def error_integration_response():
    """Provide an error integration service response"""
    return MockServiceResponses.error_integration_response()


@pytest.fixture
def performance_metrics():
    """Provide performance metrics data"""
    return MockServiceResponses.performance_metrics_response()


@pytest.fixture
def error_statistics():
    """Provide error statistics data"""
    return MockServiceResponses.error_statistics_response()


@pytest.fixture
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
def reset_mocks():
    """Reset all mocks after each test"""
    yield
    # This fixture runs after each test to clean up any mock state


class MockServiceFactory:
    """Factory for creating mock services with consistent behavior"""
    
    @staticmethod
    def create_mock_context_manager():
        """Create a mock context manager"""
        from app.services.context_manager import ContextManager
        mock_manager = Mock(spec=ContextManager)
        mock_manager.contexts = {}
        
        def get_or_create_context(session_id, user_id):
            if session_id not in mock_manager.contexts:
                mock_manager.contexts[session_id] = TestDataFactory.create_mock_context(session_id, user_id)
            return mock_manager.contexts[session_id]
        
        def get_context(session_id):
            return mock_manager.contexts.get(session_id)
        
        def clear_context(session_id):
            if session_id in mock_manager.contexts:
                del mock_manager.contexts[session_id]
                return True
            return False
        
        mock_manager.get_or_create_context = get_or_create_context
        mock_manager.get_context = get_context
        mock_manager.clear_context = clear_context
        mock_manager.cleanup_expired_contexts = Mock()
        
        return mock_manager
    
    @staticmethod
    def create_mock_phone_resolver(mock_phones=None):
        """Create a mock phone name resolver"""
        from app.services.phone_name_resolver import PhoneNameResolver
        mock_resolver = Mock(spec=PhoneNameResolver)
        
        if mock_phones is None:
            mock_phones = TestDataFactory.create_sample_phones()
        
        def resolve_phone_names(phone_names, db_session):
            resolved = []
            for name in phone_names:
                for phone in mock_phones:
                    if name.lower() in phone.name.lower() or name.lower() in phone.brand.lower():
                        resolved.append(phone)
                        break
            return resolved
        
        mock_resolver.resolve_phone_names = resolve_phone_names
        return mock_resolver
    
    @staticmethod
    def create_mock_ai_service():
        """Create a mock AI service"""
        from app.services.ai_service import AIService
        mock_ai = Mock(spec=AIService)
        
        async def process_contextual_query(query, context=None, conversation_history=None):
            # Simple intent detection based on keywords
            query_lower = query.lower()
            
            if any(word in query_lower for word in ['compare', 'vs', 'versus', 'difference']):
                intent_type = 'comparison'
                confidence = 0.9
            elif any(word in query_lower for word in ['spec', 'specification', 'details', 'about']):
                intent_type = 'specification'
                confidence = 0.8
            elif any(word in query_lower for word in ['recommend', 'suggest', 'best', 'good']):
                intent_type = 'recommendation'
                confidence = 0.85
            elif any(word in query_lower for word in ['alternative', 'similar', 'other', 'different']):
                intent_type = 'alternative'
                confidence = 0.8
            elif any(word in query_lower for word in ['it', 'this', 'that', 'them']):
                intent_type = 'contextual_recommendation'
                confidence = 0.75
            elif '?' in query and not any(brand in query_lower for brand in ['iphone', 'samsung', 'google']):
                intent_type = 'qa'
                confidence = 0.7
            else:
                intent_type = 'specification'
                confidence = 0.6
            
            return {
                'intent_type': intent_type,
                'confidence': confidence,
                'phone_references': [],
                'comparison_criteria': ['camera', 'performance'],
                'contextual_terms': [],
                'price_range': {'min': None, 'max': None},
                'specific_features': [],
                'query_focus': f'Mock {intent_type} query processing'
            }
        
        mock_ai.process_contextual_query = process_contextual_query
        return mock_ai


@pytest.fixture
def mock_services():
    """Provide a set of mock services"""
    return {
        'context_manager': MockServiceFactory.create_mock_context_manager(),
        'phone_resolver': MockServiceFactory.create_mock_phone_resolver(),
        'ai_service': MockServiceFactory.create_mock_ai_service()
    }


# Pytest markers for different test categories
def pytest_configure(config):
    """Configure pytest markers"""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "e2e: mark test as an end-to-end test"
    )
    config.addinivalue_line(
        "markers", "performance: mark test as a performance test"
    )
    config.addinivalue_line(
        "markers", "benchmark: mark test as a benchmark test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )


# Test collection customization
def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers based on file paths"""
    for item in items:
        # Add markers based on file path
        if "unit" in str(item.fspath):
            item.add_marker(pytest.mark.unit)
        elif "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
        elif "e2e" in str(item.fspath):
            item.add_marker(pytest.mark.e2e)
        elif "performance" in str(item.fspath):
            item.add_marker(pytest.mark.performance)
            item.add_marker(pytest.mark.slow)


# Async test configuration
@pytest.fixture(scope="session")
def event_loop_policy():
    """Set the event loop policy for async tests"""
    return asyncio.DefaultEventLoopPolicy()


# Test timeout configuration
@pytest.fixture(autouse=True)
def timeout_marker(request):
    """Add timeout to tests that don't have one"""
    if request.node.get_closest_marker("timeout") is None:
        # Add default timeout of 30 seconds for all tests
        request.node.add_marker(pytest.mark.timeout(30))


# Database test configuration
@pytest.fixture
def mock_database_operations():
    """Mock common database operations"""
    with patch('app.database.get_db') as mock_get_db:
        mock_session = Mock(spec=Session)
        mock_get_db.return_value = mock_session
        yield mock_session


# Environment variable mocking
@pytest.fixture
def mock_environment():
    """Mock environment variables for testing"""
    with patch.dict('os.environ', {
        'GEMINI_API_KEY': 'test_api_key',
        'DATABASE_URL': 'sqlite:///test.db',
        'REDIS_URL': 'redis://localhost:6379/1',
        'LOG_LEVEL': 'DEBUG',
        'TESTING': 'true'
    }):
        yield


# Logging configuration for tests
@pytest.fixture(autouse=True)
def configure_test_logging():
    """Configure logging for tests"""
    import logging
    logging.getLogger().setLevel(logging.WARNING)  # Reduce log noise during tests
    yield
    logging.getLogger().setLevel(logging.INFO)  # Reset after test