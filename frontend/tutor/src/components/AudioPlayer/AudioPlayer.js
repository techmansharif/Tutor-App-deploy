import React, { useEffect, useState } from 'react';
import './AudioPlayer.css';
import { numberToWords, preprocessText, detectLanguage } from './PreprocessAudio';

const AudioPlayer = ({ text, API_BASE_URL,user }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechInstance, setSpeechInstance] = useState(null);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [speechRate, setSpeechRate] = useState(1);


 // Handle text-to-speech using streaming API
  const speakText = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const user_id = user.user_id;;
      
      const response = await fetch(`${API_BASE_URL}/audio/stream/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user_id,
          'Authorization': `Bearer ${token}`
        },
       body: JSON.stringify({
  text: preprocessText(text),
  language_code: "auto",
  voice_gender: "FEMALE",
  audio_encoding: "MP3"
})
      });

      if (!response.ok) throw new Error('Audio generation failed');

      const audioBlob = await response.blob();
      console.log('Audio blob:', audioBlob);
console.log('Blob size:', audioBlob.size);
console.log('Blob type:', audioBlob.type);
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('Audio URL:', audioUrl);
      const audio = new Audio(audioUrl);
      

      audio.onerror = (e) => {
  console.error('Audio error:', e);
  console.error('Audio error details:', audio.error);
};
audio.onloadstart = () => console.log('Audio load started');
audio.oncanplay = () => console.log('Audio can play');
audio.onloadeddata = () => console.log('Audio data loaded');
      audio.onended = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setSpeechInstance(null);
        URL.revokeObjectURL(audioUrl);
      };

      setSpeechInstance(audio);
      await audio.play();
      setIsPlaying(true);
      setIsPaused(false);
    } catch (error) {
      console.error('Audio playback failed:', error);
      alert('Audio playback failed. Please try again.');
    }
  };

  // Handle play
// To this:
const handlePlay = () => {
  if (!isPlaying) {
    speakText();
  }
};

const handlePause = () => {
    if (isPlaying && !isPaused && speechInstance) {
      speechInstance.pause();
      setIsPaused(true);
    }
  };
  // Handle stop
const handleStop = () => {
    if (isPlaying && speechInstance) {
      speechInstance.pause();
      speechInstance.currentTime = 0;
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (speechInstance) {
        speechInstance.pause();
      }
    };
  }, [speechInstance]);

  return (
   <div className="audio-player-container">
    <div className="audio-controls">


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
  onClick={handleSpeakAgain}
  disabled={!isPlaying}
  className="audio-button speak-again-button"
>
</button>


  </div>

</div>

  )
};

export default AudioPlayer;