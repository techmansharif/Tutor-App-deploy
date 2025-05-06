





////following coded for explanation but not much chat memory

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown'; 
import axios from 'axios';
import './App.css';

function App() {
  // Hardcoded user data
  const user = {
    email: 'dibbodey888@gmail.com',
    name: 'Dibbo Dey',
    user_id: 1
  };

  // States for different stages of the application
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subtopics, setSubtopics] = useState([]);
  
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedSubtopic, setSelectedSubtopic] = useState('');
  // Updated quizStage to include explains state
  const [quizStage, setQuizStage] = useState('quiz0'); // Stages: quiz0, quiz0Results, selection, explains, quizQuestions, quizResults
  const [quiz0Questions, setQuiz0Questions] = useState([]);
  const [quiz0Answers, setQuiz0Answers] = useState({});
  const [quiz0Results, setQuiz0Results] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResults, setQuizResults] = useState(null);
  const [quizAttemptId, setQuizAttemptId] = useState(null);
  
  // New states for explains feature
  const [explainText, setExplainText] = useState('');
  const [isExplainLoading, setIsExplainLoading] = useState(false);
  const [explainQuery, setExplainQuery] = useState('');
  const [explainFinished, setExplainFinished] = useState(false);

  const [explainImage, setExplainImage] = useState(null);

  const API_BASE_URL = 'http://localhost:8000';

  // Fetch Quiz0 questions on mount
  useEffect(() => {
    fetchQuiz0Questions();
  }, []);

  // Fetch subjects when in selection stage
  useEffect(() => {
    if (quizStage === 'selection') {
      fetchSubjects();
    }
  }, [quizStage]);

  // Fetch topics when a subject is selected
  useEffect(() => {
    if (selectedSubject) {
      fetchTopics(selectedSubject);
    }
  }, [selectedSubject]);

  // Fetch subtopics when a topic is selected
  useEffect(() => {
    if (selectedTopic && selectedSubject) {
      fetchSubtopics(selectedSubject, selectedTopic);
    }
  }, [selectedTopic]);

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

  // Fetch initial quiz0 questions
  const fetchQuiz0Questions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/quiz0/questions/`);
      setQuiz0Questions(response.data);
    } catch (error) {
      console.error('Error fetching quiz0 questions:', error);
      alert('Error fetching initial quiz questions. Please try again.');
    }
  };

  // Fetch subjects from API
  const fetchSubjects = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/subjects/`, {
        headers: { 'user-id': user.user_id },
        withCredentials: true
      });
      setSubjects(response.data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      alert('Error fetching subjects. Please try again.');
    }
  };

  // Fetch topics from API
  const fetchTopics = async (subject) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/${subject}/topics/`, {
        headers: { 'user-id': user.user_id },
        withCredentials: true
      });
      setTopics(response.data);
    } catch (error) {
      console.error('Error fetching topics:', error);
      alert('Error fetching topics. Please try again.');
    }
  };

  // Fetch subtopics from API
  const fetchSubtopics = async (subject, topic) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/${subject}/${topic}/subtopics/`, {
        headers: { 'user-id': user.user_id },
        withCredentials: true
      });
      setSubtopics(response.data);
    } catch (error) {
      console.error('Error fetching subtopics:', error);
      alert('Error fetching subtopics. Please try again.');
    }
  };

  // Handle quiz0 answer selection
  const handleQuiz0AnswerSelect = (questionId, selectedOption) => {
    setQuiz0Answers({
      ...quiz0Answers,
      [questionId]: selectedOption
    });
  };

  // Submit quiz0 answers
  const handleQuiz0Submit = async () => {
    if (Object.keys(quiz0Answers).length < quiz0Questions.length) {
      alert('Please answer all questions before submitting.');
      return;
    }

    try {
      const answers = Object.keys(quiz0Answers).map((questionId) => ({
        question_id: parseInt(questionId),
        selected_option: quiz0Answers[questionId]
      }));

      const response = await axios.post(`${API_BASE_URL}/quiz0/submit/`, {
        answers: answers
      });

      setQuiz0Results(response.data);
      setQuizStage('quiz0Results');
    } catch (error) {
      console.error('Error submitting quiz0 answers:', error);
      alert('Error submitting answers. Please try again.');
    }
  };

  // Handle subject, topic, and subtopic selection
  const handleSelectionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubject || !selectedTopic || !selectedSubtopic) {
      alert('Please select a subject, topic, and subtopic');
      return;
    }

    try {
      // Make the selection
      await axios.post(
        `${API_BASE_URL}/select/`,
        { subject: selectedSubject, topic: selectedTopic, subtopic: selectedSubtopic },
        {
          headers: { 'user-id': user.user_id },
          withCredentials: true
        }
      );

      // Move to explains stage instead of directly fetching quiz questions
      setQuizStage('explains');
      // Start with "let's start:" which will send "continue" to the API
      fetchExplain("continue");
      
    } catch (error) {
      console.error('Error during selection:', error);
      alert('Error during selection. Please try again.');
    }
  };




  const fetchExplain = async (query) => {
    setIsExplainLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/${selectedSubject}/${selectedTopic}/${selectedSubtopic}/explains/`,
        { query },
        {
          headers: { 'user-id': user.user_id },
          withCredentials: true
        }
      );
      
      // Check if we've reached the end of explanations
      if (response.data.answer === "Congratulations, you have mastered the topic!") {
        setExplainFinished(true);
        setExplainImage(null); // Clear image when finished
      } else {
        setExplainText(response.data.answer);
        setExplainImage(response.data.image); // Store image data
      }
    } catch (error) {
      console.error('Error fetching explanation:', error);
      alert('Error fetching explanation. Please try again.');
    } finally {
      setIsExplainLoading(false);
    }
  };
  // // NEW: Fetch explanation from the API
  // const fetchExplain = async (query) => {
  //   setIsExplainLoading(true);
  //   try {
  //     const response = await axios.post(
  //       `${API_BASE_URL}/${selectedSubject}/${selectedTopic}/${selectedSubtopic}/explains/`,
  //       { query },
  //       {
  //         headers: { 'user-id': user.user_id },
  //         withCredentials: true
  //       }
  //     );
      
  //     // Check if we've reached the end of explanations
  //     if (response.data.answer === "Congratulations, you have mastered the topic!") {
  //       setExplainFinished(true);
  //     }
      
  //     setExplainText(response.data.answer);
  //   } catch (error) {
  //     console.error('Error fetching explanation:', error);
  //     alert('Error fetching explanation. Please try again.');
  //   } finally {
  //     setIsExplainLoading(false);
  //   }
  // };

  // NEW: Handle moving to next explanation
  const handleContinueExplain = () => {
    fetchExplain("continue");
  };

  // NEW: Handle asking for explanation again
  const handleExplainAgain = () => {
    fetchExplain("Explain");
  };

  // NEW: Move from explains to quiz
  const proceedToQuiz = async () => {
    try {
      // Fetch quiz questions
      const response = await axios.get(
        `${API_BASE_URL}/${selectedSubject}/${selectedTopic}/${selectedSubtopic}/quizquestions/`,
        {
          headers: { 'user-id': user.user_id },
          withCredentials: true
        }
      );

      setQuizQuestions(response.data.questions);
      setQuizAttemptId(response.data.attempt_id);
      setQuizAnswers({}); // Reset answers when new questions are loaded
      setQuizStage('quizQuestions');
    } catch (error) {
      console.error('Error fetching quiz questions:', error);
      alert('Error fetching quiz questions. Please try again.');
    }
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

  // Reset to selection stage
  const handleReset = () => {
    setSelectedSubject('');
    setSelectedTopic('');
    setSelectedSubtopic('');
    setQuizStage('selection');
    setQuizQuestions([]);
    setQuizAnswers({});
    setQuizResults(null);
    setQuizAttemptId(null);
    setExplainText('');
    setExplainFinished(false);
  };

  // Proceed from quiz0 results to selection
  const proceedToSelection = () => {
    setQuizStage('selection');
  };

  // Render quiz0 questions
  const renderQuiz0 = () => (
    <div className="quiz-container">
      <h2>Initial Quiz</h2>
      <p>Please answer the following 5 questions:</p>
      {quiz0Questions.map((question, index) => (
        <div key={question.id} className="question-container">
          <h3>Question {index + 1}</h3>
          <p>{question.question}</p>
          <div className="options">
            {['a', 'b', 'c', 'd'].map((option) => (
              <div key={option} className="option">
                <input
                  type="radio"
                  id={`q${question.id}-${option}`}
                  name={`question-${question.id}`}
                  value={option}
                  checked={quiz0Answers[question.id] === option}
                  onChange={() => handleQuiz0AnswerSelect(question.id, option)}
                />
                <label htmlFor={`q${question.id}-${option}`}>
                  {option.toUpperCase()}: {question[`option_${option}`]}
                </label>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={handleQuiz0Submit}
        disabled={Object.keys(quiz0Answers).length < quiz0Questions.length}
      >
        Submit Quiz
      </button>
    </div>
  );

  // Render quiz0 results
  const renderQuiz0Results = () => (
    <div className="results-container">
      <h2>Initial Quiz Results</h2>
      <div className="score-summary">
        <p>You scored: {quiz0Results.score.toFixed(2)}%</p>
        <p>Correct answers: {quiz0Results.correct_answers} out of {quiz0Results.total_questions}</p>
      </div>
      <h3>Question Breakdown:</h3>
      {quiz0Results.results.map((result, index) => (
        <div key={index} className={`result-item ${result.is_correct ? 'correct' : 'incorrect'}`}>
          <p>Question {index + 1}: {result.is_correct ? 'Correct' : 'Incorrect'}</p>
          <p>Your answer: Option {result.selected_option.toUpperCase()}</p>
          <p>Correct answer: Option {result.correct_option.toUpperCase()}</p>
          <p className="explanation">Explanation: {result.explanation}</p>
        </div>
      ))}
      <button onClick={proceedToSelection}>Continue to Selection</button>
    </div>
  );

  // Render subject, topic, and subtopic selection
  const renderSelection = () => (
    <div className="selection-container">
      <h2>Select Subject, Topic, and Subtopic</h2>
      <form onSubmit={handleSelectionSubmit}>
        <div className="selection-group">
          <label>Subject:</label>
          <select
            value={selectedSubject}
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setSelectedTopic('');
              setSelectedSubtopic('');
            }}
            required
          >
            <option value="">Select a Subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.name}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        <div className="selection-group">
          <label>Topic:</label>
          <select
            value={selectedTopic}
            onChange={(e) => {
              setSelectedTopic(e.target.value);
              setSelectedSubtopic('');
            }}
            disabled={!selectedSubject}
            required
          >
            <option value="">Select a Topic</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.name}>
                {topic.name}
              </option>
            ))}
          </select>
        </div>

        <div className="selection-group">
          <label>Subtopic:</label>
          <select
            value={selectedSubtopic}
            onChange={(e) => setSelectedSubtopic(e.target.value)}
            disabled={!selectedTopic}
            required
          >
            <option value="">Select a Subtopic</option>
            {subtopics.map((subtopic) => (
              <option key={subtopic.id} value={subtopic.name}>
                {subtopic.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={!selectedSubject || !selectedTopic || !selectedSubtopic}
        >
          Start Learning
        </button>
      </form>
    </div>
  );

  const renderExplains = () => {
    // Helper function to process the explanation text
    const processExplanation = (text) => {
      // Convert standard markdown bullet points to better formatted ones
      let processed = text.replace(/\n\s*\*\s+/g, '\n• ');
      
      // Ensure proper paragraph breaks
      processed = processed.replace(/\n\n/g, '\n\n');
      
      return processed;
    };
  
    return (
      <div className="explains-container">
        <h2>Learning: {selectedSubject} - {selectedTopic} - {selectedSubtopic}</h2>
        
        {isExplainLoading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading explanation...</p>
          </div>
        ) : (
          <div className="explanation-content">
            <ReactMarkdown>
              {processExplanation(explainText)}
            </ReactMarkdown>
            {explainImage && (
              <div className="explanation-image">
                <img
                  src={`data:image/png;base64,${explainImage}`}
                  alt="Explanation diagram"
                  style={{ maxWidth: '100%', marginTop: '20px' }}
                />
              </div>
            )}
          </div>
        )}
        
        <div className="explain-controls">
          {explainFinished ? (
            <button onClick={proceedToQuiz} className="primary-button">
              Start Quiz
            </button>
          ) : (
            <>
              <button onClick={handleContinueExplain} className="primary-button">
                Let's Move On
              </button>
              <button onClick={handleExplainAgain} className="secondary-button">
                Explain Once Again
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  // const renderExplains = () => {
  //   // Helper function to process the explanation text
  //   const processExplanation = (text) => {
  //     // Convert standard markdown bullet points to better formatted ones
  //     let processed = text.replace(/\n\s*\*\s+/g, '\n• ');
      
  //     // Ensure proper paragraph breaks
  //     processed = processed.replace(/\n\n/g, '\n\n');
      
  //     return processed;
  //   };
  
  //   return (
  //     <div className="explains-container">
  //       <h2>Learning: {selectedSubject} - {selectedTopic} - {selectedSubtopic}</h2>
        
  //       {isExplainLoading ? (
  //         <div className="loading">
  //           <div className="loading-spinner"></div>
  //           <p>Loading explanation...</p>
  //         </div>
  //       ) : (
  //         <div className="explanation-content">
  //           <ReactMarkdown>
  //             {processExplanation(explainText)}
  //           </ReactMarkdown>
  //         </div>
  //       )}
        
  //       <div className="explain-controls">
  //         {explainFinished ? (
  //           <button onClick={proceedToQuiz} className="primary-button">
  //             Start Quiz
  //           </button>
  //         ) : (
  //           <>
  //             <button onClick={handleContinueExplain} className="primary-button">
  //               Let's Move On
  //             </button>
  //             <button onClick={handleExplainAgain} className="secondary-button">
  //               Explain Once Again
  //             </button>
  //           </>
  //         )}
  //       </div>
  //     </div>
  //   );
  // };
  

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
        return renderQuiz0();
      case 'quiz0Results':
        return renderQuiz0Results();
      case 'selection':
        return renderSelection();
      case 'explains': 
        return renderExplains();
      case 'quizQuestions':
        return renderQuizQuestions();
      case 'quizResults':
        return renderQuizResults();
      default:
        return renderQuiz0();
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
