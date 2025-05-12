import React, { useState } from 'react';
import './integrity_score.css';

export const IDEAL_RESPONSE_TIME = 15; // seconds
export const MAX_ACCEPTABLE_TIME = 60; // seconds

export const calculateCheatProbability = (responseTime) => {
  if (responseTime <= IDEAL_RESPONSE_TIME) {
    return 0;
  } else if (responseTime >= MAX_ACCEPTABLE_TIME) {
    return 100;
  } else {
    const timeRange = MAX_ACCEPTABLE_TIME - IDEAL_RESPONSE_TIME;
    const excessTime = responseTime - IDEAL_RESPONSE_TIME;
    return Math.round((excessTime / timeRange) * 100);
  }
};

export const updateCheatScore = (newProbability, setCheatScore) => {
  setCheatScore((prev) => {
    let updatedScore;
    if (newProbability > prev) {
      updatedScore = Math.round(prev * 0.7 + newProbability * 0.3);
    } else {
      updatedScore = Math.round(prev * 0.9 + newProbability * 0.1);
    }
    return Math.max(0, Math.min(100, updatedScore));
  });
};

export const logResponseTime = (responseTime, isCorrect, currentQuestion, hardnessLevel, setResponseTimeHistory) => {
  const newEntry = {
    time: responseTime,
    isCorrect: isCorrect,
    question: currentQuestion ? currentQuestion.id : null,
    difficulty: hardnessLevel,
    timestamp: new Date().toISOString()
  };
  setResponseTimeHistory((prev) => [...prev, newEntry]);
  console.log(`Response time: ${responseTime.toFixed(1)}s, Correct: ${isCorrect}`);
};

export const useIntegrityScore = () => {
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [cheatScore, setCheatScore] = useState(0);
  const [responseTimeHistory, setResponseTimeHistory] = useState([]);

  return {
    questionStartTime,
    setQuestionStartTime,
    cheatScore,
    setCheatScore,
    responseTimeHistory,
    setResponseTimeHistory,
    calculateCheatProbability,
    updateCheatScore: (newProbability) => updateCheatScore(newProbability, setCheatScore),
    logResponseTime: (responseTime, isCorrect, currentQuestion, hardnessLevel) =>
      logResponseTime(responseTime, isCorrect, currentQuestion, hardnessLevel, setResponseTimeHistory)
  };
};

export const IntegrityScore = ({ integrityScore, cheatScore }) => {
  return (
    <div className="cheating-detection">
      <div className="progress-bar-container">
        <div
          className="progress-bar cheat-bar"
          style={{ width: `${cheatScore}%` }}
        ></div>
      </div>
      <div className="cheat-score-container">
        <span>Integrity Score</span>
        <span
          className="cheat-score"
          style={{
            color:
              integrityScore >= 80
                ? '#28a745'
                : integrityScore >= 50
                ? '#ffc107'
                : '#dc3545'
          }}
        >
          {integrityScore}%
        </span>
      </div>
    </div>
  );
};