import React, { useState, useRef, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import './Assessment.css';

const Assessment = () => {
  const [sidebarActive, setSidebarActive] = useState(false);
  const sidebarRef = useRef(null);
  const menuButtonRef = useRef(null);

  const toggleSidebar = (e) => {
    e.stopPropagation();
    console.log('Toggling sidebar, new state:', !sidebarActive); // Debug log
    setSidebarActive((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        sidebarActive &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(e.target)
      ) {
        console.log('Click outside, closing sidebar'); // Debug log
        setSidebarActive(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [sidebarActive]);

  const checkAnswer = (isCorrect) => {
    const feedback = document.getElementById('feedback');
    const feedbackImg = document.getElementById('feedbackImg');
    feedbackImg.src = isCorrect
      ? '/img/FacialExpression/dred/happy.png'
      : '/img/FacialExpression/hashi/question.png';
    feedback.style.display = 'block';
    setTimeout(() => {
      feedback.style.display = 'none';
    }, 2000);
  };

  return (
    <div className="assessment-container">
      <Navbar onMenuClick={toggleSidebar} menuButtonRef={menuButtonRef} />
      <Sidebar active={sidebarActive} sidebarRef={sidebarRef} />

      <div className="assessment-content">
        <h1>Assessment</h1>
        <p>Subject: X | Subtopic: Y</p>
        <p>Question 7 | Difficulty Level: 4</p>
        <p>Score: 6/7</p>
        <div className="progress-bar">
          <div className="progress" style={{ width: '85%' }}></div>
        </div>
        <div className="question-box">
          Q. Answer the question by choosing the correct answer
        </div>
        <div className="options">
          <div className="option" onClick={() => checkAnswer(true)}>A</div>
          <div className="option" onClick={() => checkAnswer(false)}>B</div>
          <div className="option" onClick={() => checkAnswer(false)}>C</div>
          <div className="option" onClick={() => checkAnswer(false)}>D</div>
        </div>
      </div>

      <div className="feedback" id="feedback">
        <img id="feedbackImg" src="" alt="Feedback" />
      </div>
    </div>
  );
};

export default Assessment;