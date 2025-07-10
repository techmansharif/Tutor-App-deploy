import React, { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import './AudioPlayer.css';
import { preprocessForTTS } from './PreprocessAudio.js';

const AudioPlayer = forwardRef(({ text, user, API_BASE_URL }, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaybackEnabled, setIsPlaybackEnabled] = useState(false);
  const [isPlaybackLocked, setIsPlaybackLocked] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState('idle');
  const [streamInfo, setStreamInfo] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [hasAudioReady, setHasAudioReady] = useState(false);

  const audioContextRef = useRef(null);
  const audioBufferRef = useRef([]);
  const activeSourcesRef = useRef([]);
  const chunkQueueRef = useRef([]);
  const pausedAtRef = useRef(0);
  const startTimeRef = useRef(0);
  const isPlaybackActiveRef = useRef(false);
  const isLiveStreamingModeRef = useRef(false);
  const abortControllerRef = useRef(null);
  const readerRef = useRef(null);
  const isComponentMountedRef = useRef(true);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  const stopAllAudioSources = useCallback(() => {
    isPlaybackActiveRef.current = false;
    activeSourcesRef.current.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (error) {
        if (error.name !== 'InvalidStateError') {
          console.warn('Error stopping audio source:', error);
        }
      }
    });
    activeSourcesRef.current = [];
    chunkQueueRef.current = [];
  }, []);

  const stopAllAudioSourcesComplete = useCallback(() => {
    return new Promise((resolve) => {
      stopAllAudioSources();
      setTimeout(resolve, 50);
    });
  }, [stopAllAudioSources]);

  const base64ToArrayBuffer = (base64) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const processAudioChunk = useCallback(async (audioData) => {
    if (!isComponentMountedRef.current) return;
    
    try {
      const arrayBuffer = base64ToArrayBuffer(audioData);
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      audioBufferRef.current.push(audioBuffer);
      if (isComponentMountedRef.current) {
        setHasAudioReady(true);
        setIsPlaybackEnabled(true);
      }
      
      if (isPlaybackActiveRef.current && !isPaused && isLiveStreamingModeRef.current) {
        chunkQueueRef.current.push(audioBuffer);
        if (audioBufferRef.current.length === 1) {
          startTimeRef.current = audioContextRef.current.currentTime;
          playNextChunk();
        }
      }
    } catch (error) {
      console.error('Error processing audio chunk:', error);
    }
  }, [isPaused]);

  const playNextChunk = useCallback(() => {
    if (chunkQueueRef.current.length === 0 || !isPlaybackActiveRef.current || !isComponentMountedRef.current) {
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
      activeSourcesRef.current.push(source);
      source.start(audioContextRef.current.currentTime);
      source.onended = () => {
        const index = activeSourcesRef.current.indexOf(source);
        if (index > -1) {
          activeSourcesRef.current.splice(index, 1);
        }
        if (isPlaybackActiveRef.current && isComponentMountedRef.current) {
          playNextChunk();
        }
      };
    } catch (error) {
      console.error('Error playing audio chunk:', error);
    }
  }, [isStreaming]);

  const playFromPosition = useCallback(async (startPosition = 0) => {
    if (audioBufferRef.current.length === 0 || !isComponentMountedRef.current) return;

    await stopAllAudioSourcesComplete();
    isPlaybackActiveRef.current = true;

    let currentPosition = 0;
    for (let i = 0; i < audioBufferRef.current.length; i++) {
      const chunkDuration = audioBufferRef.current[i].duration;
      if (currentPosition + chunkDuration > startPosition) {
        for (let j = i; j < audioBufferRef.current.length; j++) {
          chunkQueueRef.current.push(audioBufferRef.current[j]);
        }
        playNextChunk();
        break;
      }
      currentPosition += chunkDuration;
    }
  }, [stopAllAudioSourcesComplete, playNextChunk]);

  const handlePlaybackComplete = useCallback(() => {
    if (!isComponentMountedRef.current) return;
    setIsPlaying(false);
    setIsPaused(false);
    isPlaybackActiveRef.current = false;
    pausedAtRef.current = 0;
    if (isStreaming && hasStarted) {
      isLiveStreamingModeRef.current = true;
    } else {
      isLiveStreamingModeRef.current = false;
    }
  }, [isStreaming, hasStarted]);

  const handleStreamEvent = useCallback((event) => {
    if (!isComponentMountedRef.current) return;
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
  }, [processAudioChunk]);

  const cleanup = useCallback(() => {
    console.log('AudioPlayer: Starting cleanup...');
    return new Promise((resolve) => {
      setIsCleaningUp(true);
      isComponentMountedRef.current = false;

      if (abortControllerRef.current) {
        console.log('AudioPlayer: Aborting fetch request...');
        try {
          abortControllerRef.current.abort();
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.warn('Error aborting fetch:', error);
          }
        }
        abortControllerRef.current = null;
      }

      if (readerRef.current) {
        try {
          readerRef.current.cancel().catch(error => {
            if (error.name !== 'AbortError') {
              console.warn('Error cancelling reader:', error);
            }
          });
          readerRef.current = null;
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.warn('Error cancelling reader:', error);
          }
        }
      }

      stopAllAudioSources();
      audioBufferRef.current = [];
      chunkQueueRef.current = [];
      activeSourcesRef.current = [];
      setIsStreaming(false);
      setStreamStatus('idle');
      setIsPlaying(false);
      setIsPaused(false);
      setHasStarted(false);
      setIsPlaybackEnabled(false);
      setIsPlaybackLocked(false);
      setHasAudioReady(false);
      setChunks([]);
      setStreamInfo(null);
      pausedAtRef.current = 0;
      startTimeRef.current = 0;
      isPlaybackActiveRef.current = false;
      isLiveStreamingModeRef.current = false;

      setIsCleaningUp(false);
      console.log('AudioPlayer: Cleanup completed');
      resolve();
    });
  }, [stopAllAudioSources]);

  const startBackgroundStreaming = useCallback(async () => {
    if (!text || !text.trim() || isStreaming || !isComponentMountedRef.current) return;

    setIsStreaming(true);
    setStreamStatus('connecting');

    try {
      const token = localStorage.getItem('access_token');
      const processedText = preprocessForTTS(text, 'auto');
      abortControllerRef.current = new AbortController();

      const response = await fetch(`${API_BASE_URL}/stream-audio/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.user_id,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: processedText,
          chunk_size: 300
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();

      const readStream = async () => {
        try {
          while (isComponentMountedRef.current) {
            const { done, value } = await reader.read();
            if (done) {
              setIsStreaming(false);
              setStreamStatus('completed');
              break;
            }

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
          if (error.name === 'AbortError') {
            console.log('AudioPlayer: Stream reading aborted');
            setIsStreaming(false);
            setStreamStatus('idle');
            return;
          }
          console.error('Stream reading error:', error);
          if (isComponentMountedRef.current) {
            setStreamStatus('error');
            setIsStreaming(false);
          }
        }
      };

      readStream();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('AudioPlayer: Streaming aborted');
        setIsStreaming(false);
        setStreamStatus('idle');
        return;
      }
      console.error('Streaming error:', error);
      if (isComponentMountedRef.current) {
        setStreamStatus('error');
        setIsStreaming(false);
      }
    }
  }, [text, isStreaming, API_BASE_URL, user.user_id, handleStreamEvent]);

  const handlePlayPause = useCallback(async () => {
    if (!isComponentMountedRef.current) return;
    initAudioContext();

    if (!hasStarted) {
      setHasStarted(true);
      setIsPlaying(true);
      setIsPaused(false);
      isPlaybackActiveRef.current = true;
      isLiveStreamingModeRef.current = true;
      pausedAtRef.current = 0;
      startBackgroundStreaming();
    } else if (isPlaying && !isPaused) {
      const currentTime = audioContextRef.current.currentTime;
      pausedAtRef.current = currentTime - startTimeRef.current;
      await stopAllAudioSourcesComplete();
      setIsPlaying(false);
      setIsPaused(true);
      isLiveStreamingModeRef.current = false;
    } else {
      setIsPlaying(true);
      setIsPaused(false);
      isLiveStreamingModeRef.current = false;
      if (hasAudioReady) {
        startTimeRef.current = audioContextRef.current.currentTime - pausedAtRef.current;
        await playFromPosition(pausedAtRef.current);
      }
    }
  }, [hasStarted, isPlaying, isPaused, hasAudioReady, initAudioContext, startBackgroundStreaming, stopAllAudioSourcesComplete, playFromPosition]);

  const handleStop = useCallback(async () => {
    if (!isComponentMountedRef.current) return;
    await stopAllAudioSourcesComplete();
    setIsPlaying(false);
    setIsPaused(false);
    isLiveStreamingModeRef.current = false;
    pausedAtRef.current = 0;
  }, [stopAllAudioSourcesComplete]);

  const handlePlayback = useCallback(async () => {
    if (!isComponentMountedRef.current) return;
    if (isPlaybackLocked || audioBufferRef.current.length === 0) {
      console.warn('Playback locked or no cached audio available');
      return;
    }

    setIsPlaybackLocked(true);

    try {
      await stopAllAudioSourcesComplete();
      isLiveStreamingModeRef.current = false;
      pausedAtRef.current = 0;
      setIsPlaying(true);
      setIsPaused(false);
      initAudioContext();
      chunkQueueRef.current = [...audioBufferRef.current];
      isPlaybackActiveRef.current = true;
      playNextChunk();
    } catch (error) {
      console.error('Error during playback:', error);
      setIsPlaying(false);
      setIsPaused(false);
      isPlaybackActiveRef.current = false;
    } finally {
      setTimeout(() => {
        if (isComponentMountedRef.current) {
          setIsPlaybackLocked(false);
        }
      }, 300);
    }
  }, [isPlaybackLocked, stopAllAudioSourcesComplete, initAudioContext, playNextChunk]);

  useImperativeHandle(ref, () => ({
    cleanup: () => cleanup()
  }), [cleanup]);

  useEffect(() => {
    return () => {
      console.log('AudioPlayer: Component unmounting...');
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    const handleStageChange = () => {
      console.log('AudioPlayer: Stage change detected - cleaning up audio');
      cleanup();
    };
    window.addEventListener('stage-change-cleanup', handleStageChange);
    return () => {
      window.removeEventListener('stage-change-cleanup', handleStageChange);
    };
  }, [cleanup]);

  useEffect(() => {
    return () => {
      if (isStreaming) {
        console.log('AudioPlayer: Text changed - cleaning up previous stream');
        cleanup();
      }
    };
  }, [text, cleanup, isStreaming]);

  const isStopDisabled = !isPlaying && !isPaused;
  const showPauseIcon = isPlaying && !isPaused;

  return (
    <div className="audio-player-container">
      <div className="audio-controls">
        <button
          onClick={handleStop}
          disabled={isStopDisabled || isCleaningUp}
          className={`audio-button stop-button ${(isStopDisabled || isCleaningUp) ? 'disabled' : ''}`}
          title={isCleaningUp ? "Cleaning up..." : "Stop"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
            <rect x="6" y="6" width="12" height="12"/>
          </svg>
        </button>

        <button
          onClick={handlePlayPause}
          disabled={isCleaningUp}
          className={`audio-button play-button ${isPlaying ? 'playing' : ''} ${isCleaningUp ? 'disabled' : ''}`}
          title={isCleaningUp ? "Cleaning up..." : showPauseIcon ? "Pause" : "Play"}
        >
          {showPauseIcon ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="30px" height="30px">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="30px" height="30px">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        <button
          onClick={handlePlayback}
          disabled={!isPlaybackEnabled || isPlaybackLocked || isCleaningUp}
          className={`audio-button speak-again-button ${(!isPlaybackEnabled || isPlaybackLocked || isCleaningUp) ? 'disabled' : ''}`}
          title={isCleaningUp ? "Cleaning up..." : isPlaybackLocked ? "Processing..." : "Play from beginning"}
        >
        </button>
      </div>

      <div className="stream-status-compact" style={{ 
        fontSize: '11px', 
        color: '#666',
        marginTop: '5px',
        textAlign: 'center'
      }}>
        {isCleaningUp && 'Cleaning up...'}
        {!isCleaningUp && !hasStarted && 'Ready to play'}
        {!isCleaningUp && hasStarted && !hasAudioReady && 'Loading...'}
        {!isCleaningUp && isPlaying && !isPaused && 'Playing'}
        {!isCleaningUp && isPaused && 'Paused'}
        {!isCleaningUp && !isPlaying && !isPaused && hasAudioReady && hasStarted && 'Stopped'}
        {!isCleaningUp && streamStatus === 'completed' && !isPlaying && ' • Complete'}
        {!isCleaningUp && isLiveStreamingModeRef.current && ' • Live'}
        {!isCleaningUp && isPlaybackLocked && ' • Processing...'}
      </div>

      {streamInfo && !isCleaningUp && (
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
});

AudioPlayer.displayName = 'AudioPlayer';
export default AudioPlayer;