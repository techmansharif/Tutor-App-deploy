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
  
  // For tracking position in speech
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [speechText, setSpeechText] = useState('');
  const speechStartTime = useRef(null);
  const pausedTime = useRef(0);

  // Detect if we're on a mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Calculate approximate character position based on time and speech rate
  const calculateCharPosition = (elapsedTime, text, rate) => {
    // Average speaking rate is about 4-5 characters per second at normal speed
    const baseCharsPerSecond = 4.5;
    const adjustedCharsPerSecond = baseCharsPerSecond * rate;
    const estimatedPosition = Math.floor(elapsedTime * adjustedCharsPerSecond);
    return Math.min(estimatedPosition, text.length);
  };

  // Get text from current position
  const getTextFromPosition = (text, startIndex) => {
    return text.substring(startIndex);
  };

  // Handle text-to-speech
  const speakText = (startFromIndex = 0) => {
    if ('speechSynthesis' in window) {
      // Stop any ongoing speech
      window.speechSynthesis.cancel();

      const processedText = preprocessText(text);
      setSpeechText(processedText);
      
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
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setSpeechInstance(null);
        setCurrentCharIndex(0);
        speechStartTime.current = null;
        pausedTime.current = 0;
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsPlaying(false);
        setIsPaused(false);
        setSpeechInstance(null);
        setCurrentCharIndex(0);
        speechStartTime.current = null;
        pausedTime.current = 0;
      };

      // Track progress during speech (works better on some browsers)
      utterance.onboundary = (event) => {
        if (event.name === 'word' || event.name === 'sentence') {
          setCurrentCharIndex(startFromIndex + event.charIndex);
        }
      };

      setSpeechInstance(utterance);
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Text-to-speech is not supported in this browser.');
    }
  };

  // Handle play/pause - unified behavior for all devices
  const handlePlay = () => {
    if (!isPlaying) {
      // Start new speech or resume from position
      speakText(currentCharIndex);
    } else {
      // Try pause/resume first (works on most browsers)
      if (isPaused) {
        try {
          window.speechSynthesis.resume();
          setIsPaused(false);
          speechStartTime.current = Date.now() - pausedTime.current;
        } catch (error) {
          console.log('Resume failed, restarting from position');
          // Fallback: restart from current position if resume fails
          handleStop();
          setTimeout(() => speakText(currentCharIndex), 100);
        }
      } else {
        try {
          window.speechSynthesis.pause();
          setIsPaused(true);
          if (speechStartTime.current) {
            pausedTime.current = Date.now() - speechStartTime.current;
          }
        } catch (error) {
          console.log('Pause failed, stopping speech');
          // Fallback: stop if pause fails
          if (speechStartTime.current) {
            const elapsedTime = (Date.now() - speechStartTime.current) / 1000;
            const estimatedPosition = calculateCharPosition(elapsedTime, speechText, speechRate);
            setCurrentCharIndex(prev => Math.min(prev + estimatedPosition, speechText.length));
          }
          handleStop();
          setIsPaused(true);
        }
      }
    }
  };

  // Handle stop
  const handleStop = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
      setSpeechInstance(null);
      setCurrentCharIndex(0);
      speechStartTime.current = null;
      pausedTime.current = 0;
    }
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

    // Reset position when text changes
    setCurrentCharIndex(0);
    speechStartTime.current = null;
    pausedTime.current = 0;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [text]);

  // Handle page visibility changes (important for mobile)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying && !isPaused) {
        // Page is hidden, try to pause speech
        try {
          window.speechSynthesis.pause();
          setIsPaused(true);
          if (speechStartTime.current) {
            pausedTime.current = Date.now() - speechStartTime.current;
          }
        } catch (error) {
          // If pause fails, calculate position and stop
          if (speechStartTime.current) {
            const elapsedTime = (Date.now() - speechStartTime.current) / 1000;
            const estimatedPosition = calculateCharPosition(elapsedTime, speechText, speechRate);
            setCurrentCharIndex(prev => Math.min(prev + estimatedPosition, speechText.length));
          }
          handleStop();
          setIsPaused(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying, isPaused, speechText, speechRate]);

  // Calculate progress percentage for visual feedback
  const progressPercentage = speechText ? (currentCharIndex / speechText.length) * 100 : 0;

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
  disabled={!isPlaying}
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
  disabled={!isPlaying}
  className="audio-button speak-again-button"
  title="Restart from beginning"
>
</button>

  </div>
  
  {/* Progress indicator */}
  {speechText && (isPlaying || isPaused || currentCharIndex > 0) && (
    <div style={{
      width: '100%',
      height: '4px',
      backgroundColor: '#ddd',
      borderRadius: '2px',
      marginTop: '10px',
      overflow: 'hidden'
    }}>
      <div style={{
        width: `${progressPercentage}%`,
        height: '100%',
        backgroundColor: isPlaying ? '#007bff' : '#28a745',
        borderRadius: '2px',
        transition: 'width 0.3s ease'
      }} />
    </div>
  )}

</div>

  )
};

export default AudioPlayer;