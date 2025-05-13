import React, { useState, useEffect } from 'react';
import Quiz1 from './components/Quiz1/quiz1';
import Selection from './components/Selection/Selection';
import Explains from './components/Explains/Explains';
import PracticeQuiz from './components/Practise/Practise';
import Quiz from './components/Quiz/quiz';
import axios from 'axios';
import './App.css';

function App() {
  // Hardcoded user data
  const user = {
    email: 'dibbodey888@gmail.com',
    name: 'Dibbo Dey',
    user_id: 1
  };

  // quizStage controls the application flow
  const [quizStage, setQuizStage] = useState('quiz1'); // Stages: quiz1, selection, explains, practice, quiz
  const [selectedValues, setSelectedValues] = useState({
    selectedSubject: '',
    selectedTopic: '',
    selectedSubtopic: ''
  });
  const API_BASE_URL = 'http://localhost:8000';

  const onQuiz1Complete = () => {
    setQuizStage('selection');
  };

  const onSelectionSubmit = (values) => {
    setSelectedValues(values);
    setQuizStage('explains');
  };

  const onProceedToPractice = () => {
    setQuizStage('practice');
  };

  const onCompletePractice = () => {
    setQuizStage('quiz');
  };

  const onCompleteQuiz = () => {
    setSelectedValues({ selectedSubject: '', selectedTopic: '', selectedSubtopic: '' });
    setQuizStage('selection');
  };

  // Render the current stage of the application
  const renderCurrentStage = () => {
    switch (quizStage) {
      case 'quiz1':
        return <Quiz1 user={user} API_BASE_URL={API_BASE_URL} onCompleteQuiz={onQuiz1Complete} />;
      case 'selection':
        return (
          <Selection user={user} API_BASE_URL={API_BASE_URL} onSelectionSubmit={onSelectionSubmit} />
        );
      case 'explains':
        return (
          <Explains
            selectedSubject={selectedValues.selectedSubject}
            selectedTopic={selectedValues.selectedTopic}
            selectedSubtopic={selectedValues.selectedSubtopic}
            user={user}
            API_BASE_URL={API_BASE_URL}
            onProceedToPractice={onProceedToPractice}
          />
        );
      case 'practice':
        return (
          <PracticeQuiz
            user={user}
            API_BASE_URL={API_BASE_URL}
            subject={selectedValues.selectedSubject}
            topic={selectedValues.selectedTopic}
            subtopic={selectedValues.selectedSubtopic}
            onCompletePractice={onCompletePractice}
          />
        );
      case 'quiz':
        return (
          <Quiz
            user={user}
            API_BASE_URL={API_BASE_URL}
            subject={selectedValues.selectedSubject}
            topic={selectedValues.selectedTopic}
            subtopic={selectedValues.selectedSubtopic}
            onCompleteQuiz={onCompleteQuiz}
          />
        );
      default:
        return <Quiz1 user={user} API_BASE_URL={API_BASE_URL} onCompleteQuiz={onQuiz1Complete} />;
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>AI Tutor Quiz Application</h1>
        <div className="user-info">
          <span>Welcome, {user.name}</span>
        </div>
      </header>
      <main>{renderCurrentStage()}</main>
      <footer>
        <p>Status: Logged in as {user.email}</p>
      </footer>
    </div>
  );
}

export default App;