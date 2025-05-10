import React from 'react';
import './Quiz0Results.css';

const Quiz0Results = ({ quiz0Results, onProceedToSelection }) => {
  // Handle proceeding to the selection stage
  const handleProceedToSelection = () => {
    onProceedToSelection();
  };

  return (
    <div className="quiz0results-container">
      <h2>Initial Quiz Results</h2>
      <div className="score0-summary">
        <p>You scored: {quiz0Results.score.toFixed(2)}%</p>
        <p>Correct answers: {quiz0Results.correct_answers} out of {quiz0Results.total_questions}</p>
      </div>
      <h3>Question Breakdown:</h3>
      {quiz0Results.results.map((result, index) => (
        <div key={index} className={`result0-item ${result.is_correct ? 'correct0' : 'incorrect0'}`}>
          <p>Question {index + 1}: {result.is_correct ? 'Correct' : 'Incorrect'}</p>
          <p>Your answer: Option {result.selected_option.toUpperCase()}</p>
          <p>Correct answer: Option {result.correct_option.toUpperCase()}</p>
          <p className="explanation0">Explanation: {result.explanation}</p>
        </div>
      ))}
      <button onClick={handleProceedToSelection}>Continue to Selection</button>
    </div>
  );
};

export default Quiz0Results;