import React, { useEffect, useState } from 'react';
import './AudioPlayer.css';

const AudioPlayer = ({ text }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechInstance, setSpeechInstance] = useState(null);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [speechRate, setSpeechRate] = useState(1);

  // Number-to-words converter for numbers -100 to 100
  const numberToWords = (num) => {
    const units = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    if (num === 0) return 'zero';
    
    const isNegative = num < 0;
    const absNum = Math.abs(num);

    if (absNum < 10) {
      return isNegative ? `minus ${units[absNum]}` : units[absNum];
    }
    if (absNum < 20) {
      return isNegative ? `minus ${teens[absNum - 10]}` : teens[absNum - 10];
    }
    if (absNum < 100) {
      const ten = Math.floor(absNum / 10);
      const unit = absNum % 10;
      const base = unit === 0 ? tens[ten] : `${tens[ten]} ${units[unit]}`;
      return isNegative ? `minus ${base}` : base;
    }
    return num.toString(); // Fallback for numbers > 100 or < -100
  };

  // Preprocess text to convert numbers to words
  const preprocessText = (text) => {
    return text.replace(/\b(-?\d+)\b/g, (match, num) => {
      const n = parseInt(num);
      if (n >= -100 && n <= 100) {
        return numberToWords(n);
      }
      return num; // Return original if out of range
    });
  };

  // Detect language based on text content
  const detectLanguage = (text) => {
    const banglaRegex = /[\u0980-\u09FF]/;
    return banglaRegex.test(text) ? 'bn-BD' : 'en-US';
  };

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
          className="audio-button play-button"
        >
          {isPaused ? 'Resume' : 'Play'}
        </button>
        <button
          onClick={handlePause}
          disabled={!isPlaying || isPaused}
          className="audio-button pause-button"
        >
          Pause
        </button>
        <button
          onClick={handleStop}
          disabled={!isPlaying}
          className="audio-button stop-button"
        >
          Stop
        </button>
        <button
          onClick={handleSpeakAgain}
          className="audio-button speak-again-button"
        >
          Speak Again
        </button>
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
  );
};

export default AudioPlayer;