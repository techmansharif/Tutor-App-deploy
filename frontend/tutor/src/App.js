import React, { useState, useEffect } from 'react';
import Quiz1 from './components/Quiz1/quiz1';
import Selection from './components/Selection/Selection';
import Explains from './components/Explains/Explains';
import PracticeQuiz from './components/Practise/Practise';
import Quiz from './components/Quiz/quiz';
import Login from './components/Login/Login';
import UserInfo from './components/Login/UserInfo'; // Added import
import axios from 'axios';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quizStage, setQuizStage] = useState('quiz1');
  const [selectedValues, setSelectedValues] = useState({selectedSubject: '',selectedTopic: '', selectedSubtopic: '' });
 // const API_BASE_URL = 'http://localhost:8000';
  const API_BASE_URL = 'https://fastapi-tutor-app-backend-208251878692.asia-south1.run.app';

  useEffect(() => {
    alert("inside use effect")
    fetch(`${API_BASE_URL}/api/user`, {
      credentials: 'include',
       mode: 'cors',
  headers: {
    'Content-Type': 'application/json',
  }
    })
      .then(response => response.json())
      .then(data => {
        setUser({
          email: data.user.email,
          user_id: data.user.id,
          picture: data.user.picture,
          name: data.user.name
        });
        if (data.user) {
          console.log('User Email:', data.user.email);
          console.log('User ID:', data.user.id);
          console.log('user name', data.user.name);
        }
        setLoading(false);
      })
      .catch(error => {
        console.log("not seeing user")
        console.error('Error fetching user:', error);
        setLoading(false);
      });
  }, []);

  

  const onQuiz1Complete = () => {
    setQuizStage('selection');
  };

  const onSelectionSubmit = (values) => {
    setSelectedValues(values);
    // Stay in selection stage, do not auto-advance to explains
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

  const areSelectionsComplete = () => {
    return (
      selectedValues.selectedSubject &&
      selectedValues.selectedTopic &&
      selectedValues.selectedSubtopic
    );
  };

  const handleStageChange = (stage) => {
    if (['explains', 'practice', 'quiz'].includes(stage) && !areSelectionsComplete()) {
      setQuizStage('selection');
    } else {
      setQuizStage(stage);
    }
  };

  const renderCurrentStage = () => {
    if (!user) {
      return (
    <Login API_BASE_URL={API_BASE_URL}/>
  );
    }

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

  const renderNavigationButtons = () => {
    if (!user) return null;

    return (
      <div className='navigation-button-container'>
       <div className="navigation-buttons">
        <button
          onClick={() => handleStageChange('quiz1')}
          className="nav-button"
        >
          Quiz 1
        </button>
        <button
          onClick={() => handleStageChange('selection')}
          className="nav-button"
        >
          Selection
        </button>
        <button
          onClick={() => handleStageChange('explains')}
         className="nav-button"
        >
          Explains
        </button>
        <button
          onClick={() => handleStageChange('practice')}
        className="nav-button"
        >
          Practice
        </button>
        <button
          onClick={() => handleStageChange('quiz')}
          className="nav-button"
        >
          Quiz
        </button>
      </div>
      </div>
    );
  };

  if (loading) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  return (
    <div className="App min-h-screen flex flex-col">
      <header className="App-header bg-gray-800 text-white p-4 text-center">
        <h1 className="text-3xl">AI Tutor Quiz Application</h1>
        {user && (
    <UserInfo
      user={user}
      setUser={setUser}
      setQuizStage={setQuizStage}
      setSelectedValues={setSelectedValues}
      API_BASE_URL={API_BASE_URL}
    />
  )}
      </header>
      <main className="flex-grow p-4">
        {renderCurrentStage()}
        <div className="status-bar">
    <p>Status: {user ? `Logged in as ${user.email}` : 'Not logged in'}</p>
  </div>
        {renderNavigationButtons()}
      </main>
      <footer className="bg-gray-200 p-2 text-center">
        
      </footer>
    </div>
  );
}

export default App;