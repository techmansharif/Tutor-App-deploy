import os
import secrets
from urllib.parse import urlencode
import requests
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from .database.session import SessionLocal, Base, engine
from .database.models import User

# Load environment variables from .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# Configuration
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
REDIRECT_URI = "http://localhost:8000/auth/google/callback"
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
SECRET_KEY = secrets.token_hex(32)

# Initialize FastAPI app
app = FastAPI(title="FastAPI Google OAuth")

# Add CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add session middleware
app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    max_age=60*60,
    same_site="lax",
    https_only=False
)

# Models
class UserModel(BaseModel):
    id: Optional[int] = None
    email: str
    name: str
    picture: Optional[str] = None

# Routes
@app.get("/api/user")
async def get_user(request: Request):
    user = request.session.get("user")
    return {"user": user}

@app.get("/login")
async def login(request: Request):
    state = secrets.token_hex(16)
    request.session["oauth_state"] = state
    
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
    
    state = request.session.get("oauth_state")
    state_param = request.query_params.get("state")
    if state and state_param and state != state_param:
        print(f"Warning: State mismatch. Expected {state}, got {state_param}")
    
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
        
        request.session["user"] = {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "picture": user.picture
        }
        
        request.session.pop("oauth_state", None)
        
        return RedirectResponse(url="http://localhost:3000")
    finally:
        db.close()

@app.get("/logout")
async def logout(request: Request):
    request.session.pop("user", None)
    return {"message": "Logged out successfully"}