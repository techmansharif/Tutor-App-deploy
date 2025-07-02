// import React, { useEffect, useState } from 'react';
// import './AudioPlayer.css';
// import { numberToWords, preprocessText, detectLanguage } from './PreprocessAudio';

// const AudioPlayer = ({ text }) => {
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [isPaused, setIsPaused] = useState(false);
//   const [speechInstance, setSpeechInstance] = useState(null);
//   const [voices, setVoices] = useState([]);
//   const [selectedVoice, setSelectedVoice] = useState(null);
//   const [speechRate, setSpeechRate] = useState(1);


//   // Handle text-to-speech
//   const speakText = () => {
//     if ('speechSynthesis' in window) {
//       // Stop any ongoing speech
//       window.speechSynthesis.cancel();

//       const processedText = preprocessText(text);
//       const utterance = new SpeechSynthesisUtterance(processedText);
//       const lang = detectLanguage(text);
//       utterance.lang = lang;

//       // Set selected voice
//       if (selectedVoice) {
//         utterance.voice = selectedVoice;
//       } else {
//         const availableVoices = window.speechSynthesis.getVoices();
//         const voice = availableVoices.find((v) => v.lang === lang) || 
//                      availableVoices.find((v) => v.lang.includes(lang.split('-')[0]));
//         if (voice) utterance.voice = voice;
//       }

//       // Adjust for natural speech
//       utterance.pitch = 1;
//       utterance.rate = speechRate;
//       utterance.volume = 1;

//       utterance.onend = () => {
//         setIsPlaying(false);
//         setIsPaused(false);
//         setSpeechInstance(null);
//       };

//       setSpeechInstance(utterance);
//       window.speechSynthesis.speak(utterance);
//       setIsPlaying(true);
//       setIsPaused(false);
//     } else {
//       alert('Text-to-speech is not supported in this browser.');
//     }
//   };

//   // Handle play
// // To this:
// const handlePlay = () => {
//   if (!isPlaying) {
//     speakText();
//   }
// };

//   // Handle pause
//   const handlePause = () => {
//     if (isPlaying && !isPaused) {
//       window.speechSynthesis.pause();
//       setIsPaused(true);
//     }
//   };

//   // Handle stop
//   const handleStop = () => {
//     if (isPlaying) {
//       window.speechSynthesis.cancel();
//       setIsPlaying(false);
//       setIsPaused(false);
//       setSpeechInstance(null);
//     }
//   };

//   // Handle speak again
//   const handleSpeakAgain = () => {
//     handleStop();
//     speakText();
//   };

//   // Load voices when component mounts
//   useEffect(() => {
//     const loadVoices = () => {
//       const availableVoices = window.speechSynthesis.getVoices();
//       setVoices(availableVoices);
//       // Set default voice based on language
//       const lang = detectLanguage(text);
//       const defaultVoice = availableVoices.find((v) => v.lang === lang) || 
//                          availableVoices.find((v) => v.lang.includes(lang.split('-')[0]));
//       if (defaultVoice) setSelectedVoice(defaultVoice);
//     };

//     loadVoices();
//     window.speechSynthesis.onvoiceschanged = loadVoices;

//     return () => {
//       window.speechSynthesis.cancel();
//     };
//   }, [text]);

//   return (
//    <div className="audio-player-container">
//     <div className="audio-controls">


// <button
//   onClick={handleStop}
//   disabled={!isPlaying}
//   className="audio-button stop-button"
// >
//   <svg
//     xmlns="http://www.w3.org/2000/svg"
//     viewBox="0 0 24 24"
//     fill="white"
//     width="30px"
//     height="30px"
//   >
//     <rect x="6" y="6" width="12" height="12"/>
//   </svg>
// </button>

// <button
//   onClick={handlePlay}
//   disabled={isPlaying}
//   className={`audio-button play-button ${isPlaying ? 'playing' : ''}`}
// >
//   <span className="speaker-icon">
//     <svg
//       xmlns="http://www.w3.org/2000/svg"
//       viewBox="0 0 24 24"
//       fill="white"
//       width="30px"
//       height="30px"
//     >
//       <path d="M8 5v14l11-7z"/>
//     </svg>
//   </span>
// </button>

// <button
//   onClick={handleSpeakAgain}
//   disabled={!isPlaying}
//   className="audio-button speak-again-button"
// >
// </button>


//   </div>

// </div>

//   )
// };

// export default AudioPlayer;

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
      window.speechSynthesis.cancel();
      const processedText = preprocessText(text);
      const lang = detectLanguage(text);
      const chunks = processedText.match(/.{1,200}/g) || [processedText]; // Split into 200-char chunks

      const speakChunk = (index = 0) => {
        if (index >= chunks.length) {
          setIsPlaying(false);
          setIsPaused(false);
          setSpeechInstance(null);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[index]);
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

        utterance.pitch = 1;
        utterance.rate = speechRate;
        utterance.volume = 1;

        utterance.onend = () => speakChunk(index + 1);

        setSpeechInstance(utterance);
        window.speechSynthesis.speak(utterance);
      };

      setIsPlaying(true);
      setIsPaused(false);
      speakChunk();
    } else {
      alert('Text-to-speech is not supported in this browser.');
    }
  };

  // Handle play
  const handlePlay = () => {
    if (!isPlaying) {
      speakText();
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
          onClick={handleStop}
          disabled={!isPlaying}
          className="audio-button stop-button"
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
          onClick={handlePlay}
          disabled={isPlaying}
          className={`audio-button play-button ${isPlaying ? 'playing' : ''}`}
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
          onClick={handleSpeakAgain}
          disabled={!isPlaying}
          className="audio-button speak-again-button"
        >
        </button>
      </div>
    </div>
  );
};

export default AudioPlayer;