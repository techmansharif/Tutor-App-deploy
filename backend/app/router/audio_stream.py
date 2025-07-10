#!/usr/bin/env python3
"""
FastAPI Audio Streaming Router
Real-time TTS streaming using Google Cloud Text-to-Speech
"""

import os
import json
import base64
import asyncio
from datetime import datetime
from typing import Optional, AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from google.cloud import texttospeech
from google.cloud import translate_v2 as translate

from ..database.session import SessionLocal
from ..database.models import User
from ..jwt_utils import get_user_from_token

# Set your credentials (adjust path as needed)
if os.path.exists(r"C:\Users\saiye\Downloads\tutor-app-460518-ae5ab4ef4e95.json"):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\saiye\Downloads\tutor-app-460518-ae5ab4ef4e95.json"

router = APIRouter(
    tags=["audio_stream"]
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models
class AudioStreamRequest(BaseModel):
    text: str
    chunk_size: Optional[int] = 30  # Characters per chunk
    
class StreamingStatus(BaseModel):
    status: str
    message: str
    language: Optional[str] = None
    voice: Optional[str] = None

def detect_language(text: str):
    """Detect language using Google Translate API"""
    try:
        translate_client = translate.Client()
        detection = translate_client.detect_language(text)
        return detection['language'], detection['confidence']
    except Exception as e:
        print(f"❌ Language detection failed: {e}")
        return 'en', 0.5

def get_voice_config(language_code: str):
    """Get female voice configuration for language"""
    voice_mapping = {
        'en': {
            'language_code': 'en-US',
            'voice_name': 'en-US-Chirp3-HD-Leda'  # Female voice
        },
        'bn': {
            'language_code': 'bn-IN', 
            'voice_name': 'bn-IN-Chirp3-HD-Leda'  # Female voice
        }
    }
    
    if language_code in voice_mapping:
        return voice_mapping[language_code]
    else:
        # Default to English female voice
        return {
            'language_code': 'en-US',
            'voice_name': 'en-US-Chirp3-HD-Leda'
        }

def add_wav_header(pcm_data: bytes, sample_rate: int = 24000, num_channels: int = 1, bits_per_sample: int = 16) -> bytes:
    """Add WAV header to raw PCM data"""
    import struct
    
    byte_rate = sample_rate * num_channels * bits_per_sample // 8
    block_align = num_channels * bits_per_sample // 8
    data_size = len(pcm_data)
    file_size = data_size + 36
    
    header = struct.pack('<4sI4s4sIHHIIHH4sI',
        b'RIFF', file_size, b'WAVE', b'fmt ', 16,
        1, num_channels, sample_rate, byte_rate, block_align, bits_per_sample,
        b'data', data_size
    )
    
    return header + pcm_data

async def generate_audio_stream(text: str, chunk_size: int = 30) -> AsyncGenerator[str, None]:
    """
    Generate real-time audio stream chunks
    Yields Server-Sent Events (SSE) formatted data
    """
    try:
        # Step 1: Language detection
        detected_lang, confidence = detect_language(text)
        voice_config = get_voice_config(detected_lang)
        
        # Send initial status
        yield f"data: {json.dumps({'type': 'status', 'status': 'started', 'language': detected_lang, 'voice': voice_config['voice_name'], 'confidence': confidence})}\n\n"
        
        # Step 2: Initialize Google Cloud TTS client
        client = texttospeech.TextToSpeechClient()
        
        # Configure streaming
        streaming_config = texttospeech.StreamingSynthesizeConfig(
            voice=texttospeech.VoiceSelectionParams(
                name=voice_config['voice_name'],
                language_code=voice_config['language_code'],
            )
        )
        
        config_request = texttospeech.StreamingSynthesizeRequest(
            streaming_config=streaming_config
        )
        
        # Split text into chunks for streaming
        text_chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
        
        def request_generator():
            yield config_request
            for chunk in text_chunks:
                if chunk.strip():
                    yield texttospeech.StreamingSynthesizeRequest(
                        input=texttospeech.StreamingSynthesisInput(text=chunk)
                    )
        
        # Step 3: Stream audio chunks
        chunk_count = 0
        total_bytes = 0
        
        responses = client.streaming_synthesize(request_generator())
        
        for response in responses:
            if response.audio_content:
                chunk_count += 1
                chunk_data = response.audio_content
                total_bytes += len(chunk_data)
                
                # Add WAV header to make chunk playable
                wav_chunk = add_wav_header(chunk_data)
                
                # Encode as base64 for JSON transport
                encoded_chunk = base64.b64encode(wav_chunk).decode('utf-8')
                
                # Create chunk data
                chunk_info = {
                    'type': 'audio_chunk',
                    'chunk_id': chunk_count,
                    'audio_data': encoded_chunk,
                    'size_bytes': len(chunk_data),
                    'size_wav': len(wav_chunk),
                    'timestamp': datetime.now().isoformat(),
                    'total_bytes': total_bytes
                }
                
                # Send chunk via SSE
                yield f"data: {json.dumps(chunk_info)}\n\n"
                
                # Small delay to simulate realistic streaming
                await asyncio.sleep(0.1)
        
        # Send completion status
        yield f"data: {json.dumps({'type': 'complete', 'total_chunks': chunk_count, 'total_bytes': total_bytes})}\n\n"
        
    except Exception as e:
        # Send error status
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

@router.post("/stream-audio/")
async def stream_audio(
    request: AudioStreamRequest,
    user_id: int = Header(...),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Stream real-time TTS audio to frontend
    Returns Server-Sent Events (SSE) stream
    """
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
    
    # Validate text input
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    if len(request.text) > 20000:  # Reasonable limit
        raise HTTPException(status_code=400, detail="Text too long (max 5000 characters)")
    
    # Return streaming response
    return StreamingResponse(
        generate_audio_stream(request.text, request.chunk_size),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )

@router.get("/stream-audio/test/")
async def test_stream_audio(
    text: str = "Hello! This is a test of real-time streaming audio.",
    user_id: int = Header(...),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Test endpoint for streaming audio
    """
    # Same authentication as main endpoint
    try:
        user_data = get_user_from_token(authorization)
        if user_data.get("id") != user_id:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid token")
    except:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid or missing token")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User ID {user_id} not found")
    
    return StreamingResponse(
        generate_audio_stream(text, 20),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )

@router.post("/detect-language/")
async def detect_text_language(
    request: AudioStreamRequest,
    user_id: int = Header(...),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Detect language of input text
    """
    try:
        user_data = get_user_from_token(authorization)
        if user_data.get("id") != user_id:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid token")
    except:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid or missing token")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User ID {user_id} not found")
    
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    detected_lang, confidence = detect_language(request.text)
    voice_config = get_voice_config(detected_lang)
    
    return {
        "language": detected_lang,
        "confidence": confidence,
        "voice_name": voice_config['voice_name'],
        "language_code": voice_config['language_code']
    }