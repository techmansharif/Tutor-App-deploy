from pydantic import BaseModel
from typing import List, Optional,Dict







# Request model for user input
class ExplainQuery(BaseModel):
    query: str
    is_initial: Optional[bool] = False

# Response model for explain (only answer)
class ExplainResponse(BaseModel):
    answer: str
    image: Optional[str] = None  # Base64-encoded image string (or None if no image)
    total:Optional[int]=None
    current:Optional[int]=None
    initial_response: Optional[List[Dict[str, Optional[str]]]] = None