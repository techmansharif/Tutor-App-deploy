from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import random
from pydantic import BaseModel
from ..database.models import Subject, Topic, Subtopic, User, MCQ, QuizAttempt, QuizAnswer, QuizScore, Quiz1Attempt, Quiz1, Quiz1Score, PractiseAnswer, PractiseAttempt, FacialExpression
from ..schemas.quizzes import QuizAnswerSubmission, QuizQuestionResponse, PracticeQuizAnswerSubmission, PracticeQuizQuestionResponse, MCQResponse

# Import your database models and utilities
from ..database.session import SessionLocal
from ..database.models import (
    Subject, Topic, Subtopic, User, MCQ, 
    QuizAttempt, QuizAnswer, PractiseAnswer, PractiseAttempt,
    ReviseSession, ReviseShownQuestion
)
from ..jwt_utils import get_user_from_token
from sqlalchemy.sql import func

# Create router
router = APIRouter(
    prefix="/revise",
    tags=["revise"]
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class ReviseQuestionResponse(BaseModel):
    question: Optional[MCQResponse] = None
    message: Optional[str] = None
    total_questions: Optional[int] = None
    questions_shown: Optional[int] = None
    mode: Optional[str] = None  # "subject" or "random"
    
    class Config:
        from_attributes = True

class ReviseAnswerSubmission(BaseModel):
    question_id: int
    selected_answer: str
    retry: bool = False  # If True, show same question again

class ReviseStartRequest(BaseModel):
    mode: str  # "subject" or "random"
    subject: Optional[str] = None
    topic: Optional[str] = None
    subtopic: Optional[str] = None
    
# Add this wrapper model
class ReviseRequest(BaseModel):
    request: Optional[ReviseStartRequest] = None
    submission: Optional[ReviseAnswerSubmission] = None

# Helper function to get failed questions
def get_failed_questions(db: Session, user_id: int, subject: str = None, topic: str = None, subtopic: str = None):
    """Get questions that user failed in last 5 practice and quiz attempts"""
    
    failed_question_ids = set()
    
    # Get subject, topic, subtopic IDs if provided
    subject_id = topic_id = subtopic_id = None
    if subject:
        subject_obj = db.query(Subject).filter(Subject.name == subject).first()
        if subject_obj:
            subject_id = subject_obj.id
            if topic:
                topic_obj = db.query(Topic).filter(
                    Topic.name == topic,
                    Topic.subject_id == subject_id
                ).first()
                if topic_obj:
                    topic_id = topic_obj.id
                    if subtopic:
                        subtopic_obj = db.query(Subtopic).filter(
                            Subtopic.name == subtopic,
                            Subtopic.topic_id == topic_id
                        ).first()
                        if subtopic_obj:
                            subtopic_id = subtopic_obj.id
    
    # Get last 5 practice attempts
    practice_attempts_query = db.query(PractiseAttempt).filter(
        PractiseAttempt.user_id == user_id
    )
    if subtopic_id:
        practice_attempts_query = practice_attempts_query.filter(
            PractiseAttempt.subtopic_id == subtopic_id
        )
    elif topic_id:
        practice_attempts_query = practice_attempts_query.filter(
            PractiseAttempt.topic_id == topic_id
        )
    elif subject_id:
        practice_attempts_query = practice_attempts_query.filter(
            PractiseAttempt.subject_id == subject_id
        )
    
    practice_attempts = practice_attempts_query.order_by(
        PractiseAttempt.started_at.desc()
    ).limit(5).all()
    
    # Get failed questions from practice attempts
    for attempt in practice_attempts:
        failed_answers = db.query(PractiseAnswer).filter(
            PractiseAnswer.attempt_id == attempt.id,
            PractiseAnswer.is_correct == False
        ).all()
        failed_question_ids.update([ans.question_id for ans in failed_answers])
    
    # Get last 5 quiz attempts
    quiz_attempts_query = db.query(QuizAttempt).filter(
        QuizAttempt.user_id == user_id
    )
    if subtopic_id:
        quiz_attempts_query = quiz_attempts_query.filter(
            QuizAttempt.subtopic_id == subtopic_id
        )
    elif topic_id:
        quiz_attempts_query = quiz_attempts_query.filter(
            QuizAttempt.topic_id == topic_id
        )
    elif subject_id:
        quiz_attempts_query = quiz_attempts_query.filter(
            QuizAttempt.subject_id == subject_id
        )
    
    quiz_attempts = quiz_attempts_query.order_by(
        QuizAttempt.started_at.desc()
    ).limit(5).all()
    
    # Get failed questions from quiz attempts
    for attempt in quiz_attempts:
        failed_answers = db.query(QuizAnswer).filter(
            QuizAnswer.attempt_id == attempt.id,
            QuizAnswer.is_correct == False
        ).all()
        failed_question_ids.update([ans.question_id for ans in failed_answers])
    
    # Return MCQ objects for failed questions
    if failed_question_ids:
        return db.query(MCQ).filter(MCQ.id.in_(failed_question_ids)).all()
    return []

# Main revise endpoint
@router.post("/", response_model=ReviseQuestionResponse)
async def revise(
    body: Optional[ReviseRequest] = None,  # Changed from separate params
    user_id: int = Header(...),
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    # Authentication
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
    # Extract request and submission from body
    request = body.request if body else None
    submission = body.submission if body else None
    # Handle initial request or mode change
    if request:
        # Deactivate any existing active sessions for this user
        db.query(ReviseSession).filter(
            ReviseSession.user_id == user_id,
            ReviseSession.is_active == True
        ).update({"is_active": False})
        
        # Create new session
        new_session = ReviseSession(
            user_id=user_id,
            mode=request.mode,
            subject=request.subject,
            topic=request.topic,
            subtopic=request.subtopic
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        
        # Get failed questions based on mode
        failed_questions = get_failed_questions(
            db, user_id, 
            subject=request.subject if request.mode == "subject" else None,
            topic=request.topic if request.mode == "subject" else None,
            subtopic=request.subtopic if request.mode == "subject" else None
        )
        
        if not failed_questions:
            return ReviseQuestionResponse(
                message="No failed questions found to revise!",
                total_questions=0,
                questions_shown=0,
                mode=request.mode
            )
        
        # Get first question
        next_question_id = random.choice([q.id for q in failed_questions])
        question = db.query(MCQ).filter(MCQ.id == next_question_id).first()
        
        return ReviseQuestionResponse(
            question=MCQResponse.from_orm(question),
            total_questions=len(failed_questions),
            questions_shown=0,
            mode=request.mode
        )
    
    # Get active session
    active_session = db.query(ReviseSession).filter(
        ReviseSession.user_id == user_id,
        ReviseSession.is_active == True
    ).first()
    
    if not active_session:
        # No active session - return a message to prompt mode selection
        return ReviseQuestionResponse(
            message="Please select a revision mode to start.",
            total_questions=0,
            questions_shown=0,
            mode=None
        )
    
    # Handle answer submission
    if submission and not submission.retry:
        # Check if question already shown
        existing = db.query(ReviseShownQuestion).filter(
            ReviseShownQuestion.session_id == active_session.id,
            ReviseShownQuestion.question_id == submission.question_id
        ).first()
        
        if not existing:
            # Mark question as shown
            shown_question = ReviseShownQuestion(
                session_id=active_session.id,
                question_id=submission.question_id
            )
            db.add(shown_question)
            db.commit()
    
    # Get failed questions for this session
    failed_questions = get_failed_questions(
        db, user_id,
        subject=active_session.subject,
        topic=active_session.topic,
        subtopic=active_session.subtopic
    )
    
    # Get shown questions
    shown_question_ids = db.query(ReviseShownQuestion.question_id).filter(
        ReviseShownQuestion.session_id == active_session.id
    ).all()
    shown_question_ids = [qid for (qid,) in shown_question_ids]
    
    # Get remaining questions
    failed_question_ids = [q.id for q in failed_questions]
    remaining_questions = [
        qid for qid in failed_question_ids 
        if qid not in shown_question_ids
    ]
    
    if not remaining_questions:
        # All questions shown - deactivate session
        active_session.is_active = False
        db.commit()
        
        return ReviseQuestionResponse(
            message="You have reviewed all failed questions! Click 'Restart Revise' to go through them again.",
            total_questions=len(failed_question_ids),
            questions_shown=len(shown_question_ids),
            mode=active_session.mode
        )
    
    # Get next question (or same question if retry)
    if submission and submission.retry:
        next_question_id = submission.question_id
    else:
        next_question_id = random.choice(remaining_questions)
    
    question = db.query(MCQ).filter(MCQ.id == next_question_id).first()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    return ReviseQuestionResponse(
        question=MCQResponse.from_orm(question),
        total_questions=len(failed_question_ids),
        questions_shown=len(shown_question_ids),
        mode=active_session.mode
    )

# Optional: Get revision statistics
@router.get("/stats")
async def get_revision_stats(
    user_id: int = Header(...),
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    # Authentication
    try:
        user_data = get_user_from_token(authorization)
        if user_data.get("id") != user_id:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid token")
    except:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid or missing token")
    
    # Get revision statistics
    total_sessions = db.query(ReviseSession).filter(
        ReviseSession.user_id == user_id
    ).count()
    
    completed_sessions = db.query(ReviseSession).filter(
        ReviseSession.user_id == user_id,
        ReviseSession.is_active == False
    ).count()
    
    return {
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "active_session": db.query(ReviseSession).filter(
            ReviseSession.user_id == user_id,
            ReviseSession.is_active == True
        ).first() is not None
    }