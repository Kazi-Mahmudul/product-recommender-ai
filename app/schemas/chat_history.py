from typing import List, Dict, Any, Optional
from pydantic import BaseModel, UUID4, Field
from datetime import datetime

class ChatMessageBase(BaseModel):
    role: str
    content: Any # Can be string or JSON object
    metadata: Optional[Dict[str, Any]] = Field(default={}, validation_alias="metadata_")

class ChatMessageCreate(ChatMessageBase):
    session_id: UUID4

class ChatMessage(ChatMessageBase):
    id: UUID4
    session_id: UUID4
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionBase(BaseModel):
    title: Optional[str] = None

class ChatSessionCreate(ChatSessionBase):
    pass

class ChatSession(ChatSessionBase):
    id: UUID4
    user_id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool
    
    # Optional list of messages for detailed view
    messages: Optional[List[ChatMessage]] = None

    class Config:
        from_attributes = True

class ChatHistoryList(BaseModel):
    sessions: List[ChatSession]
    total_count: int
