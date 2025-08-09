"""
Unit tests for Security and Input Validation
"""

import pytest
import time
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

from app.services.security_validator import (
    InputValidator, RateLimiter, SessionSecurity, DataPrivacyManager,
    SecurityContext, ValidationResult
)

class TestInputValidator:
    """Test cases for input validation"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.validator = InputValidator()
        self.security_context = SecurityContext(
            session_id="test_session_123",
            user_id="test_user",
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0 Test Browser",
            timestamp=datetime.now()
        )
    
    def test_valid_query_input(self):
        """Test validation of valid query input"""
        valid_queries = [
            "Compare iPhone 14 Pro with Samsung Galaxy S23",
            "What's the best camera phone under 50000 taka?",
            "Show me phones with good battery life",
            "Tell me about Xiaomi 13 Pro specifications"
        ]
        
        for query in valid_queries:
            result = self.validator.validate_query_input(query, self.security_context)
            assert result.is_valid, f"Query should be valid: {query}"
            assert result.risk_level in ["low", "medium"]
            assert len(result.sanitized_input) > 0
    
    def test_sql_injection_detection(self):
        """Test SQL injection detection"""
        malicious_queries = [
            "'; DROP TABLE phones; --",
            "SELECT * FROM phones WHERE id = 1 OR 1=1",
            "UNION SELECT password FROM users",
            "INSERT INTO phones VALUES ('malicious')",
            "DELETE FROM phones WHERE brand = 'Apple'"
        ]
        
        for query in malicious_queries:
            result = self.validator.validate_query_input(query, self.security_context)
            assert not result.is_valid, f"SQL injection should be detected: {query}"
            assert result.risk_level == "critical"
            assert any("SQL injection" in violation for violation in result.violations)
    
    def test_xss_detection(self):
        """Test XSS detection"""
        xss_queries = [
            "<script>alert('xss')</script>",
            "javascript:alert('test')",
            "<iframe src='malicious.com'></iframe>",
            "onload=alert('xss')",
            "<object data='malicious.swf'></object>"
        ]
        
        for query in xss_queries:
            result = self.validator.validate_query_input(query, self.security_context)
            assert not result.is_valid, f"XSS should be detected: {query}"
            assert result.risk_level == "high"
            assert any("XSS" in violation for violation in result.violations)
    
    def test_path_traversal_detection(self):
        """Test path traversal detection"""
        traversal_queries = [
            "../../../etc/passwd",
            "..\\..\\windows\\system32",
            "/etc/shadow",
            "..%2f..%2fetc%2fpasswd"
        ]
        
        for query in traversal_queries:
            result = self.validator.validate_query_input(query, self.security_context)
            assert not result.is_valid, f"Path traversal should be detected: {query}"
            assert result.risk_level == "high"
            assert any("path traversal" in violation for violation in result.violations)
    
    def test_template_injection_detection(self):
        """Test template injection detection"""
        template_queries = [
            "{{7*7}}",
            "{%for item in items%}",
            "${java.lang.Runtime}",
            "<%=system('whoami')%>"
        ]
        
        for query in template_queries:
            result = self.validator.validate_query_input(query, self.security_context)
            assert not result.is_valid, f"Template injection should be detected: {query}"
            assert result.risk_level == "high"
            assert any("template injection" in violation for violation in result.violations)
    
    def test_command_injection_detection(self):
        """Test command injection detection"""
        command_queries = [
            "test; cat /etc/passwd",
            "test | whoami",
            "test && ls -la",
            "test `id`",
            "test $(whoami)"
        ]
        
        for query in command_queries:
            result = self.validator.validate_query_input(query, self.security_context)
            assert not result.is_valid, f"Command injection should be detected: {query}"
            assert result.risk_level == "critical"
            assert any("command injection" in violation for violation in result.violations)
    
    def test_query_length_validation(self):
        """Test query length validation"""
        # Test normal length
        normal_query = "Compare iPhone with Samsung"
        result = self.validator.validate_query_input(normal_query, self.security_context)
        assert result.is_valid
        
        # Test very long query
        long_query = "A" * 3000  # Exceeds max_query_length
        result = self.validator.validate_query_input(long_query, self.security_context)
        assert result.risk_level == "medium"
        assert any("too long" in violation for violation in result.violations)
        assert len(result.sanitized_input) <= self.validator.max_query_length
    
    def test_empty_query_handling(self):
        """Test handling of empty queries"""
        empty_queries = ["", "   ", "\n\t", None]
        
        for query in empty_queries:
            result = self.validator.validate_query_input(query, self.security_context)
            assert not result.is_valid
            assert result.risk_level == "low"
            assert "Empty query" in result.violations
    
    def test_session_id_validation(self):
        """Test session ID validation"""
        # Valid session IDs
        valid_sessions = [
            "session_123456789",
            "ctx_abcdef123456",
            "user-session-12345",
            "a1b2c3d4e5f6g7h8"
        ]
        
        for session_id in valid_sessions:
            result = self.validator.validate_session_id(session_id)
            assert result.is_valid, f"Session ID should be valid: {session_id}"
        
        # Invalid session IDs
        invalid_sessions = [
            "short",  # Too short
            "session with spaces",  # Contains spaces
            "session@#$%",  # Invalid characters
            "A" * 200,  # Too long
            ""  # Empty
        ]
        
        for session_id in invalid_sessions:
            result = self.validator.validate_session_id(session_id)
            assert not result.is_valid, f"Session ID should be invalid: {session_id}"
    
    def test_user_id_validation(self):
        """Test user ID validation"""
        # Valid user IDs
        valid_users = [
            "user123",
            "test-user@example.com",
            "user_name_123",
            ""  # Empty is allowed (optional)
        ]
        
        for user_id in valid_users:
            result = self.validator.validate_user_id(user_id)
            assert result.is_valid, f"User ID should be valid: {user_id}"
        
        # Invalid user ID (too long)
        long_user_id = "A" * 300
        result = self.validator.validate_user_id(long_user_id)
        assert result.risk_level == "medium"
        assert any("too long" in violation for violation in result.violations)
    
    def test_text_sanitization(self):
        """Test text sanitization"""
        test_cases = [
            ("<script>alert('test')</script>", "&lt;script&gt;alert('test')&lt;/script&gt;"),
            ("Test\x00null\x01control", "Testnullcontrol"),
            ("Multiple   spaces", "Multiple spaces"),
            ("Test\u200Bhidden\u200Cchars", "Testhiddenchars")
        ]
        
        for input_text, expected_pattern in test_cases:
            sanitized = self.validator._sanitize_text(input_text)
            assert expected_pattern in sanitized or len(sanitized) < len(input_text)
    
    def test_suspicious_character_detection(self):
        """Test suspicious character detection"""
        # Text with excessive special characters
        suspicious_text = "!@#$%^&*()_+{}|:<>?[]\\;'\",./"
        violations = self.validator._check_suspicious_characters(suspicious_text)
        assert len(violations) > 0
        assert any("special characters" in violation for violation in violations)
        
        # Normal text
        normal_text = "Compare iPhone 14 Pro with Samsung Galaxy S23"
        violations = self.validator._check_suspicious_characters(normal_text)
        assert len(violations) == 0
    
    def test_excessive_repetition_detection(self):
        """Test excessive repetition detection"""
        # Excessive character repetition
        repetitive_text = "aaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        assert self.validator._has_excessive_repetition(repetitive_text)
        
        # Excessive pattern repetition
        pattern_text = "abcabc" * 20
        assert self.validator._has_excessive_repetition(pattern_text)
        
        # Normal text
        normal_text = "Compare iPhone with Samsung Galaxy"
        assert not self.validator._has_excessive_repetition(normal_text)

class TestRateLimiter:
    """Test cases for rate limiting"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.rate_limiter = RateLimiter()
        self.identifier = "test_ip_192.168.1.1"
    
    def test_normal_request_rate(self):
        """Test normal request rate is allowed"""
        # Make a few requests
        for i in range(5):
            allowed, info = self.rate_limiter.is_allowed(self.identifier)
            assert allowed, f"Request {i} should be allowed"
            assert info['allowed']
    
    def test_rate_limit_enforcement(self):
        """Test rate limit enforcement"""
        # Exceed per-minute limit
        for i in range(65):  # Exceed the 60 per minute limit
            allowed, info = self.rate_limiter.is_allowed(self.identifier)
            
            if i < 60:
                assert allowed, f"Request {i} should be allowed"
            else:
                assert not allowed, f"Request {i} should be rate limited"
                assert info['rate_limited']
                assert info['rule'] == 'per_minute'
    
    def test_different_identifiers(self):
        """Test that different identifiers have separate limits"""
        identifier1 = "ip1"
        identifier2 = "ip2"
        
        # Exhaust limit for identifier1
        for i in range(65):
            self.rate_limiter.is_allowed(identifier1)
        
        # identifier2 should still be allowed
        allowed, info = self.rate_limiter.is_allowed(identifier2)
        assert allowed
        assert info['allowed']
    
    def test_request_cleanup(self):
        """Test that old requests are cleaned up"""
        # Make some requests
        for i in range(10):
            self.rate_limiter.is_allowed(self.identifier)
        
        # Manually clean old requests
        current_time = time.time()
        self.rate_limiter._clean_old_requests(self.identifier, current_time + 3700)  # 1 hour later
        
        # Should have fewer requests in memory
        assert len(self.rate_limiter.request_counts[self.identifier]) < 10
    
    def test_ip_blocking(self):
        """Test IP blocking after excessive violations"""
        # Simulate excessive violations
        for i in range(15):  # Exceed max_violations_per_hour
            for j in range(65):  # Trigger rate limit each time
                self.rate_limiter.is_allowed(self.identifier)
        
        # IP should be blocked
        allowed, info = self.rate_limiter.is_allowed(self.identifier)
        assert not allowed
        assert info['blocked']

class TestSessionSecurity:
    """Test cases for session security"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.session_security = SessionSecurity()
        self.security_context = SecurityContext(
            session_id="",
            user_id="test_user",
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0 Test Browser",
            timestamp=datetime.now()
        )
    
    def test_session_creation(self):
        """Test secure session creation"""
        session_id = self.session_security.create_secure_session(self.security_context)
        
        assert session_id.startswith("ctx_")
        assert len(session_id) > 10
        assert session_id in self.session_security.session_data
    
    def test_session_validation(self):
        """Test session validation"""
        # Create session
        session_id = self.session_security.create_secure_session(self.security_context)
        
        # Validate session
        valid, details = self.session_security.validate_session_access(session_id, self.security_context)
        assert valid
        assert details['valid']
        assert 'session_data' in details
    
    def test_invalid_session_validation(self):
        """Test validation of invalid sessions"""
        # Test non-existent session
        valid, details = self.session_security.validate_session_access("invalid_session", self.security_context)
        assert not valid
        assert details['error'] == 'Invalid session'
    
    def test_session_expiration(self):
        """Test session expiration"""
        # Create session
        session_id = self.session_security.create_secure_session(self.security_context)
        
        # Manually expire session
        past_time = datetime.now() - timedelta(hours=2)
        self.session_security.session_timeouts[session_id] = past_time
        
        # Validation should fail
        valid, details = self.session_security.validate_session_access(session_id, self.security_context)
        assert not valid
        assert details['error'] == 'Session expired'
    
    def test_session_cleanup(self):
        """Test session cleanup"""
        # Create multiple sessions
        session_ids = []
        for i in range(5):
            context = SecurityContext(
                session_id="",
                user_id=f"user_{i}",
                ip_address="192.168.1.1",
                user_agent="Test Browser",
                timestamp=datetime.now()
            )
            session_id = self.session_security.create_secure_session(context)
            session_ids.append(session_id)
        
        # Expire some sessions
        for i in range(3):
            past_time = datetime.now() - timedelta(hours=2)
            self.session_security.session_timeouts[session_ids[i]] = past_time
        
        # Run cleanup
        self.session_security.cleanup_expired_sessions()
        
        # Check that expired sessions are removed
        for i in range(3):
            assert session_ids[i] not in self.session_security.session_data
        
        # Check that non-expired sessions remain
        for i in range(3, 5):
            assert session_ids[i] in self.session_security.session_data

class TestDataPrivacyManager:
    """Test cases for data privacy management"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.privacy_manager = DataPrivacyManager()
    
    def test_sensitive_data_detection(self):
        """Test detection and redaction of sensitive data"""
        test_cases = [
            ("My credit card is 1234-5678-9012-3456", "[REDACTED]"),
            ("Call me at 555-123-4567", "[REDACTED]"),
            ("Email me at user@example.com", "[REDACTED]"),
            ("SSN: 123-45-6789", "[REDACTED]")
        ]
        
        for input_text, expected_redaction in test_cases:
            sanitized = self.privacy_manager.sanitize_for_storage(input_text)
            assert expected_redaction in sanitized
            assert not any(char.isdigit() for char in sanitized if expected_redaction in sanitized)
    
    def test_data_hashing(self):
        """Test sensitive data hashing"""
        sensitive_data = "user@example.com"
        hashed = self.privacy_manager.hash_sensitive_data(sensitive_data)
        
        assert len(hashed) == 64  # SHA-256 produces 64-character hex string
        assert hashed != sensitive_data
        
        # Same input should produce same hash
        hashed2 = self.privacy_manager.hash_sensitive_data(sensitive_data)
        assert hashed == hashed2
    
    def test_query_anonymization(self):
        """Test query anonymization for analytics"""
        test_queries = [
            "Compare iPhone 14 Pro with Samsung Galaxy S23",
            "What's the price of Xiaomi 13 Pro?",
            "Show me OnePlus 11 specifications"
        ]
        
        for query in test_queries:
            anonymized = self.privacy_manager.anonymize_query_for_analytics(query)
            assert "PHONE_MODEL" in anonymized
            # Specific model names should be replaced
            assert "iPhone 14 Pro" not in anonymized
            assert "Galaxy S23" not in anonymized
    
    def test_empty_input_handling(self):
        """Test handling of empty inputs"""
        assert self.privacy_manager.sanitize_for_storage("") == ""
        assert self.privacy_manager.hash_sensitive_data("") == ""
        assert self.privacy_manager.anonymize_query_for_analytics("") == ""
        
        assert self.privacy_manager.sanitize_for_storage(None) == ""
        assert self.privacy_manager.hash_sensitive_data(None) == ""
        assert self.privacy_manager.anonymize_query_for_analytics(None) == ""

class TestSecurityIntegration:
    """Integration tests for security components"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.validator = InputValidator()
        self.rate_limiter = RateLimiter()
        self.session_security = SessionSecurity()
        self.privacy_manager = DataPrivacyManager()
    
    def test_complete_security_workflow(self):
        """Test complete security validation workflow"""
        # Create security context
        context = SecurityContext(
            session_id="test_session_123",
            user_id="test_user",
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0 Test Browser",
            timestamp=datetime.now()
        )
        
        # Test query
        query = "Compare iPhone 14 Pro with Samsung Galaxy S23"
        
        # 1. Rate limiting check
        allowed, rate_info = self.rate_limiter.is_allowed(context.ip_address)
        assert allowed
        
        # 2. Input validation
        validation_result = self.validator.validate_query_input(query, context)
        assert validation_result.is_valid
        
        # 3. Session creation and validation
        session_id = self.session_security.create_secure_session(context)
        context.session_id = session_id
        
        session_valid, session_details = self.session_security.validate_session_access(session_id, context)
        assert session_valid
        
        # 4. Data privacy
        anonymized_query = self.privacy_manager.anonymize_query_for_analytics(query)
        assert "PHONE_MODEL" in anonymized_query
    
    def test_security_failure_scenarios(self):
        """Test various security failure scenarios"""
        context = SecurityContext(
            session_id="invalid_session",
            user_id="test_user",
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0 Test Browser",
            timestamp=datetime.now()
        )
        
        # Test malicious query
        malicious_query = "'; DROP TABLE phones; --"
        validation_result = self.validator.validate_query_input(malicious_query, context)
        assert not validation_result.is_valid
        assert validation_result.risk_level == "critical"
        
        # Test rate limiting
        for i in range(65):  # Exceed rate limit
            self.rate_limiter.is_allowed(context.ip_address)
        
        allowed, rate_info = self.rate_limiter.is_allowed(context.ip_address)
        assert not allowed
        assert rate_info['rate_limited']
        
        # Test invalid session
        session_valid, session_details = self.session_security.validate_session_access("invalid", context)
        assert not session_valid
        assert session_details['error'] == 'Invalid session'