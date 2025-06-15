import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IntegrityScore, useIntegrityScore } from '../integrity_score/integrity_score';
import Stopwatch from '../Stopwatch/Stopwatch';
import './Practise.css';

const PracticeQuiz = ({ user, API_BASE_URL, subject, topic, subtopic, onCompletePractice }) => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [hardnessLevel, setHardnessLevel] = useState(5);
  const [questionsTried, setQuestionsTried] = useState(0);
  const [selectedOption, setSelectedOption] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [score, setScore] = useState(0);
  const [isAnswerIncorrect, setIsAnswerIncorrect] = useState(false);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [timerReset, setTimerReset] = useState(0); // Trigger timer reset
  const [showCongrats, setShowCongrats] = useState(false); // Track congratulatory message
  const [isTimerPaused, setIsTimerPaused] = useState(false); // Track timer pause state

  const [image1, setImage1] = useState(null); // State for correct answer image
  const [image2, setImage2] = useState(null); // State for incorrect answer image

  // Integrity score hook
  const {
    questionStartTime,
    setQuestionStartTime,
    cheatScore,
    calculateCheatProbability,
    updateCheatScore,
    logResponseTime
  } = useIntegrityScore();

  // Start timing when a new question is loaded
  useEffect(() => {
    if (currentQuestion) {
      setQuestionStartTime(Date.now());
      setTimerReset((prev) => prev + 1); // Reset timer
      setIsTimerPaused(false); // Ensure timer is not paused for new question
    }
  }, [currentQuestion, setQuestionStartTime]);

  // Fetch the first practice question on mount
  useEffect(() => {
    fetchPracticeQuestion();
  }, []);

const fetchPracticeQuestion = async (submission = null) => {
    setIsLoading(true);
    try {
         const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${API_BASE_URL}/${subject}/${topic}/${subtopic}/practise/`,
        submission,
        {
         headers: { 
              'user-id': user.user_id,
              'Authorization': `Bearer ${token}`
            }
          }
        );

      const { question, hardness_level, message, questions_tried, number_correct,image1,image2 } = response.data;
      if (question) {
        setCurrentQuestion(question);
        setHardnessLevel(hardness_level);
        setSelectedOption('');
        setIsAnswerSubmitted(false);
        setIsAnswerIncorrect(false);
        setShowCongrats(false);
        setIsTimerPaused(false);

        setImage1(image1); // Store image1
        setImage2(image2); // Store image2
        // Set questionsTried and score if resuming an incomplete session
        if (questions_tried !== null && questions_tried !== undefined) {
          setQuestionsTried(questions_tried);
        }
        if (number_correct !== null && number_correct !== undefined) {
          setScore(number_correct);
        }
      } else if (message) {
        setIsComplete(true);
        setCompletionMessage(message);
        // Set final questionsTried and score for completion
        if (questions_tried !== null && questions_tried !== undefined) {
          setQuestionsTried(questions_tried);
        }
        if (number_correct !== null && number_correct !== undefined) {
          setScore(number_correct);
        }
      }
    } catch (error) {
      console.error('Error fetching practice question:', error);
      alert('Error fetching practice question. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  const handleAnswerSelect = async (option) => {
    setSelectedOption(option);

    // Auto-submit the answer
    const responseTime = (Date.now() - questionStartTime) / 1000;
    const cheatProbability = calculateCheatProbability(responseTime);
    updateCheatScore(cheatProbability);
    const isCorrect = option === currentQuestion.correct_option;
    logResponseTime(responseTime, isCorrect, currentQuestion, hardnessLevel);

    setIsAnswerSubmitted(true);
    setIsAnswerIncorrect(!isCorrect);

    // Increment score and questionsTried if answer is correct
    if (isCorrect) {
      setScore((prev) => prev + 1);
      setQuestionsTried((prev) => prev + 1);
      setShowCongrats(true); // Show congratulatory message
      setIsTimerPaused(true); // Pause the stopwatch
      setTimeout(async () => {
        const submission = {
          question_id: currentQuestion.id,
          is_correct: isCorrect,
          current_hardness_level: hardnessLevel,
          questions_tried: questionsTried + 1
        };
        await fetchPracticeQuestion(submission);
      }, 1500); // Wait 3 seconds before moving to next question
    }
  };

  const handleTimeExpired = () => {
    if (!isAnswerSubmitted) {
      // Treat as incorrect answer
      const responseTime = (Date.now() - questionStartTime) / 1000;
      logResponseTime(responseTime, false, currentQuestion, hardnessLevel);
      setIsAnswerSubmitted(true);
      setIsAnswerIncorrect(true);
    }
  };

  const handleRetry = () => {
    // Reset for retrying the same question
    setSelectedOption('');
    setIsAnswerSubmitted(false);
    setIsAnswerIncorrect(false);
    setQuestionStartTime(Date.now()); // Reset timer for integrity score
    setTimerReset((prev) => prev + 1); // Reset stopwatch
    setIsTimerPaused(false); // Ensure timer is not paused
  };

  const handleNextQuestion = async () => {
    // Move to next question, count the incorrect attempt
    setQuestionsTried((prev) => prev + 1);
    const submission = {
      question_id: currentQuestion.id,
      is_correct: false,
      current_hardness_level: hardnessLevel,
      questions_tried: questionsTried + 1
    };
    await fetchPracticeQuestion(submission);
  };

  const handleCompletePractice = () => {
    onCompletePractice();
  };

  const handleRestart = () => {
    // Reset all relevant states to initial values
    setCurrentQuestion(null);
    setHardnessLevel(5);
    setQuestionsTried(0);
    setSelectedOption('');
    setIsComplete(false);
    setCompletionMessage('');
    setScore(0);
    setIsAnswerIncorrect(false);
    setIsAnswerSubmitted(false);
    setTimerReset((prev) => prev + 1); // Reset timer
    setShowCongrats(false);
    setIsTimerPaused(false);
    // Fetch a new question to start the next part
    fetchPracticeQuestion();
  };

  const integrityScore = 100 - cheatScore;

  if (isComplete) {
    return (
      <div className="practice-quiz-container">
        <h2>Practice Session Complete</h2>
        <p>{completionMessage}</p>
        <p>Score: {score} / {questionsTried}</p>
        <p>Total Questions Tried: {questionsTried}</p>
        <p>Final Difficulty Level: {hardnessLevel}</p>
        <IntegrityScore integrityScore={integrityScore} cheatScore={cheatScore} />
        <div className="action-buttons">
          <button onClick={handleRestart} className="restart-button">
            Restart Practice
          </button>
          <button onClick={handleCompletePractice} className="primary-button">
            Proceed to Quiz
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !currentQuestion) {
    return (
      <div className="practice-quiz-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading practice question...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="practice-quiz-container">
      <div className="quiz-header">
         <div className="quiz-title-section">
                  <h2>Practice</h2>
                  <h3>{subject}</h3>
                  <h3>{topic}</h3>
                  <h3>{subtopic}</h3>
         </div>
        <button onClick={handleRestart} className="restart-button">
          Restart Practice
        </button>
      </div>
      <div className="quiz-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div className="left-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <p style={{ margin: '5px 0', fontWeight: 'normal' }}>
  Question {questionsTried + 1}/20 |{' '}
  <span style={{ color: 'rgb(128, 128, 128)' }}>
    Difficulty Level: {hardnessLevel}
  </span>
</p>
          <p style={{ margin: '5px 0', fontWeight: 'normal' }}>Score    {score} / {questionsTried}</p>
        </div>
        <div className="right-section">
          <Stopwatch reset={timerReset} onTimeExpired={handleTimeExpired} pause={isTimerPaused} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ width: '100%' }}>
          <IntegrityScore integrityScore={integrityScore} cheatScore={cheatScore} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '1px' }}>
          <span style={{ fontWeight: 'normal' , fontSize: '0.7em',color:'blue'}}>Integrity mode (helps you answer faster)</span>
          <span style={{ fontWeight: 'normal', fontSize: '0.7em' ,color:'blue'}}>{integrityScore}%</span>
        </div>
      </div>
      <div className="question-container"  >
        <h4>{currentQuestion.question}</h4>
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
                disabled={isAnswerSubmitted && isAnswerIncorrect}
              />
              <label htmlFor={`q-${currentQuestion.id}-${option}`}>
                {option.toUpperCase()}: {currentQuestion[`option_${option}`]}
              </label>
            </div>
          ))}
        </div>
      </div>
      {showCongrats && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="feedback correct">
              <h3>Correct!</h3>
              <p>Well done! You selected the right answer.</p>
              {image1 && (
                <img
                  src={`data:image/png;base64,${image1}`}
                  alt="Correct feedback"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '200px',
                    margin: '10px 0',
                    borderRadius: '5px',
                    objectFit: 'contain'
                  }}
                />
              )}
              <p>Great speed!</p>
              <p>Moving to a more challenging question...</p>
            </div>
          </div>
        </div>
      )}
      {isAnswerSubmitted && isAnswerIncorrect && (
        <div className="modal-overlay">
          <div className="modal-content">
          <div className="feedback incorrect">
  <h3>Incorrect</h3>
  <p>Your answer was incorrect.</p>
  {image2 && (
    <img
      src={`data:image/png;base64,${image2}`}
      alt="Incorrect feedback"
      style={{
        maxWidth: '70%',
        maxHeight: '150px',
        margin: '10px 0',
        borderRadius: '5px',
        objectFit: 'contain'
      }}
    />
  )}
  <p style={{ marginLeft: '20px', paddingLeft: '10px', textAlign: 'left' }}>
    <strong>Correct Answer:</strong> {currentQuestion.correct_option.toUpperCase()}: {currentQuestion[`option_${currentQuestion.correct_option}`]}
  </p>
  <p className="explanation indented-text" style={{ marginLeft: '20px', paddingLeft: '10px', textAlign: 'left' }}>
    <strong>Explanation:</strong> {currentQuestion.explanation}
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
        </div>
      )}
    </div>
  );
};

export default PracticeQuiz;