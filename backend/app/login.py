from fastapi import FastAPI, Request, HTTPException
from starlette.middleware.sessions import SessionMiddleware
from authlib.integrations.starlette_client import OAuth, OAuthError
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Hardcoded environment variables
GOOGLE_CLIENT_ID = "1000335296683-2oib02ql97l8nljkjgp0rn0fogob6r14.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET = "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"
SESSION_SECRET = "quiz-app-session-secret-key"

# Validate hardcoded variables
if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
    logger.error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET")
    raise ValueError("Google OAuth credentials not configured")

# Create FastAPI app
app = FastAPI(title="Simple Auth App")

# Add middleware for session management
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    same_site="none",
    https_only=False
)

# Setup OAuth
oauth = OAuth()
oauth.register(
    name='google',
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Helper function to check if user is authenticated
def is_authenticated(request: Request):
    return "user" in request.session

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to the Simple Auth API!"}

# Auth status endpoint
@app.get("/auth")
async def auth(request: Request):
    logger.info(f"Checking auth status, session: {request.session}")
    if is_authenticated(request):
        return {
            "message": f"Logged in as {request.session['user']['email']}",
            "user": request.session["user"]
        }
    return {"message": "User not logged in"}

# Google login endpoint
@app.get("/auth/google")
async def login(request: Request):
    redirect_uri = request.url_for('auth_callback')
    logger.info(f"Redirecting to Google OAuth with redirect_uri: {redirect_uri}")
    logger.info(f"Session before redirect: {request.session}")
    response = await oauth.google.authorize_redirect(request, redirect_uri)
    logger.info(f"Session after setting state: {request.session}")
    return response

# Google callback endpoint
@app.get("/auth/google/callback")
async def auth_callback(request: Request):
    try:
        logger.info("Processing Google OAuth callback")
        logger.info(f"Incoming state: {request.query_params.get('state')}")
        logger.info(f"Session state: {request.session.get('state')}")
        token = await oauth.google.authorize_access_token(request)
        userinfo = token.get('userinfo')
        if not userinfo:
            logger.error("No userinfo received from Google")
            raise HTTPException(status_code=400, detail="Failed to retrieve user info")
        
        logger.info(f"User authenticated: {userinfo['email']}")
        
        # Store user info in session
        request.session['user'] = {
            "email": userinfo["email"],
            "name": userinfo.get("name", "User")
        }
        
    except OAuthError as e:
        logger.error(f"OAuth error: {str(e)}")
        return RedirectResponse("/auth", status_code=303)
    except Exception as e:
        logger.error(f"Unexpected error in callback: {str(e)}")
        return RedirectResponse("/auth", status_code=303)
    
    return RedirectResponse("http://localhost:3000", status_code=303)

# Logout endpoint
@app.get("/logout")
async def logout(request: Request):
    request.session.clear()
    logger.info("User logged out")
    return RedirectResponse("/", status_code=303)

# Run on startup
@app.on_event("startup")
def startup():
    logger.info("Application startup: Auth configured")
    logger.info(f"GOOGLE_CLIENT_ID: {GOOGLE_CLIENT_ID}")
    logger.info(f"GOOGLE_CLIENT_SECRET: {GOOGLE_CLIENT_SECRET[:4]}**** (masked)")