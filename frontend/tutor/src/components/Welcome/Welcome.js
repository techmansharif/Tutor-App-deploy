//import React from 'react';
import Stopwatch from '../Stopwatch/Stopwatch';
import './Welcome.css';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Welcome = ({ user, API_BASE_URL, onStartQuiz }) => {
  const navigate = useNavigate();
  const [token, setToken] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) setToken(storedToken);
  }, []);

  const handleStartQuiz = async () => {
    try {
      await axios.post(`${API_BASE_URL}/quiz1/`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
          user_id: user.id,  
        },
        withCredentials: true,
      });

      // Navigate to quiz1 on success
      navigate('/quiz1');
    } catch (error) {
      console.error('Failed to start quiz1:', error);
      alert('Error starting quiz. Please try again.');
    }
  };
  return (
    <div className="welcome-container">
      <h1 className="welcome-title">BRIM AI Tutor-এ স্বাগতম!</h1>
      <p className="welcome-message">
       শুরুতে, আমরা আপনাকে কিছু সহজ মূল্যায়ন প্রশ্ন করব। এর মাধ্যমে আমরা বুঝতে পারব, আপনার শেখার যাত্রা কোথা থেকে শুরু করলে সবচেয়ে ভালো হবে।  <br/>
       প্রশ্নগুলো খুবই সহজ আর মজাদার!
      </p>
      <button
        onClick={onStartQuiz}
        className="start-button"
      >
        Press here to start!
        <div style={{ fontSize: '0.8em' }}>Assess your initial skill</div>
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