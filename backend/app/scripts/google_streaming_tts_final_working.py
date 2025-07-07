#!/usr/bin/env python3
"""
Save and Listen to Google Cloud Streaming TTS Audio
"""

import os
from google.cloud import texttospeech

# Set your credentials
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\Dibbo\Downloads\tutor-app-460518-ae5ab4ef4e95.json"

def streaming_tts_and_save(text, output_file="streaming_audio.wav"):
    """
    Generate streaming TTS and save to a playable audio file
    """
    print(f"🎵 Generating streaming TTS for: '{text[:50]}...'")
    
    try:
        client = texttospeech.TextToSpeechClient()
        
        # Use the working configuration (no explicit audio config)
        streaming_config = texttospeech.StreamingSynthesizeConfig(
            voice=texttospeech.VoiceSelectionParams(
                name="en-US-Chirp3-HD-Leda", 
                language_code="en-US",
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
            
            # Since Google chose defaults, it's likely LINEAR16 (raw PCM)
            # Add WAV header to make it playable
            complete_audio_with_header = add_wav_header(complete_audio)
            
            # Save to file
            with open(output_file, "wb") as f:
                f.write(complete_audio_with_header)
            
            print(f"✅ Audio saved to '{output_file}'")
            print(f"📊 Total size: {total_bytes} bytes (raw) → {len(complete_audio_with_header)} bytes (with WAV header)")
            print(f"🎧 You can now play this file with any audio player!")
            
            return output_file
        else:
            print("❌ No audio content received")
            return None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def add_wav_header(pcm_data, sample_rate=24000, num_channels=1, bits_per_sample=16):
    """
    Add WAV header to raw PCM data to make it playable
    Assumes LINEAR16 format which is likely the Google default
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

def test_different_sample_rates(text):
    """
    Try different sample rates to find the correct one
    """
    print("🔍 Testing different sample rates to find the best audio quality...")
    
    sample_rates = [16000, 22050, 24000, 44100, 48000]
    
    for rate in sample_rates:
        print(f"\n--- Testing {rate} Hz ---")
        
        try:
            client = texttospeech.TextToSpeechClient()
            
            streaming_config = texttospeech.StreamingSynthesizeConfig(
                voice=texttospeech.VoiceSelectionParams(
                    name="en-US-Chirp3-HD-Leda", 
                    language_code="en-US",
                )
            )
            
            config_request = texttospeech.StreamingSynthesizeRequest(
                streaming_config=streaming_config
            )
            
            def request_generator():
                yield config_request
                yield texttospeech.StreamingSynthesizeRequest(
                    input=texttospeech.StreamingSynthesisInput(text="Testing sample rate")
                )
            
            responses = client.streaming_synthesize(request_generator())
            
            audio_chunks = []
            for response in responses:
                if response.audio_content:
                    audio_chunks.append(response.audio_content)
            
            if audio_chunks:
                complete_audio = b"".join(audio_chunks)
                complete_audio_with_header = add_wav_header(complete_audio, sample_rate=rate)
                
                output_file = f"test_{rate}hz.wav"
                with open(output_file, "wb") as f:
                    f.write(complete_audio_with_header)
                
                print(f"✅ Created {output_file} - try playing this!")
            
        except Exception as e:
            print(f"❌ Failed at {rate} Hz: {e}")

def main():
    """Main function to demonstrate streaming TTS"""
    print("=== Google Cloud Streaming TTS - Save Audio ===\n")
    
    # Test texts
    test_texts = [
        "Hello! This is a test of Google Cloud streaming text-to-speech. The audio should now be saved to a file you can listen to.",
        "This is a longer text to test streaming capabilities. The streaming API breaks this text into chunks and generates audio in real-time, which is perfect for applications like voice assistants or live narration.",
        "Welcome to the world of artificial intelligence and text-to-speech technology. Google's Chirp 3 HD voices provide incredibly natural and human-like speech synthesis."
    ]
    
    print("Choose an option:")
    print("1. Generate audio for a short test")
    print("2. Generate audio for a longer test") 
    print("3. Generate audio for all tests")
    print("4. Test different sample rates")
    print("5. Enter your own text")
    
    choice = input("\nEnter your choice (1-5): ").strip()
    
    if choice == "1":
        result = streaming_tts_and_save(test_texts[0], "short_test.wav")
    elif choice == "2":
        result = streaming_tts_and_save(test_texts[1], "long_test.wav")
    elif choice == "3":
        for i, text in enumerate(test_texts):
            print(f"\n--- Generating audio {i+1}/3 ---")
            result = streaming_tts_and_save(text, f"test_audio_{i+1}.wav")
    elif choice == "4":
        test_different_sample_rates("Sample rate test")
        return
    elif choice == "5":
        custom_text = input("Enter your text: ").strip()
        if custom_text:
            result = streaming_tts_and_save(custom_text, "custom_audio.wav")
        else:
            print("No text entered!")
            return
    else:
        print("Invalid choice!")
        return
    
    print("\n" + "="*60)
    print("🎧 HOW TO LISTEN TO YOUR AUDIO:")
    print("1. Double-click the .wav file to open with default audio player")
    print("2. Or use VLC, Windows Media Player, or any audio player")
    print("3. On Windows: right-click → 'Open with' → choose audio player")
    print("4. If audio sounds weird, try the sample rate test (option 4)")

if __name__ == "__main__":
    main()