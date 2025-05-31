import { preprocessText, detectLanguage } from './PreprocessAudio';

// Global variables to track speech state across components
let globalSpeechInstance = null;
let globalProgressInterval = null;

export const speakText = (
  text,
  startFromIndex = 0,
  speechRate = 1,
  selectedVoice = null,
  callbacks = {}
) => {
  const {
    onStart = () => {},
    onEnd = () => {},
    onError = () => {},
    onProgress = () => {},
    setIsPlaying = () => {},
    setIsPaused = () => {},
    setSpeechInstance = () => {},
    setCurrentWordIndex = () => {},
    setWords = () => {}
  } = callbacks;

  if ('speechSynthesis' in window) {
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    if (globalProgressInterval) {
      clearInterval(globalProgressInterval);
      globalProgressInterval = null;
    }

    const processedText = preprocessText(text);
    const textWords = processedText.split(' ');
    setWords(textWords);
    
    // Create text starting from the specified word index
    const resumeText = textWords.slice(startFromIndex).join(' ');
    
    if (resumeText.trim() === '') {
      // If we've reached the end, reset to beginning
      setCurrentWordIndex(0);
      setIsPlaying(false);
      setIsPaused(false);
      onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(resumeText);
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

    // Track progress (approximate)
    let wordCount = 0;
    const wordsPerSecond = speechRate * 3; // Approximate words per second
    globalProgressInterval = setInterval(() => {
      wordCount += wordsPerSecond;
      const currentIndex = startFromIndex + Math.floor(wordCount);
      setCurrentWordIndex(currentIndex);
      onProgress(currentIndex);
    }, 1000);

    utterance.onstart = () => {
      onStart();
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      if (globalProgressInterval) {
        clearInterval(globalProgressInterval);
        globalProgressInterval = null;
      }
      setIsPlaying(false);
      setIsPaused(false);
      setSpeechInstance(null);
      setCurrentWordIndex(0); // Reset when complete
      globalSpeechInstance = null;
      onEnd();
    };

    utterance.onerror = (error) => {
      if (globalProgressInterval) {
        clearInterval(globalProgressInterval);
        globalProgressInterval = null;
      }
      setIsPlaying(false);
      setIsPaused(false);
      setSpeechInstance(null);
      globalSpeechInstance = null;
      onError(error);
    };

    globalSpeechInstance = utterance;
    setSpeechInstance(utterance);
    window.speechSynthesis.speak(utterance);
  } else {
    onError(new Error('Text-to-speech is not supported in this browser.'));
  }
};

export const pauseSpeech = (callbacks = {}) => {
  const { setIsPaused = () => {} } = callbacks;
  
  if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
    window.speechSynthesis.pause();
    setIsPaused(true);
  }
};

export const resumeSpeech = (callbacks = {}) => {
  const { setIsPaused = () => {} } = callbacks;
  
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    setIsPaused(false);
  }
};

export const stopSpeech = (callbacks = {}) => {
  const { setIsPlaying = () => {}, setIsPaused = () => {}, setSpeechInstance = () => {} } = callbacks;
  
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    if (globalProgressInterval) {
      clearInterval(globalProgressInterval);
      globalProgressInterval = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setSpeechInstance(null);
    globalSpeechInstance = null;
  }
};

export const restartSpeech = (
  text,
  speechRate = 1,
  selectedVoice = null,
  callbacks = {}
) => {
  const { setCurrentWordIndex = () => {} } = callbacks;
  
  stopSpeech(callbacks);
  setCurrentWordIndex(0);
  speakText(text, 0, speechRate, selectedVoice, callbacks);
};