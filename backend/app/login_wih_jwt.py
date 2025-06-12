import os
import secrets
from urllib.parse import urlencode
import requests
from fastapi import FastAPI, Request, HTTPException, status, Header
from fastapi.responses import RedirectResponse, JSONResponse
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from .database.session import SessionLocal, Base, engine
from .database.models import User
from .jwt_utils import create_access_token, get_user_from_token
from datetime import timedelta

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
app = FastAPI(title="FastAPI Google OAuth with JWT")

# Add CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Keep session middleware only for OAuth state management
app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    max_age=60*5,  # Short lived for OAuth state only
    same_site="lax",
    https_only=False
)

# Models
class UserModel(BaseModel):
    id: Optional[int] = None
    email: str
    name: str
    picture: Optional[str] = None

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserModel

# Helper function to get current user from JWT
def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing"
        )
    
    try:
        user_data = get_user_from_token(authorization)
        return user_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

# Routes
@app.get("/api/user")
async def get_user(authorization: Optional[str] = Header(None)):
    """Get current user from JWT token"""
    if not authorization:
        return {"user": None}
    
    try:
        user_data = get_user_from_token(authorization)
        return {"user": user_data}
    except:
        return {"user": None}

@app.get("/login")
async def login(request: Request):
    """Initiate Google OAuth login"""
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
    """Handle Google OAuth callback and return JWT token"""
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization code not provided"
        )
    
    # Verify state parameter
    state = request.session.get("oauth_state")
    state_param = request.query_params.get("state")
    if state and state_param and state != state_param:
        print(f"Warning: State mismatch. Expected {state}, got {state_param}")
    
    # Exchange code for access token
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
    
    # Get user info from Google
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
        
        # Create user model
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
        
        # Create JWT token with 24 hour expiration
        jwt_token = create_access_token(
            data=jwt_data,
            expires_delta=timedelta(hours=24)
        )
        
        # Clean up OAuth state
        request.session.pop("oauth_state", None)
        
        # Redirect to frontend with token as query parameter
        frontend_url = f"http://localhost:3000?token={jwt_token}"
        return RedirectResponse(url=frontend_url)
        
    finally:
        db.close()

@app.post("/logout")
async def logout():
    """Logout endpoint (client-side token removal)"""
    return {"message": "Logged out successfully"}

@app.get("/api/protected")
async def protected_route(current_user: dict = get_current_user):
    """Example protected route"""
    return {"message": f"Hello {current_user['name']}, this is a protected route!"}