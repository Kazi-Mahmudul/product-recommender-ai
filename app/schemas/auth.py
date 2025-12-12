from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from datetime import datetime

class UserSignup(BaseModel):
    """
    Schema for user signup requests.
    
    Attributes:
        email: User email address
        password: User password
        confirm_password: Password confirmation
        first_name: User's first name
        last_name: User's last name
    """
    email: EmailStr
    password: str
    confirm_password: str
    first_name: str
    last_name: str

    @validator('password')
    def validate_password(cls, v):
        """
        Validate password strength.
        
        Requirements:
        - At least 8 characters
        - Contains uppercase letter
        - Contains lowercase letter
        - Contains digit
        """
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v

    @validator('confirm_password')
    def validate_confirm_password(cls, v, values):
        """
        Validate password confirmation matches password.
        """
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

    @validator('first_name', 'last_name')
    def validate_name(cls, v):
        """
        Validate name fields.
        """
        if not v or not v.strip():
            raise ValueError('Name cannot be empty')
        if len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters long')
        return v.strip()

    class Config:
        schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "SecurePass123",
                "confirm_password": "SecurePass123",
                "first_name": "John",
                "last_name": "Doe"
            }
        }

class UserLogin(BaseModel):
    """
    Schema for user login requests.
    
    Attributes:
        email: User email address
        password: User password
    """
    email: EmailStr
    password: str
    
    @validator('email')
    def validate_email(cls, v):
        """
        Validate email is not empty.
        """
        if not v or not v.strip():
            raise ValueError('Email cannot be empty')
        return v.strip()
    
    @validator('password')
    def validate_password(cls, v):
        """
        Validate password is not empty.
        """
        if not v or not v.strip():
            raise ValueError('Password cannot be empty')
        return v

    class Config:
        schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "SecurePass123"
            }
        }

class EmailVerificationRequest(BaseModel):
    """
    Schema for email verification requests.
    
    Attributes:
        email: User email address
        code: Verification code
    """
    email: EmailStr
    code: str

    @validator('code')
    def validate_code(cls, v):
        """
        Validate verification code format.
        """
        if not v or not v.strip():
            raise ValueError('Verification code cannot be empty')
        
        v = v.strip()
        if not v.isdigit():
            raise ValueError('Verification code must contain only digits')
        if len(v) != 6:
            raise ValueError('Verification code must be exactly 6 digits')
        return v

    class Config:
        schema_extra = {
            "example": {
                "email": "user@example.com",
                "code": "123456"
            }
        }

class Token(BaseModel):
    """
    Schema for JWT token responses.
    
    Attributes:
        access_token: JWT access token
        token_type: Token type (bearer)
        expires_in: Token expiration time in minutes
    """
    access_token: str
    token_type: str = "bearer"
    expires_in: int

    class Config:
        schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 60
            }
        }

class UserResponse(BaseModel):
    """
    Schema for user information responses.
    
    Attributes:
        id: User ID
        email: User email address
        is_verified: Email verification status
        is_admin: Admin privileges flag
        created_at: Account creation timestamp
        first_name: User's first name
        last_name: User's last name
    """
    id: int
    email: str
    is_verified: bool
    is_admin: bool
    created_at: datetime
    first_name: Optional[str]
    last_name: Optional[str]

    class Config:
        from_attributes = True
        schema_extra = {
            "example": {
                "id": 1,
                "email": "user@example.com",
                "is_verified": True,
                "is_admin": False,
                "created_at": "2023-01-01T00:00:00Z",
                "first_name": "John",
                "last_name": "Doe"
            }
        }

class MessageResponse(BaseModel):
    """
    Schema for generic message responses.
    
    Attributes:
        message: Response message
        success: Success status flag
    """
    message: str
    success: bool = True

    class Config:
        schema_extra = {
            "example": {
                "message": "Operation completed successfully",
                "success": True
            }
        }