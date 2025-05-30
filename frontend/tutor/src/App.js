import React, { useState, useEffect } from 'react';
import Quiz1 from './components/Quiz1/quiz1';
import Selection from './components/Selection/Selection';
import Explains from './components/Explains/Explains';
import PracticeQuiz from './components/Practise/Practise';
import Quiz from './components/Quiz/quiz';
import Login from './components/Login/Login';
import UserInfo from './components/Login/UserInfo'; // Added import
import Welcome from './components/Welcome/Welcome';
import Dashboard from './components/Dashboard/Dashboard';
import axios from 'axios';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quizStage, setQuizStage] = useState('welcome');
  const [selectedValues, setSelectedValues] = useState({selectedSubject: '',selectedTopic: '', selectedSubtopic: '' });
 // const API_BASE_URL = 'http://localhost:8000';
  const API_BASE_URL = 'https://fastapi-tutor-app-backend-208251878692.asia-south1.run.app';

  useEffect(() => {
    //alert("inside use effect")
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
    setQuizStage('explains');  // Add this line
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
      case 'welcome':
        return <Welcome user={user} API_BASE_URL={API_BASE_URL} onStartQuiz={() => setQuizStage('quiz1')} />;
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
        case 'dashboard':
  return (
    <Dashboard 
      user={user} 
      API_BASE_URL={API_BASE_URL} 
      onGoToSelection={() => setQuizStage('selection')}
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
          <button onClick={() => handleStageChange('selection')} className="nav-button">SUBJECT<div style={{ fontSize: '0.8em' }}>Select a subject</div></button>
          <button onClick={() => handleStageChange('explains')}  className="nav-button"> EXPLAIN  <div style={{ fontSize: '0.8em' }}>Tutors you the subject</div></button>
          <button onClick={() => handleStageChange('practice')} className="nav-button">PRACTISE  <div style={{ fontSize: '0.8em' }}>Helps you practise the subject</div> </button>
          <button onClick={() => handleStageChange('quiz')} className="nav-button"> Quiz  <div style={{ fontSize: '0.8em' }}>Check your progress with a quiz!</div></button>
          <button onClick={() => handleStageChange('dashboard')} className="nav-button">PROGRESS <div style={{ fontSize: '0.8em' }}>Your scoreboard</div></button>
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
       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <h1 className="text-3xl">BRIM AI TUTOR</h1>
        <p
          style={{ marginTop: '5px', color: 'rgb(15, 15, 15)' }}
          className="text-xs"
        >
          Limited Test Edition
        </p>
      </div>
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
              {renderNavigationButtons()}
            <div className="status-bar">
                    <p>Status: {user ? `Logged in as ${user.email}` : 'Not logged in'}</p>
            </div>
          
      </main>
      <footer className="bg-gray-200 p-2 text-center">
        
      </footer>
    </div>
  );
}

export default App;