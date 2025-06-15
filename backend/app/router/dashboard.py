# Add these imports at the top of router/dashboard.py if not already present
from fastapi import Request, status,APIRouter
from pydantic import BaseModel
from ..database.models import QuizAttempt, QuizScore
from typing import List,Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from ..database.session import SessionLocal
from ..database.models import Subject, Topic, Subtopic, User, MCQ, QuizAttempt, QuizAnswer, QuizScore, Quiz1Attempt, Quiz1, Quiz1Score, PractiseAnswer, PractiseAttempt, FacialExpression
from ..schemas.quizzes import QuizAnswerSubmission, QuizQuestionResponse, PracticeQuizAnswerSubmission, PracticeQuizQuestionResponse, MCQResponse
from sqlalchemy.sql import func
import base64
import random

# BEFORE - Add these imports
from ..jwt_utils import create_access_token, get_user_from_token


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
# NEW DASHBOARD ENDPOINTS
# Pydantic model for DashboardData
class SubtopicData(BaseModel):
    name: str
    completion_percentage: float
    quiz_taken: bool

class DashboardData(BaseModel):
    subject: str
    topic: str
    subtopics: List[SubtopicData]
    
router = APIRouter(
  
    tags=["dashboard"]
)

@router.get("/dashboard/{subject}/{topic}/", response_model=DashboardData)
async def get_dashboard_data(
    subject: str,
    topic: str,
    user_id: int = Header(...),
    db: Session = Depends(get_db),
      authorization: Optional[str] = Header(None)
):
    try:
        user_data = get_user_from_token(authorization)
        if user_data.get("id") != user_id:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid token")
    except:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid or missing token")
    
    # Validate user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User ID {user_id} not found")

    # Validate subject and topic
    subject_obj = db.query(Subject).filter(Subject.name == subject).first()
    if not subject_obj:
        raise HTTPException(status_code=404, detail=f"Subject {subject} not found")
    
    topic_obj = db.query(Topic).filter(
        Topic.name == topic,
        Topic.subject_id == subject_obj.id
    ).first()
    if not topic_obj:
        raise HTTPException(status_code=404, detail=f"Topic {topic} not found in subject {subject}")

    # Get all subtopics for this topic
    subtopics = db.query(Subtopic).filter(Subtopic.topic_id == topic_obj.id).all()
    
    subtopics_data = []
    for subtopic in subtopics:
        # Check if user has taken quiz for this subtopic
        quiz_attempts = db.query(QuizAttempt).filter(
            QuizAttempt.user_id == user_id,
            QuizAttempt.subject_id == subject_obj.id,
            QuizAttempt.topic_id == topic_obj.id,
            QuizAttempt.subtopic_id == subtopic.id,
            QuizAttempt.completed_at.isnot(None)
        ).all()
        
        if not quiz_attempts:
            # No quiz taken for this subtopic
            subtopics_data.append({
                "name": subtopic.name,
                "completion_percentage": 0,
                "quiz_taken": False
            })
        else:
            # Get the latest completed quiz attempt
            latest_attempt = max(quiz_attempts, key=lambda x: x.completed_at)
            
            # Get quiz score for this attempt
            quiz_score = db.query(QuizScore).filter(
                QuizScore.attempt_id == latest_attempt.id
            ).first()
            
            if quiz_score:
                # Calculate overall score percentage
                total_questions = 10  # As per your quiz logic
                overall_score = (quiz_score.total_correct / total_questions) * 100
                completion_percentage = 100 if overall_score >= 75 else overall_score
                
                subtopics_data.append({
                    "name": subtopic.name,
                    "completion_percentage": completion_percentage,
                    "quiz_taken": True
                })
            else:
                subtopics_data.append({
                    "name": subtopic.name,
                    "completion_percentage": 0,
                    "quiz_taken": False
                })
    
    return DashboardData(
        subject=subject,
        topic=topic,
        subtopics=subtopics_data
    )