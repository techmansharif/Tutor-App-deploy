import React, { useState, useRef, useCallback } from 'react';
import './AudioPlayer.css';

const AudioPlayer = ({ text, user, API_BASE_URL }) => {

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState('idle');
  const [streamInfo, setStreamInfo] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasAudioReady, setHasAudioReady] = useState(false);
  
  const eventSourceRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioBufferRef = useRef([]);
  const chunkQueueRef = useRef([]);
  const isAutoPlayingRef = useRef(false);
  
  // 🆕 NEW: Track all active audio sources for proper cleanup
  const activeSourcesRef = useRef([]);
  const playbackTimeoutRef = useRef(null);
  const isPlaybackActiveRef = useRef(false);

  // Initialize Web Audio API
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  // 🆕 NEW: Stop all active audio sources immediately
  const stopAllAudioSources = () => {
    // Stop all currently playing sources
    activeSourcesRef.current.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (error) {
        // Source might already be stopped, ignore error
      }
    });
    
    // Clear the active sources array
    activeSourcesRef.current = [];
    
    // Clear any pending timeouts
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
    
    // Reset playback state
    isPlaybackActiveRef.current = false;
  };

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

  // Process audio chunks during streaming
  const processAudioChunk = async (audioData) => {
    try {
      const arrayBuffer = base64ToArrayBuffer(audioData);
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      // Store for potential replay
      audioBufferRef.current.push(audioBuffer);
      setHasAudioReady(true);
      
      // Only auto-play if real-time mode is active and playback is still active
      if (isAutoPlayingRef.current && isPlaybackActiveRef.current) {
        chunkQueueRef.current.push(audioBuffer);
        
        // If this is the first chunk, start playing immediately
        if (audioBufferRef.current.length === 1) {
          playNextChunk();
        }
      }
      
    } catch (error) {
      console.error('Error processing audio chunk:', error);
    }
  };

  // 🔧 FIXED: Play chunks with proper source management
  const playNextChunk = () => {
    // Check if playback should continue
    if (chunkQueueRef.current.length === 0 || !isPlaybackActiveRef.current) {
      // If no more chunks, mark playback as complete
      if (chunkQueueRef.current.length === 0) {
        setIsPlaying(false);
        isAutoPlayingRef.current = false;
        isPlaybackActiveRef.current = false;
      }
      return;
    }
    
    const audioBuffer = chunkQueueRef.current.shift();
    
    try {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      // 🆕 NEW: Track this source for cleanup
      activeSourcesRef.current.push(source);
      
      // Play immediately
      const startTime = audioContextRef.current.currentTime;
      source.start(startTime);
      
      // 🆕 NEW: Clean up source when it ends and continue to next
      source.onended = () => {
        // Remove this source from active sources
        const index = activeSourcesRef.current.indexOf(source);
        if (index > -1) {
          activeSourcesRef.current.splice(index, 1);
        }
        
        // Continue to next chunk if playback is still active
        if (isPlaybackActiveRef.current) {
          playNextChunk();
        }
      };
      
      // 🆕 NEW: Handle source errors
      source.onerror = (error) => {
        console.error('Audio source error:', error);
        const index = activeSourcesRef.current.indexOf(source);
        if (index > -1) {
          activeSourcesRef.current.splice(index, 1);
        }
      };
      
    } catch (error) {
      console.error('Error playing audio chunk:', error);
    }
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
          processAudioChunk(data.audio_data);
          break;
          
        case 'complete':
          setStreamStatus('completed');
          setIsStreaming(false);
          console.log(`Streaming completed: ${data.total_chunks} chunks, ${data.total_bytes} bytes`);
          break;
          
        case 'error':
          setStreamStatus('error');
          setIsStreaming(false);
          isAutoPlayingRef.current = false;
          isPlaybackActiveRef.current = false;
          console.error('Streaming error:', data.message);
          break;
          
        default:
          console.log('Unknown event type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing SSE data:', error);
    }
  };

  // Start streaming (no playback)
  const startStreaming = async () => {
    if (!text || !text.trim()) {
      console.warn('No text provided for audio streaming');
      return;
    }

    // 🔧 FIXED: Stop any existing playback first
    stopAllAudioSources();

    setIsStreaming(true);
    setStreamStatus('connecting');
    setChunks([]);
    setTotalChunks(0);
    setHasAudioReady(false);
    setIsPlaying(false);
    
    // Clear all audio data
    audioBufferRef.current = [];
    chunkQueueRef.current = [];
    isAutoPlayingRef.current = false;
    isPlaybackActiveRef.current = false;

    try {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const token = localStorage.getItem('access_token');

      const response = await fetch(`${API_BASE_URL}/stream-audio/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.user_id,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: text,
          chunk_size: 300
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

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

  // 🆕 NEW: Start real-time playback during streaming
  const startRealtimePlayback = () => {
    // Don't start if already playing
    if (isPlaybackActiveRef.current) {
      return;
    }

    initAudioContext();
    isAutoPlayingRef.current = true;
    isPlaybackActiveRef.current = true;
    setIsPlaying(true);
    
    // If we already have chunks, start playing them
    if (audioBufferRef.current.length > 0) {
      chunkQueueRef.current = [...audioBufferRef.current];
      playNextChunk();
    }
  };

  // 🆕 NEW: Play completed audio
  const playCompletedAudio = () => {
    if (audioBufferRef.current.length === 0) {
      console.warn('No audio to play');
      return;
    }

    // 🔧 FIXED: Stop any existing playback first
    stopAllAudioSources();

    initAudioContext();
    isPlaybackActiveRef.current = true;
    setIsPlaying(true);
    
    // Queue all chunks and start playback
    chunkQueueRef.current = [...audioBufferRef.current];
    playNextChunk();
  };

  // 🔧 FIXED: Properly stop streaming
  const stopStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    // Stop all audio playback
    stopAllAudioSources();
    
    setIsStreaming(false);
    setStreamStatus('stopped');
    setIsPlaying(false);
    isAutoPlayingRef.current = false;
    isPlaybackActiveRef.current = false;
    chunkQueueRef.current = [];
  };

  // 🔧 FIXED: Properly stop playback only
  const stopPlayback = () => {
    stopAllAudioSources();
    
    setIsPlaying(false);
    isAutoPlayingRef.current = false;
    isPlaybackActiveRef.current = false;
    chunkQueueRef.current = [];
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
        {/* Stream button */}
        <button
          onClick={startStreaming}
          disabled={isStreaming}
          className={`audio-button stream-button ${isStreaming ? 'streaming' : ''}`}
          title="Start streaming audio"
        >
          📡
        </button>

        {/* Real-time play button */}
        <button
          onClick={startRealtimePlayback}
          disabled={!isStreaming || isAutoPlayingRef.current}
          className={`audio-button realtime-button ${isAutoPlayingRef.current ? 'active' : ''}`}
          title="Play audio as it streams"
        >
          🔴
        </button>

        {/* Play completed audio button */}
        <button
          onClick={playCompletedAudio}
          disabled={!hasAudioReady || (isPlaying && !isAutoPlayingRef.current)}
          className={`audio-button play-button ${isPlaying && !isAutoPlayingRef.current ? 'playing' : ''}`}
          title="Play completed audio"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
            width="20px"
            height="20px"
          >
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>

        {/* Stop streaming button */}
        <button
          onClick={stopStreaming}
          disabled={!isStreaming}
          className="audio-button stop-stream-button"
          title="Stop streaming"
        >
          🛑
        </button>

        {/* Stop playback button */}
        <button
          onClick={stopPlayback}
          disabled={!isPlaying && !isAutoPlayingRef.current}
          className="audio-button stop-play-button"
          title="Stop playback"
        >
          ⏹️
        </button>
      </div>

      {/* Status indicator */}
      <div className="stream-status-compact" style={{ 
        fontSize: '12px', 
        color: getStatusColor(), 
        marginTop: '5px',
        textAlign: 'center'
      }}>
        {streamStatus === 'idle' && hasAudioReady && 'Ready to play'}
        {streamStatus === 'connecting' && 'Connecting...'}
        {streamStatus === 'streaming' && `Streaming (${chunks.length} chunks)`}
        {streamStatus === 'completed' && `Complete (${totalChunks} chunks)`}
        {streamStatus === 'error' && 'Error occurred'}
        {streamStatus === 'stopped' && 'Stopped'}
        
        {/* Playback status */}
        {isAutoPlayingRef.current && ' • 🔴 Live'}
        {isPlaying && !isAutoPlayingRef.current && ' • ▶️ Playing'}
        {activeSourcesRef.current.length > 0 && ` • ${activeSourcesRef.current.length} sources`}
      </div>

      {/* Language info */}
      {streamInfo && (
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