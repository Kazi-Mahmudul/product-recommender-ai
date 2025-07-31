
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime

class ComparisonItemBase(BaseModel):
    slug: str

class ComparisonItemCreate(ComparisonItemBase):
    pass

class ComparisonItem(ComparisonItemBase):
    id: int
    session_id: Optional[uuid.UUID] = None
    user_id: Optional[int] = None
    added_at: datetime

    class Config:
        from_attributes = True

class ComparisonSessionBase(BaseModel):
    session_id: uuid.UUID

class ComparisonSessionCreate(ComparisonSessionBase):
    pass

class ComparisonSession(ComparisonSessionBase):
    created_at: datetime
    expires_at: datetime
    items: List[ComparisonItem] = []

    class Config:
        from_attributes = True
