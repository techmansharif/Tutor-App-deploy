from pydantic import BaseModel
from typing import List, Optional





#######################
class Quiz0Response(BaseModel):
    id: int
    question: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    category: str

    class Config:
        orm_mode = True



# Request model for submitting answers
class AnswerSubmission(BaseModel):
    question_id: int
    selected_option: str

class QuizSubmission(BaseModel):
    answers: List[AnswerSubmission]



# Updated MCQResponse model to include correct_option
class MCQResponse(BaseModel):
    id: int
    question: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    hardness_level: int
    correct_option: str
    explanation: Optional[str] = None
    class Config:
        from_attributes = True


# Response model for practice quiz question
class PracticeQuizQuestionResponse(BaseModel):
    question: Optional[MCQResponse] = None
    hardness_level: int
    message: Optional[str] = None
    questions_tried: Optional[int] = None  # Number of questions tried in the attempt
    number_correct: Optional[int] = None   # Number of correct answers in the attempt
   # last_question_correct: Optional[bool] = None  # Whether the last question was correct
    image1: Optional[str] = None  # Base64-encoded string for the first image
    image2: Optional[str] = None  # Base64-encoded string for the second image


    class Config:
        from_attributes = True

# Request model for submitting practice quiz answer
class PracticeQuizAnswerSubmission(BaseModel):
    question_id: int
    is_correct: bool
    current_hardness_level: int
    questions_tried: int
    response_time: Optional[float] = None  # NEW FIELD



# New QuizQuestionResponse schema
class QuizQuestionResponse(BaseModel):
    question: Optional[MCQResponse] = None
    hardness_level: int
    message: Optional[str] = None
    attempt_id: Optional[int] = None
    questions_tried: Optional[int] = None  # New field
    correct_answers: Optional[int] = None  # New field
    image1: Optional[str] = None  # Base64-encoded string for the first image
    image2: Optional[str] = None  # Base64-encoded string for the second image


    class Config:
        from_attributes = True

# New QuizAnswerSubmission schema
class QuizAnswerSubmission(BaseModel):
    question_id: int
    is_correct: bool
    current_hardness_level: int
    questions_tried: int
    attempt_id: int
    response_time: Optional[float] = None  # NEW FIELD