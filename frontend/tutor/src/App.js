

import React, { useState, useEffect } from 'react';

import Quiz0 from './components/Quiz0/Quiz0';
import Quiz0Results from './components/Quiz0Results/Quiz0Results';
import Selection from './components/Selection/Selection';
import Explains from './components/Explains/Explains';
import PracticeQuiz from './components/Practise/Practise'; // Add this line
import Quiz from './components/Quiz/quiz'; // Add this line
 
import axios from 'axios';
import './App.css';

function App() {
  // Hardcoded user data
  const user = {
    email: 'dibbodey888@gmail.com',
    name: 'Dibbo Dey',
    user_id: 1
  };


  // Updated quizStage to include explains state
  const [quizStage, setQuizStage] = useState('quiz0'); // Stages: quiz0, quiz0Results, selection, explains, quizQuestions, quizResults
  const [selectedValues, setSelectedValues] = useState({
  selectedSubject: '',
  selectedTopic: '',
  selectedSubtopic: ''
});
  const [quiz0Results, setQuiz0Results] = useState(null);
  const API_BASE_URL = 'http://localhost:8000';








const onQuiz0Submit = (results) => {
  setQuiz0Results(results);
  setQuizStage('quiz0Results');
};
  



const handleReset = () => {
  setSelectedValues({selectedSubject: '',selectedTopic: '',selectedSubtopic: ''});
  setQuizStage('selection');
};

const onProceedToSelection = () => {
  setQuizStage('selection');
};


const onSelectionSubmit = (values) => {
  setSelectedValues(values);
  setQuizStage('explains');
};

const onProceedToPractice = () => {
  setQuizStage('practice');
};
// Change to:
const onCompletePractice = () => {
  setQuizStage('quiz');
};
 
  // Render the current stage of the application
  const renderCurrentStage = () => {
    switch (quizStage) {
      case 'quiz0':
       return (<Quiz0 API_BASE_URL={API_BASE_URL}  onQuiz0Submit={onQuiz0Submit}/>);
      case 'quiz0Results':
      return (<Quiz0Results quiz0Results={quiz0Results} onProceedToSelection={onProceedToSelection}/>);
      case 'selection':
        return (
    <Selection user={user} API_BASE_URL={API_BASE_URL} onSelectionSubmit={onSelectionSubmit}/>);

      case 'explains': 
 return (
    <Explains selectedSubject={selectedValues.selectedSubject} selectedTopic={selectedValues.selectedTopic}
      selectedSubtopic={selectedValues.selectedSubtopic} user={user}
      API_BASE_URL={API_BASE_URL}  onProceedToPractice={onProceedToPractice}
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

      // Change to:
case 'quiz':
  return (
    <Quiz user={user} API_BASE_URL={API_BASE_URL}
                      subject={selectedValues.selectedSubject} topic={selectedValues.selectedTopic}
                                       subtopic={selectedValues.selectedSubtopic}
                                              onCompleteQuiz={() => setQuizStage('selection')}
                                                                                />)



      default:
       return (<Quiz0 API_BASE_URL={API_BASE_URL} onQuiz0Submit={onQuiz0Submit}/>);
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
