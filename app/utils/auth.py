from datetime import datetime, timedelta
from typing import Optional
import secrets
import string
import logging

# Try to import passlib, fallback to bcrypt if not available
try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    HAS_PASSLIB = True
except ImportError:
    HAS_PASSLIB = False
    try:
        import bcrypt
    except ImportError:
        raise ImportError("Either passlib or bcrypt is required for password hashing")

from jose import JWTError, jwt
from app.core.config import settings

logger = logging.getLogger(__name__)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    
    Args:
        plain_password: Plain text password
        hashed_password: Hashed password
        
    Returns:
        bool: True if password matches, False otherwise
    """
    try:
        if HAS_PASSLIB:
            return pwd_context.verify(plain_password, hashed_password)
        else:
            # Handle bcrypt version compatibility issues
            try:
                return bcrypt.checkpw(
                    plain_password.encode('utf-8'), 
                    hashed_password.encode('utf-8')
                )
            except Exception as e:
                logger.warning(f"BCrypt verification failed: {str(e)}")
                # Fallback comparison (NOT secure, only for testing)
                return False
    except Exception as e:
        logger.error(f"Password verification error: {str(e)}")
        return False

def get_password_hash(password: str) -> str:
    """
    Hash a password.
    
    Args:
        password: Plain text password
        
    Returns:
        str: Hashed password
    """
    # Validate input
    if not password:
        raise ValueError("Password cannot be empty")
    
    try:
        # Truncate password to 72 bytes for bcrypt compatibility
        if len(password.encode('utf-8')) > 72:
            logger.warning("Password truncated to 72 bytes for bcrypt compatibility")
            password = password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
        
        if HAS_PASSLIB:
            return pwd_context.hash(password)
        else:
            # Handle bcrypt
            try:
                hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
                return hashed.decode('utf-8')
            except Exception as e:
                logger.error(f"BCrypt hashing failed: {str(e)}")
                # Fallback to a simple hash method for emergency cases
                import hashlib
                return hashlib.sha256(password.encode('utf-8')).hexdigest()
    except Exception as e:
        logger.error(f"Password hashing error: {str(e)}")
        # Fallback to a simple hash method for emergency cases
        import hashlib
        return hashlib.sha256(password.encode('utf-8')).hexdigest()

# JWT Token functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Data to encode in the token
        expires_delta: Token expiration time
        
    Returns:
        str: JWT token
    """
    # Validate input
    if data is None:
        raise ValueError("Token data cannot be None")
    
    try:
        to_encode = data.copy() if data else {}
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.error(f"JWT token creation error: {str(e)}")
        raise

def verify_token(token: str) -> Optional[dict]:
    """
    Verify and decode a JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        dict: Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        logger.warning(f"JWT verification error: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error during JWT verification: {str(e)}")
        return None

# Email verification code functions
def generate_verification_code(length: int = 6) -> str:
    """
    Generate a random verification code.
    
    Args:
        length: Length of the verification code (default: 6)
        
    Returns:
        str: Random verification code
    """
    try:
        return ''.join(secrets.choice(string.digits) for _ in range(length))
    except Exception as e:
        logger.error(f"Verification code generation error: {str(e)}")
        # Fallback method
        import random
        return ''.join(random.choices(string.digits, k=length))

def get_verification_expiry(minutes: Optional[int] = None) -> datetime:
    """
    Get the expiry time for verification codes.
    
    Args:
        minutes: Expiry time in minutes (defaults to settings.VERIFICATION_CODE_EXPIRE_MINUTES)
        
    Returns:
        datetime: Expiry datetime
    """
    if minutes is None:
        minutes = settings.VERIFICATION_CODE_EXPIRE_MINUTES
    return datetime.utcnow() + timedelta(minutes=minutes)