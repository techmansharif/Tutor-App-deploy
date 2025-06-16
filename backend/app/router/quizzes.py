# from fastapi import APIRouter
# from pydantic import BaseModel

# router = APIRouter()

# class AddRequest(BaseModel):
#     a: int
#     b: int

# class AddResponse(BaseModel):
#     result: int

# @router.post("/add", response_model=AddResponse)
# async def add_numbers(data: AddRequest):
#     print(data)
#     return AddResponse(result=data.a + data.b)

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

router = APIRouter(
  
    tags=["quizzes"]
)


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        
        

# Update the fetch_random_images function to return Base64-encoded strings
def fetch_random_images(db: Session):
    import random
    
    group1_expressions = ["relieved", "happy", "dreamy"]
    group2_expressions = ["surprised", "question"]
    
    send_images = random.choice([True, False])
    if not send_images:
        return None, None
    
    image1 = (
        db.query(FacialExpression)
        .filter(FacialExpression.facial_expression.in_(group1_expressions))
        .order_by(func.random())
        .first()
    )
    
    image2 = (
        db.query(FacialExpression)
        .filter(FacialExpression.facial_expression.in_(group2_expressions))
        .order_by(func.random())
        .first()
    )
    
    # Convert images to Base64 strings if they exist
    image1_data = base64.b64encode(image1.image).decode('utf-8') if image1 else None
    image2_data = base64.b64encode(image2.image).decode('utf-8') if image2 else None
    
    return image1_data, image2_data





@router.post("/quiz1/", response_model=QuizQuestionResponse)
async def quiz1(
    submission: Optional[QuizAnswerSubmission] = None,
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
    image1, image2 = fetch_random_images(db)
    hardness_level = 1
    attempt_id = None

    if submission:
        # Validate question and attempt
        question = db.query(MCQ).filter(MCQ.id == submission.question_id).first()
        if not question:
            raise HTTPException(status_code=404, detail=f"Question ID {submission.question_id} not found")

        attempt = db.query(Quiz1Attempt).filter(Quiz1Attempt.id == submission.attempt_id, Quiz1Attempt.user_id == user_id).first()
        if not attempt:
            raise HTTPException(status_code=404, detail=f"Attempt ID {submission.attempt_id} not found")
        attempt_id = submission.attempt_id

        # Record quiz answer
        quiz_answer = Quiz1(
            user_id=user_id,
            attempt_id=submission.attempt_id,
            question_id=submission.question_id,
            hardness_level=submission.current_hardness_level,
            is_correct=submission.is_correct,
            user_answer=question.correct_option if submission.is_correct else "incorrect",
            correct_answer=question.correct_option
        )
        db.add(quiz_answer)
        db.commit()

        # Adjust hardness level
        hardness_level = submission.current_hardness_level
        if submission.is_correct:
            hardness_level = min(hardness_level + 1, 10)
        else:
            hardness_level = max(hardness_level - 1, 1)

        # Check if quiz is complete (10 questions)
        question_number = submission.questions_tried
        if question_number >= 10:
            answers = db.query(Quiz1).filter(Quiz1.attempt_id == submission.attempt_id).all()
            total_correct = sum(1 for ans in answers if ans.is_correct)
            total_questions = len(answers)
            score_percentage = (total_correct / total_questions) * 100 if total_questions > 0 else 0

            quiz_score = Quiz1Score(
                attempt_id=submission.attempt_id,
                total_correct=total_correct,
                total_questions=total_questions,
                score_percentage=score_percentage,
                student_level=hardness_level
            )
            db.add(quiz_score)
            attempt.completed_at = datetime.utcnow()
            db.commit()

            return QuizQuestionResponse(
                hardness_level=hardness_level,
                message="You have completed the Quiz1! Check your scores.",
                attempt_id=submission.attempt_id
            )
        
        attempt_id = submission.attempt_id
    else:
        # Create new quiz attempt
        quiz_attempt = Quiz1Attempt(
            user_id=user_id
        )
        db.add(quiz_attempt)
        db.commit()
        db.refresh(quiz_attempt)
        attempt_id = quiz_attempt.id

    # Get answered question IDs for this attempt
    answered_question_ids = db.query(Quiz1.question_id).filter(Quiz1.attempt_id == attempt_id).all()
    answered_question_ids = [qid for (qid,) in answered_question_ids]

    # Try to find a question by randomly selecting subject, topic, and subtopic
    next_question = None
    max_attempts = 1000  # Prevent infinite loop
    attempt_count = 0

    while not next_question and attempt_count < max_attempts:
        # Select only the "quiz1" subject
        subject = db.query(Subject).filter(Subject.name == "quiz1").first()
        if not subject:
            raise HTTPException(status_code=404, detail="Subject 'quiz1' not found")

        # Randomly select topic under the subject
        topic = db.query(Topic).filter(Topic.subject_id == subject.id).order_by(func.random()).first()
        if not topic:
            attempt_count += 1
            continue

        # Randomly select subtopic under the topic
        subtopic = db.query(Subtopic).filter(Subtopic.topic_id == topic.id).order_by(func.random()).first()
        if not subtopic:
            attempt_count += 1
            continue

        # Try to find a question at the current hardness level
        next_question = (
            db.query(MCQ)
            .filter(
                MCQ.subtopic_id == subtopic.id,
                MCQ.hardness_level == hardness_level,
                ~MCQ.id.in_(answered_question_ids)
            )
            .order_by(func.random())
            .first()
        )
        attempt_count += 1

    # If no question found after max attempts
    if not next_question:
        return QuizQuestionResponse(
            hardness_level=hardness_level,
            message="No questions available at the current difficulty level. Quiz1 completed!",
            attempt_id=attempt_id,
            image1=image1,
            image2=image2
        )

    return QuizQuestionResponse(
        question=MCQResponse.from_orm(next_question),
        hardness_level=hardness_level,
        attempt_id=attempt_id,
        image1=image1,
        image2=image2
    )



@router.post("/{subject}/{topic}/{subtopic}/quiz/", response_model=QuizQuestionResponse)
async def quiz(
    subject: str,
    topic: str,
    subtopic: str,
    submission: Optional[QuizAnswerSubmission] = None,
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
    image1, image2 = fetch_random_images(db)
    # Validate subject, topic, subtopic
    subject_obj = db.query(Subject).filter(Subject.name == subject).first()
    if not subject_obj:
        raise HTTPException(status_code=404, detail=f"Subject {subject} not found")
    
    topic_obj = db.query(Topic).filter(Topic.name == topic, Topic.subject_id == subject_obj.id).first()
    if not topic_obj:
        raise HTTPException(status_code=404, detail=f"Topic {topic} not found in subject {subject}")
    
    subtopic_obj = db.query(Subtopic).filter(Subtopic.name == subtopic, Subtopic.topic_id == topic_obj.id).first()
    if not subtopic_obj:
        raise HTTPException(status_code=404, detail=f"Subtopic {subtopic} not found in topic {topic}")

    latest_quiz1_attempt = db.query(Quiz1Attempt).filter(Quiz1Attempt.user_id == user_id).order_by(Quiz1Attempt.started_at.desc()).first()
    hardness_level = db.query(Quiz1Score).filter(Quiz1Score.attempt_id == latest_quiz1_attempt.id).first().student_level if latest_quiz1_attempt and db.query(Quiz1Score).filter(Quiz1Score.attempt_id == latest_quiz1_attempt.id).first() else 5
    attempt_id = None
    questions_tried=None
    correct_answers= None
    if submission:
        # Validate question and attempt
        question = db.query(MCQ).filter(MCQ.id == submission.question_id).first()
        if not question:
            raise HTTPException(status_code=404, detail=f"Question ID {submission.question_id} not found")

        attempt = db.query(QuizAttempt).filter(QuizAttempt.id == submission.attempt_id, QuizAttempt.user_id == user_id).first()
        if not attempt:
            raise HTTPException(status_code=404, detail=f"Attempt ID {submission.attempt_id} not found")
        attempt_id = submission.attempt_id

        # Record quiz answer
        question_number = db.query(QuizAnswer).filter(QuizAnswer.attempt_id == submission.attempt_id).count() + 1
        quiz_type = "quiz2" if question_number <= 5 else "quiz3"

        quiz_answer = QuizAnswer(
            attempt_id=submission.attempt_id,
            quiz_type=quiz_type,
            question_id=submission.question_id,
            user_answer=question.correct_option if submission.is_correct else "incorrect",
            correct_answer=question.correct_option,
            is_correct=submission.is_correct
        )
        db.add(quiz_answer)
        db.commit()

        # Adjust hardness level
        hardness_level = submission.current_hardness_level
        if submission.is_correct:
            hardness_level = min(hardness_level + 1, 10)
        else:
            hardness_level = max(hardness_level - 1, 1)

        # Check if quiz is complete (10 questions)
        if question_number >= 10:
            quiz2_answers = db.query(QuizAnswer).filter(QuizAnswer.attempt_id == submission.attempt_id, QuizAnswer.quiz_type == "quiz2").all()
            quiz3_answers = db.query(QuizAnswer).filter(QuizAnswer.attempt_id == submission.attempt_id, QuizAnswer.quiz_type == "quiz3").all()
            quiz2_correct = sum(1 for ans in quiz2_answers if ans.is_correct)
            quiz3_correct = sum(1 for ans in quiz3_answers if ans.is_correct)
            quiz2_score = (quiz2_correct / 5) * 100 if quiz2_answers else 0
            quiz3_score = (quiz3_correct / 5) * 100 if quiz3_answers else 0

            quiz_score = QuizScore(
                attempt_id=submission.attempt_id,
                quiz2_correct=quiz2_correct,
                quiz3_correct=quiz3_correct,
                total_correct=quiz2_correct + quiz3_correct,
                quiz2_score=quiz2_score,
                quiz3_score=quiz3_score
            )
            db.add(quiz_score)
            attempt.completed_at = datetime.utcnow()
            db.commit()

            return QuizQuestionResponse(
                hardness_level=hardness_level,
                message="You have completed the quiz! Check your scores.",
                attempt_id=submission.attempt_id
            )
        
        attempt_id = submission.attempt_id
    else:
        # Check for latest incomplete quiz attempt
        latest_attempt = (
            db.query(QuizAttempt)
            .filter(
                QuizAttempt.user_id == user_id,
                QuizAttempt.subject_id == subject_obj.id,
                QuizAttempt.topic_id == topic_obj.id,
                QuizAttempt.subtopic_id == subtopic_obj.id,
                QuizAttempt.completed_at.is_(None)
            )
            .order_by(QuizAttempt.started_at.desc())
            .first()
        )

        questions_tried = 0
        correct_answers = 0
        if latest_attempt and db.query(QuizAnswer).filter(QuizAnswer.attempt_id == latest_attempt.id).count() < 10:
            # Reuse existing attempt
            
            attempt_id = latest_attempt.id
            # Calculate questions tried and correct answers
            quiz_answers = db.query(QuizAnswer).filter(QuizAnswer.attempt_id == attempt_id).all()
            questions_tried = len(quiz_answers)
            correct_answers = sum(1 for ans in quiz_answers if ans.is_correct)
            # Get the last question's hardness level and correctness
            last_answer = (
                db.query(QuizAnswer)
                .filter(QuizAnswer.attempt_id == attempt_id)
                .join(MCQ, QuizAnswer.question_id == MCQ.id)
                .order_by(QuizAnswer.id.desc())
                .first()
            )
            if last_answer:
                hardness_level = last_answer.question.hardness_level
                if last_answer.is_correct:
                    hardness_level = min(hardness_level + 1, 10)
                else:
                    hardness_level = max(hardness_level - 1, 1)
        else:
            
            # Create new quiz attempt
            quiz_attempt = QuizAttempt(
                user_id=user_id,
                subject_id=subject_obj.id,
                topic_id=topic_obj.id,
                subtopic_id=subtopic_obj.id
            )
            db.add(quiz_attempt)
            db.commit()
            db.refresh(quiz_attempt)
            attempt_id = quiz_attempt.id
    # Get answered question IDs
    answered_question_ids = db.query(QuizAnswer.question_id).filter(QuizAnswer.attempt_id == attempt_id).all()
    answered_question_ids = [qid for (qid,) in answered_question_ids]

    # Try to find a question at the current hardness level
    next_question = (
        db.query(MCQ)
        .filter(
            MCQ.subtopic_id == subtopic_obj.id,
            MCQ.hardness_level == hardness_level,
            ~MCQ.id.in_(answered_question_ids)
        )
        .order_by(func.random())
        .first()
    )

   # If no question found, try random search at same level (ignoring answered questions)
    if not next_question:
        next_question = (
            db.query(MCQ)
            .filter(
                MCQ.subtopic_id == subtopic_obj.id,
                MCQ.hardness_level == hardness_level
            )
            .order_by(func.random())
            .first()
        )
  
    # If still no question found, quiz is complete
    if not next_question:
        return QuizQuestionResponse(
                hardness_level=hardness_level,
                message="No questions available at any difficulty level. Quiz completed!",
                attempt_id=attempt_id,
                questions_tried=questions_tried,
                correct_answers= correct_answers,
                image1=image1,
                image2=image2
        )

    print("question tried is ",questions_tried)
    return QuizQuestionResponse(
        question=MCQResponse.from_orm(next_question),
        hardness_level=hardness_level,
        attempt_id=attempt_id,
        questions_tried=questions_tried,
        correct_answers= correct_answers,
        image1=image1,
        image2=image2
    )
    
    
    

# Practice quiz endpoint
@router.post("/{subject}/{topic}/{subtopic}/practise/", response_model=PracticeQuizQuestionResponse)
async def practice_quiz(
    subject: str,
    topic: str,
    subtopic: str,
    submission: Optional[PracticeQuizAnswerSubmission] = None,
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
    
    image1, image2 = fetch_random_images(db)
    # Validate subject, topic, and subtopic
    subject_obj = db.query(Subject).filter(Subject.name == subject).first()
    if not subject_obj:
        raise HTTPException(status_code=404, detail=f"Subject {subject} not found")
    
    topic_obj = db.query(Topic).filter(
        Topic.name == topic,
        Topic.subject_id == subject_obj.id
    ).first()
    if not topic_obj:
        raise HTTPException(status_code=404, detail=f"Topic {topic} not found in subject {subject}")
    
    subtopic_obj = db.query(Subtopic).filter(
        Subtopic.name == subtopic,
        Subtopic.topic_id == topic_obj.id
    ).first()
    if not subtopic_obj:
        raise HTTPException(status_code=404, detail=f"Subtopic {subtopic} not found in topic {topic}")

    # Determine hardness level and questions tried
    latest_quiz1_attempt = db.query(Quiz1Attempt).filter(Quiz1Attempt.user_id == user_id).order_by(Quiz1Attempt.started_at.desc()).first()
    hardness_level = db.query(Quiz1Score).filter(Quiz1Score.attempt_id == latest_quiz1_attempt.id).first().student_level if latest_quiz1_attempt and db.query(Quiz1Score).filter(Quiz1Score.attempt_id == latest_quiz1_attempt.id).first() else 5
    # Create or retrieve PractiseAttempt
    practise_attempt = None
    questions_tried = 0
    number_correct = 0
    if not submission:
        # Check for the latest PractiseAttempt for the user and subtopic
        practise_attempt = (
            db.query(PractiseAttempt)
            .filter(
                PractiseAttempt.user_id == user_id,
                PractiseAttempt.subtopic_id == subtopic_obj.id
            )
            .order_by(PractiseAttempt.started_at.desc())
            .first()
        )
        if practise_attempt:
            # Calculate questions tried and correct answers
            questions_tried = (
                db.query(PractiseAnswer)
                .filter(PractiseAnswer.attempt_id == practise_attempt.id)
                .count()
            )
            number_correct = (
                db.query(PractiseAnswer)
                .filter(
                    PractiseAnswer.attempt_id == practise_attempt.id,
                    PractiseAnswer.is_correct == True
                )
                .count()
            )
            # Get the last question's difficulty and correctness
            last_answer = (
                db.query(PractiseAnswer)
                .filter(PractiseAnswer.attempt_id == practise_attempt.id)
                .join(MCQ, PractiseAnswer.question_id == MCQ.id)
                .order_by(PractiseAnswer.id.desc())
                .first()
            )
            if last_answer:
                hardness_level = last_answer.question.hardness_level
                # Adjust hardness level based on last question's correctness
                if last_answer.is_correct:
                    hardness_level = min(hardness_level + 1, 10)  # Increase, max 10
                else:
                    hardness_level = max(hardness_level - 1, 1)   # Decrease, min 1
        if not practise_attempt or questions_tried >= 20:
            # Create a new PractiseAttempt if none exists or latest has >= 20 answers
            practise_attempt = PractiseAttempt(
                user_id=user_id,
                subject_id=subject_obj.id,
                topic_id=topic_obj.id,
                subtopic_id=subtopic_obj.id
            )
            db.add(practise_attempt)
            db.commit()
            db.refresh(practise_attempt)
            questions_tried = 0
            number_correct = 0
            # Determine hardness level and questions tried
            latest_quiz1_attempt = db.query(Quiz1Attempt).filter(Quiz1Attempt.user_id == user_id).order_by(Quiz1Attempt.started_at.desc()).first()
            hardness_level = db.query(Quiz1Score).filter(Quiz1Score.attempt_id == latest_quiz1_attempt.id).first().student_level if latest_quiz1_attempt and db.query(Quiz1Score).filter(Quiz1Score.attempt_id == latest_quiz1_attempt.id).first() else 5
   
    else:
        # Retrieve the most recent PractiseAttempt for the user and subtopic
        practise_attempt = (
            db.query(PractiseAttempt)
            .filter(
                PractiseAttempt.user_id == user_id,
                PractiseAttempt.subtopic_id == subtopic_obj.id
            )
            .order_by(PractiseAttempt.started_at.desc())
            .first()
        )
        if not practise_attempt:
            raise HTTPException(status_code=400, detail="No active practice attempt found")
        # Save the user's answer to PractiseAnswer
        practise_answer = PractiseAnswer(
            attempt_id=practise_attempt.id,
            question_id=submission.question_id,
            is_correct=submission.is_correct
        )
        db.add(practise_answer)
        db.commit()
        # Update questions tried and correct count
        questions_tried = (
            db.query(PractiseAnswer)
            .filter(PractiseAnswer.attempt_id == practise_attempt.id)
            .count()
        )
        number_correct = (
            db.query(PractiseAnswer)
            .filter(
                PractiseAnswer.attempt_id == practise_attempt.id,
                PractiseAnswer.is_correct == True
            )
            .count()
        )
        # Update hardness level based on submission
        hardness_level = submission.current_hardness_level
        if submission.is_correct:
            hardness_level = min(hardness_level + 1, 10)  # Increase, max 10
        else:
            hardness_level = max(hardness_level - 1, 1)   # Decrease, min 1

    # Check if 20 questions have been reached
    if questions_tried >= 20:
        return PracticeQuizQuestionResponse(
            hardness_level=hardness_level,
            message="You have completed 20 practice questions!",
            questions_tried=questions_tried,
            number_correct=number_correct,
            image1=image1,
            image2=image2
        )

    # Fetch next question (allow reuse of questions)
    next_question = (
        db.query(MCQ)
        .filter(
            MCQ.subtopic_id == subtopic_obj.id,
            MCQ.hardness_level == hardness_level
        )
        .order_by(func.random())
        .first()
    )

    # If no questions are available at this hardness level, end the quiz
    if not next_question:
        return PracticeQuizQuestionResponse(
            hardness_level=hardness_level,
            message=f"No questions available at difficulty level {hardness_level}. Practice completed!",
            questions_tried=questions_tried,
            number_correct=number_correct,
            image1=image1,
            image2=image2
        )

    return PracticeQuizQuestionResponse(
        question=MCQResponse.from_orm(next_question),
        hardness_level=hardness_level,
        questions_tried=questions_tried,
        number_correct=number_correct,
        image1=image1,
        image2=image2
    )
