

import React, { useState, useEffect } from 'react';

import Quiz0 from './components/Quiz0/Quiz0';
import Quiz0Results from './components/Quiz0Results/Quiz0Results';
import Selection from './components/Selection/Selection';
import Explains from './components/Explains/Explains';
import PracticeQuiz from './components/Practise/Practise'; // Add this line
 
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


  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResults, setQuizResults] = useState(null);
  const [quizAttemptId, setQuizAttemptId] = useState(null);
  
  const API_BASE_URL = 'http://localhost:8000';







  // Debug quizQuestions for duplicate IDs
  useEffect(() => {
    if (quizQuestions.length > 0) {
      console.log('Quiz Questions:', quizQuestions);
      const ids = quizQuestions.map(q => q.id);
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
      if (duplicates.length > 0) {
        console.warn('Duplicate question IDs detected:', duplicates);
      }
    }
  }, [quizQuestions]);



const onQuiz0Submit = (results) => {
  setQuiz0Results(results);
  setQuizStage('quiz0Results');
};
  




  // Handle quiz answer selection
  const handleQuizAnswerSelect = (questionIndex, questionId, selectedOption) => {
    console.log(`Selected question ${questionId} at index ${questionIndex}: ${selectedOption}`);
    setQuizAnswers((prev) => {
      const newAnswers = { ...prev, [questionId]: selectedOption };
      console.log('Updated quizAnswers:', newAnswers);
      return newAnswers;
    });
  };

  // Submit quiz answers
  const handleQuizSubmit = async () => {
    if (Object.keys(quizAnswers).length < quizQuestions.length) {
      alert('Please answer all questions before submitting.');
      return;
    }

    try {
      const answers = Object.keys(quizAnswers).map((questionId) => ({
        question_id: parseInt(questionId),
        selected_option: quizAnswers[questionId],
      }));

      console.log('Submitting payload:', { answers, attempt_id: quizAttemptId });

      const response = await axios.post(
        `${API_BASE_URL}/quiz/submit/?attempt_id=${quizAttemptId}`,
        { answers },
        {
          headers: {
            'user-id': user.user_id
          },
          withCredentials: true
        }
      );

      setQuizResults(response.data);
      setQuizStage('quizResults');
    } catch (error) {
      console.error('Error submitting quiz answers:', error.response?.data || error);
      alert(
        `Error submitting answers: ${
          error.response?.data?.detail || 'Please try again.'
        }`
      );
    }
  };
const handleReset = () => {
  setSelectedValues({selectedSubject: '',selectedTopic: '',selectedSubtopic: ''});
  setQuizStage('selection');
  setQuizQuestions([]);
  setQuizAnswers({});
  setQuizResults(null);
  setQuizAttemptId(null);
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

const onCompletePractice = async () => {
  try {
    const { selectedSubject, selectedTopic, selectedSubtopic } = selectedValues;
    const response = await axios.get(
      `${API_BASE_URL}/${selectedSubject}/${selectedTopic}/${selectedSubtopic}/quizquestions/`,
      {
        headers: { 'user-id': user.user_id },
        withCredentials: true
      }
    );

    setQuizQuestions(response.data.questions);
    setQuizAttemptId(response.data.attempt_id);
    setQuizAnswers({});
    setQuizStage('quizQuestions');
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    alert('Error fetching quiz questions. Please try again.');
  }
};
  // Render quiz questions (Quiz-2 and Quiz-3)
  const renderQuizQuestions = () => (
    <div className="quiz-container">
      <h2>Main Quiz (Quiz-2 and Quiz-3)</h2>
      <p>Please answer all 10 questions below:</p>
      
      {quizQuestions.map((question, index) => {
        // Generate a unique group name for each question's radio buttons
        const radioGroupName = `question-group-${index}`;
        
        return (
          <div key={`question-container-${index}`} className="question-container">
            <h4>Question {index + 1} {index < 5 ? '(Quiz-2)' : '(Quiz-3)'}</h4>
            <p>{question.question}</p>
            <div className="options">
              {['a', 'b', 'c', 'd'].map((option) => {
                // Generate unique ID for each radio button
                const radioId = `radio-${index}-${option}`;
                
                return (
                  <div key={`option-${index}-${option}`} className="option">
                    <input
                      type="radio"
                      id={radioId}
                      name={radioGroupName}
                      value={option}
                      checked={quizAnswers[question.id] === option}
                      onChange={() => handleQuizAnswerSelect(index, question.id, option)}
                    />
                    <label htmlFor={radioId}>
                      {option.toUpperCase()}: {question[`option_${option}`]}
                    </label>
                  </div>
                );
              })}
            </div>
            {question.hardness_level && (
              <p className="difficulty">Difficulty: {question.hardness_level}</p>
            )}
          </div>
        );
      })}

      {/* Debugging: Show number of answered questions */}
      <p>Answered: {Object.keys(quizAnswers).length} / {quizQuestions.length}</p>

      <button
        onClick={handleQuizSubmit}
        disabled={Object.keys(quizAnswers).length < quizQuestions.length}
      >
        Submit Quiz
      </button>
    </div>
  );

  // Render quiz results
  const renderQuizResults = () => (
    <div className="results-container">
      <h2>Quiz Results</h2>
      
      <div className="quiz-section">
        <h3>Quiz-2 Results</h3>
        <div className="score-summary">
          <p>You scored: {quizResults.quiz2_results.score.toFixed(2)}%</p>
          <p>Correct answers: {quizResults.quiz2_results.correct_answers} out of {quizResults.quiz2_results.total_questions}</p>
        </div>
        <h4>Question Breakdown:</h4>
        {quizResults.quiz2_results.results.map((result, index) => (
          <div key={index} className={`result-item ${result.is_correct ? 'correct' : 'incorrect'}`}>
            <p>Question {index + 1}: {result.is_correct ? 'Correct' : 'Incorrect'}</p>
            <p>Your answer: Option {result.selected_option.toUpperCase()}</p>
            <p>Correct answer: Option {result.correct_option.toUpperCase()}</p>
            <p className="explanation">Explanation: {result.explanation}</p>
          </div>
        ))}
      </div>
      
      <div className="quiz-section">
        <h3>Quiz-3 Results</h3>
        <div className="score-summary">
          <p>You scored: {quizResults.quiz3_results.score.toFixed(2)}%</p>
          <p>Correct answers: {quizResults.quiz3_results.correct_answers} out of {quizResults.quiz3_results.total_questions}</p>
        </div>
        <h4>Question Breakdown:</h4>
        {quizResults.quiz3_results.results.map((result, index) => (
          <div key={index} className={`result-item ${result.is_correct ? 'correct' : 'incorrect'}`}>
            <p>Question {index + 1}: {result.is_correct ? 'Correct' : 'Incorrect'}</p>
            <p>Your answer: Option {result.selected_option.toUpperCase()}</p>
            <p>Correct answer: Option {result.correct_option.toUpperCase()}</p>
            <p className="explanation">Explanation: {result.explanation}</p>
          </div>
        ))}
      </div>
      
      <div className="overall-results">
        <h3>Overall Results</h3>
        <p>Total correct answers: {quizResults.quiz2_results.correct_answers + quizResults.quiz3_results.correct_answers} out of 10</p>
        <p>Overall score: {((quizResults.quiz2_results.score + quizResults.quiz3_results.score) / 2).toFixed(2)}%</p>
      </div>
      
      <button onClick={handleReset}>Start New Quiz</button>
    </div>
  );

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

      case 'quizQuestions':
        return renderQuizQuestions();


      case 'quizResults':
        return renderQuizResults();


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
