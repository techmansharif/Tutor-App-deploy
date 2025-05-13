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
      const response = await axios.post(
        `${API_BASE_URL}/${subject}/${topic}/${subtopic}/practise/`,
        submission,
        {
          headers: { 'user-id': user.user_id },
          withCredentials: true
        }
      );

      const { question, hardness_level, message } = response.data;
      if (question) {
        setCurrentQuestion(question);
        setHardnessLevel(hardness_level);
        setSelectedOption('');
        setIsAnswerSubmitted(false);
        setIsAnswerIncorrect(false);
        setShowCongrats(false); // Reset congratulatory message
        setIsTimerPaused(false); // Ensure timer is not paused
      } else if (message) {
        setIsComplete(true);
        setCompletionMessage(message);
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
        <button onClick={handleCompletePractice} className="primary-button">
          Proceed to Quiz
        </button>
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
      <h2>Practice Quiz: {subject} - {topic} - {subtopic}</h2>
      <div className="quiz-header">
        <p>Question {questionsTried + 1} | Difficulty Level: {hardnessLevel}</p>
        <Stopwatch reset={timerReset} onTimeExpired={handleTimeExpired} pause={isTimerPaused} />
        <p>Score: {score} / {questionsTried}</p>
      </div>
      <div className="integrity-score">
        <span>Integrity Score</span>
        <span>{integrityScore}%</span>
      </div>
      <IntegrityScore integrityScore={integrityScore} cheatScore={cheatScore} />
      <div className="question-container">
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
        {showCongrats && (
          <div className="feedback correct">
            <h3>Correct!</h3>
            <p>Well done! You selected the right answer.</p>
            <p>Great speed!</p>
            <p>Moving to a more challenging question...</p>
          </div>
        )}
      </div>
      {isAnswerSubmitted && isAnswerIncorrect && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="feedback incorrect">
              <h3>Incorrect</h3>
              <p>You answered quickly in {(Date.now() - questionStartTime) / 1000} seconds, but incorrectly.</p>
              <p className="explanation">
                <strong>Explanation:</strong> {currentQuestion.explanation}
              </p>
              <p>You can retry this question or move to an easier question.</p>
              <p>Questions completed in this batch: {score}/{questionsTried}</p>
            </div>
            <div className="action-buttons">
              <button onClick={handleRetry} className="retry-button">
                Retry Question
              </button>
              <button onClick={handleNextQuestion} className="next-button">
                Next Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default PracticeQuiz;