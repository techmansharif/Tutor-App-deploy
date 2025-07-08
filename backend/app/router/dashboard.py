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
from itertools import groupby
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
    total_quiz_attempts: int  # NEW: Total number of quiz attempts

# NEW: Analytics Pydantic models
class AnalyticsData(BaseModel):
    subtopic_name: str
    quiz_date: Optional[str] = None
    average_response_time: float
    total_response_time: float

class SubtopicAnalytics(BaseModel):
    subject: str
    topic: str
    analytics: List[AnalyticsData]
    
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
    
    # Count total quiz attempts across all subtopics
    total_quiz_attempts = db.query(QuizAttempt).filter(
        QuizAttempt.user_id == user_id,
        QuizAttempt.subject_id == subject_obj.id,
        QuizAttempt.topic_id == topic_obj.id,
        QuizAttempt.completed_at.isnot(None)
    ).count()
    
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
        subtopics=subtopics_data,
        total_quiz_attempts=total_quiz_attempts
    )

# MODIFIED: Analytics endpoint to show multiple entries per subtopic
@router.get("/analytics/{subject}/{topic}/", response_model=SubtopicAnalytics)
async def get_analytics_data(
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
    
    analytics_data = []
    
    try:
        for subtopic in subtopics:
            # Get all quiz attempts for this subtopic (not just the latest one)
            quiz_attempts = db.query(QuizAttempt).filter(
                QuizAttempt.user_id == user_id,
                QuizAttempt.subject_id == subject_obj.id,
                QuizAttempt.topic_id == topic_obj.id,
                QuizAttempt.subtopic_id == subtopic.id,
                QuizAttempt.completed_at.isnot(None)
            ).order_by(QuizAttempt.completed_at.desc()).all()
            
            # Create separate entry for each quiz attempt
            for attempt in quiz_attempts:
                quiz_answers = db.query(QuizAnswer).filter(
                    QuizAnswer.attempt_id == attempt.id,
                    QuizAnswer.response_time.isnot(None)
                ).all()
                
                if quiz_answers:
                    response_times = [answer.response_time for answer in quiz_answers]
                    total_time = sum(response_times)
                    avg_time = total_time / len(response_times)
                    
                    analytics_data.append({
                        "subtopic_name": subtopic.name,
                        "quiz_date": attempt.completed_at.strftime("%Y-%m-%d %H:%M:%S"),
                        "average_response_time": round(avg_time, 2),
                        "total_response_time": round(total_time, 2)
                    })
            
            # Get all practice attempts for this subtopic
            try:
                practice_attempts = db.query(PractiseAttempt).filter(
                    PractiseAttempt.user_id == user_id,
                    PractiseAttempt.subject_id == subject_obj.id,
                    PractiseAttempt.topic_id == topic_obj.id,
                    PractiseAttempt.subtopic_id == subtopic.id
                ).all()
                
                # Create separate entry for each practice attempt
                for attempt in practice_attempts:
                    practice_answers = db.query(PractiseAnswer).filter(
                        PractiseAnswer.attempt_id == attempt.id,
                        PractiseAnswer.response_time.isnot(None)
                    ).all()
                    
                    if practice_answers:
                        response_times = [answer.response_time for answer in practice_answers]
                        total_time = sum(response_times)
                        avg_time = total_time / len(response_times)
                        
                        # Try to get a date from the attempt, fallback to created_at or use generic date
                        attempt_date = None
                        if hasattr(attempt, 'completed_at') and attempt.completed_at:
                            attempt_date = attempt.completed_at.strftime("%Y-%m-%d %H:%M:%S")
                        elif hasattr(attempt, 'created_at') and attempt.created_at:
                            attempt_date = attempt.created_at.strftime("%Y-%m-%d %H:%M:%S")
                        else:
                            attempt_date = "Unknown date"
                        
                        analytics_data.append({
                            "subtopic_name": subtopic.name,
                            "quiz_date": attempt_date,
                            "average_response_time": round(avg_time, 2),
                            "total_response_time": round(total_time, 2)
                        })
            except Exception as e:
                # If there's an error with practice attempts, just skip them
                print(f"Error processing practice attempts for subtopic {subtopic.name}: {e}")
            
            # If no attempts at all, add placeholder entry
            if not quiz_attempts and not any(item["subtopic_name"] == subtopic.name for item in analytics_data):
                analytics_data.append({
                    "subtopic_name": subtopic.name,
                    "quiz_date": None,
                    "average_response_time": 0.0,
                    "total_response_time": 0.0
                })
        
        # Separate taken and untaken quizzes
        taken_quizzes = [item for item in analytics_data if item["quiz_date"] is not None]
        untaken_quizzes = [item for item in analytics_data if item["quiz_date"] is None]
        
        # Sort taken quizzes: by subtopic name, then by date (newest first)
        taken_quizzes.sort(key=lambda x: (x["subtopic_name"], x["quiz_date"]), reverse=False)
        
        # Group by subtopic and reverse date order within each subtopic
        from itertools import groupby
        final_taken = []
        for subtopic, group in groupby(taken_quizzes, key=lambda x: x["subtopic_name"]):
            subtopic_items = list(group)
            subtopic_items.sort(key=lambda x: x["quiz_date"], reverse=True)  # Newest first
            final_taken.extend(subtopic_items)
        
        # Sort untaken quizzes by subtopic name
        untaken_quizzes.sort(key=lambda x: x["subtopic_name"])
        
        # Combine: taken first, then untaken
        analytics_data = final_taken + untaken_quizzes
        
    except Exception as e:
        print(f"Error in analytics endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    return SubtopicAnalytics(
        subject=subject,
        topic=topic,
        analytics=analytics_data
    )