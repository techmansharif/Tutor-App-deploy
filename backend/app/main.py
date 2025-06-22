


#####################################

from fastapi import FastAPI, Depends, HTTPException, Header, Query,status
from sqlalchemy.orm import Session
from typing import List,Optional
from datetime import datetime
from .database.session import SessionLocal, Base, engine
from .database.models import  Subject, Topic, Subtopic, MCQ, User, UserSelection, QuizAttempt, QuizAnswer, QuizScore,UserProgress,Diagram,Quiz1,Quiz1Attempt,Quiz1Score,PractiseAnswer,PractiseAttempt,FacialExpression
from .schemas.models import SubjectBase, TopicBase, SubtopicBase,UserModel
from .schemas.quizzes import QuizAnswerSubmission, QuizQuestionResponse, PracticeQuizAnswerSubmission, PracticeQuizQuestionResponse,MCQResponse
from .schemas.explains import ExplainQuery,ExplainResponse
from .schemas.selections import SelectionRequest
from prometheus_client import Counter, Histogram, make_asgi_app
from sqlalchemy.sql import func
from pydantic import BaseModel
from .router.quizzes import router as quizzes_router
from .router.dashboard import router as dashboard_router
from .router.explain import router as explains_router
from .router.revise import router as revise_router 

from fastapi import Request
from starlette.middleware.sessions import SessionMiddleware

import os
from dotenv import load_dotenv
from fastapi.responses import RedirectResponse

import uvicorn
from fastapi.middleware.cors import CORSMiddleware


from .database.models import Subject, Topic, Subtopic, User, Explain
import faiss
from sentence_transformers import SentenceTransformer
from pylatexenc.latex2text import LatexNodes2Text


import secrets
from urllib.parse import urlencode
import requests


import base64  # Add this import for base64 encoding
import json 
import time 

# BEFORE - Add these imports
from .jwt_utils import create_access_token, get_user_from_token
from datetime import timedelta

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Prometheus metrics
REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP Requests",
    ["method", "endpoint", "http_status"]
)
REQUEST_LATENCY = Histogram(
    "http_request_latency_seconds",
    "HTTP Request Latency",
    ["method", "endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

app = FastAPI(title="AITutor Quiz Webapp")


# Mount Prometheus metrics endpoint
prometheus_app = make_asgi_app()
app.mount("/metrics", prometheus_app)

# Middleware to track metrics for all requests
@app.middleware("http")
async def add_prometheus_metrics(request: Request, call_next):
    start_time = time.time()
    method = request.method
    path = request.url.path

    # Process the request
    response = await call_next(request)

    # Calculate latency
    duration = time.time() - start_time
    status_code = response.status_code

    # Record metrics
    REQUESTS_TOTAL.labels(
        method=method,
        endpoint=path,
        http_status=status_code
    ).inc()
    REQUEST_LATENCY.labels(
        method=method,
        endpoint=path
    ).observe(duration)

    return response


Base.metadata.create_all(bind=engine)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

##########################login stuff 






from pydantic import BaseModel






# Load environment variables from .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# Configuration
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
REDIRECT_URI = "http://localhost:8000/auth/google/callback"
#REDIRECT_URI = "https://fastapi-tutor-app-backend-208251878692.asia-south1.run.app/auth/google/callback"
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
SECRET_KEY = secrets.token_hex(32)

# In-memory storage for OAuth states (with expiration)
oauth_states = {}
def clean_expired_states():
    """Remove expired OAuth states"""
    current_time = time.time()
    expired_keys = [key for key, (_, timestamp) in oauth_states.items() 
                   if current_time - timestamp > 300]  # 5 minutes expiry
    for key in expired_keys:
        del oauth_states[key]

# Add CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000",
        "https://test-deployment-e19fb.web.app",
    "https://test-deployment-e19fb.firebaseapp.com",
    "https://brimai-test-v1.web.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




# Routes
# AFTER
@app.get("/api/user")
async def get_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        return {"user": None}
    
    try:
        user_data = get_user_from_token(authorization)
        return {"user": user_data}
    except:
        return {"user": None}
    
@app.get("/login")
async def login():
    clean_expired_states()  # Clean up expired states
    state = secrets.token_hex(16)
    oauth_states[state] = (state, time.time())  # Store state with timestamp
    
    params = {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state
    }
    
    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(auth_url)

@app.get("/auth/google/callback")
async def auth_callback(request: Request):
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization code not provided"
        )
    
    # Verify state parameter
    state_param = request.query_params.get("state")
    if state_param and state_param in oauth_states:
        # Valid state, remove it from storage
        del oauth_states[state_param]
    elif state_param:
        print(f"Warning: Invalid or expired state: {state_param}")
    
    token_data = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": REDIRECT_URI
    }
    
    token_response = requests.post(GOOGLE_TOKEN_URL, data=token_data)
    if not token_response.ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to retrieve access token"
        )
    
    token_json = token_response.json()
    access_token = token_json.get("access_token")
    
    user_response = requests.get(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    if not user_response.ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to retrieve user information"
        )
    
    user_info = user_response.json()
    
    # Database session
    db: Session = SessionLocal()
    try:
        # Check if user exists, if not create new user
        db_user = db.query(User).filter(User.email == user_info.get("email")).first()
        if not db_user:
            db_user = User(email=user_info.get("email"))
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
        
        user = UserModel(
            id=db_user.id,
            email=user_info.get("email", ""),
            name=user_info.get("name", ""),
            picture=user_info.get("picture", "")
        )
        
        # Create JWT token
        jwt_data = {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "picture": user.picture
        }
        
        jwt_token = create_access_token(
            data=jwt_data,
            expires_delta=timedelta(hours=24)
        )
        

        
        # Redirect to frontend with token as query parameter
        frontend_url = f"http://localhost:3000?token={jwt_token}"
        return RedirectResponse(url=frontend_url)
    finally:
        db.close()

# AFTER
@app.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}







#######################







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
@app.get("/{subject}/topics/", response_model=List[TopicBase])
async def get_topics(subject: str, db: Session = Depends(get_db)):
    subject_obj = db.query(Subject).filter(Subject.name == subject).first()
    if not subject_obj:
        raise HTTPException(status_code=404, detail=f"Subject {subject} not found")
    
    topics = db.query(Topic).filter(Topic.subject_id == subject_obj.id).all()
    if not topics:
        raise HTTPException(status_code=404, detail=f"No topics found for subject {subject}")
    
    # Check each topic for question availability
    topics_with_status = []
    for topic in topics:
        subtopics = db.query(Subtopic).filter(Subtopic.topic_id == topic.id).all()
        
        has_questions = True
        if subtopics:
            for subtopic in subtopics:
                mcq_count = db.query(MCQ).filter(MCQ.subtopic_id == subtopic.id).count()
                if mcq_count == 0:
                    has_questions = False
                    break
        else:
            has_questions = False
                    
        topics_with_status.append({
            "name": topic.name,
            "has_questions": has_questions
        })
    
    return topics_with_status

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


# Endpoint to select subject, topic, and subtopic in one request
@app.post("/select/")
async def select_subject_topic_subtopic(
    selection: SelectionRequest,
    user_id: int = Header(...),
    db: Session = Depends(get_db),
    request:Request=None
):
    session_user = request.session.get("user")
    if not session_user or session_user.get("id") != user_id:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid or missing session")
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

app.include_router(quizzes_router)

app.include_router(dashboard_router)
# Updated function to handle various LaTeX commands in the first line
app.include_router(explains_router)
app.include_router(revise_router)

# @app.on_event("startup")
# async def startup_event():
#     Base.metadata.create_all(bind=engine)
@app.get("/health")
def health_check():
    return {"status": "healthy"}




if __name__ == "__main__":
# Use the PORT environment variable provided by Cloud Run, default to 8000
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)