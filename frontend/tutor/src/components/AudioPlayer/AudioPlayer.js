import React, { useEffect, useState, useRef } from 'react';
import './AudioPlayer.css';
import { numberToWords, preprocessText, detectLanguage } from './PreprocessAudio';

const AudioPlayer = ({ text }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechInstance, setSpeechInstance] = useState(null);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [speechRate, setSpeechRate] = useState(1);
  
  // Enhanced tracking system
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [speechText, setSpeechText] = useState('');
  const [wordTimings, setWordTimings] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  
  // Timing references
  const speechStartTime = useRef(null);
  const pausedAt = useRef(null);
  const totalPausedTime = useRef(0);
  const progressInterval = useRef(null);
  const lastKnownPosition = useRef(0);

  // Detect if we're on a mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Pre-process text and create word timing map
  const createWordTimings = (text, rate) => {
    const words = text.split(/(\s+)/);
    const timings = [];
    let charIndex = 0;
    let timeOffset = 0;
    
    // Average characters per second at normal speed
    const baseCharsPerSecond = 4.5;
    const adjustedCharsPerSecond = baseCharsPerSecond * rate;
    
    words.forEach((word, index) => {
      if (word.trim()) {
        // Calculate estimated duration for this word
        const wordDuration = word.length / adjustedCharsPerSecond;
        
        timings.push({
          word: word,
          startChar: charIndex,
          endChar: charIndex + word.length,
          startTime: timeOffset,
          endTime: timeOffset + wordDuration,
          index: index
        });
        
        timeOffset += wordDuration;
      }
      charIndex += word.length;
    });
    
    return timings;
  };

  // Get current position based on elapsed time
  const getCurrentPosition = () => {
    if (!speechStartTime.current) return lastKnownPosition.current;
    
    const now = Date.now();
    const elapsedTime = (now - speechStartTime.current - totalPausedTime.current) / 1000;
    
    // Find current word based on timing
    const currentTiming = wordTimings.find(timing => 
      elapsedTime >= timing.startTime && elapsedTime <= timing.endTime
    );
    
    if (currentTiming) {
      // Interpolate character position within the word
      const wordProgress = (elapsedTime - currentTiming.startTime) / (currentTiming.endTime - currentTiming.startTime);
      const charPosition = Math.floor(currentTiming.startChar + (currentTiming.word.length * wordProgress));
      lastKnownPosition.current = Math.min(charPosition, speechText.length);
      return lastKnownPosition.current;
    }
    
    // Fallback: estimate based on total elapsed time
    const baseCharsPerSecond = 4.5;
    const adjustedCharsPerSecond = baseCharsPerSecond * speechRate;
    const estimatedPosition = Math.floor(elapsedTime * adjustedCharsPerSecond);
    lastKnownPosition.current = Math.min(estimatedPosition, speechText.length);
    return lastKnownPosition.current;
  };

  // Start progress tracking
  const startProgressTracking = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    progressInterval.current = setInterval(() => {
      if (isPlaying && !isPaused) {
        const position = getCurrentPosition();
        setCurrentCharIndex(position);
        
        // Update current word index
        const currentTiming = wordTimings.find(timing => 
          position >= timing.startChar && position <= timing.endChar
        );
        if (currentTiming) {
          setCurrentWordIndex(currentTiming.index);
        }
      }
    }, 100); // Update every 100ms for smooth progress
  };

  // Stop progress tracking
  const stopProgressTracking = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  // Get text from current position
  const getTextFromPosition = (text, startIndex) => {
    return text.substring(startIndex);
  };

  // Handle text-to-speech with enhanced tracking
  const speakText = (startFromIndex = 0) => {
    if ('speechSynthesis' in window) {
      // Stop any ongoing speech
      window.speechSynthesis.cancel();
      stopProgressTracking();

      const processedText = preprocessText(text);
      setSpeechText(processedText);
      
      // Create word timings for the full text
      const timings = createWordTimings(processedText, speechRate);
      setWordTimings(timings);
      
      // Get text from the specified starting position
      const textToSpeak = getTextFromPosition(processedText, startFromIndex);
      
      if (textToSpeak.trim().length === 0) {
        // Nothing left to speak
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentCharIndex(0);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      const lang = detectLanguage(text);
      utterance.lang = lang;

      // Set selected voice
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      } else {
        const availableVoices = window.speechSynthesis.getVoices();
        const voice = availableVoices.find((v) => v.lang === lang) || 
                     availableVoices.find((v) => v.lang.includes(lang.split('-')[0]));
        if (voice) utterance.voice = voice;
      }

      // Adjust for natural speech
      utterance.pitch = 1;
      utterance.rate = speechRate;
      utterance.volume = 1;

      utterance.onstart = () => {
        setIsPlaying(true);
        setIsPaused(false);
        speechStartTime.current = Date.now();
        setCurrentCharIndex(startFromIndex);
        lastKnownPosition.current = startFromIndex;
        startProgressTracking();
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setSpeechInstance(null);
        setCurrentCharIndex(0);
        setCurrentWordIndex(0);
        speechStartTime.current = null;
        totalPausedTime.current = 0;
        lastKnownPosition.current = 0;
        stopProgressTracking();
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsPlaying(false);
        setIsPaused(false);
        setSpeechInstance(null);
        setCurrentCharIndex(0);
        setCurrentWordIndex(0);
        speechStartTime.current = null;
        totalPausedTime.current = 0;
        lastKnownPosition.current = 0;
        stopProgressTracking();
      };

      // Enhanced boundary tracking
      utterance.onboundary = (event) => {
        if (event.name === 'word' || event.name === 'sentence') {
          const actualPosition = startFromIndex + event.charIndex;
          setCurrentCharIndex(actualPosition);
          lastKnownPosition.current = actualPosition;
          
          // Update word index
          const currentTiming = wordTimings.find(timing => 
            actualPosition >= timing.startChar && actualPosition <= timing.endChar
          );
          if (currentTiming) {
            setCurrentWordIndex(currentTiming.index);
          }
        }
      };

      setSpeechInstance(utterance);
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Text-to-speech is not supported in this browser.');
    }
  };

  // Universal pause/resume with custom tracking
  const handlePlay = () => {
    if (!isPlaying) {
      // Start new speech or resume from position
      if (isPaused) {
        // Reset timing for resume
        totalPausedTime.current = totalPausedTime.current + (Date.now() - pausedAt.current);
      }
      speakText(currentCharIndex);
    } else {
      // Pause functionality
      const currentPosition = getCurrentPosition();
      setCurrentCharIndex(currentPosition);
      lastKnownPosition.current = currentPosition;
      
      // Stop speech and tracking
      window.speechSynthesis.cancel();
      stopProgressTracking();
      
      // Set paused state
      setIsPlaying(false);
      setIsPaused(true);
      setSpeechInstance(null);
      pausedAt.current = Date.now();
    }
  };

  // Handle stop
  const handleStop = () => {
    window.speechSynthesis.cancel();
    stopProgressTracking();
    setIsPlaying(false);
    setIsPaused(false);
    setSpeechInstance(null);
    setCurrentCharIndex(0);
    setCurrentWordIndex(0);
    speechStartTime.current = null;
    totalPausedTime.current = 0;
    pausedAt.current = null;
    lastKnownPosition.current = 0;
  };

  // Handle speak again (restart from beginning)
  const handleSpeakAgain = () => {
    handleStop();
    setTimeout(() => speakText(0), 100);
  };

  // Load voices when component mounts
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      // Set default voice based on language
      const lang = detectLanguage(text);
      const defaultVoice = availableVoices.find((v) => v.lang === lang) || 
                         availableVoices.find((v) => v.lang.includes(lang.split('-')[0]));
      if (defaultVoice) setSelectedVoice(defaultVoice);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Reset everything when text changes
    handleStop();

    return () => {
      window.speechSynthesis.cancel();
      stopProgressTracking();
    };
  }, [text]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying && !isPaused) {
        // Save current position and pause
        handlePlay(); // This will pause
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying, isPaused]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      stopProgressTracking();
    };
  }, []);

  // Calculate progress percentage for visual feedback
  const progressPercentage = speechText ? (currentCharIndex / speechText.length) * 100 : 0;

  // Debug info for development
  const debugInfo = {
    isPlaying,
    isPaused,
    currentCharIndex,
    textLength: speechText.length,
    progress: Math.round(progressPercentage),
    isMobile,
    currentWordIndex,
    totalWords: wordTimings.length
  };

  return (
   <div className="audio-player-container">
    <div className="audio-controls">

<button
  onClick={handlePlay}
  disabled={false}
  className={`audio-button play-button ${isPlaying && !isPaused ? 'playing' : ''}`}
  title={isPlaying && !isPaused ? 'Pause' : (isPaused ? 'Resume' : 'Play')}
>
  {isPlaying && !isPaused ? (
    <span className="pause-icon">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="white"
        width="30px"
        height="30px"
      >
        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
      </svg>
    </span>
  ) : (
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
  )}
</button>

       <button
  onClick={handleStop}
  disabled={!isPlaying && !isPaused}
  className="audio-button stop-button"
  title="Stop and reset to beginning"
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
  onClick={handleSpeakAgain}
  disabled={!isPlaying && !isPaused}
  className="audio-button speak-again-button"
  title="Restart from beginning"
>
</button>

  </div>
  
  {/* Enhanced Progress indicator */}
  {speechText && (isPlaying || isPaused || currentCharIndex > 0) && (
    <div style={{
      width: '100%',
      height: '6px',
      backgroundColor: '#ddd',
      borderRadius: '3px',
      marginTop: '10px',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div style={{
        width: `${progressPercentage}%`,
        height: '100%',
        backgroundColor: isPlaying ? '#007bff' : (isPaused ? '#ffc107' : '#28a745'),
        borderRadius: '3px',
        transition: 'width 0.1s ease'
      }} />
      
      {/* Current word indicator */}
      {wordTimings.length > 0 && currentWordIndex < wordTimings.length && (
        <div style={{
          position: 'absolute',
          top: '-2px',
          left: `${(wordTimings[currentWordIndex].startChar / speechText.length) * 100}%`,
          width: '2px',
          height: '10px',
          backgroundColor: '#dc3545',
          borderRadius: '1px'
        }} />
      )}
    </div>
  )}

  {/* Status indicator */}
  {(isPlaying || isPaused) && (
    <div style={{
      marginTop: '5px',
      fontSize: '12px',
      color: '#666',
      textAlign: 'center'
    }}>
      {isPlaying ? '🔊 Playing' : isPaused ? '⏸️ Paused' : '⏹️ Stopped'} 
      {speechText && ` • ${Math.round(progressPercentage)}% complete`}
    </div>
  )}

  {/* Debug info - remove in production */}
  {process.env.NODE_ENV === 'development' && (
    <div style={{ fontSize: '10px', color: '#666', marginTop: '5px', fontFamily: 'monospace' }}>
      Playing: {debugInfo.isPlaying ? 'Yes' : 'No'} | 
      Paused: {debugInfo.isPaused ? 'Yes' : 'No'} | 
      Char: {debugInfo.currentCharIndex}/{debugInfo.textLength} | 
      Word: {debugInfo.currentWordIndex}/{debugInfo.totalWords} |
      Mobile: {debugInfo.isMobile ? 'Yes' : 'No'}
    </div>
  )}

</div>

  )
};

export default AudioPlayer;