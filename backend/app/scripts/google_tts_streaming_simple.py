#!/usr/bin/env python3
"""
Google Cloud TTS Troubleshooting Script
Helps diagnose common issues with TTS setup
"""

import os
import sys
from google.cloud import texttospeech
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\Dibbo\Downloads\tutor-app-460518-ae5ab4ef4e95.json"

def check_authentication():
    """Check if Google Cloud authentication is properly set up"""
    print("🔐 Checking authentication...")
    
    # Check environment variable
    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds_path:
        print("❌ GOOGLE_APPLICATION_CREDENTIALS environment variable not set")
        print("   Set it to your service account key file path:")
        print("   export GOOGLE_APPLICATION_CREDENTIALS='/path/to/your/key.json'")
        return False
    
    # Check if file exists
    if not os.path.exists(creds_path):
        print(f"❌ Credentials file not found: {creds_path}")
        return False
    
    print(f"✅ Credentials file found: {creds_path}")
    return True

def check_api_access():
    """Test if we can access the TTS API"""
    print("\n🌐 Testing API access...")
    
    try:
        client = texttospeech.TextToSpeechClient()
        
        # Try to list voices (simple API call)
        request = texttospeech.ListVoicesRequest()
        response = client.list_voices(request=request)
        
        # Count available voices
        voice_count = len(response.voices)
        print(f"✅ API access successful! Found {voice_count} available voices")
        
        # Check for Chirp3-HD voices (required for streaming)
        chirp3_voices = [v for v in response.voices if "Chirp3-HD" in v.name]
        print(f"✅ Found {len(chirp3_voices)} Chirp3-HD voices (required for streaming)")
        
        return True
        
    except Exception as e:
        print(f"❌ API access failed: {e}")
        if "403" in str(e):
            print("   This usually means the Text-to-Speech API is not enabled")
            print("   Enable it at: https://console.cloud.google.com/apis/library/texttospeech.googleapis.com")
        elif "401" in str(e):
            print("   Authentication issue - check your credentials")
        return False

def test_regular_tts():
    """Test regular (non-streaming) TTS"""
    print("\n🎤 Testing regular TTS...")
    
    try:
        client = texttospeech.TextToSpeechClient()
        
        # Simple synthesis request
        synthesis_input = texttospeech.SynthesisInput(text="Hello, testing regular TTS")
        voice = texttospeech.VoiceSelectionParams(
            language_code="en-US",
            name="en-US-Chirp3-HD-Leda"
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )
        
        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config
        )
        
        if response.audio_content:
            with open("test_regular.mp3", "wb") as f:
                f.write(response.audio_content)
            print(f"✅ Regular TTS successful! Saved test_regular.mp3 ({len(response.audio_content)} bytes)")
            return True
        else:
            print("❌ No audio content in response")
            return False
            
    except Exception as e:
        print(f"❌ Regular TTS failed: {e}")
        return False

def test_streaming_tts():
    """Test streaming TTS"""
    print("\n🎵 Testing streaming TTS...")
    
    try:
        client = texttospeech.TextToSpeechClient()
        
        # Streaming configuration
        streaming_config = texttospeech.StreamingSynthesizeConfig(
            voice=texttospeech.VoiceSelectionParams(
            name="en-US-Chirp3-HD-Leda", 
            language_code="en-US",
            )
    # No streaming_audio_config - let Google choose
        )
        config_request = texttospeech.StreamingSynthesizeRequest(
            streaming_config=streaming_config
        )
        
        def request_generator():
            yield config_request
            yield texttospeech.StreamingSynthesizeRequest(
                input=texttospeech.StreamingSynthesisInput(text="Hello, testing streaming TTS")
            )
        
        responses = client.streaming_synthesize(request_generator())
        
        audio_chunks = []
        for response in responses:
            if response.audio_content:
                audio_chunks.append(response.audio_content)
        
        if audio_chunks:
            total_bytes = sum(len(chunk) for chunk in audio_chunks)
            print(f"✅ Streaming TTS successful! Received {len(audio_chunks)} chunks, {total_bytes} total bytes")
            return True
        else:
            print("❌ No audio chunks received")
            return False
            
    except Exception as e:
        print(f"❌ Streaming TTS failed: {e}")
        if "only supports" in str(e).lower():
            print("   This error suggests format compatibility issues")
        return False

def check_dependencies():
    """Check if required dependencies are installed"""
    print("\n📦 Checking dependencies...")
    
    try:
        import google.cloud.texttospeech
        version = google.cloud.texttospeech.__version__ if hasattr(google.cloud.texttospeech, '__version__') else "unknown"
        print(f"✅ google-cloud-texttospeech installed (version: {version})")
    except ImportError:
        print("❌ google-cloud-texttospeech not installed")
        print("   Install with: pip install google-cloud-texttospeech")
        return False
    
    return True

def main():
    """Run all diagnostic tests"""
    print("=== Google Cloud TTS Diagnostic Tool ===\n")
    
    all_passed = True
    
    # Run all tests
    tests = [
        check_dependencies,
        check_authentication,
        check_api_access,
        test_regular_tts,
        test_streaming_tts
    ]
    
    for test in tests:
        if not test():
            all_passed = False
    
    print("\n" + "="*50)
    if all_passed:
        print("🎉 All tests passed! Your TTS setup is working correctly.")
    else:
        print("❌ Some tests failed. Check the issues above and fix them.")
        print("\nCommon solutions:")
        print("1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable")
        print("2. Enable Text-to-Speech API in Google Cloud Console")
        print("3. Ensure billing is enabled for your project")
        print("4. Install/update google-cloud-texttospeech: pip install --upgrade google-cloud-texttospeech")

if __name__ == "__main__":
    main()