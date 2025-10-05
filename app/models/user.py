from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):
    """
    User model for authentication system.
    
    Attributes:
        id: Unique user identifier
        email: User email address (unique)
        password_hash: Hashed user password
        is_verified: Email verification status
        is_admin: Admin privileges flag
        created_at: Account creation timestamp
        first_name: User's first name
        last_name: User's last name
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    
    # Relationship
    email_verifications = relationship("EmailVerification", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', is_verified={self.is_verified}, is_admin={self.is_admin})>"

class EmailVerification(Base):
    """
    Email verification model for user registration.
    
    Attributes:
        id: Unique verification identifier
        user_id: Reference to user ID
        code: Verification code (6 digits)
        expires_at: Expiration timestamp
    """
    __tablename__ = "email_verifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    code = Column(String(6), nullable=False)  # 6-digit verification code
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Relationship
    user = relationship("User", back_populates="email_verifications")

    def __repr__(self):
        return f"<EmailVerification(user_id={self.user_id}, code='{self.code}', expires_at='{self.expires_at}')>"