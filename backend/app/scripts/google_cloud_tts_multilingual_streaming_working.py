#!/usr/bin/env python3
"""
Multi-Language Google Cloud Streaming TTS with Automatic Language Detection
Supports English and Bengali (Bangla) with auto-detection
"""

import os
from google.cloud import texttospeech
from google.cloud import translate_v2 as translate

# Set your credentials
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\Dibbo\Downloads\tutor-app-460518-ae5ab4ef4e95.json"

def get_language_voice_mapping():
    """
    Map detected languages to appropriate Chirp3-HD voices
    """
    return {
        'en': {
            'language_code': 'en-US',
            'voices': {
                'female': ['en-US-Chirp3-HD-Leda', 'en-US-Chirp3-HD-Aoede', 'en-US-Chirp3-HD-Kore', 'en-US-Chirp3-HD-Zephyr'],
                'male': ['en-US-Chirp3-HD-Charon', 'en-US-Chirp3-HD-Fenrir', 'en-US-Chirp3-HD-Orus', 'en-US-Chirp3-HD-Puck']
            },
            'default': 'en-US-Chirp3-HD-Leda'
        },
        'bn': {
            'language_code': 'bn-IN',
            'voices': {
                'female': ['bn-IN-Chirp3-HD-Leda', 'bn-IN-Chirp3-HD-Aoede', 'bn-IN-Chirp3-HD-Kore', 'bn-IN-Chirp3-HD-Zephyr'],
                'male': ['bn-IN-Chirp3-HD-Charon', 'bn-IN-Chirp3-HD-Fenrir', 'bn-IN-Chirp3-HD-Orus', 'bn-IN-Chirp3-HD-Puck']
            },
            'default': 'bn-IN-Chirp3-HD-Leda'
        }
    }

def detect_language(text):
    """
    Detect the language of the input text using Google Translate API
    """
    try:
        translate_client = translate.Client()
        detection = translate_client.detect_language(text)
        
        detected_lang = detection['language']
        confidence = detection['confidence']
        
        print(f"🔍 Detected language: {detected_lang} (confidence: {confidence:.2f})")
        
        # Map some common language codes to our supported ones
        language_mapping = {
            'en': 'en',
            'bn': 'bn',
            'bengali': 'bn',
            'english': 'en'
        }
        
        mapped_lang = language_mapping.get(detected_lang, detected_lang)
        return mapped_lang, confidence
        
    except Exception as e:
        print(f"❌ Language detection failed: {e}")
        print("🔄 Defaulting to English")
        return 'en', 0.5

def get_voice_for_language(language_code, gender='female'):
    """
    Get appropriate voice for detected language
    """
    voice_mapping = get_language_voice_mapping()
    
    if language_code in voice_mapping:
        lang_config = voice_mapping[language_code]
        
        # Try to get voice by gender, fallback to default
        if gender in lang_config['voices'] and lang_config['voices'][gender]:
            voice_name = lang_config['voices'][gender][0]  # Use first voice of requested gender
        else:
            voice_name = lang_config['default']
        
        return {
            'name': voice_name,
            'language_code': lang_config['language_code'],
            'detected_lang': language_code
        }
    else:
        print(f"⚠️  Language '{language_code}' not supported, using English")
        return {
            'name': 'en-US-Chirp3-HD-Leda',
            'language_code': 'en-US', 
            'detected_lang': 'en'
        }

def multilang_streaming_tts(text, output_file=None, preferred_gender='female'):
    """
    Generate streaming TTS with automatic language detection
    """
    print(f"🎵 Processing text: '{text[:50]}...'")
    
    # Step 1: Detect language
    detected_lang, confidence = detect_language(text)
    
    # Step 2: Get appropriate voice
    voice_config = get_voice_for_language(detected_lang, preferred_gender)
    
    print(f"🎤 Using voice: {voice_config['name']} ({voice_config['language_code']})")
    
    # Step 3: Generate filename if not provided
    if output_file is None:
        lang_name = "english" if detected_lang == 'en' else "bangla" if detected_lang == 'bn' else detected_lang
        output_file = f"audio_{lang_name}_{preferred_gender}.wav"
    
    try:
        client = texttospeech.TextToSpeechClient()
        
        # Use the working configuration (no explicit audio config)
        streaming_config = texttospeech.StreamingSynthesizeConfig(
            voice=texttospeech.VoiceSelectionParams(
                name=voice_config['name'],
                language_code=voice_config['language_code'],
            )
            # No streaming_audio_config - let Google choose defaults
        )
        
        config_request = texttospeech.StreamingSynthesizeRequest(
            streaming_config=streaming_config
        )
        
        # Split text into chunks for better streaming
        chunk_size = 50
        text_chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
        
        def request_generator():
            yield config_request  # Send config first
            
            for chunk in text_chunks:
                if chunk.strip():  # Only send non-empty chunks
                    yield texttospeech.StreamingSynthesizeRequest(
                        input=texttospeech.StreamingSynthesisInput(text=chunk)
                    )
        
        # Get streaming responses
        print("🎵 Starting streaming synthesis...")
        responses = client.streaming_synthesize(request_generator())
        
        # Collect all audio chunks
        audio_chunks = []
        total_bytes = 0
        
        for response in responses:
            if response.audio_content:
                chunk_size_bytes = len(response.audio_content)
                audio_chunks.append(response.audio_content)
                total_bytes += chunk_size_bytes
                print(f"📦 Received chunk: {chunk_size_bytes} bytes")
        
        if audio_chunks:
            # Combine all audio chunks
            complete_audio = b"".join(audio_chunks)
            
            # Add WAV header to make it playable
            complete_audio_with_header = add_wav_header(complete_audio)
            
            # Save to file
            with open(output_file, "wb") as f:
                f.write(complete_audio_with_header)
            
            print(f"✅ Audio saved to '{output_file}'")
            print(f"📊 Total size: {total_bytes} bytes (raw) → {len(complete_audio_with_header)} bytes (with WAV header)")
            print(f"🎧 Language: {detected_lang.upper()} | Voice: {voice_config['name']}")
            
            return {
                'file': output_file,
                'language': detected_lang,
                'voice': voice_config['name'],
                'confidence': confidence,
                'size_bytes': len(complete_audio_with_header)
            }
        else:
            print("❌ No audio content received")
            return None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def add_wav_header(pcm_data, sample_rate=24000, num_channels=1, bits_per_sample=16):
    """
    Add WAV header to raw PCM data to make it playable
    """
    import struct
    
    # Calculate WAV header parameters
    byte_rate = sample_rate * num_channels * bits_per_sample // 8
    block_align = num_channels * bits_per_sample // 8
    data_size = len(pcm_data)
    file_size = data_size + 36
    
    # Create WAV header (44 bytes)
    header = struct.pack('<4sI4s4sIHHIIHH4sI',
        b'RIFF',           # Chunk ID
        file_size,         # File size
        b'WAVE',           # Format
        b'fmt ',           # Subchunk1 ID
        16,                # Subchunk1 size
        1,                 # Audio format (1 = PCM)
        num_channels,      # Number of channels
        sample_rate,       # Sample rate
        byte_rate,         # Byte rate
        block_align,       # Block align
        bits_per_sample,   # Bits per sample
        b'data',           # Subchunk2 ID
        data_size          # Subchunk2 size
    )
    
    return header + pcm_data

def test_multiple_languages():
    """
    Test the multi-language TTS with sample texts
    """
    print("=== Multi-Language Streaming TTS Test ===\n")
    
    # Test texts in different languages
    test_cases = [
        {
            'text': "Hello! This is a test of English text-to-speech with automatic language detection.",
            'description': "English Text"
        },
        {
            'text': "আমি বাংলায় কথা বলতে পারি। এটি একটি বাংলা টেক্সট টু স্পিচ পরীক্ষা।",
            'description': "Bengali Text"
        },
        {
            'text': "আমার নাম রহিম। আমি ঢাকায় থাকি।",
            'description': "Bengali Short Text"
        },
        {
            'text': "Welcome to the world of multilingual artificial intelligence!",
            'description': "English Technology Text"
        }
    ]
    
    results = []
    
    for i, test_case in enumerate(test_cases):
        print(f"\n--- Test {i+1}: {test_case['description']} ---")
        print(f"Text: {test_case['text']}")
        
        result = multilang_streaming_tts(
            text=test_case['text'],
            output_file=f"test_multilang_{i+1}.wav",
            preferred_gender='female'
        )
        
        if result:
            results.append(result)
            print(f"✅ Success: {result['file']}")
        else:
            print("❌ Failed")
        
        print("-" * 60)
    
    # Summary
    print(f"\n=== Results Summary ===")
    print(f"Total tests: {len(test_cases)}")
    print(f"Successful: {len(results)}")
    
    if results:
        print("\n🎧 Generated Audio Files:")
        for result in results:
            print(f"  • {result['file']} - {result['language'].upper()} ({result['voice']})")

def interactive_multilang_tts():
    """
    Interactive mode for testing with custom text
    """
    print("=== Interactive Multi-Language TTS ===\n")
    
    while True:
        print("\nOptions:")
        print("1. Enter text for auto-detection and TTS")
        print("2. Test with sample texts")
        print("3. Choose voice gender")
        print("4. Exit")
        
        choice = input("\nEnter your choice (1-4): ").strip()
        
        if choice == "1":
            text = input("\nEnter your text (English or বাংলা): ").strip()
            if text:
                gender = input("Preferred voice gender (female/male) [default: female]: ").strip() or 'female'
                result = multilang_streaming_tts(text, preferred_gender=gender)
                if result:
                    print(f"\n🎉 Audio generated successfully!")
                    print(f"File: {result['file']}")
                    print(f"Language: {result['language']}")
                    print(f"Voice: {result['voice']}")
            else:
                print("No text entered!")
                
        elif choice == "2":
            test_multiple_languages()
            
        elif choice == "3":
            print("\nAvailable voices:")
            voice_mapping = get_language_voice_mapping()
            for lang, config in voice_mapping.items():
                lang_name = "English" if lang == 'en' else "Bengali" if lang == 'bn' else lang
                print(f"\n{lang_name} ({lang}):")
                print(f"  Female: {', '.join(config['voices']['female'])}")
                print(f"  Male: {', '.join(config['voices']['male'])}")
                
        elif choice == "4":
            print("Goodbye!")
            break
            
        else:
            print("Invalid choice!")

def main():
    """
    Main function
    """
    print("=== Multi-Language Streaming TTS with Auto-Detection ===")
    print("Supports: English (en) and Bengali/Bangla (bn)")
    print("Features: Automatic language detection, Multiple voice options")
    print()
    
    # Quick test to verify everything works
    print("🔧 Quick verification test...")
    test_result = multilang_streaming_tts(
        "Hello! Testing multilingual TTS.",
        "quick_test_multilang.wav"
    )
    
    if test_result:
        print("✅ Multi-language TTS is working!")
        print("\nStarting interactive mode...\n")
        interactive_multilang_tts()
    else:
        print("❌ Setup verification failed. Please check your configuration.")

if __name__ == "__main__":
    main()