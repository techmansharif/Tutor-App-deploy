# from fastapi import APIRouter, Depends, HTTPException, Header, Request
# from sqlalchemy.orm import Session
# from typing import Optional
# from datetime import datetime
# from ..database.session import SessionLocal
# from ..database.models import Quiz1, Quiz1Attempt, Quiz1Score, MCQ, User, Subject, Topic, Subtopic, FacialExpression
# from ..schemas.models import MCQResponse, QuizQuestionResponse, QuizAnswerSubmission
# from sqlalchemy.sql import func
# import base64
# import random

# router = APIRouter()

# # Dependency to get DB session
# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()
        
        
        

# @router.post("/quiz1/", response_model=QuizQuestionResponse)
# async def quiz1(
#     submission: Optional[QuizAnswerSubmission] = None,
#     user_id: int = Header(...),
#     db: Session = Depends(get_db),
#     request:Request=None
# ):
#     session_user = request.session.get("user")
#     if not session_user or session_user.get("id") != user_id:
#         raise HTTPException(status_code=401, detail="Unauthorized: Invalid or missing session")
#     # Validate user
#     user = db.query(User).filter(User.id == user_id).first()
#     if not user:
#         raise HTTPException(status_code=404, detail=f"User ID {user_id} not found")
#     image1, image2 = fetch_random_images(db)
#     hardness_level = 1
#     attempt_id = None

#     if submission:
#         # Validate question and attempt
#         question = db.query(MCQ).filter(MCQ.id == submission.question_id).first()
#         if not question:
#             raise HTTPException(status_code=404, detail=f"Question ID {submission.question_id} not found")

#         attempt = db.query(Quiz1Attempt).filter(Quiz1Attempt.id == submission.attempt_id, Quiz1Attempt.user_id == user_id).first()
#         if not attempt:
#             raise HTTPException(status_code=404, detail=f"Attempt ID {submission.attempt_id} not found")
#         attempt_id = submission.attempt_id

#         # Record quiz answer
#         quiz_answer = Quiz1(
#             user_id=user_id,
#             attempt_id=submission.attempt_id,
#             question_id=submission.question_id,
#             hardness_level=submission.current_hardness_level,
#             is_correct=submission.is_correct,
#             user_answer=question.correct_option if submission.is_correct else "incorrect",
#             correct_answer=question.correct_option
#         )
#         db.add(quiz_answer)
#         db.commit()

#         # Adjust hardness level
#         hardness_level = submission.current_hardness_level
#         if submission.is_correct:
#             hardness_level = min(hardness_level + 1, 10)
#         else:
#             hardness_level = max(hardness_level - 1, 1)

#         # Check if quiz is complete (10 questions)
#         question_number = submission.questions_tried
#         if question_number >= 10:
#             answers = db.query(Quiz1).filter(Quiz1.attempt_id == submission.attempt_id).all()
#             total_correct = sum(1 for ans in answers if ans.is_correct)
#             total_questions = len(answers)
#             score_percentage = (total_correct / total_questions) * 100 if total_questions > 0 else 0

#             quiz_score = Quiz1Score(
#                 attempt_id=submission.attempt_id,
#                 total_correct=total_correct,
#                 total_questions=total_questions,
#                 score_percentage=score_percentage,
#                 student_level=hardness_level
#             )
#             db.add(quiz_score)
#             attempt.completed_at = datetime.utcnow()
#             db.commit()

#             return QuizQuestionResponse(
#                 hardness_level=hardness_level,
#                 message="You have completed the Quiz1! Check your scores.",
#                 attempt_id=submission.attempt_id
#             )
        
#         attempt_id = submission.attempt_id
#     else:
#         # Create new quiz attempt
#         quiz_attempt = Quiz1Attempt(
#             user_id=user_id
#         )
#         db.add(quiz_attempt)
#         db.commit()
#         db.refresh(quiz_attempt)
#         attempt_id = quiz_attempt.id

#     # Get answered question IDs for this attempt
#     answered_question_ids = db.query(Quiz1.question_id).filter(Quiz1.attempt_id == attempt_id).all()
#     answered_question_ids = [qid for (qid,) in answered_question_ids]

#     # Try to find a question by randomly selecting subject, topic, and subtopic
#     next_question = None
#     max_attempts = 1000  # Prevent infinite loop
#     attempt_count = 0

#     while not next_question and attempt_count < max_attempts:
#         # Randomly select subject
#         subject = db.query(Subject).order_by(func.random()).first()
#         if not subject:
#             raise HTTPException(status_code=404, detail="No subjects available")

#         # Randomly select topic under the subject
#         topic = db.query(Topic).filter(Topic.subject_id == subject.id).order_by(func.random()).first()
#         if not topic:
#             attempt_count += 1
#             continue

#         # Randomly select subtopic under the topic
#         subtopic = db.query(Subtopic).filter(Subtopic.topic_id == topic.id).order_by(func.random()).first()
#         if not subtopic:
#             attempt_count += 1
#             continue

#         # Try to find a question at the current hardness level
#         next_question = (
#             db.query(MCQ)
#             .filter(
#                 MCQ.subtopic_id == subtopic.id,
#                 MCQ.hardness_level == hardness_level,
#                 ~MCQ.id.in_(answered_question_ids)
#             )
#             .order_by(func.random())
#             .first()
#         )
#         attempt_count += 1

#     # If no question found after max attempts
#     if not next_question:
#         return QuizQuestionResponse(
#             hardness_level=hardness_level,
#             message="No questions available at the current difficulty level. Quiz1 completed!",
#             attempt_id=attempt_id,
#             image1=image1,
#             image2=image2
#         )

#     return QuizQuestionResponse(
#         question=MCQResponse.from_orm(next_question),
#         hardness_level=hardness_level,
#         attempt_id=attempt_id,
#         image1=image1,
#         image2=image2
#     )


