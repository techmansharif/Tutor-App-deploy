import React, { useEffect, useState } from 'react';
import './AudioPlayer.css';
import { numberToWords, preprocessText, detectLanguage } from './PreprocessAudio';

const AudioPlayer = ({ text }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechInstance, setSpeechInstance] = useState(null);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [speechRate, setSpeechRate] = useState(1);


  // Handle text-to-speech
  const speakText = () => {
    if ('speechSynthesis' in window) {
      // Stop any ongoing speech
      window.speechSynthesis.cancel();

      const processedText = preprocessText(text);
      const utterance = new SpeechSynthesisUtterance(processedText);
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

      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setSpeechInstance(null);
      };

      setSpeechInstance(utterance);
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
      setIsPaused(false);
    } else {
      alert('Text-to-speech is not supported in this browser.');
    }
  };

  // Handle play
  const handlePlay = () => {
    if (!isPlaying) {
      speakText();
    } else if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  // Handle pause
  const handlePause = () => {
    if (isPlaying && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  // Handle stop
  const handleStop = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
      setSpeechInstance(null);
    }
  };

  // Handle speak again
  const handleSpeakAgain = () => {
    handleStop();
    speakText();
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

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [text]);

  return (
   <div className="audio-player-container">
    <div className="audio-controls">
    <button
      onClick={handlePlay}
      disabled={isPlaying && !isPaused}
      className={`audio-button play-button ${isPlaying && !isPaused ? 'playing' : ''}`}
    >
      {isPlaying && !isPaused ?(   <span className="pause-icon">
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
      onClick={handlePause}
      disabled={!isPlaying || isPaused}
      className="audio-button pause-button"
    >
      
    </button>
    <button
  onClick={handleSpeakAgain}
  disabled={!isPlaying|| isPaused}
  className="audio-button speak-again-button"
>
</button>
<div className="waveform-container">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 80 40"
    fill="none"
    stroke="white"
    strokeWidth="2"
    width="80px"
    height="40px"
  >
    <path d="M2 20 L6 12 L10 25 L14 8 L18 30 L22 15 L26 35 L30 5 L34 28 L38 18 L42 32 L46 10 L50 22 L54 6 L58 29 L62 16 L66 33 L70 11 L74 24 L78 20" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
</div>

<div className="explain-box">
  I can <br /> verbally <br/>explain!
</div>
  </div>

  <div className="audio-settings">
    <select
      value={selectedVoice ? selectedVoice.name : ''}
      onChange={(e) => {
        const voice = voices.find((v) => v.name === e.target.value);
        setSelectedVoice(voice);
      }}
      className="voice-select"
    >
      <option value="">Select Voice</option>
      {voices.map((voice) => (
        <option key={voice.name} value={voice.name}>
          {voice.name} ({voice.lang})
        </option>
      ))}
    </select>
    <select
      value={speechRate}
      onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
      className="speed-select"
    >
      <option value={0.5}>0.5x</option>
      <option value={0.75}>0.75x</option>
      <option value={1}>1x</option>
      <option value={1.25}>1.25x</option>
      <option value={1.5}>1.5x</option>
      <option value={1.75}>1.75x</option>
      <option value={2}>2x</option>
    </select>
  </div>
</div>

  )
};

export default AudioPlayer;