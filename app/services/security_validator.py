"""
Security and Input Validation Service for Contextual Query System
"""

import re
import html
import logging
import hashlib
import time
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from collections import defaultdict
import json

from app.services.monitoring_analytics import monitoring_analytics, MetricType

logger = logging.getLogger(__name__)

@dataclass
class ValidationResult:
    """Result of input validation"""
    is_valid: bool
    sanitized_input: str
    violations: List[str]
    risk_level: str  # 'low', 'medium', 'high', 'critical'
    metadata: Dict[str, Any]

@dataclass
class SecurityContext:
    """Security context for requests"""
    session_id: str
    user_id: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    timestamp: datetime
    request_count: int = 0

class InputValidator:
    """Comprehensive input validation and sanitization"""
    
    def __init__(self):
        """Initialize input validator"""
        # Malicious pattern detection
        self.sql_injection_patterns = [
            r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)",
            r"(--|#|/\*|\*/)",
            r"(\b(OR|AND)\s+\d+\s*=\s*\d+)",
            r"(\b(OR|AND)\s+['\"]?\w+['\"]?\s*=\s*['\"]?\w+['\"]?)",
            r"(;\s*(SELECT|INSERT|UPDATE|DELETE|DROP))",
            r"(\bUNION\s+(ALL\s+)?SELECT)",
        ]
        
        self.xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"vbscript:",
            r"onload\s*=",
            r"onerror\s*=",
            r"onclick\s*=",
            r"onmouseover\s*=",
            r"<iframe[^>]*>",
            r"<object[^>]*>",
            r"<embed[^>]*>",
        ]
        
        self.path_traversal_patterns = [
            r"\.\./",
            r"\.\.\\",
            r"/etc/passwd",
            r"/etc/shadow",
            r"\\windows\\system32",
            r"\.\.%2f",
            r"\.\.%5c",
        ]
        
        self.template_injection_patterns = [
            r"\{\{.*?\}\}",
            r"\{%.*?%\}",
            r"\$\{.*?\}",
            r"<%.*?%>",
        ]
        
        self.command_injection_patterns = [
            r"[;&|`]",
            r"\$\(",
            r"``",
            r"\|\s*(cat|ls|pwd|whoami|id|uname)",
        ]
        
        # Content validation patterns
        self.phone_name_pattern = re.compile(r'^[a-zA-Z0-9\s\-\+\(\)\.]+$')
        self.session_id_pattern = re.compile(r'^[a-zA-Z0-9\-_]{8,128}$')
        self.safe_text_pattern = re.compile(r'^[a-zA-Z0-9\s\-\+\(\)\.\,\?\!\:\'\"]+$')
        
        # Length limits
        self.max_query_length = 2000
        self.max_session_id_length = 128
        self.max_user_id_length = 255
        
        logger.info("Input validator initialized")
    
    def validate_query_input(self, query: str, context: SecurityContext) -> ValidationResult:
        """Validate and sanitize query input"""
        violations = []
        risk_level = "low"
        metadata = {}
        
        # Check if query is None or empty
        if not query:
            return ValidationResult(
                is_valid=False,
                sanitized_input="",
                violations=["Empty query"],
                risk_level="low",
                metadata={"empty_input": True}
            )
        
        # Convert to string and strip whitespace
        query = str(query).strip()
        original_length = len(query)
        
        # Length validation
        if len(query) > self.max_query_length:
            violations.append(f"Query too long: {len(query)} > {self.max_query_length}")
            risk_level = "medium"
            query = query[:self.max_query_length]
        
        # Check for malicious patterns
        malicious_patterns_found = []
        
        # SQL injection detection
        for pattern in self.sql_injection_patterns:
            if re.search(pattern, query, re.IGNORECASE):
                violations.append(f"Potential SQL injection: {pattern}")
                malicious_patterns_found.append("sql_injection")
                risk_level = "critical"
        
        # XSS detection
        for pattern in self.xss_patterns:
            if re.search(pattern, query, re.IGNORECASE):
                violations.append(f"Potential XSS: {pattern}")
                malicious_patterns_found.append("xss")
                risk_level = "high"
        
        # Path traversal detection
        for pattern in self.path_traversal_patterns:
            if re.search(pattern, query, re.IGNORECASE):
                violations.append(f"Potential path traversal: {pattern}")
                malicious_patterns_found.append("path_traversal")
                risk_level = "high"
        
        # Template injection detection
        for pattern in self.template_injection_patterns:
            if re.search(pattern, query, re.IGNORECASE):
                violations.append(f"Potential template injection: {pattern}")
                malicious_patterns_found.append("template_injection")
                risk_level = "high"
        
        # Command injection detection
        for pattern in self.command_injection_patterns:
            if re.search(pattern, query, re.IGNORECASE):
                violations.append(f"Potential command injection: {pattern}")
                malicious_patterns_found.append("command_injection")
                risk_level = "critical"
        
        # Sanitize input
        sanitized_query = self._sanitize_text(query)
        
        # Check for suspicious character sequences
        suspicious_chars = self._check_suspicious_characters(sanitized_query)
        if suspicious_chars:
            violations.extend(suspicious_chars)
            if risk_level == "low":
                risk_level = "medium"
        
        # Validate character set
        if not self._is_safe_character_set(sanitized_query):
            violations.append("Contains unsafe characters")
            if risk_level == "low":
                risk_level = "medium"
        
        # Check for excessive repetition (potential DoS)
        if self._has_excessive_repetition(sanitized_query):
            violations.append("Excessive character repetition detected")
            risk_level = "medium"
        
        # Metadata
        metadata.update({
            "original_length": original_length,
            "sanitized_length": len(sanitized_query),
            "malicious_patterns": malicious_patterns_found,
            "character_reduction": original_length - len(sanitized_query),
            "validation_timestamp": datetime.now().isoformat()
        })
        
        is_valid = risk_level in ["low", "medium"] and len(sanitized_query) > 0
        
        return ValidationResult(
            is_valid=is_valid,
            sanitized_input=sanitized_query,
            violations=violations,
            risk_level=risk_level,
            metadata=metadata
        )
    
    def validate_session_id(self, session_id: str) -> ValidationResult:
        """Validate session ID"""
        violations = []
        risk_level = "low"
        
        if not session_id:
            return ValidationResult(
                is_valid=False,
                sanitized_input="",
                violations=["Empty session ID"],
                risk_level="medium",
                metadata={}
            )
        
        session_id = str(session_id).strip()
        
        # Length check
        if len(session_id) > self.max_session_id_length:
            violations.append(f"Session ID too long: {len(session_id)}")
            risk_level = "medium"
        
        # Pattern check
        if not self.session_id_pattern.match(session_id):
            violations.append("Invalid session ID format")
            risk_level = "high"
        
        # Sanitize
        sanitized_session_id = re.sub(r'[^a-zA-Z0-9\-_]', '', session_id)
        
        is_valid = len(violations) == 0 and len(sanitized_session_id) >= 8
        
        return ValidationResult(
            is_valid=is_valid,
            sanitized_input=sanitized_session_id,
            violations=violations,
            risk_level=risk_level,
            metadata={"original_length": len(session_id)}
        )
    
    def validate_user_id(self, user_id: str) -> ValidationResult:
        """Validate user ID"""
        violations = []
        risk_level = "low"
        
        if not user_id:
            return ValidationResult(
                is_valid=True,  # User ID is optional
                sanitized_input="",
                violations=[],
                risk_level="low",
                metadata={}
            )
        
        user_id = str(user_id).strip()
        
        # Length check
        if len(user_id) > self.max_user_id_length:
            violations.append(f"User ID too long: {len(user_id)}")
            risk_level = "medium"
        
        # Sanitize
        sanitized_user_id = self._sanitize_text(user_id)
        
        is_valid = len(violations) == 0
        
        return ValidationResult(
            is_valid=is_valid,
            sanitized_input=sanitized_user_id,
            violations=violations,
            risk_level=risk_level,
            metadata={"original_length": len(user_id)}
        )
    
    def _sanitize_text(self, text: str) -> str:
        """Sanitize text input"""
        if not text:
            return ""
        
        # HTML escape
        text = html.escape(text)
        
        # Remove null bytes
        text = text.replace('\x00', '')
        
        # Remove control characters except newlines and tabs
        text = re.sub(r'[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
        
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove potentially dangerous Unicode characters
        text = re.sub(r'[\u200B-\u200F\u202A-\u202E\u2060-\u206F]', '', text)
        
        return text.strip()
    
    def _check_suspicious_characters(self, text: str) -> List[str]:
        """Check for suspicious character patterns"""
        violations = []
        
        # Check for excessive special characters
        special_char_count = len(re.findall(r'[^\w\s]', text))
        if special_char_count > len(text) * 0.3:  # More than 30% special chars
            violations.append("Excessive special characters")
        
        # Check for suspicious Unicode ranges
        if re.search(r'[\u0000-\u001F\u007F-\u009F]', text):
            violations.append("Contains control characters")
        
        # Check for homograph attacks
        if re.search(r'[\u0400-\u04FF\u0500-\u052F]', text):  # Cyrillic
            violations.append("Contains potentially confusing characters")
        
        return violations
    
    def _is_safe_character_set(self, text: str) -> bool:
        """Check if text contains only safe characters"""
        # Allow alphanumeric, common punctuation, and basic symbols
        safe_pattern = re.compile(r'^[a-zA-Z0-9\s\-\+\(\)\.\,\?\!\:\'\"\/@#\$%&\*=<>]+$')
        return safe_pattern.match(text) is not None
    
    def _has_excessive_repetition(self, text: str) -> bool:
        """Check for excessive character repetition"""
        if len(text) < 10:
            return False
        
        # Check for repeated characters
        for char in set(text):
            if char.isalnum() and text.count(char) > len(text) * 0.5:
                return True
        
        # Check for repeated patterns
        for i in range(2, min(10, len(text) // 3)):
            pattern = text[:i]
            if text.count(pattern) > len(text) // i * 0.7:
                return True
        
        return False

class RateLimiter:
    """Rate limiting for contextual query endpoints"""
    
    def __init__(self):
        """Initialize rate limiter"""
        self.request_counts = defaultdict(list)
        self.blocked_ips = defaultdict(datetime)
        
        # Rate limiting rules
        self.rules = {
            'per_minute': {'limit': 60, 'window': 60},
            'per_hour': {'limit': 1000, 'window': 3600},
            'per_day': {'limit': 10000, 'window': 86400}
        }
        
        # Blocking rules
        self.block_duration = 300  # 5 minutes
        self.max_violations_per_hour = 10
        
        logger.info("Rate limiter initialized")
    
    def is_allowed(self, identifier: str, endpoint: str = "default") -> Tuple[bool, Dict[str, Any]]:
        """Check if request is allowed"""
        current_time = time.time()
        
        # Check if IP is blocked
        if identifier in self.blocked_ips:
            if current_time < self.blocked_ips[identifier].timestamp():
                return False, {
                    'blocked': True,
                    'reason': 'IP temporarily blocked',
                    'unblock_time': self.blocked_ips[identifier].isoformat()
                }
            else:
                # Unblock expired blocks
                del self.blocked_ips[identifier]
        
        # Clean old requests
        self._clean_old_requests(identifier, current_time)
        
        # Check rate limits
        requests = self.request_counts[identifier]
        
        for rule_name, rule in self.rules.items():
            window_start = current_time - rule['window']
            recent_requests = [req for req in requests if req > window_start]
            
            if len(recent_requests) >= rule['limit']:
                # Rate limit exceeded
                self._record_violation(identifier, rule_name)
                
                return False, {
                    'rate_limited': True,
                    'rule': rule_name,
                    'limit': rule['limit'],
                    'window': rule['window'],
                    'retry_after': rule['window']
                }
        
        # Record this request
        self.request_counts[identifier].append(current_time)
        
        return True, {
            'allowed': True,
            'requests_in_window': len(requests) + 1
        }
    
    def _clean_old_requests(self, identifier: str, current_time: float):
        """Clean old request records"""
        if identifier not in self.request_counts:
            return
        
        # Keep only requests within the largest window
        max_window = max(rule['window'] for rule in self.rules.values())
        cutoff_time = current_time - max_window
        
        self.request_counts[identifier] = [
            req for req in self.request_counts[identifier] 
            if req > cutoff_time
        ]
    
    def _record_violation(self, identifier: str, rule_name: str):
        """Record rate limit violation"""
        # Count violations in the last hour
        current_time = time.time()
        hour_ago = current_time - 3600
        
        violations = sum(1 for req in self.request_counts[identifier] if req > hour_ago)
        
        if violations >= self.max_violations_per_hour:
            # Block the IP
            block_until = datetime.fromtimestamp(current_time + self.block_duration)
            self.blocked_ips[identifier] = block_until
            
            logger.warning(f"Blocked {identifier} for {self.block_duration} seconds due to excessive violations")
        
        # Record metrics
        monitoring_analytics.record_metric(
            f"rate_limit_violation_{rule_name}", 
            1, 
            MetricType.COUNTER
        )

class SessionSecurity:
    """Session-based security for context access"""
    
    def __init__(self):
        """Initialize session security"""
        self.session_data = {}
        self.session_timeouts = {}
        self.max_session_age = 3600  # 1 hour
        self.max_sessions_per_ip = 10
        
        logger.info("Session security initialized")
    
    def create_secure_session(self, context: SecurityContext) -> str:
        """Create a secure session"""
        # Generate secure session ID
        session_id = self._generate_session_id(context)
        
        # Store session data
        self.session_data[session_id] = {
            'user_id': context.user_id,
            'ip_address': context.ip_address,
            'user_agent': context.user_agent,
            'created_at': context.timestamp,
            'last_accessed': context.timestamp,
            'request_count': 0
        }
        
        # Set timeout
        self.session_timeouts[session_id] = context.timestamp + timedelta(seconds=self.max_session_age)
        
        return session_id
    
    def validate_session_access(self, session_id: str, context: SecurityContext) -> Tuple[bool, Dict[str, Any]]:
        """Validate session access"""
        if not session_id or session_id not in self.session_data:
            return False, {'error': 'Invalid session'}
        
        session = self.session_data[session_id]
        
        # Check timeout
        if session_id in self.session_timeouts:
            if datetime.now() > self.session_timeouts[session_id]:
                self._cleanup_session(session_id)
                return False, {'error': 'Session expired'}
        
        # Validate IP address (optional, can be disabled for mobile users)
        if context.ip_address and session['ip_address']:
            if context.ip_address != session['ip_address']:
                logger.warning(f"IP address mismatch for session {session_id}")
                # Don't block, but log for monitoring
        
        # Update session
        session['last_accessed'] = datetime.now()
        session['request_count'] += 1
        
        # Extend timeout
        self.session_timeouts[session_id] = datetime.now() + timedelta(seconds=self.max_session_age)
        
        return True, {'valid': True, 'session_data': session}
    
    def _generate_session_id(self, context: SecurityContext) -> str:
        """Generate secure session ID"""
        # Combine various factors for uniqueness
        factors = [
            str(context.timestamp.timestamp()),
            context.ip_address or '',
            context.user_agent or '',
            str(time.time()),
            str(hash(context.user_id)) if context.user_id else ''
        ]
        
        # Create hash
        combined = ''.join(factors)
        session_hash = hashlib.sha256(combined.encode()).hexdigest()
        
        return f"ctx_{session_hash[:32]}"
    
    def _cleanup_session(self, session_id: str):
        """Clean up expired session"""
        if session_id in self.session_data:
            del self.session_data[session_id]
        if session_id in self.session_timeouts:
            del self.session_timeouts[session_id]
    
    def cleanup_expired_sessions(self):
        """Clean up all expired sessions"""
        current_time = datetime.now()
        expired_sessions = [
            session_id for session_id, timeout in self.session_timeouts.items()
            if current_time > timeout
        ]
        
        for session_id in expired_sessions:
            self._cleanup_session(session_id)
        
        logger.info(f"Cleaned up {len(expired_sessions)} expired sessions")

class DataPrivacyManager:
    """Data privacy and protection measures"""
    
    def __init__(self):
        """Initialize data privacy manager"""
        self.sensitive_patterns = [
            r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',  # Credit card
            r'\b\d{3}-\d{2}-\d{4}\b',  # SSN
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email
            r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',  # Phone number
        ]
        
        logger.info("Data privacy manager initialized")
    
    def sanitize_for_storage(self, text: str) -> str:
        """Sanitize text for safe storage"""
        if not text:
            return ""
        
        sanitized = text
        
        # Remove or mask sensitive information
        for pattern in self.sensitive_patterns:
            sanitized = re.sub(pattern, '[REDACTED]', sanitized, flags=re.IGNORECASE)
        
        return sanitized
    
    def hash_sensitive_data(self, data: str) -> str:
        """Hash sensitive data for analytics"""
        if not data:
            return ""
        
        # Use SHA-256 for hashing
        return hashlib.sha256(data.encode()).hexdigest()
    
    def anonymize_query_for_analytics(self, query: str) -> str:
        """Anonymize query for analytics storage"""
        # Remove sensitive information but keep structure for analysis
        anonymized = self.sanitize_for_storage(query)
        
        # Replace specific phone models with generic terms for privacy
        anonymized = re.sub(r'\biphone\s+\d+[a-z\s]*\b', 'PHONE_MODEL', anonymized, flags=re.IGNORECASE)
        anonymized = re.sub(r'\bgalaxy\s+[a-z0-9\s]+\b', 'PHONE_MODEL', anonymized, flags=re.IGNORECASE)
        anonymized = re.sub(r'\b[a-z]+\s+\d+[a-z\s]*\b', 'PHONE_MODEL', anonymized, flags=re.IGNORECASE)
        
        return anonymized

# Global instances
input_validator = InputValidator()
rate_limiter = RateLimiter()
session_security = SessionSecurity()
data_privacy_manager = DataPrivacyManager()