from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class InteractionCreate(BaseModel):
    interaction_type: str
    details: Optional[Dict[str, Any]] = None

class InteractionResponse(BaseModel):
    id: int
    interaction_type: str
    timestamp: datetime
    status: str
    
    class Config:
        from_attributes = True