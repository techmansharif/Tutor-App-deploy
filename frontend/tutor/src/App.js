// a small change

//this is for testing out updates

import React, { useState, useEffect,Suspense,lazy } from 'react';


import Login from './components/Login/Login';
import UserInfo from './components/Login/UserInfo'; // Added import

import axios from 'axios';
import './App.css';

// Lazy load the heavy components
const LoadingScreen = lazy(() => import('./components/LoadingScreen/LoadingScreen')) ;
const Quiz1 = lazy(() => import('./components/Quiz1/quiz1'));
const Selection = lazy(() => import('./components/Selection/Selection'));
const Explains = lazy(() => import('./components/Explains/Explains'));
const PracticeQuiz = lazy(() => import('./components/Practise/Practise'));
const Quiz = lazy(() => import('./components/Quiz/quiz'));
const Welcome = lazy(() => import('./components/Welcome/Welcome'));
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'));
// 1. Add this import at the top with other lazy imports
const Revise = lazy(() => import('./components/Revise/Revise'));

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quizStage, setQuizStage] = useState('welcome');
  const [selectedValues, setSelectedValues] = useState({selectedSubject: '',selectedTopic: '', selectedSubtopic: '' });
  // BEFORE - Add this state
const [token, setToken] = useState(null);
  // const API_BASE_URL = 'http://localhost:8000';
  
  const API_BASE_URL = 'https://fastapi-tutor-app-backend-208251878692.asia-south1.run.app';

// AFTER - useEffect for fetching user
useEffect(() => {
  // Check if token is in URL (from OAuth callback)
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('token');
  
  if (tokenFromUrl) {
    localStorage.setItem('access_token', tokenFromUrl);
    setToken(tokenFromUrl);
    window.history.replaceState({}, document.title, window.location.pathname);
  } else {
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }
}, []);

// Add new useEffect for token changes
useEffect(() => {
  if (token) {
    fetch(`${API_BASE_URL}/api/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
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
      console.log("Error with token")
      localStorage.removeItem('access_token');
      setToken(null);
      setUser(null);
      setLoading(false);
    });
  } else {
    setLoading(false);
  }
}, [token]);
// Add this after your existing useEffect that fetches user
useEffect(() => {
  const savedStage = localStorage.getItem('quizStage');
  const savedValues = localStorage.getItem('selectedValues');
  console.log('Restored stage:', savedStage);
  console.log('Restored values:', savedValues);
  
  if (savedStage && user) setQuizStage(savedStage);
  if (savedValues) {
    try {
      const parsed = JSON.parse(savedValues);
      console.log('Parsed values:', parsed);
      setSelectedValues(parsed);
    } catch (error) {
      console.error('Error parsing saved values:', error);
    }
  }
}, [user]);
useEffect(() => {
  if (user) localStorage.setItem('quizStage', quizStage);
}, [quizStage, user]);

useEffect(() => {
  // Only save if values are not empty
  if (selectedValues.selectedSubject && selectedValues.selectedTopic && selectedValues.selectedSubtopic) {
    localStorage.setItem('selectedValues', JSON.stringify(selectedValues));
  }
}, [selectedValues]);



  const onQuiz1Complete = () => {
    setQuizStage('selection');
  };

  const onSelectionSubmit = (values) => {
    setSelectedValues(values);
    setQuizStage('explains');  // Add this line
  };
const onSelectionChange = (values) => {
  setSelectedValues(values);
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
     return (
    <Suspense fallback={<div className="text-center mt-10">Loading...</div>}>
      {(() => {

    switch (quizStage) {
      case 'welcome':
        return <Welcome user={user} API_BASE_URL={API_BASE_URL} onStartQuiz={() => setQuizStage('quiz1')} />;
      case 'quiz1':
        return <Quiz1 user={user} API_BASE_URL={API_BASE_URL} onCompleteQuiz={onQuiz1Complete} />;
      case 'selection':
        return (
          <Selection user={user} API_BASE_URL={API_BASE_URL} onSelectionSubmit={onSelectionSubmit} onSelectionChange={onSelectionChange}  initialValues={selectedValues} />
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
        // 2. Add 'revise' case to your switch statement in renderCurrentStage():
      case 'revise':
        return <Revise user={user} API_BASE_URL={API_BASE_URL} />;

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
    }   })()}
    </Suspense>
  );
  };

const renderNavigationButtons = () => {
  if (!user) return null;

  const selectionsComplete = areSelectionsComplete();
 const shouldDisableButtons = (quizStage === 'selection' && !selectionsComplete) || quizStage === 'welcome' || quizStage === 'quiz1';

  return (
    <div className='navigation-button-container'>
      <div className="navigation-buttons">
        {/* <button 
              onClick={() => handleStageChange('quiz1')} 
              className={`nav-button ${quizStage === 'quiz1' ? 'nav-button-active' : ''}`}
            >
              ASSESSMENT
              <div style={{ fontSize: '0.8em' }}>Initial skill check</div>
        </button> */}
        <button 
          onClick={() => handleStageChange('selection')} 
          className={`nav-button ${quizStage === 'selection' ? 'nav-button-active' : ''} ${shouldDisableButtons ? 'nav-button-disabled' : ''}`}
          disabled={shouldDisableButtons}
        >
          SUBJECT
          <div style={{ fontSize: '0.8em' }}>একটি বিষয় নির্বাচন করুন/div>
        </button>
        
        <button 
          onClick={() => handleStageChange('explains')}  
          className={`nav-button ${quizStage === 'explains' ? 'nav-button-active' : ''} ${shouldDisableButtons ? 'nav-button-disabled' : ''}`}
          disabled={shouldDisableButtons}
        > 
          EXPLAIN  
          <div style={{ fontSize: '0.8em' }}>Tবিষয়টি শিখুন</div>
        </button>
        
        <button 
          onClick={() => handleStageChange('practice')} 
          className={`nav-button ${quizStage === 'practice' ? 'nav-button-active' : ''} ${shouldDisableButtons ? 'nav-button-disabled' : ''}`}
          disabled={shouldDisableButtons}
        >
          PRACTICE  
          <div style={{ fontSize: '0.8em' }}> বিষয়টির অনুশীলন করুন</div> 
        </button>
        
        <button 
          onClick={() => handleStageChange('quiz')} 
          className={`nav-button ${quizStage === 'quiz' ? 'nav-button-active' : ''} ${shouldDisableButtons ? 'nav-button-disabled' : ''}`}
          disabled={shouldDisableButtons}
        > 
          QUIZ  
          <div style={{ fontSize: '0.8em' }}> আপনার অগ্রগতি যাচাই করুন </div>
        </button>
      
      <button 
        onClick={() => handleStageChange('revise')} 
        className={`nav-button ${quizStage === 'revise' ? 'nav-button-active' : ''} ${(quizStage === 'welcome' || quizStage === 'quiz1') ? 'nav-button-disabled' : ''}`}
        disabled={quizStage === 'welcome' || quizStage === 'quiz1'}
      >
        REVISE
        <div style={{ fontSize: '0.8em' }}>ভুল প্রশ্নগুলো পর্যালোচনা করুন</div>
      </button>
        <button 
    onClick={() => handleStageChange('dashboard')} 
    className={`nav-button ${quizStage === 'dashboard' ? 'nav-button-active' : ''} ${(quizStage === 'welcome' || quizStage === 'quiz1') ? 'nav-button-disabled' : ''}`}
    disabled={quizStage === 'welcome' || quizStage === 'quiz1'}
  >
    PROGRESS 
    <div style={{ fontSize: '0.8em' }}>আপনার স্কোরবোর্ড</div>
</button>

      </div>
    </div>
  );
};

  if (loading) {
    // return <div className="text-center mt-10">Loading...</div>;
    <LoadingScreen />
  }

  return (
    <div className="App min-h-screen flex flex-col">
      <header className="App-header bg-gray-800 text-white p-4 text-center">
       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop:'10px' }}>
        <h1 className="text-3xl">BRIM AI TUTOR</h1>
        <p
          style={{ marginTop: '5px', color: 'rgb(15, 15, 15)' }}
          className="text-xs"
        >
          SSC Exam, <span style={{ fontStyle: 'italic' }}>Limited Test Edition</span>
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
      <main className={`flex-grow p-4 main-content-${quizStage}`}>
        
            {renderCurrentStage()}
              {renderNavigationButtons()}
            {/* <div className="status-bar">
                    <p>Status: {user ? `Logged in as ${user.email}` : 'Not logged in'}</p>
            </div> */}
          
      </main>
      <footer className="bg-gray-200 p-2 text-center">
        
      </footer>
    </div>
  );
}

export default App;