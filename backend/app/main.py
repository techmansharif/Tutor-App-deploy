

from fastapi import FastAPI, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session
from typing import List,Optional
from datetime import datetime
from .database.session import SessionLocal, Base, engine
from .database.models import Quiz0, Subject, Topic, Subtopic, MCQ, User, UserSelection, QuizAttempt, QuizAnswer, QuizScore,UserProgress,Diagram
from .schemas.models import SubjectBase, TopicBase, SubtopicBase, MCQBase
from sqlalchemy.sql import func
from pydantic import BaseModel

from fastapi import Request
from starlette.middleware.sessions import SessionMiddleware
from authlib.integrations.starlette_client import OAuth, OAuthError
import os
from dotenv import load_dotenv
from fastapi.responses import RedirectResponse


from fastapi.middleware.cors import CORSMiddleware


from .database.models import Subject, Topic, Subtopic, User, Explain
import faiss
from sentence_transformers import SentenceTransformer
from pylatexenc.latex2text import LatexNodes2Text

import base64  # Add this import for base64 encoding
import json 

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


app = FastAPI(title="AITutor Quiz Webapp")

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "quiz-app-se1ssion-secret-key"),
    same_site="none",  # 👈 important for frontend-backend on different ports
    https_only=False  # 👈 ensure False for localhost
)
oauth = OAuth()
oauth.register(
    name='google',
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)


def is_authenticated(request: Request):
    return "user" in request.session

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



@app.get("/auth/google")
async def login(request: Request):
    redirect_uri = request.url_for('auth_callback')
    print("it is working")
    return await oauth.google.authorize_redirect(request, redirect_uri)

@app.get("/auth/google/callback")
async def auth_callback(request: Request, db: Session = Depends(get_db)):
    try:
        print("inside auth callback")
        token = await oauth.google.authorize_access_token(request)
        userinfo = token.get('userinfo')
        
        # Store user info in session
        request.session['user'] = {
            "email": userinfo["email"],
            "name": userinfo["name"]
        }
        
        # Check if user exists in database
        user = db.query(User).filter(User.email == userinfo["email"]).first()
        
        # If user doesn't exist, create a new user record
        if not user:
            logger.info(f"Creating new user with email: {userinfo['email']}")
            new_user = User(email=userinfo["email"])  # Create a new user with email
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            
            # Store the user ID in the session
            request.session['user']["user_id"] = new_user.id  # Store the primary key ID
        else:
            # If user exists, store their user ID in the session
            request.session['user']["user_id"] = user.id
            
    except OAuthError as e:
        logger.error(f"OAuth error: {e}")
        return RedirectResponse("/auth", status_code=303)
    
    return RedirectResponse("http://localhost:3000", status_code=303)


@app.get("/killsession")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/", status_code=303)


@app.get("/logout")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/", status_code=303)

@app.get("/auth")
async def auth(request: Request):
    if is_authenticated(request):
        return {
            "message": f"Already logged in as {request.session['user']['email']}",
            "user": request.session["user"]  # 👈 includes full user object
        }
    return {"message": "User not logged in"}


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

    class Config:
        from_attributes = True

# Request model for submitting practice quiz answer
class PracticeQuizAnswerSubmission(BaseModel):
    question_id: int
    is_correct: bool
    current_hardness_level: int
    questions_tried: int

# # Model for selecting subject, topic, subtopic
# class SelectionRequest(BaseModel):
#     name: str
# Model for selecting subject, topic, and subtopic
class SelectionRequest(BaseModel):
    subject: str  # Name of the subject
    topic: str    # Name of the topic under the selected subject
    subtopic: Optional[str] = None  # Subtopic is optional now


# Request model for user input
class ExplainQuery(BaseModel):
    query: str

# Response model for explain (only answer)
class ExplainResponse(BaseModel):
    answer: str
    image: Optional[str] = None  # Base64-encoded image string (or None if no image)

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to the API!"}

# Endpoint to fetch all subjects
@app.get("/subjects/", response_model=List[SubjectBase])
async def get_subjects(db: Session = Depends(get_db)):
    subjects = db.query(Subject).all()
    if not subjects:
        raise HTTPException(status_code=404, detail="No subjects found")
    return subjects

# Endpoint to fetch topics for a subject
@app.get("/{subject}/topics/", response_model=List[TopicBase])
async def get_topics(subject: str, db: Session = Depends(get_db)):
    subject_obj = db.query(Subject).filter(Subject.name == subject).first()
    if not subject_obj:
        raise HTTPException(status_code=404, detail=f"Subject {subject} not found")
    topics = db.query(Topic).filter(Topic.subject_id == subject_obj.id).all()
    if not topics:
        raise HTTPException(status_code=404, detail=f"No topics found for subject {subject}")
    return topics

# Endpoint to fetch subtopics for a topic under a subject
@app.get("/{subject}/{topic}/subtopics/", response_model=List[SubtopicBase])
async def get_subtopics(subject: str, topic: str, db: Session = Depends(get_db)):
    subject_obj = db.query(Subject).filter(Subject.name == subject).first()
    if not subject_obj:
        raise HTTPException(status_code=404, detail=f"Subject {subject} not found")
    topic_obj = db.query(Topic).filter(
        Topic.name == topic,
        Topic.subject_id == subject_obj.id
    ).first()
    if not topic_obj:
        raise HTTPException(status_code=404, detail=f"Topic {topic} not found in subject {subject}")
    subtopics = db.query(Subtopic).filter(Subtopic.topic_id == topic_obj.id).all()
    if not subtopics:
        raise HTTPException(status_code=404, detail=f"No subtopics found for topic {topic}")
    return subtopics

# Endpoint to fetch 5 random Quiz0 questions
@app.get("/quiz0/questions/", response_model=List[Quiz0Response])
async def get_quiz0_questions(db: Session = Depends(get_db)):
    questions = db.query(Quiz0).order_by(func.random()).limit(5).all()
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found in Quiz0")
    return questions

# Endpoint to submit answers for Quiz0
@app.post("/quiz0/submit/")
async def submit_quiz0_answers(submission: QuizSubmission, db: Session = Depends(get_db)):
    results = []
    correct_count = 0
    total_questions = len(submission.answers)

    for answer in submission.answers:
        question = db.query(Quiz0).filter(Quiz0.id == answer.question_id).first()
        if not question:
            raise HTTPException(status_code=404, detail=f"Question ID {answer.question_id} not found")
        
        is_correct = answer.selected_option == question.correct_option
        if is_correct:
            correct_count += 1
        
        results.append({
            "question_id": answer.question_id,
            "selected_option": answer.selected_option,
            "correct_option": question.correct_option,
            "is_correct": is_correct,
            "explanation": question.explanation
        })

    score = (correct_count / total_questions) * 100 if total_questions > 0 else 0
    return {
        "results": results,
        "score": score,
        "correct_answers": correct_count,
        "total_questions": total_questions
    }
# Endpoint to select subject, topic, and subtopic in one request
@app.post("/select/")
async def select_subject_topic_subtopic(
    selection: SelectionRequest,
    user_id: int = Header(...),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User ID {user_id} not found")

    # Fetch the subject
    subject = db.query(Subject).filter(Subject.name == selection.subject).first()
    if not subject:
        raise HTTPException(status_code=404, detail=f"Subject {selection.subject} not found")

    # Fetch the topic related to the subject
    topic = db.query(Topic).filter(Topic.name == selection.topic, Topic.subject_id == subject.id).first()
    if not topic:
        raise HTTPException(status_code=404, detail=f"Topic {selection.topic} not found under subject {selection.subject}")

    # Check if subtopic is provided
    subtopic_id = None
    if selection.subtopic:
        # Fetch the subtopic related to the topic
        subtopic = db.query(Subtopic).filter(Subtopic.name == selection.subtopic, Subtopic.topic_id == topic.id).first()
        if not subtopic:
            raise HTTPException(status_code=404, detail=f"Subtopic {selection.subtopic} not found under topic {selection.topic}")
        subtopic_id = subtopic.id

    # Always create a new entry in the UserSelection table
    user_selection = UserSelection(
        user_id=user_id,
        subject_id=subject.id,
        topic_id=topic.id,
        subtopic_id=subtopic_id  # subtopic_id can be None if no subtopic was provided
    )
    db.add(user_selection)
    db.commit()
    db.refresh(user_selection)
    
    return {"message": f"Selected subject: {selection.subject}, topic: {selection.topic}, subtopic: {selection.subtopic if selection.subtopic else 'None'}", "selection_id": user_selection.id}





# Endpoint to fetch 10 MCQs: first 5 for Quiz-2 (3 easy, 2 medium), last 5 for Quiz-3 (2 medium, 3 hard)
@app.get("/{subject}/{topic}/{subtopic}/quizquestions/")
async def get_quiz_questions(
    subject: str,
    topic: str,
    subtopic: str,
    user_id: int = Header(...),
    db: Session = Depends(get_db)
) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User ID {user_id} not found")

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
    
    # Create a new selection entry
    user_selection = UserSelection(
        user_id=user_id,
        subject_id=subject_obj.id,
        topic_id=topic_obj.id,
        subtopic_id=subtopic_obj.id
    )
    db.add(user_selection)
    db.commit()
    db.refresh(user_selection)

    # Create a new quiz attempt
    quiz_attempt = QuizAttempt(
        user_id=user_id,
        selection_id=user_selection.id
    )
    db.add(quiz_attempt)
    db.commit()
    db.refresh(quiz_attempt)

    # Fetch questions for Quiz-2: 3 easy, 2 medium
    easy_questions = (
        db.query(MCQ)
        .filter(MCQ.subtopic_id == subtopic_obj.id, MCQ.hardness_level == "easy")
        .order_by(func.random())
        .limit(3)
        .all()
    )
    medium_questions_quiz2 = (
        db.query(MCQ)
        .filter(MCQ.subtopic_id == subtopic_obj.id, MCQ.hardness_level == "medium")
        .order_by(func.random())
        .limit(2)
        .all()
    )
    quiz2_questions = easy_questions + medium_questions_quiz2
    if len(quiz2_questions) < 5:
        raise HTTPException(
            status_code=404,
            detail=f"Not enough questions for Quiz-2 in subtopic {subtopic} (need 3 easy, 2 medium, found {len(easy_questions)} easy, {len(medium_questions_quiz2)} medium)"
        )
    
    # Fetch questions for Quiz-3: 2 medium, 3 hard
    medium_questions_quiz3 = (
        db.query(MCQ)
        .filter(MCQ.subtopic_id == subtopic_obj.id, MCQ.hardness_level == "medium")
        .order_by(func.random())
        .limit(2)
        .all()
    )
    hard_questions = (
        db.query(MCQ)
        .filter(MCQ.subtopic_id == subtopic_obj.id, MCQ.hardness_level == "hard")
        .order_by(func.random())
        .limit(3)
        .all()
    )
    quiz3_questions = medium_questions_quiz3 + hard_questions
    if len(quiz3_questions) < 5:
        raise HTTPException(
            status_code=404,
            detail=f"Not enough questions for Quiz-3 in subtopic {subtopic} (need 2 medium, 3 hard, found {len(medium_questions_quiz3)} medium, {len(hard_questions)} hard)"
        )
    
    # Combine questions: first 5 for Quiz-2, last 5 for Quiz-3
    questions = quiz2_questions + quiz3_questions
    questions_response = [MCQResponse.from_orm(q) for q in questions]
    return {"attempt_id": quiz_attempt.id, "questions": questions_response}



# Endpoint to submit answers for Quiz-2 and Quiz-3 (10 questions: first 5 for Quiz-2, last 5 for Quiz-3)
@app.post("/quiz/submit/")
async def submit_quiz_answers(
    submission: QuizSubmission,
    user_id: int = Header(...),
    attempt_id: int = Query(...),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User ID {user_id} not found")

    # Validate quiz attempt
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id, QuizAttempt.user_id == user_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail=f"Quiz attempt ID {attempt_id} not found for user ID {user_id}")

    # Ensure exactly 10 answers are submitted
    if len(submission.answers) != 10:
        raise HTTPException(
            status_code=400,
            detail=f"Expected 10 answers (5 for Quiz-2, 5 for Quiz-3), but received {len(submission.answers)}"
        )
    
    # Split answers: first 5 for Quiz-2, last 5 for Quiz-3
    quiz2_answers = submission.answers[:5]
    quiz3_answers = submission.answers[5:]
    
    # Process Quiz-2 answers
    quiz2_results = []
    quiz2_correct_count = 0
    for answer in quiz2_answers:
        question = db.query(MCQ).filter(MCQ.id == answer.question_id).first()
        if not question:
            raise HTTPException(status_code=404, detail=f"Question ID {answer.question_id} not found")

        # No need to pass subject or topic anymore; everything is inferred from the MCQ table
        is_correct = answer.selected_option == question.correct_option
        if is_correct:
            quiz2_correct_count += 1
        
        # Store the answer
        quiz_answer = QuizAnswer(
            attempt_id=attempt_id,
            quiz_type="quiz2",
            question_id=answer.question_id,
            user_answer=answer.selected_option,
            correct_answer=question.correct_option,
            is_correct=is_correct
        )
        db.add(quiz_answer)
        
        quiz2_results.append({
            "question_id": answer.question_id,
            "selected_option": answer.selected_option,
            "correct_option": question.correct_option,
            "is_correct": is_correct,
            "explanation": question.explanation
        })
    
    quiz2_score = (quiz2_correct_count / 5) * 100
    
    # Process Quiz-3 answers
    quiz3_results = []
    quiz3_correct_count = 0
    for answer in quiz3_answers:
        question = db.query(MCQ).filter(MCQ.id == answer.question_id).first()
        if not question:
            raise HTTPException(status_code=404, detail=f"Question ID {answer.question_id} not found")

        # No need to pass subject or topic anymore; everything is inferred from the MCQ table
        is_correct = answer.selected_option == question.correct_option
        if is_correct:
            quiz3_correct_count += 1
        
        # Store the answer
        quiz_answer = QuizAnswer(
            attempt_id=attempt_id,
            quiz_type="quiz3",
            question_id=answer.question_id,
            user_answer=answer.selected_option,
            correct_answer=question.correct_option,
            is_correct=is_correct
        )
        db.add(quiz_answer)
        
        quiz3_results.append({
            "question_id": answer.question_id,
            "selected_option": answer.selected_option,
            "correct_option": question.correct_option,
            "is_correct": is_correct,
            "explanation": question.explanation
        })
    
    quiz3_score = (quiz3_correct_count / 5) * 100
    
    # Store the scores
    total_correct = quiz2_correct_count + quiz3_correct_count
    quiz_score = QuizScore(
        attempt_id=attempt_id,
        quiz2_correct=quiz2_correct_count,
        quiz3_correct=quiz3_correct_count,
        total_correct=total_correct,
        quiz2_score=quiz2_score,
        quiz3_score=quiz3_score
    )
    db.add(quiz_score)
    
    # Update the quiz attempt
    attempt.completed_at = datetime.utcnow()
    db.commit()
    
    return {
        "quiz2_results": {
            "results": quiz2_results,
            "score": quiz2_score,
            "correct_answers": quiz2_correct_count,
            "total_questions": 5
        },
        "quiz3_results": {
            "results": quiz3_results,
            "score": quiz3_score,
            "correct_answers": quiz3_correct_count,
            "total_questions": 5
        }
    }


# Updated function to handle various LaTeX commands in the first line
def get_image_data_from_chunk(chunk: str, subtopic_id: int, db: Session) -> Optional[str]:
    """
    Fetches and encodes image data from the Diagram table if the chunk contains 'image description'.
    Uses the raw first line of the chunk, cleans LaTeX commands (\section, \subsection, \textbf),
    and performs a substring search against Diagram.description.
    
    Args:
        chunk (str): The chunk text to search for image description.
        subtopic_id (int): The ID of the subtopic to query diagrams for.
        db (Session): SQLAlchemy session for database operations.
    
    Returns:
        Optional[str]: Base64-encoded image data, or None if no image is found.
    """
    image_data = None
    if isinstance(chunk, str) and "image description".lower() in chunk.lower():
        # Split the chunk into lines and get the first line
        lines = chunk.split('\n')
        if not lines:
            return None  # No lines in the chunk

        first_line = lines[0].strip()  # e.g., "\subsection*{Union of Sets}" or "\section*{Introduction}" or "\textbf{Key Concepts}"

        # Clean the first line by removing LaTeX commands (\section, \subsection, \textbf) and braces
        description = first_line
        # Remove common LaTeX commands and their variants (with or without *)
        for cmd in ["\\section*", "\\section", "\\subsection*", "\\subsection", "\\textbf"]:
            description = description.replace(cmd, "")
        # Remove braces and any remaining LaTeX markup
        description = description.replace("{", "").replace("}", "").strip()  # e.g., "Union of Sets"

        if description:
            # Query the Diagram table for an image where the description contains the cleaned first line (case-insensitive)
            diagram = db.query(Diagram).filter(
                Diagram.subtopic_id == subtopic_id,
                func.lower(Diagram.description).contains(func.lower(description))
            ).first()
            if diagram and diagram.image_content:
                # Encode the image content as base64 for the frontend
                image_data = base64.b64encode(diagram.image_content).decode('utf-8')
    return image_data

# NEW: Modified /explains/ endpoint to use UserProgress table instead of session
@app.post("/{subject}/{topic}/{subtopic}/explains/", response_model=ExplainResponse)
async def post_explain(
    subject: str,
    topic: str,
    subtopic: str,
    explain_query: ExplainQuery,
    user_id: int = Header(...),
    db: Session = Depends(get_db)
):
    # Validate user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User ID {user_id} not found")

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

    # Fetch explain record
    explain = db.query(Explain).filter(Explain.subtopic_id == subtopic_obj.id).first()
    if not explain:
        raise HTTPException(status_code=404, detail=f"No explanations found for subtopic {subtopic}")

    # Load chunks
    chunks = explain.chunks
    if not chunks:
        raise HTTPException(status_code=404, detail="No chunks available for this subtopic")

    # NEW: Fetch or initialize user progress from UserProgress table
    progress = db.query(UserProgress).filter(
        UserProgress.user_id == user_id,
        UserProgress.subtopic_id == subtopic_obj.id
    ).first()
    if not progress:
        progress = UserProgress(
            user_id=user_id,
            subtopic_id=subtopic_obj.id,
            chunk_index=0,
            chat_memory=[]
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)

    # NEW: Use chunk_index and chat_memory from UserProgress
    chunk_index = progress.chunk_index
    chat_memory = progress.chat_memory
    # Handle query
    query = explain_query.query.lower()
    context = None
    if query == "explain":
        query = "please explain more easily and elaborately"
        context = chunks[chunk_index]
            # After determining context and chunk_index
        selected_chunk =chunks[chunk_index]
    elif query == "continue":
        chunk_index += 1
        if chunk_index >= len(chunks):
            chunk_index = 0
            progress.chunk_index = chunk_index
            progress.chat_memory = []
            db.commit()
            return ExplainResponse(answer="Congratulations, you have mastered the topic!")
        query = "Explain the context easy fun way"
        context = chunks[chunk_index]
            # After determining context and chunk_index
        selected_chunk =chunks[chunk_index]
    else:
        # Custom query with FAISS
        model = SentenceTransformer('all-MiniLM-L6-v2')
        embeddings = model.encode(chunks, convert_to_numpy=True)
        dimension = embeddings.shape[1]
        index = faiss.IndexFlatL2(dimension)
        index.add(embeddings)
        query_embedding = model.encode([query], convert_to_numpy=True)
        top_k = 3
        distances, indices = index.search(query_embedding, top_k)
        context = [chunks[idx] for idx in indices[0]]
        selected_chunk=None




    # Fetch image data using the new function
    image_data = get_image_data_from_chunk(selected_chunk, subtopic_obj.id, db)


    # Setup Gemini API
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")

    import google.generativeai as genai
    genai.configure(api_key=api_key)
    gemini_model = genai.GenerativeModel("gemini-2.0-flash")

    # NEW: Prepare memory_text from UserProgress.chat_memory
    memory_text = "\n\n".join([
        f"User: {pair['question']}\nAssistant: {pair['answer']}"
        for pair in chat_memory[-30:]
    ]) if chat_memory else "No prior conversation."

    # Prepare prompt (unchanged)
    prompt = f"""
You are an educational assistant tasked with creating a step-by-step learning guide 
for a user. 
your sentences should be simple.
Use the memory of recent conversations to personalize the response and 
incorporate any relevant context to enhance clarity.

user_input:
{query}
Recent Chat History:
{memory_text}

Relevant Text:
{context if context else chunks}

Instructions:
1. Explain the Relevant Text in fun and interesting ways
2. Make the Explanation engaging , use story if necessary
3. if necessary refer to chat history

"""
    if subject !="English":
        prompt=prompt+"\n"+"4. Reply in Bengali language"
    else:
        prompt=prompt+"\n"+"4. Reply in very simple English and write meaning around difficult word if necessary"


    # Generate response
    response = gemini_model.generate_content(prompt)
    answer = LatexNodes2Text().latex_to_text(response.text.strip())

    # NEW: Update UserProgress with new chunk_index and chat_memory
    # chat_memory.append({"question": explain_query.query, "answer": answer})

    # When updating:
    new_pair = {"question": explain_query.query, "answer": answer}
    chat_memory_updated = chat_memory + [new_pair] 
    
    if len(chat_memory_updated) > 30:
        chat_memory_updated = chat_memory_updated[-30:]  # Keep only last 30

    # Assign the new list to progress.chat_memory
    progress.chat_memory = chat_memory_updated
    progress.chunk_index = chunk_index
    progress.last_updated = datetime.utcnow()
    db.commit()



    return ExplainResponse(answer=answer,image=image_data)






# Practice quiz endpoint
@app.post("/{subject}/{topic}/{subtopic}/practise/", response_model=PracticeQuizQuestionResponse)
async def practice_quiz(
    subject: str,
    topic: str,
    subtopic: str,
    submission: Optional[PracticeQuizAnswerSubmission] = None,
    user_id: int = Header(...),
    db: Session = Depends(get_db)
):
    # Validate user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User ID {user_id} not found")

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
    hardness_level = 5  # Default for first question
    questions_tried = 0
    if submission:
        # Validate question
        question = db.query(MCQ).filter(MCQ.id == submission.question_id).first()
        if not question:
            raise HTTPException(status_code=404, detail=f"Question ID {submission.question_id} not found")

        # Update hardness level based on correctness
        hardness_level = submission.current_hardness_level
        if submission.is_correct:
            hardness_level = min(hardness_level + 1, 10)  # Increase, max 10
        else:
            hardness_level = max(hardness_level - 1, 1)   # Decrease, min 1

        # Update questions tried
        questions_tried = submission.questions_tried

        # Check if 20 questions have been reached
        if questions_tried >= 20:
            return PracticeQuizQuestionResponse(
                hardness_level=hardness_level,
                message="You have completed 20 practice questions!"
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
            message=f"No questions available at difficulty level {hardness_level}. Practice completed!"
        )

    return PracticeQuizQuestionResponse(
        question=MCQResponse.from_orm(next_question),
        hardness_level=hardness_level
    )


@app.on_event("startup")
async def startup_event():
    Base.metadata.create_all(bind=engine)
    