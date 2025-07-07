#!/usr/bin/env python3
"""
Real-Time Streaming TTS Simulation
Simulates how individual audio chunks would be sent to frontend in real streaming scenario
"""

import os
import time
import threading
import json
from datetime import datetime
from google.cloud import texttospeech
from google.cloud import translate_v2 as translate

# Set your credentials
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\Dibbo\Downloads\tutor-app-460518-ae5ab4ef4e95.json"

class StreamingAudioBuffer:
    """
    Simulates how frontend would receive and buffer audio chunks
    """
    def __init__(self):
        self.chunks = []
        self.chunk_count = 0
        self.total_bytes = 0
        self.start_time = None
        self.chunk_metadata = []
    
    def add_chunk(self, chunk_data, chunk_info=None):
        """Add a new audio chunk (simulates receiving from backend)"""
        self.chunk_count += 1
        self.total_bytes += len(chunk_data)
        
        if self.start_time is None:
            self.start_time = time.time()
        
        chunk_metadata = {
            'chunk_id': self.chunk_count,
            'size_bytes': len(chunk_data),
            'timestamp': datetime.now().isoformat(),
            'elapsed_time': time.time() - self.start_time,
            'info': chunk_info or {}
        }
        
        self.chunks.append(chunk_data)
        self.chunk_metadata.append(chunk_metadata)
        
        return chunk_metadata
    
    def get_playable_audio(self):
        """Combine all received chunks into playable audio"""
        if not self.chunks:
            return None
        return b"".join(self.chunks)

def detect_language(text):
    """Detect language using Google Translate API"""
    try:
        translate_client = translate.Client()
        detection = translate_client.detect_language(text)
        return detection['language'], detection['confidence']
    except Exception as e:
        print(f"❌ Language detection failed: {e}")
        return 'en', 0.5

def get_voice_config(language_code, gender='female'):
    """Get voice configuration for language"""
    voice_mapping = {
        'en': {
            'language_code': 'en-US',
            'voices': {
                'female': 'en-US-Chirp3-HD-Leda',
                'male': 'en-US-Chirp3-HD-Charon'
            }
        },
        'bn': {
            'language_code': 'bn-IN', 
            'voices': {
                'female': 'bn-IN-Chirp3-HD-Leda',
                'male': 'bn-IN-Chirp3-HD-Charon'
            }
        }
    }
    
    if language_code in voice_mapping:
        config = voice_mapping[language_code]
        voice_name = config['voices'].get(gender, config['voices']['female'])
        return {
            'name': voice_name,
            'language_code': config['language_code']
        }
    else:
        return {
            'name': 'en-US-Chirp3-HD-Leda',
            'language_code': 'en-US'
        }

def realtime_streaming_tts_simulation(text, chunk_callback=None, simulate_frontend=True):
    """
    Simulate real-time streaming TTS where chunks are processed as they arrive
    
    Args:
        text: Text to convert to speech
        chunk_callback: Function to call when each chunk arrives
        simulate_frontend: Whether to simulate frontend behavior
    """
    print(f"🎵 Starting real-time streaming for: '{text[:50]}...'")
    
    # Step 1: Language detection
    detected_lang, confidence = detect_language(text)
    print(f"🔍 Detected: {detected_lang} (confidence: {confidence:.2f})")
    
    # Step 2: Get voice config
    voice_config = get_voice_config(detected_lang)
    print(f"🎤 Voice: {voice_config['name']}")
    
    # Step 3: Initialize streaming buffer (simulates frontend buffer)
    audio_buffer = StreamingAudioBuffer()
    
    try:
        client = texttospeech.TextToSpeechClient()
        
        # Configure streaming
        streaming_config = texttospeech.StreamingSynthesizeConfig(
            voice=texttospeech.VoiceSelectionParams(
                name=voice_config['name'],
                language_code=voice_config['language_code'],
            )
        )
        
        config_request = texttospeech.StreamingSynthesizeRequest(
            streaming_config=streaming_config
        )
        
        # Split text into chunks
        chunk_size = 30  # Smaller chunks for more realistic streaming
        text_chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
        
        def request_generator():
            yield config_request
            for chunk in text_chunks:
                if chunk.strip():
                    yield texttospeech.StreamingSynthesizeRequest(
                        input=texttospeech.StreamingSynthesisInput(text=chunk)
                    )
        
        print("🚀 Starting real-time streaming...")
        print("=" * 60)
        
        responses = client.streaming_synthesize(request_generator())
        
        # Process each chunk as it arrives (real-time simulation)
        for response in responses:
            if response.audio_content:
                chunk_data = response.audio_content
                
                # Add to buffer (simulates frontend receiving chunk)
                chunk_metadata = audio_buffer.add_chunk(
                    chunk_data, 
                    {'text_processed': 'partial', 'language': detected_lang}
                )
                
                # Real-time logging (what frontend would see)
                print(f"📦 CHUNK {chunk_metadata['chunk_id']} RECEIVED:")
                print(f"   Size: {chunk_metadata['size_bytes']} bytes")
                print(f"   Time: {chunk_metadata['elapsed_time']:.3f}s from start")
                print(f"   Total so far: {audio_buffer.total_bytes} bytes")
                
                # Call custom callback if provided
                if chunk_callback:
                    chunk_callback(chunk_data, chunk_metadata)
                
                # Simulate frontend processing time
                if simulate_frontend:
                    frontend_process_chunk(chunk_data, chunk_metadata)
                
                print("-" * 40)
                
                # Small delay to simulate network latency
                time.sleep(0.1)
        
        print("=" * 60)
        print(f"✅ STREAMING COMPLETED!")
        print(f"📊 Total chunks: {audio_buffer.chunk_count}")
        print(f"📊 Total size: {audio_buffer.total_bytes} bytes")
        print(f"⏱️  Total time: {time.time() - audio_buffer.start_time:.3f}s")
        
        return audio_buffer
        
    except Exception as e:
        print(f"❌ Streaming error: {e}")
        return None

def frontend_process_chunk(chunk_data, metadata):
    """
    Simulate what frontend would do with each chunk
    """
    # Simulate saving individual chunks (what frontend might do for debugging)
    chunk_filename = f"chunk_{metadata['chunk_id']:03d}.raw"
    
    # In real frontend, this might be:
    # - Adding to audio buffer for playback
    # - Sending to Web Audio API
    # - Updating progress bar
    # - Caching for offline use
    
    # For our simulation, save each chunk
    with open(chunk_filename, "wb") as f:
        f.write(chunk_data)
    
    print(f"   📁 Frontend saved: {chunk_filename}")
    
    # Simulate frontend deciding when to start playback
    if metadata['chunk_id'] == 1:
        print(f"   🎵 Frontend: Starting audio playback...")
    elif metadata['chunk_id'] == 3:
        print(f"   🔊 Frontend: Audio buffer sufficient, smooth playback...")

def save_individual_chunks_test(audio_buffer, output_dir="streaming_chunks"):
    """
    Save and test individual chunks (for debugging streaming issues)
    """
    import os
    import struct
    
    if not audio_buffer or not audio_buffer.chunks:
        print("❌ No audio chunks to test")
        return
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"\n🔍 Testing Individual Chunks ({len(audio_buffer.chunks)} chunks)")
    print("=" * 60)
    
    for i, chunk in enumerate(audio_buffer.chunks):
        chunk_num = i + 1
        
        # Save raw chunk
        raw_filename = os.path.join(output_dir, f"chunk_{chunk_num:03d}_raw.bin")
        with open(raw_filename, "wb") as f:
            f.write(chunk)
        
        # Try to create a playable WAV from this chunk
        wav_filename = os.path.join(output_dir, f"chunk_{chunk_num:03d}.wav")
        try:
            # Add WAV header
            wav_data = add_wav_header(chunk)
            with open(wav_filename, "wb") as f:
                f.write(wav_data)
            
            print(f"✅ Chunk {chunk_num}: {len(chunk)} bytes → {wav_filename}")
        except Exception as e:
            print(f"❌ Chunk {chunk_num}: Failed to create WAV - {e}")
    
    # Save complete combined audio
    complete_audio = audio_buffer.get_playable_audio()
    complete_filename = os.path.join(output_dir, "complete_audio.wav")
    complete_wav = add_wav_header(complete_audio)
    with open(complete_filename, "wb") as f:
        f.write(complete_wav)
    
    print(f"\n📁 Files saved in: {output_dir}/")
    print(f"🎵 Complete audio: {complete_filename}")
    
    # Generate metadata file
    metadata_filename = os.path.join(output_dir, "chunks_metadata.json")
    with open(metadata_filename, "w") as f:
        json.dump(audio_buffer.chunk_metadata, f, indent=2)
    print(f"📋 Metadata: {metadata_filename}")

def add_wav_header(pcm_data, sample_rate=24000, num_channels=1, bits_per_sample=16):
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

def websocket_simulation(text):
    """
    Simulate how this would work with WebSockets in a real application
    """
    print("\n🌐 WebSocket Streaming Simulation")
    print("=" * 50)
    print("Backend → WebSocket → Frontend")
    print()
    
    def websocket_send_callback(chunk_data, metadata):
        """Simulate sending chunk via WebSocket"""
        # In real app, this would be: websocket.send(chunk_data)
        message = {
            'type': 'audio_chunk',
            'chunk_id': metadata['chunk_id'],
            'size': metadata['size_bytes'],
            'timestamp': metadata['timestamp'],
            'data': f"<{len(chunk_data)} bytes of audio data>"  # Would be base64 encoded
        }
        print(f"📡 WebSocket Send: {json.dumps(message, indent=2)}")
        
        # Simulate WebSocket latency
        time.sleep(0.05)
        
        print(f"✅ Frontend received chunk {metadata['chunk_id']}")
        print()
    
    # Run streaming with WebSocket simulation
    audio_buffer = realtime_streaming_tts_simulation(
        text,
        chunk_callback=websocket_send_callback,
        simulate_frontend=False
    )
    
    return audio_buffer

def main():
    """Test real-time streaming scenarios"""
    print("=== Real-Time Streaming TTS Testing ===\n")
    
    test_cases = [
        {
            'text': "Hello! This is a real-time streaming test.",
            'description': "Short English Text"
        },
        {
            'text': "আমি বাংলায় রিয়েল টাইম স্ট্রিমিং পরীক্ষা করছি।",
            'description': "Bengali Text"
        },
        {
            'text': "This is a longer text to test how the streaming performs with more content. Each chunk should arrive in real-time and be processed immediately by the frontend.",
            'description': "Long English Text"
        }
    ]
    
    print("Choose a test:")
    for i, test in enumerate(test_cases):
        print(f"{i+1}. {test['description']}: {test['text'][:50]}...")
    print("4. WebSocket simulation")
    print("5. Custom text")
    
    choice = input("\nEnter choice (1-5): ").strip()
    
    if choice in ['1', '2', '3']:
        test_case = test_cases[int(choice) - 1]
        print(f"\n🧪 Testing: {test_case['description']}")
        print(f"📝 Text: {test_case['text']}")
        print()
        
        # Run real-time streaming simulation
        audio_buffer = realtime_streaming_tts_simulation(test_case['text'])
        
        if audio_buffer:
            # Test individual chunks
            save_individual_chunks_test(audio_buffer)
            
    elif choice == '4':
        text = "WebSocket streaming test with real-time audio chunks."
        websocket_simulation(text)
        
    elif choice == '5':
        custom_text = input("Enter your text: ").strip()
        if custom_text:
            audio_buffer = realtime_streaming_tts_simulation(custom_text)
            if audio_buffer:
                save_individual_chunks_test(audio_buffer)
    else:
        print("Invalid choice!")

if __name__ == "__main__":
    main()