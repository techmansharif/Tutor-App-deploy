from pydantic import BaseModel
from typing import List, Optional


# # Model for selecting subject, topic, subtopic
# class SelectionRequest(BaseModel):
#     name: str
# Model for selecting subject, topic, and subtopic
class SelectionRequest(BaseModel):
    subject: str  # Name of the subject
    topic: str    # Name of the topic under the selected subject
    subtopic: Optional[str] = None  # Subtopic is optional now
