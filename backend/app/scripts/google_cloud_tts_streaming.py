from google.cloud import texttospeech
from google.cloud import translate_v2 as translate
import os

# Set the path to your service key file
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\Dibbo\Downloads\tutor-app-460518-ae5ab4ef4e95.json"

def create_streaming_requests(text, language_code, voice_gender):
    """Create streaming synthesis requests"""
    
    # Map language codes to specific Chirp 3 HD voice names for streaming
    voice_name_map = {
        "en": "en-US-Chirp3-HD-Leda",    # Female English Chirp 3 HD voice
        "bn": "bn-IN-Chirp3-HD-Leda"    # Female Bengali Chirp 3 HD voice  
    }
    
    # Get the appropriate voice name
    voice_name = voice_name_map.get(language_code, "en-US-Chirp3-HD-Leda")
    
    # Determine the correct language code format
    if language_code == "en":
        full_language_code = "en-US"
    elif language_code == "bn":
        full_language_code = "bn-IN"
    else:
        full_language_code = "en-US"  # Default fallback
    
    # First request: Configuration
    config_request = texttospeech.StreamingSynthesizeRequest(
        streaming_config=texttospeech.StreamingSynthesizeConfig(
            voice=texttospeech.VoiceSelectionParams(
                language_code=full_language_code,
                name=voice_name
            )
        )
    )
    yield config_request
    
    # Split text into chunks for streaming
    chunk_size = 200
    text_chunks = [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]
    
    # Send text chunks
    for chunk in text_chunks:
        input_request = texttospeech.StreamingSynthesizeRequest(
            input=texttospeech.StreamingSynthesisInput(text=chunk)
        )
        yield input_request

def text_to_speech_auto_language_streaming(text):
    # Initialize clients
    translate_client = translate.Client()
    tts_client = texttospeech.TextToSpeechClient()
    
    # Detect language
    detection = translate_client.detect_language(text)
    detected_language = detection['language']
    confidence = detection['confidence']
    
    print(f"Detected language: {detected_language} (confidence: {confidence:.2f})")
    
    try:
        # Create streaming requests
        requests = create_streaming_requests(text, detected_language, texttospeech.SsmlVoiceGender.FEMALE)
        
        # Call streaming synthesize
        print(f"🎵 Starting streaming synthesis...")
        responses = tts_client.streaming_synthesize(requests)
        
        # Collect all audio chunks
        audio_chunks = []
        for response in responses:
            if response.audio_content:
                print(f"📦 Received audio chunk: {len(response.audio_content)} bytes")
                audio_chunks.append(response.audio_content)
        
        # Combine all chunks
        complete_audio = b"".join(audio_chunks)
        
        # Save to file
        filename = f"streaming_output_{detected_language}.mp3"
        with open(filename, "wb") as out:
            out.write(complete_audio)
            print(f"Streaming audio content written to {filename} ({len(complete_audio)} bytes)")
            
    except Exception as e:
        print(f"Streaming Error: {e}")
        print(f"Language '{detected_language}' might not be supported for streaming TTS")

# Alternative voices you can use for different speaker characteristics
def get_available_chirp3_voices():
    """Return available Chirp 3 HD voices for different languages"""
    return {
        "en-US": [
            "en-US-Chirp3-HD-Aoede",    # Female
            "en-US-Chirp3-HD-Charon",   # Male
            "en-US-Chirp3-HD-Fenrir",   # Male
            "en-US-Chirp3-HD-Kore",     # Female
            "en-US-Chirp3-HD-Leda",     # Female
            "en-US-Chirp3-HD-Orus",     # Male
            "en-US-Chirp3-HD-Puck",     # Male
            "en-US-Chirp3-HD-Zephyr"    # Female
        ],
        "bn-IN": [
            "bn-IN-Chirp3-HD-Aoede",    # Female
            "bn-IN-Chirp3-HD-Charon",   # Male
            "bn-IN-Chirp3-HD-Fenrir",   # Male
            "bn-IN-Chirp3-HD-Kore",     # Female
            "bn-IN-Chirp3-HD-Leda",     # Female
            "bn-IN-Chirp3-HD-Orus",     # Male
            "bn-IN-Chirp3-HD-Puck",     # Male
            "bn-IN-Chirp3-HD-Zephyr"    # Female
        ]
    }

# Test with different languages using streaming
if __name__ == "__main__":
    print("=== Testing Streaming TTS with Chirp 3 HD Voices ===")
    print("Available voices:")
    voices = get_available_chirp3_voices()
    for lang, voice_list in voices.items():
        print(f"{lang}: {', '.join(voice_list)}")
    print()
    
    text_to_speech_auto_language_streaming("Hello, how are you")
    text_to_speech_auto_language_streaming("আমি ভাত খাই")  # Bengali