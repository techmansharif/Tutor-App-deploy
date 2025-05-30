import React from 'react';
import Stopwatch from '../Stopwatch/Stopwatch';
import './Welcome.css';

const Welcome = ({ user, API_BASE_URL, onStartQuiz }) => {
  const handleStartQuiz = () => {
    onStartQuiz(); // Move to quiz1
  };

  return (
    <div className="welcome-container">
      <h1 className="welcome-title">BRIM AI Tutor-এ স্বাগতম!</h1>
      <p className="welcome-message">
       শুরুতে, আমরা আপনাকে কিছু সহজ মূল্যায়ন প্রশ্ন করব। এর মাধ্যমে আমরা বুঝতে পারব, আপনার শেখার যাত্রা কোথা থেকে শুরু করলে সবচেয়ে ভালো হবে।  <br/>
       প্রশ্নগুলো খুবই সহজ আর মজাদার!
      </p>
      <button
        onClick={handleStartQuiz}
        className="start-button"
      >
        Press here to start!
      </button>
      <div className="stopwatch-wrapper">
        <Stopwatch
          reset={false}
          pause={false}
          onTimeExpired={onStartQuiz}
          initialTime={30}
        />
      </div>
    </div>
  );
};

export default Welcome;