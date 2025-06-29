import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MathText } from '../ProcessText/ProcessQuiz';
import './Revise.css';
import Stopwatch from '../Stopwatch/Stopwatch';

const Revise = ({ user, API_BASE_URL }) => {
  const [mode, setMode] = useState(null); // null, 'subject', 'random'
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [questionsShown, setQuestionsShown] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // For subject selection
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subtopics, setSubtopics] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedSubtopic, setSelectedSubtopic] = useState('');
 
  const [timerReset, setTimerReset] = useState(0); // Trigger timer reset
  const [isTimerPaused, setIsTimerPaused] = useState(false); // Track timer pause state
  // Fetch subjects on mount and check for existing session
  useEffect(() => {
    fetchSubjects();
    checkExistingSession();
  }, []);
 
  // Start timing when a new question is loaded
useEffect(() => {
  if (currentQuestion) {
    setTimerReset((prev) => prev + 1); // Reset timer
    setIsTimerPaused(false); // Ensure timer is not paused for new question
  }
}, [currentQuestion]);
  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/subjects/`, {
        headers: {
          'user-id': user.user_id,
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });
      
      // Filter out unwanted subjects like in Selection.js
      const filteredSubjects = response.data.filter(subject => 
        !['Higher Math', 'General Math', 'quiz1', 'data'].includes(subject.name)
      );
      
      setSubjects(filteredSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchTopics = async (subjectName) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/${subjectName}/topics/`, {
        headers: {
          'user-id': user.user_id,
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });
      let sortedTopics;
          if  (selectedSubject !== "English") {
              sortedTopics = response.data.sort((a, b) => a.name.localeCompare(b.name, 'bn', { numeric: true }));
            } else {
              sortedTopics=response.data;
            }
          setTopics(sortedTopics);
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };
  const fetchSubtopics = async (subjectName, topicName) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/${subjectName}/${topicName}/subtopics/`, {
        headers: {
          'user-id': user.user_id,
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });
      setSubtopics(response.data);
    } catch (error) {
      console.error('Error fetching subtopics:', error);
    }
  };
  
  const handleTimeExpired = () => {
  if (!showExplanation) {
    // Treat as incorrect answer
    setSelectedOption('');
    setIsCorrect(false);
    setShowExplanation(true);
    setIsTimerPaused(true);
  }
};
  const checkExistingSession = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      // Try to get current session state without submission
      const response = await axios.post(
        `${API_BASE_URL}/revise/`,
        {},
        {
          headers: {
            'user-id': user.user_id,
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data.question) {
        // Active session exists - continue from where left off
        handleResponse(response.data);
        setMode(response.data.mode || 'random');
      }
    } catch (error) {
      console.log('No active session found');
    } finally {
      setIsLoading(false);
    }
  };

  const startRevision = async (selectedMode) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const requestData = {
        mode: selectedMode,
        ...(selectedMode === 'subject' && {
          subject: selectedSubject,
          topic: selectedTopic,
          subtopic: selectedSubtopic
        })
      };

      const response = await axios.post(
        `${API_BASE_URL}/revise/`,
        { request: requestData },
        {
          headers: {
            'user-id': user.user_id,
            'Authorization': `Bearer ${token}`
          }
        }
      );

      handleResponse(response.data);
      setMode(selectedMode);
    } catch (error) {
      console.error('Error starting revision:', error);
      alert('Error starting revision. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

const handleAnswerSelect = (option) => {
  setSelectedOption(option);
  const correct = option === currentQuestion.correct_option;
  setIsCorrect(correct);
  setShowExplanation(true);
  setIsTimerPaused(true); // Pause the stopwatch
};

  const handleRetry = () => {
  setSelectedOption('');
  setShowExplanation(false);
  setIsCorrect(false);
  setTimerReset((prev) => prev + 1); // Reset stopwatch
  setIsTimerPaused(false); // Ensure timer is not paused
};
  const handleNextQuestion = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${API_BASE_URL}/revise/`,
        {
          submission: {
            question_id: currentQuestion.id,
            selected_answer: selectedOption,
            retry: false
          }
        },
        {
          headers: {
            'user-id': user.user_id,
            'Authorization': `Bearer ${token}`
          }
        }
      );

      handleResponse(response.data);
      setSelectedOption('');
      setShowExplanation(false);
    } catch (error) {
      console.error('Error fetching next question:', error);
      alert('Error fetching next question. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponse = (data) => {
    if (data.question) {
      setCurrentQuestion(data.question);
      setIsComplete(false);
    } else if (data.message) {
      if (data.message.includes("select a revision mode")) {
        // Reset to mode selection
        setMode(null);
        setCurrentQuestion(null);
        setIsComplete(false);
      } else {
        setIsComplete(true);
      }
    }
    
    if (data.total_questions !== undefined) {
      setTotalQuestions(data.total_questions);
    }
    if (data.questions_shown !== undefined) {
      setQuestionsShown(data.questions_shown);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(null);
    setIsComplete(false);
    setMode(null);
    setSelectedOption('');
    setShowExplanation(false);
    setSelectedSubject('');
    setSelectedTopic('');
    setSelectedSubtopic('');
    setTopics([]);
    setSubtopics([]);
  };

  // Mode selection screen
  if (!mode) {
    return (
      <div className="revise-container">
        <div className="revise-header">
          <h2>REVISION MODE</h2>
        </div>
        <p className="revise-description">Review questions you answered incorrectly in your recent practice and quiz sessions.</p>
        
        <div className="mode-selection">
          <div className="mode-card">
            <h3>Select Subject/Topic</h3>
            <p>Review failed questions from a specific area</p>
            
            <div className="selection-group">
              <select 
                value={selectedSubject} 
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setSelectedTopic('');
                  setSelectedSubtopic('');
                  if (e.target.value) fetchTopics(e.target.value);
                }}
                className="selection-dropdown"
              >
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.name}>{subject.name}</option>
                ))}
              </select>

              {selectedSubject && (
                <select 
                  value={selectedTopic} 
                  onChange={(e) => {
                    setSelectedTopic(e.target.value);
                    setSelectedSubtopic('');
                    if (e.target.value) fetchSubtopics(selectedSubject, e.target.value);
                  }}
                  className="selection-dropdown"
                >
                  <option value="">Select Topic</option>
                  {topics.map(topic => (
                    <option 
                      key={topic.id} 
                      value={topic.name}
                      disabled={!topic.has_questions}
                      style={{
                        color: topic.has_questions ? '#1a6c7b' : '#cccccc',
                        backgroundColor: topic.has_questions ? 'white' : '#f5f5f5'
                      }}
                    >
                      {topic.name} {!topic.has_questions ? '(No questions available)' : ''}
                    </option>
                  ))}
                </select>
              )}

              {selectedTopic && (
                <select 
                  value={selectedSubtopic} 
                  onChange={(e) => setSelectedSubtopic(e.target.value)}
                  className="selection-dropdown"
                >
                  <option value="">Select Subtopic</option>
                  {subtopics.map(subtopic => (
                    <option key={subtopic.id} value={subtopic.name}>{subtopic.name}</option>
                  ))}
                </select>
              )}
            </div>

            <button 
              onClick={() => startRevision('subject')}
              disabled={!selectedSubject || !selectedTopic || !selectedSubtopic}
              className="start-button"
            >
              Start Subject Revision
            </button>
          </div>

          <div className="mode-card">
            <h3>Random Selection</h3>
            <p>Review all failed questions randomly</p>
            <button 
              onClick={() => startRevision('random')}
              className="start-button random-button"
            >
              Start All Revision
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Completion screen
  if (isComplete) {
    return (
      <div className="revise-container">
        <div className="completion-content">
          <h2>Revision Complete!</h2>
          {totalQuestions === 0 ? (
          <p className="completion-message">You have no questions to review!</p>
        ) : (
          <p className="completion-message">
            You have reviewed all {totalQuestions} failed questions.
          </p>
        )}
          <button onClick={handleRestart} className="restart-button">
            Restart Revise
          </button>
        </div>
      </div>
    );
  }

  // Loading screen
  if (isLoading || !currentQuestion) {
    return (
      <div className="revise-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading question...</p>
        </div>
      </div>
    );
  }

  // Question screen
  return (
    <div className="revise-container">
      <div className="revise-header">
        <div className="revise-title-section">
           <button onClick={handleRestart} className="restart-button">
          Restart Revision
        </button>
          
          <h2 style={{marginTop: '1em'}}> REVISION</h2>

          {mode === 'subject' && selectedSubject && (
            <>
              <h3>{selectedSubject}</h3>
              <h3>{selectedTopic}</h3>
              <h3>{selectedSubtopic}</h3>
            </>
          )}
        </div>
      </div>
      
      
      <div className="revise-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: '5px 0', fontWeight: 'normal' }}>
              Question {questionsShown + 1} of {totalQuestions}
            </p>
            <Stopwatch reset={timerReset} onTimeExpired={handleTimeExpired} pause={isTimerPaused} />
      </div>

      <div className="question-container">
        <h4><MathText>{currentQuestion.question}</MathText></h4>
        <div className="options">
          {['a', 'b', 'c', 'd'].map((option) => (
            <div key={option} className="option">
              <input
                type="radio"
                id={`q-${currentQuestion.id}-${option}`}
                name={`question-${currentQuestion.id}`}
                value={option}
                checked={selectedOption === option}
                onChange={() => handleAnswerSelect(option)}
                disabled={showExplanation}
              />
              <label htmlFor={`q-${currentQuestion.id}-${option}`}>
                {option.toUpperCase()}: <MathText>{currentQuestion[`option_${option}`]}</MathText>
              </label>
            </div>
          ))}
        </div>
      </div>

      {showExplanation && (
        <div className="explanation-box">
          <div className={`feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
            <h3>{isCorrect ? 'Correct!' : 'Incorrect'}</h3>
            <p>{isCorrect ? 'Well done! You selected the right answer.' : 'Your answer was incorrect.'}</p>
            
            <p style={{ marginLeft: '20px', paddingLeft: '10px', textAlign: 'left' }}>
              <strong>Correct Answer:</strong> {currentQuestion.correct_option.toUpperCase()}: <MathText>{currentQuestion[`option_${currentQuestion.correct_option}`]}</MathText>
            </p>
            
            <p className="explanation indented-text" style={{ marginLeft: '20px', paddingLeft: '10px', textAlign: 'left' }}>
              <strong>Explanation:</strong> <MathText>{currentQuestion.explanation}</MathText>
            </p>
          </div>
          
          <div className="action-buttons">
            <button onClick={handleRetry} className="retry-button" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              Retry Question
            </button>
            <button onClick={handleNextQuestion} className="next-button" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              Next Question
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Revise;