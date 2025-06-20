from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
from typing import Optional
from app.models.user import User, EmailVerification
from app.schemas.auth import UserSignup
from app.utils.auth import get_password_hash, generate_verification_code, get_verification_expiry

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email address."""
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get user by ID."""
    return db.query(User).filter(User.id == user_id).first()

def create_user(db: Session, user_data: UserSignup) -> User:
    """Create a new user with hashed password."""
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        is_verified=False,
        first_name=user_data.first_name,
        last_name=user_data.last_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def create_email_verification(db: Session, user_id: int) -> EmailVerification:
    """Create a new email verification record."""
    # Delete any existing verification codes for this user
    db.query(EmailVerification).filter(EmailVerification.user_id == user_id).delete()
    
    verification_code = generate_verification_code()
    expires_at = get_verification_expiry()
    
    db_verification = EmailVerification(
        user_id=user_id,
        code=verification_code,
        expires_at=expires_at
    )
    db.add(db_verification)
    db.commit()
    db.refresh(db_verification)
    return db_verification

def verify_email_code(db: Session, email: str, code: str) -> Optional[User]:
    """Verify email verification code and mark user as verified."""
    user = get_user_by_email(db, email)
    if not user:
        return None
    
    # Get the most recent verification code for this user
    verification = db.query(EmailVerification).filter(
        and_(
            EmailVerification.user_id == user.id,
            EmailVerification.code == code,
            EmailVerification.expires_at > datetime.utcnow()
        )
    ).first()
    
    if not verification:
        return None
    
    # Mark user as verified
    user.is_verified = True
    db.commit()
    db.refresh(user)
    
    # Delete the verification code
    db.delete(verification)
    db.commit()
    
    return user

def delete_expired_verifications(db: Session) -> int:
    """Delete expired verification codes and return count of deleted records."""
    count = db.query(EmailVerification).filter(
        EmailVerification.expires_at < datetime.utcnow()
    ).delete()
    db.commit()
    return count

def get_verification_by_user_id(db: Session, user_id: int) -> Optional[EmailVerification]:
    """Get the most recent verification code for a user."""
    return db.query(EmailVerification).filter(
        and_(
            EmailVerification.user_id == user_id,
            EmailVerification.expires_at > datetime.utcnow()
        )
    ).first() 