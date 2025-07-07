import React, { useState, useRef, useCallback } from 'react';
import './AudioPlayer.css';

const AudioPlayer = ({ text, user, API_BASE_URL }) => {
  // Audio player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  
  // Background streaming states (hidden from user)
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState('idle');
  const [streamInfo, setStreamInfo] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [hasAudioReady, setHasAudioReady] = useState(false);

  // Audio management refs
  const audioContextRef = useRef(null);
  const audioBufferRef = useRef([]);
  const activeSourcesRef = useRef([]);
  const chunkQueueRef = useRef([]);
  
  // Playback position tracking for pause/resume
  const pausedAtRef = useRef(0);
  const startTimeRef = useRef(0);
  const isPlaybackActiveRef = useRef(false);
  const eventSourceRef = useRef(null);

  // Initialize Web Audio API
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  // Stop all active audio sources
  const stopAllAudioSources = () => {
    activeSourcesRef.current.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (error) {
        // Source might already be stopped
      }
    });
    activeSourcesRef.current = [];
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

  // Process audio chunks from streaming
  const processAudioChunk = async (audioData) => {
    try {
      const arrayBuffer = base64ToArrayBuffer(audioData);
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      // Store chunk for playback
      audioBufferRef.current.push(audioBuffer);
      setHasAudioReady(true);
      
      // If playing live (first play), add to queue and play
      if (isPlaybackActiveRef.current && !isPaused) {
        chunkQueueRef.current.push(audioBuffer);
        
        // Start playing if this is the first chunk
        if (audioBufferRef.current.length === 1) {
          startTimeRef.current = audioContextRef.current.currentTime;
          playNextChunk();
        }
      }
      
    } catch (error) {
      console.error('Error processing audio chunk:', error);
    }
  };

  // Play audio chunks sequentially
  const playNextChunk = () => {
    if (chunkQueueRef.current.length === 0 || !isPlaybackActiveRef.current) {
      // If no more chunks and not streaming anymore, playback complete
      if (chunkQueueRef.current.length === 0 && !isStreaming) {
        handlePlaybackComplete();
      }
      return;
    }

    const audioBuffer = chunkQueueRef.current.shift();
    
    try {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      // Track source for cleanup
      activeSourcesRef.current.push(source);
      
      // Start playing immediately
      source.start(audioContextRef.current.currentTime);
      
      // Continue to next chunk when this one ends
      source.onended = () => {
        const index = activeSourcesRef.current.indexOf(source);
        if (index > -1) {
          activeSourcesRef.current.splice(index, 1);
        }
        
        if (isPlaybackActiveRef.current) {
          playNextChunk();
        }
      };
      
    } catch (error) {
      console.error('Error playing audio chunk:', error);
    }
  };

  // Play from specific position (for pause/resume)
  const playFromPosition = (startPosition = 0) => {
    if (audioBufferRef.current.length === 0) return;

    stopAllAudioSources();
    isPlaybackActiveRef.current = true;

    let currentPosition = 0;
    
    // Find which chunks to play based on start position
    for (let i = 0; i < audioBufferRef.current.length; i++) {
      const chunkDuration = audioBufferRef.current[i].duration;
      
      if (currentPosition + chunkDuration > startPosition) {
        // This chunk contains our start position
        const offsetInChunk = startPosition - currentPosition;
        
        // Queue remaining chunks starting from this position
        for (let j = i; j < audioBufferRef.current.length; j++) {
          chunkQueueRef.current.push(audioBufferRef.current[j]);
        }
        
        // Start playback (with offset for first chunk if needed)
        if (offsetInChunk > 0) {
          // For simplicity, we'll start from the beginning of the chunk
          // In a more advanced implementation, you'd crop the audio buffer
        }
        playNextChunk();
        break;
      }
      
      currentPosition += chunkDuration;
    }
  };

  // Handle playback completion
  const handlePlaybackComplete = () => {
    setIsPlaying(false);
    setIsPaused(false);
    isPlaybackActiveRef.current = false;
    pausedAtRef.current = 0;
  };

  // Handle streaming events
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
          processAudioChunk(data.audio_data);
          break;
          
        case 'complete':
          setStreamStatus('completed');
          setIsStreaming(false);
          console.log(`Streaming completed: ${data.total_chunks} chunks`);
          break;
          
        case 'error':
          setStreamStatus('error');
          setIsStreaming(false);
          console.error('Streaming error:', data.message);
          break;
      }
    } catch (error) {
      console.error('Error parsing stream event:', error);
    }
  };

  // Start background streaming (only called once)
  const startBackgroundStreaming = async () => {
    if (!text || !text.trim() || isStreaming) return;

    setIsStreaming(true);
    setStreamStatus('connecting');

    try {
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
                  handleStreamEvent({ data: eventData });
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

  // 🎵 MAIN BUTTON FUNCTIONS

  // Play/Pause toggle
  const handlePlayPause = () => {
    initAudioContext();

    if (!hasStarted) {
      // First play - start streaming and playback
      setHasStarted(true);
      setIsPlaying(true);
      setIsPaused(false);
      isPlaybackActiveRef.current = true;
      pausedAtRef.current = 0;
      
      // Start background streaming
      startBackgroundStreaming();
      
      // Audio will start playing when first chunk arrives via processAudioChunk
      
    } else if (isPlaying && !isPaused) {
      // Currently playing - pause it
      const currentTime = audioContextRef.current.currentTime;
      pausedAtRef.current = currentTime - startTimeRef.current;
      
      stopAllAudioSources();
      setIsPlaying(false);
      setIsPaused(true);
      
    } else {
      // Currently paused or stopped - resume/play
      setIsPlaying(true);
      setIsPaused(false);
      
      if (hasAudioReady) {
        // Play from paused position
        startTimeRef.current = audioContextRef.current.currentTime - pausedAtRef.current;
        playFromPosition(pausedAtRef.current);
      }
    }
  };

  // Stop playback
  const handleStop = () => {
    stopAllAudioSources();
    setIsPlaying(false);
    setIsPaused(false);
    pausedAtRef.current = 0;
    chunkQueueRef.current = [];
  };

  // Restart from beginning
  const handleRestart = () => {
    if (audioBufferRef.current.length === 0) {
      // No audio ready yet, start streaming and play
      handlePlayPause();
      return;
    }

    stopAllAudioSources();
    setIsPlaying(true);
    setIsPaused(false);
    pausedAtRef.current = 0;
    
    initAudioContext();
    startTimeRef.current = audioContextRef.current.currentTime;
    playFromPosition(0);
  };

  // Determine button states
  const isStopDisabled = !isPlaying && !isPaused;
  const showPauseIcon = isPlaying && !isPaused;

  return (
    <div className="audio-player-container">
      <div className="audio-controls">
        
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          className={`audio-button play-button ${isPlaying ? 'playing' : ''}`}
          title={showPauseIcon ? "Pause" : "Play"}
        >
          {showPauseIcon ? (
            // Pause icon
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ) : (
            // Play icon
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        {/* Stop Button */}
        <button
          onClick={handleStop}
          disabled={isStopDisabled}
          className={`audio-button stop-button ${isStopDisabled ? 'disabled' : ''}`}
          title="Stop"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
            <rect x="6" y="6" width="12" height="12"/>
          </svg>
        </button>

        {/* Restart Button */}
        <button
          onClick={handleRestart}
          className="audio-button speak-again-button"
          title="Restart from beginning"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
          </svg>
        </button>

      </div>

      {/* Status indicator - minimal */}
      <div className="stream-status-compact" style={{ 
        fontSize: '11px', 
        color: '#666',
        marginTop: '5px',
        textAlign: 'center'
      }}>
        {!hasStarted && 'Ready to play'}
        {hasStarted && !hasAudioReady && 'Loading...'}
        {isPlaying && !isPaused && 'Playing'}
        {isPaused && 'Paused'}
        {!isPlaying && !isPaused && hasAudioReady && hasStarted && 'Stopped'}
        {streamStatus === 'completed' && !isPlaying && ' • Complete'}
      </div>

      {/* Language info when available */}
      {streamInfo && (
        <div className="stream-info-compact" style={{ 
          fontSize: '10px', 
          color: '#999', 
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