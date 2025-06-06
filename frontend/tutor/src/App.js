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
  //const API_BASE_URL = 'http://localhost:8000';
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

  const selectionsComplete = areSelectionsComplete();
  const shouldDisableButtons = quizStage === 'selection' && !selectionsComplete;

  return (
    <div className='navigation-button-container'>
      <div className="navigation-buttons">
        <button 
          onClick={() => handleStageChange('selection')} 
          className={`nav-button ${quizStage === 'selection' ? 'nav-button-active' : ''}`}
        >
          SUBJECT
          <div style={{ fontSize: '0.8em' }}>Select a subject</div>
        </button>
        
        <button 
          onClick={() => handleStageChange('explains')}  
          className={`nav-button ${quizStage === 'explains' ? 'nav-button-active' : ''} ${shouldDisableButtons ? 'nav-button-disabled' : ''}`}
          disabled={shouldDisableButtons}
        > 
          EXPLAIN  
          <div style={{ fontSize: '0.8em' }}>Tutors you the subject</div>
        </button>
        
        <button 
          onClick={() => handleStageChange('practice')} 
          className={`nav-button ${quizStage === 'practice' ? 'nav-button-active' : ''} ${shouldDisableButtons ? 'nav-button-disabled' : ''}`}
          disabled={shouldDisableButtons}
        >
          PRACTICE  
          <div style={{ fontSize: '0.8em' }}>Practise the subject</div> 
        </button>
        
        <button 
          onClick={() => handleStageChange('quiz')} 
          className={`nav-button ${quizStage === 'quiz' ? 'nav-button-active' : ''} ${shouldDisableButtons ? 'nav-button-disabled' : ''}`}
          disabled={shouldDisableButtons}
        > 
          QUIZ  
          <div style={{ fontSize: '0.8em' }}>Check your progress </div>
        </button>
        
        <button 
          onClick={() => handleStageChange('dashboard')} 
          className={`nav-button ${quizStage === 'dashboard' ? 'nav-button-active' : ''}`}
        >
          PROGRESS 
          <div style={{ fontSize: '0.8em' }}>Your scoreboard</div>
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
       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
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