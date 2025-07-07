import React, { useState, useRef, useCallback } from 'react';
import './AudioPlayer.css';

const AudioPlayer = ({ text, user, API_BASE_URL }) => {

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState('idle');
  const [streamInfo, setStreamInfo] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const eventSourceRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioBufferRef = useRef([]);
  const playbackIndexRef = useRef(0);
  const nextStartTimeRef = useRef(0);
  const chunkQueueRef = useRef([]);

  // Initialize Web Audio API
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  // Convert base64 to ArrayBuffer
  const base64ToArrayBuffer = (base64) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  // Play audio chunk sequentially
  const playAudioChunk = async (audioData) => {
    try {
      initAudioContext();
      const arrayBuffer = base64ToArrayBuffer(audioData);
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      // Store for potential replay
      audioBufferRef.current.push(audioBuffer);
      
      // Add to queue for sequential playback
      chunkQueueRef.current.push(audioBuffer);
      
      // Play chunks sequentially
      playNextChunk();
      
    } catch (error) {
      console.error('Error playing audio chunk:', error);
    }
  };

  // Play chunks one after another (sequential)
  const playNextChunk = () => {
    if (chunkQueueRef.current.length === 0 || !isPlaying) return;
    
    const audioBuffer = chunkQueueRef.current.shift();
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    
    // Calculate when this chunk should start
    const currentTime = audioContextRef.current.currentTime;
    const startTime = Math.max(currentTime, nextStartTimeRef.current);
    
    // Schedule this chunk to start at the right time
    source.start(startTime);
    
    // Update next start time (when this chunk will end)
    nextStartTimeRef.current = startTime + audioBuffer.duration;
    
    // When this chunk ends, play the next one
    source.onended = () => {
      playNextChunk();
    };
  };

  // Handle Server-Sent Events
  const handleStreamEvent = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'status':
          if (data.status === 'started') {
            setStreamStatus('streaming');
            setStreamInfo({
              language: data.language,
              voice: data.voice,
              confidence: data.confidence
            });
          }
          break;
          
        case 'audio_chunk':
          setChunks(prev => [...prev, data]);
          setTotalChunks(data.chunk_id);
          
          // Auto-play chunks as they arrive
          if (isPlaying) {
            playAudioChunk(data.audio_data);
          }
          break;
          
        case 'complete':
          setStreamStatus('completed');
          setIsStreaming(false);
          console.log(`Streaming completed: ${data.total_chunks} chunks, ${data.total_bytes} bytes`);
          break;
          
        case 'error':
          setStreamStatus('error');
          setIsStreaming(false);
          console.error('Streaming error:', data.message);
          break;
          
        default:
          console.log('Unknown event type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing SSE data:', error);
    }
  };

  // Start streaming
  const startStreaming = async () => {
    if (!text || !text.trim()) {
      console.warn('No text provided for audio streaming');
      return;
    }

    setIsStreaming(true);
    setStreamStatus('connecting');
    setChunks([]);
    setTotalChunks(0);
    audioBufferRef.current = [];
    chunkQueueRef.current = [];
    playbackIndexRef.current = 0;
    nextStartTimeRef.current = 0;
    setIsPlaying(true); // Auto-enable playback for streaming

    try {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Get token from localStorage (consistent with other components)
      const token = localStorage.getItem('access_token');

      // Make POST request to start streaming
      const response = await fetch(`${API_BASE_URL}/stream-audio/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.user_id,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: text,
          chunk_size: 30
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Create EventSource from response stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const readStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const eventData = line.slice(6);
                if (eventData.trim()) {
                  const mockEvent = { data: eventData };
                  handleStreamEvent(mockEvent);
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream reading error:', error);
          setStreamStatus('error');
          setIsStreaming(false);
        }
      };

      readStream();

    } catch (error) {
      console.error('Streaming error:', error);
      setStreamStatus('error');
      setIsStreaming(false);
    }
  };

  // Stop streaming
  const stopStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
    setStreamStatus('stopped');
    setIsPlaying(false);
    chunkQueueRef.current = [];
    nextStartTimeRef.current = 0;
  };

  // Toggle playback
  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      initAudioContext();
      // Resume playback if there are queued chunks
      playNextChunk();
    } else {
      // Stop current playback
      chunkQueueRef.current = [];
    }
  };

  // Replay all chunks sequentially
  const replayAudio = async () => {
    if (audioBufferRef.current.length === 0) {
      console.warn('No audio to replay');
      return;
    }

    initAudioContext();
    
    // Reset timing and queue all chunks for replay
    nextStartTimeRef.current = audioContextRef.current.currentTime;
    chunkQueueRef.current = [...audioBufferRef.current]; // Copy all buffers to queue
    setIsPlaying(true);
    
    // Start sequential playback
    playNextChunk();
  };

  // Get status color
  const getStatusColor = () => {
    switch (streamStatus) {
      case 'connecting': return '#orange';
      case 'streaming': return '#green';
      case 'completed': return '#blue';
      case 'error': return '#red';
      case 'stopped': return '#gray';
      default: return '#gray';
    }
  };

  return (
    <div className="audio-player-container">
      <div className="audio-controls">
        <button
          onClick={startStreaming}
          disabled={isStreaming}
          className={`audio-button play-button ${isStreaming ? 'playing' : ''}`}
          title="Start streaming audio"
        >
          <span className="speaker-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="white"
              width="30px"
              height="30px"
            >
              <path d="M8 5v14l11-7z"/>
            </svg>
          </span>
        </button>

        <button
          onClick={stopStreaming}
          disabled={!isStreaming}
          className="audio-button stop-button"
          title="Stop streaming"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
            width="30px"
            height="30px"
          >
            <rect x="6" y="6" width="12" height="12"/>
          </svg>
        </button>

        <button
          onClick={togglePlayback}
          className={`audio-button toggle-button ${isPlaying ? 'active' : ''}`}
          title={isPlaying ? 'Mute audio' : 'Unmute audio'}
        >
          {isPlaying ? '🔊' : '🔇'}
        </button>

        <button
          onClick={replayAudio}
          disabled={chunks.length === 0}
          className={`audio-button speak-again-button ${chunks.length === 0 ? 'disabled' : ''}`}
          title="Replay audio"
        >
          🔄
        </button>
      </div>

      {/* Compact status indicator */}
      {streamStatus !== 'idle' && (
        <div className="stream-status-compact" style={{ 
          fontSize: '12px', 
          color: getStatusColor(), 
          marginTop: '5px',
          textAlign: 'center'
        }}>
          {streamStatus === 'connecting' && 'Connecting...'}
          {streamStatus === 'streaming' && `Streaming (${chunks.length} chunks)`}
          {streamStatus === 'completed' && `Complete (${totalChunks} chunks)`}
          {streamStatus === 'error' && 'Error occurred'}
          {streamStatus === 'stopped' && 'Stopped'}
        </div>
      )}

      {/* Language info when streaming starts */}
      {streamInfo && streamStatus === 'streaming' && (
        <div className="stream-info-compact" style={{ 
          fontSize: '11px', 
          color: '#666', 
          marginTop: '2px',
          textAlign: 'center'
        }}>
          {streamInfo.language === 'bn' ? 'বাংলা' : 'English'} • {streamInfo.voice.includes('Leda') ? 'Female' : 'Male'}
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;