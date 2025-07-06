from google.cloud import texttospeech
from google.cloud import translate_v2 as translate
import os

# Set the path to your service key file
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\Dibbo\Downloads\tutor-app-460518-ae5ab4ef4e95.json"

def text_to_speech_auto_language(text):
    # Initialize clients
    translate_client = translate.Client()
    tts_client = texttospeech.TextToSpeechClient()
    
    # Detect language
    detection = translate_client.detect_language(text)
    detected_language = detection['language']
    confidence = detection['confidence']
    
    print(f"Detected language: {detected_language} (confidence: {confidence:.2f})")
    
    # Prepare the input
    synthesis_input = texttospeech.SynthesisInput(text=text)
    
    # Choose voice based on detected language
    voice = texttospeech.VoiceSelectionParams(
        language_code=detected_language,
        ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
    )
    
    # Audio configuration
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3
    )
    
    try:
        # Generate the speech
        response = tts_client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config
        )
        
        # Save to file
        filename = f"output_{detected_language}.mp3"
        with open(filename, "wb") as out:
            out.write(response.audio_content)
            print(f"Audio content written to {filename}")
            
    except Exception as e:
        print(f"Error: {e}")
        print(f"Language '{detected_language}' might not be supported for TTS")

# Test with different languages
text_to_speech_auto_language("Hello, world!")

text_to_speech_auto_language("আমি ভাত খাই")  # Bengali