# router/audio.py - New separate audio router file
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from google.cloud import texttospeech
from google.cloud import translate_v2 as translate
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Generator
import asyncio
import io
from concurrent.futures import ThreadPoolExecutor
import os


# Set up Google Cloud credentials (same as your working test file)
# For local development
GOOGLE_CREDENTIALS_PATH = r"C:\Users\Dibbo\Downloads\tutor-app-460518-ae5ab4ef4e95.json"
if os.path.exists(GOOGLE_CREDENTIALS_PATH):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_CREDENTIALS_PATH
    print("✅ Using local Google Cloud credentials")
else:
    # For production (Cloud Run) - will use environment variable
    print("🔄 Using production Google Cloud credentials from environment")

# Initialize TTS and Translation clients AFTER setting credentials
tts_client = texttospeech.TextToSpeechClient()
translate_client = translate.Client()
# Import your existing dependencies
from .explain import get_async_db  # Adjust import path as needed
from ..jwt_utils import get_user_from_token  # Adjust import path as needed

# Create the router
router = APIRouter(
    prefix="/audio",
    tags=["audio"]
)

# ThreadPoolExecutor setup
cpu_count = os.cpu_count() or 4
max_workers = 8 if cpu_count <= 2 else min(int(cpu_count * 1.5), 8)
executor = ThreadPoolExecutor(max_workers=max_workers)

# Initialize TTS and Translation clients


# Authentication function (adapt from your existing code)
async def authenticate_and_validate_user(authorization: Optional[str], user_id: int, db: AsyncSession):
    try:
        user_data = get_user_from_token(authorization)
        if user_data.get("id") != user_id:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid token")
    except:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid or missing token")

# Add this schema class
class AudioRequest(BaseModel):
    text: str
    language_code: Optional[str] = "auto"  # Default to auto-detect
    voice_gender: Optional[str] = "FEMALE"  # MALE, FEMALE, NEUTRAL
    audio_encoding: Optional[str] = "LINEAR16"   # LINEAR16 recommended for streaming

# Initialize TTS and Translation clients (add near your other global setups)


def detect_language_for_tts(text: str) -> str:
    """Auto-detect language using Google Cloud Translation API (Bengali & English only)"""
    try:
        # Detect language using Google Translation API
        detection = translate_client.detect_language(text)
        detected_language = detection['language']
        confidence = detection['confidence']
        
        print(f"🔍 Detected language: {detected_language} (confidence: {confidence:.2f})")
        
        # Convert detected language codes to TTS-compatible format (Bengali & English only)
        language_mapping = {
            'en': 'en-US',
            'bn': 'bn-IN',  # Bengali
        }
        
        # Get the proper language code for TTS
        tts_language = language_mapping.get(detected_language, "en-US")  # Default to English
        
        print(f"✅ Using TTS language: {tts_language}")
        return tts_language
        
    except Exception as e:
        print(f"❌ Language detection failed: {e}, falling back to en-US")
        return "en-US"

def create_streaming_requests(text: str, language_code: str, voice_gender, audio_encoding) -> Generator:
    """Create streaming synthesis requests"""
    
    
  # Map language codes to specific voice names for streaming (Chirp 3: HD voices only)
    voice_name_map = {
        "en-US": "en-US-Journey-F",  # Female English Chirp voice
        "bn-IN": "bn-IN-Journey-F"   # Female Bengali Chirp voice  
    }
    
    voice_name = voice_name_map.get(language_code, "en-US-Wavenet-F")  # Default to English female
    
    # First request: Configuration
    config_request = texttospeech.StreamingSynthesizeRequest(
        streaming_config=texttospeech.StreamingSynthesizeConfig(
            voice=texttospeech.VoiceSelectionParams(
                language_code=language_code,
                name=voice_name  # Add this line - this is the key fix!
            )
        )
    )
    yield config_request
    
    # Split text into chunks for streaming (Google TTS works better with smaller chunks)
    chunk_size = 200  # characters per chunk
    text_chunks = [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]
    
    # Send text chunks
    for chunk in text_chunks:
        input_request = texttospeech.StreamingSynthesizeRequest(
            input=texttospeech.StreamingSynthesisInput(text=chunk)
        )
        yield input_request

def generate_streaming_audio(text: str, language_code: str, voice_gender: str, audio_encoding: str):
    """Generate streaming audio using Google Cloud TTS StreamingSynthesize"""
    try:
        # Auto-detect language if not specified
        if language_code == "auto":
            language_code = detect_language_for_tts(text)
        
        print(f"🎵 Starting streaming synthesis for text: '{text[:50]}...' with language: {language_code}")
        
        # Map string to enum
        gender_map = {
            "MALE": texttospeech.SsmlVoiceGender.MALE,
            "FEMALE": texttospeech.SsmlVoiceGender.FEMALE,
            "NEUTRAL": texttospeech.SsmlVoiceGender.NEUTRAL
        }
        
        encoding_map = {
            "MP3": texttospeech.AudioEncoding.MP3,
            "LINEAR16": texttospeech.AudioEncoding.LINEAR16,
            "OGG_OPUS": texttospeech.AudioEncoding.OGG_OPUS
        }
        
        # Create request generator
        requests = create_streaming_requests(
            text, 
            language_code, 
            gender_map.get(voice_gender, texttospeech.SsmlVoiceGender.FEMALE),
            encoding_map.get(audio_encoding, texttospeech.AudioEncoding.LINEAR16)
        )
        
        # Call streaming synthesize
        responses = tts_client.streaming_synthesize(requests)
        
        # Yield audio chunks as they arrive
        for response in responses:
            if response.audio_content:
                print(f"📦 Received audio chunk: {len(response.audio_content)} bytes")
                yield response.audio_content
                
        print("✅ Streaming synthesis completed")
                
    except Exception as e:
        print(f"❌ Streaming audio generation failed: {e}")
        
        # Try fallback to English if language-specific error
        if "language" in str(e).lower() and language_code != "en-US":
            print(f"🔄 Retrying with English fallback...")
            try:
                requests = create_streaming_requests(
                    text, 
                    "en-US", 
                    texttospeech.SsmlVoiceGender.FEMALE,
                    texttospeech.AudioEncoding.LINEAR16
                )
                responses = tts_client.streaming_synthesize(requests)
                for response in responses:
                    if response.audio_content:
                        yield response.audio_content
                print("✅ Fallback synthesis completed")
                return
            except Exception as fallback_error:
                print(f"❌ Fallback also failed: {fallback_error}")
        
        # Yield empty chunk on error
        yield b""

async def generate_streaming_audio_async(text: str, language_code: str, voice_gender: str, audio_encoding: str):
    """Async wrapper for streaming audio generation"""
    loop = asyncio.get_event_loop()
    
    def sync_generator():
        return list(generate_streaming_audio(text, language_code, voice_gender, audio_encoding))
    
    # Run the sync streaming TTS in thread pool and collect all chunks
    audio_chunks = await loop.run_in_executor(executor, sync_generator)
        # DEBUG: Save the complete audio to file for testing
    if audio_chunks:
        complete_audio = b"".join(chunk for chunk in audio_chunks if chunk)
        if complete_audio:
            # Save to current directory for testing
            debug_filename = f"debug_audio_{language_code}_{len(complete_audio)}.mp3"
            try:
                with open(debug_filename, "wb") as f:
                    f.write(complete_audio)
                print(f"🔍 DEBUG: Saved audio to {debug_filename} ({len(complete_audio)} bytes)")
            except Exception as e:
                print(f"❌ Could not save debug file: {e}")
    
    # Yield chunks asynchronously
    for chunk in audio_chunks:
        if chunk:  # Only yield non-empty chunks
            yield chunk

# def generate_streaming_audio(text: str, language_code: str, voice_gender: str, audio_encoding: str):
#     """Generate audio using regular Google Cloud TTS (non-streaming)"""
#     try:
#         # Auto-detect language if not specified
#         if language_code == "auto":
#             language_code = detect_language_for_tts(text)
        
#         print(f"🎵 Starting synthesis for text: '{text[:50]}...' with language: {language_code}")
        
#         # Map string to enum
#         gender_map = {
#             "MALE": texttospeech.SsmlVoiceGender.MALE,
#             "FEMALE": texttospeech.SsmlVoiceGender.FEMALE,
#             "NEUTRAL": texttospeech.SsmlVoiceGender.NEUTRAL
#         }
        
#         encoding_map = {
#             "MP3": texttospeech.AudioEncoding.MP3,
#             "LINEAR16": texttospeech.AudioEncoding.LINEAR16,
#             "OGG_OPUS": texttospeech.AudioEncoding.OGG_OPUS
#         }
        
#         # Use regular TTS API (like your working test file)
#         synthesis_input = texttospeech.SynthesisInput(text=text)
        
#         voice = texttospeech.VoiceSelectionParams(
#             language_code=language_code,
#             ssml_gender=gender_map.get(voice_gender, texttospeech.SsmlVoiceGender.FEMALE)
#         )
        
#         audio_config = texttospeech.AudioConfig(
#             audio_encoding=encoding_map.get(audio_encoding, texttospeech.AudioEncoding.MP3)
#         )
        
#         # Generate the speech using regular API
#         response = tts_client.synthesize_speech(
#             input=synthesis_input,
#             voice=voice,
#             audio_config=audio_config
#         )
        
#         # Yield the complete audio content
#         print(f"📦 Generated complete audio: {len(response.audio_content)} bytes")
#         yield response.audio_content
#         print("✅ Audio generation completed")
                
#     except Exception as e:
#         print(f"❌ Audio generation failed: {e}")
#         yield b""

# Add this new streaming endpoint
@router.post("/stream/")
async def stream_audio(
    audio_request: AudioRequest,
    user_id: int = Header(...),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Stream audio using Google Cloud Text-to-Speech StreamingSynthesize
    Real-time audio generation and streaming for Bengali & English
    URL: POST /audio/stream/
    """
    try:
        # Authenticate user
        await authenticate_and_validate_user(authorization, user_id, db)
        
        # Validate text input
        if not audio_request.text or not audio_request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        # Limit text length to prevent abuse
        if len(audio_request.text) > 5000:
            raise HTTPException(status_code=400, detail="Text too long. Maximum 5000 characters allowed.")
        
        print(f"🎵 Generating audio for user {user_id}, text length: {len(audio_request.text)}")
        
        # Determine content type based on encoding
        content_type_map = {
            "MP3": "audio/mpeg",
            "LINEAR16": "audio/wav", 
            "OGG_OPUS": "audio/ogg"
        }
        content_type = content_type_map.get(audio_request.audio_encoding, "audio/wav")
        
        # Create async generator for streaming
        async def audio_stream_generator():
            try:
                async for chunk in generate_streaming_audio_async(
                    audio_request.text,
                    audio_request.language_code,
                    audio_request.voice_gender,
                    audio_request.audio_encoding
                ):
                    if chunk:  # Only yield non-empty chunks
                        yield chunk
                        
                print(f"✅ Audio streaming completed for user {user_id}")
                        
            except Exception as e:
                print(f"❌ Audio streaming error: {e}")
                # Yield empty chunk to end stream gracefully
                yield b""
        
        # Return streaming response
        return StreamingResponse(
            audio_stream_generator(),
            media_type=content_type,
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, user-id"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Unexpected error in audio endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during audio generation")

# Optional: Add a simple test endpoint to verify language detection
@router.post("/detect-language/")
async def detect_text_language(
    audio_request: AudioRequest,
    user_id: int = Header(...),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Test endpoint to detect language of given text (Bengali & English only)
    URL: POST /audio/detect-language/
    """
    try:
        # Authenticate user
        await authenticate_and_validate_user(authorization, user_id, db)
        
        if not audio_request.text or not audio_request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        # Detect language
        detected_language = detect_language_for_tts(audio_request.text)
        
        return {
            "text": audio_request.text,
            "detected_language": detected_language,
            "supported_languages": ["en-US", "bn-IN"],
            "success": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Language detection error: {e}")
        raise HTTPException(status_code=500, detail="Failed to detect language")