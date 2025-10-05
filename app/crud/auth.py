from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
from typing import Optional, List
import logging

from app.models.user import User, EmailVerification
from app.schemas.auth import UserSignup
from app.utils.auth import get_password_hash, generate_verification_code, get_verification_expiry

logger = logging.getLogger(__name__)

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """
    Get user by email address.
    
    Args:
        db: Database session
        email: User email address
        
    Returns:
        User: User object or None if not found
    """
    try:
        return db.query(User).filter(User.email == email).first()
    except Exception as e:
        logger.error(f"Error fetching user by email {email}: {str(e)}")
        return None

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """
    Get user by ID.
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        User: User object or None if not found
    """
    try:
        return db.query(User).filter(User.id == user_id).first()
    except Exception as e:
        logger.error(f"Error fetching user by ID {user_id}: {str(e)}")
        return None

def create_user(db: Session, user_data: UserSignup) -> Optional[User]:
    """
    Create a new user with hashed password.
    
    Args:
        db: Database session
        user_data: User signup data
        
    Returns:
        User: Created user object or None if error
    """
    try:
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
        logger.info(f"Created new user: {user_data.email}")
        return db_user
    except Exception as e:
        logger.error(f"Error creating user {user_data.email}: {str(e)}")
        db.rollback()
        return None

def create_email_verification(db: Session, user_id: int) -> Optional[EmailVerification]:
    """
    Create a new email verification record.
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        EmailVerification: Created verification object or None if error
    """
    try:
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
        logger.info(f"Created verification code for user ID {user_id}")
        return db_verification
    except Exception as e:
        logger.error(f"Error creating email verification for user ID {user_id}: {str(e)}")
        db.rollback()
        return None

def verify_email_code(db: Session, email: str, code: str) -> Optional[User]:
    """
    Verify email verification code and mark user as verified.
    
    Args:
        db: Database session
        email: User email address
        code: Verification code
        
    Returns:
        User: Verified user object or None if invalid
    """
    try:
        user = get_user_by_email(db, email)
        if not user:
            logger.warning(f"User not found for email verification: {email}")
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
            logger.warning(f"Invalid or expired verification code for user: {email}")
            return None
        
        # Mark user as verified
        user.is_verified = True
        db.commit()
        db.refresh(user)
        
        # Delete the verification code
        db.delete(verification)
        db.commit()
        
        logger.info(f"Email verified successfully for user: {email}")
        return user
    except Exception as e:
        logger.error(f"Error verifying email code for {email}: {str(e)}")
        db.rollback()
        return None

def delete_expired_verifications(db: Session) -> int:
    """
    Delete expired verification codes and return count of deleted records.
    
    Args:
        db: Database session
        
    Returns:
        int: Number of deleted records
    """
    try:
        count = db.query(EmailVerification).filter(
            EmailVerification.expires_at < datetime.utcnow()
        ).delete()
        db.commit()
        logger.info(f"Deleted {count} expired verification codes")
        return count
    except Exception as e:
        logger.error(f"Error deleting expired verifications: {str(e)}")
        db.rollback()
        return 0

def get_verification_by_user_id(db: Session, user_id: int) -> Optional[EmailVerification]:
    """
    Get the most recent verification code for a user.
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        EmailVerification: Verification object or None if not found
    """
    try:
        return db.query(EmailVerification).filter(
            and_(
                EmailVerification.user_id == user_id,
                EmailVerification.expires_at > datetime.utcnow()
            )
        ).first()
    except Exception as e:
        logger.error(f"Error fetching verification for user ID {user_id}: {str(e)}")
        return None

def get_all_users(db: Session) -> List[User]:
    """
    Get all users in the system.
    
    Args:
        db: Database session
        
    Returns:
        List[User]: List of all users
    """
    try:
        return db.query(User).all()
    except Exception as e:
        logger.error(f"Error fetching all users: {str(e)}")
        return []