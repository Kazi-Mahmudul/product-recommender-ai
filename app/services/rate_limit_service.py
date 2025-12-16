import logging
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime

from app.models.user import User
from app.models.guest import GuestUsage
from app.core.config import settings

logger = logging.getLogger(__name__)

class RateLimitService:
    """
    Service to handle rate limiting for chat usage.
    Limits:
    - Guest: 10 lifetime chats
    - Free User: 20 lifetime chats (can be expanded later for monthly/paid)
    """

    GUEST_LIMIT = 10
    FREE_USER_LIMIT = 20

    def check_and_increment(
        self, 
        db: Session, 
        user: Optional[User], 
        guest_uuid: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Check if user/guest can chat, and increment their counter.
        Returns metrics about limits.
        
        Raises HTTPException if limit reached.
        """
        logger.info(f"Rate Limit Check: User={user.email if user else 'Guest'}, GuestID={guest_uuid}")
        
        if user:
            return self._handle_user_limit(db, user)
        else:
            return self._handle_guest_limit(db, guest_uuid, ip_address, user_agent)

    def _handle_user_limit(self, db: Session, user: User) -> Dict[str, Any]:
        """Handle logic for registered users."""
        
        # Admin Exemption
        if user.is_admin:
            logger.info(f"User {user.email} is Admin - Bypassing rate limit")
            return {
                "is_guest": False,
                "limit": 1000000,
                "usage": 0,
                "remaining": 1000000
            }

        stats = user.usage_stats or {}
        current_count = stats.get("total_chats", 0)
        
        logger.info(f"User {user.email} Current Chats: {current_count}")
        
        # Check limit
        if current_count >= self.FREE_USER_LIMIT:
            logger.warning(f"User {user.email} hit limit: {current_count}/{self.FREE_USER_LIMIT}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "LIMIT_REACHED_USER",
                    "message": "You have reached your free chat limit.",
                    "limit": self.FREE_USER_LIMIT,
                    "remaining": 0
                }
            )

        # Increment
        new_count = current_count + 1
        stats["total_chats"] = new_count
        user.usage_stats = stats
        user.last_activity = datetime.now()
        
        # Explicitly flag modified for JSON fields in some SQLA versions
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(user, "usage_stats")
        
        try:
            db.add(user) # Ensure user is in session
            db.commit()
            db.refresh(user)
            logger.info(f"User {user.email} Updated usage to {new_count}")
        except Exception as e:
            logger.error(f"Failed to update user rate limit: {e}")
            db.rollback()
            # We don't block the user if DB update fails, just log it
        
        return {
            "is_guest": False,
            "limit": self.FREE_USER_LIMIT,
            "usage": new_count,
            "remaining": self.FREE_USER_LIMIT - new_count
        }

    def _handle_guest_limit(
        self, 
        db: Session, 
        guest_uuid: str, 
        ip_address: str, 
        user_agent: str
    ) -> Dict[str, Any]:
        """Handle logic for guest users."""
        
        if not guest_uuid:
             logger.warning("Guest UUID missing in request")
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Guest UUID required"
            )

        guest_usage = db.query(GuestUsage).filter(GuestUsage.guest_uuid == guest_uuid).first()

        if not guest_usage:
            logger.info(f"Creating new Guest profile for UUID: {guest_uuid}")
            # ANTI-ABUSE: Check if this IP has too many unique Guest UUIDs
            # If a single IP has created > 5 guest profiles, block new ones
            if ip_address:
                existing_ip_accounts = db.query(GuestUsage).filter(
                    GuestUsage.ip_address == ip_address
                ).count()
                
                if existing_ip_accounts >= 5:
                    logger.warning(f"Rate limit abuse attempt from IP {ip_address}")
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail={
                            "code": "IP_RATE_LIMIT",
                            "message": "Too many guest sessions from this network. Please sign up."
                        }
                    )

            # Create new guest tracking
            guest_usage = GuestUsage(
                guest_uuid=guest_uuid,
                ip_address=ip_address,
                # Simple hash for UA to avoid storing PII if not needed
                user_agent_hash=str(hash(user_agent)) if user_agent else None,
                chat_count=0
            )
            try:
                db.add(guest_usage)
                db.commit()
                db.refresh(guest_usage)
                logger.info(f"Created Guest record ID: {guest_usage.id}")
            except Exception as e:
                logger.error(f"Failed to create guest record: {e}")
                db.rollback()
                raise HTTPException(status_code=500, detail="Failed to initialize guest usage")

        logger.info(f"Guest {guest_uuid} Current Chats: {guest_usage.chat_count}")

        # Check limit
        if guest_usage.chat_count >= self.GUEST_LIMIT:
             logger.warning(f"Guest {guest_uuid} hit limit")
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "LIMIT_REACHED_GUEST",
                    "message": "You have reached your free guest limit.",
                    "limit": self.GUEST_LIMIT,
                    "remaining": 0
                }
            )

        # Increment
        guest_usage.chat_count += 1
        guest_usage.last_activity = datetime.now()
        
        try:
            db.add(guest_usage) # Explicit add just in case detached
            db.commit()
            logger.info(f"Guest {guest_uuid} incremented usage to {guest_usage.chat_count}")
        except Exception as e:
            logger.error(f"Failed to update guest rate limit: {e}")
            db.rollback()

        return {
            "is_guest": True,
            "limit": self.GUEST_LIMIT,
            "usage": guest_usage.chat_count,
            "remaining": self.GUEST_LIMIT - guest_usage.chat_count
        }

rate_limit_service = RateLimitService()
