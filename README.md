
# FastAPI Google OAuth Authentication

A simple authentication website using FastAPI and Google OAuth.

## Setup

1. Create and activate a virtual environment:
   ```
   python -m venv venv
   venv\Scripts\activate  # Windows
   source venv/bin/activate  # Linux/Mac
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Run the application:
   ```
   uvicorn main:app --reload --port 9090
   ```

4. Visit http://localhost:9090 in your browser

## Configuration

The application is configured with the following OAuth parameters:

- Client ID: 1000335296683-phd1pcr5m6jqvgdj3p6rps2ugk0dqv8t.apps.googleusercontent.com
- Client Secret: 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
- Redirect URI: http://localhost:9090/auth/google/callback

## Features

- Google OAuth authentication
- Session management
- Protected routes
- Simple UI with profile display
    