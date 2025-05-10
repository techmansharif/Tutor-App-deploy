import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Quiz0.css';

const Quiz0 = ({ API_BASE_URL, onQuiz0Submit }) => {
  const [quiz0Questions, setQuiz0Questions] = useState([]);
  const [quiz0Answers, setQuiz0Answers] = useState({});

  // Fetch Quiz0 questions on mount
  useEffect(() => {
    const fetchQuiz0Questions = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/quiz0/questions/`);
        setQuiz0Questions(response.data);
      } catch (error) {
        console.error('Error fetching quiz0 questions:', error);
        alert('Error fetching initial quiz questions. Please try again.');
      }
    };
    fetchQuiz0Questions();
  }, [API_BASE_URL]);

  // Handle quiz0 answer selection
  const handleQuiz0AnswerSelect = (questionId, selectedOption) => {
    setQuiz0Answers((prev) => ({
      ...prev,
      [questionId]: selectedOption
    }));
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

      // Notify App.js of the submission with the results
      onQuiz0Submit(response.data);
    } catch (error) {
      console.error('Error submitting quiz0 answers:', error);
      alert('Error submitting answers. Please try again.');
    }
  };

  return (
    <div className="quiz0-container">
      <h2>Initial Quiz</h2>
      <p>Please answer the following 5 questions:</p>
      {quiz0Questions.map((question, index) => (
        <div key={question.id} className="question0-container">
          <h3>Question {index + 1}</h3>
          <p>{question.question}</p>
          <div className="options0">
            {['a', 'b', 'c', 'd'].map((option) => (
              <div key={option} className="option0">
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
};

export default Quiz0;