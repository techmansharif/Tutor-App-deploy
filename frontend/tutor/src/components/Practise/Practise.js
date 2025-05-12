import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IntegrityScore, useIntegrityScore } from '../integrity_score/integrity_score';
import './Practise.css';

const PracticeQuiz = ({ user, API_BASE_URL, subject, topic, subtopic, onCompletePractice }) => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [hardnessLevel, setHardnessLevel] = useState(5);
  const [questionsTried, setQuestionsTried] = useState(1);
  const [selectedOption, setSelectedOption] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
        if(submission){
        setQuestionsTried((prev) => prev + 1);
        }
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

  const handleAnswerSelect = (option) => {
    setSelectedOption(option);
  };

  const handleAnswerSubmit = async () => {
    if (!selectedOption) {
      alert('Please select an option before submitting.');
      return;
    }

    const responseTime = (Date.now() - questionStartTime) / 1000;
    const cheatProbability = calculateCheatProbability(responseTime);
    updateCheatScore(cheatProbability);
    const isCorrect = selectedOption === currentQuestion.correct_option;
    logResponseTime(responseTime, isCorrect, currentQuestion, hardnessLevel);

    const submission = {
      question_id: currentQuestion.id,
      is_correct: isCorrect,
      current_hardness_level: hardnessLevel,
      questions_tried: questionsTried
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
      <p>Question {questionsTried} | Difficulty Level: {hardnessLevel}</p>
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
              />
              <label htmlFor={`q-${currentQuestion.id}-${option}`}>
                {option.toUpperCase()}: {currentQuestion[`option_${option}`]}
              </label>
            </div>
          ))}
        </div>
        {currentQuestion.explanation && (
          <p className="explanation">Explanation: {currentQuestion.explanation}</p>
        )}
      </div>
      <button
        onClick={handleAnswerSubmit}
        disabled={!selectedOption}
        className="primary-button"
      >
        Submit Answer
      </button>
    </div>
  );
};

export default PracticeQuiz;