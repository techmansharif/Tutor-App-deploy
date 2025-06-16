import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IntegrityScore, useIntegrityScore } from '../integrity_score/integrity_score';
import Stopwatch from '../Stopwatch/Stopwatch';
import { processQuizText, MathText } from '../ProcessText/ProcessQuiz'; // Add this import
import './quiz1.css';

const Quiz1 = ({ user, API_BASE_URL, onCompleteQuiz }) => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [hardnessLevel, setHardnessLevel] = useState(1);
  const [questionsTried, setQuestionsTried] = useState(0);
  const [selectedOption, setSelectedOption] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [score, setScore] = useState(0);
  const [isAnswerIncorrect, setIsAnswerIncorrect] = useState(false);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [timerReset, setTimerReset] = useState(0);
  const [showCongrats, setShowCongrats] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [attemptId, setAttemptId] = useState(null);

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
      setTimerReset((prev) => prev + 1);
      setIsTimerPaused(false);
    }
  }, [currentQuestion, setQuestionStartTime]);

  // Fetch the first quiz question on mount
  useEffect(() => {
    fetchQuizQuestion();
  }, []);

  const fetchQuizQuestion = async (submission = null) => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('access_token');
        const response = await axios.post(
          `${API_BASE_URL}/quiz1/`,
          submission,
          {
            headers: { 
              'user-id': user.user_id,
              'Authorization': `Bearer ${token}`
            }
          }
        );

      const { question, hardness_level, message, attempt_id,image1,image2 } = response.data;
      if (question) {
        setCurrentQuestion(question);
        setHardnessLevel(hardness_level);
        setAttemptId(attempt_id);
        setSelectedOption('');
        setIsAnswerSubmitted(false);
        setIsAnswerIncorrect(false);
        setShowCongrats(false);
        setIsTimerPaused(false);

        setImage1(image1); // Store image1
        setImage2(image2); // Store image2
      } else if (message) {
        setIsComplete(true);
        setCompletionMessage(message);
        setAttemptId(attempt_id);
      }
    } catch (error) {
      console.error('Error fetching quiz question:', error);
      alert('Error fetching quiz question. Please try again.');
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

    // Prepare submission
    const submission = {
      question_id: currentQuestion.id,
      is_correct: isCorrect,
      current_hardness_level: hardnessLevel,
      questions_tried: questionsTried + 1,
      attempt_id: attemptId
    };

    // Increment score and questionsTried
    setQuestionsTried((prev) => prev + 1);
    if (isCorrect) {
      setScore((prev) => prev + 1);
      setShowCongrats(true);
      setIsTimerPaused(true);
      setTimeout(async () => {
        await fetchQuizQuestion(submission);
      }, 1500);
    }
    // For incorrect answers, do not fetch new question immediately
    // Let handleNextQuestion trigger the fetch
  };

  const handleTimeExpired = () => {
    if (!isAnswerSubmitted) {
      const responseTime = (Date.now() - questionStartTime) / 1000;
      logResponseTime(responseTime, false, currentQuestion, hardnessLevel);
      setIsAnswerSubmitted(true);
      setIsAnswerIncorrect(true);

      const submission = {
        question_id: currentQuestion.id,
        is_correct: false,
        current_hardness_level: hardnessLevel,
        questions_tried: questionsTried + 1,
        attempt_id: attemptId
      };
      setQuestionsTried((prev) => prev + 1);
      fetchQuizQuestion(submission);
    }
  };

  const handleNextQuestion = async () => {
    const submission = {
      question_id: currentQuestion.id,
      is_correct: false,
      current_hardness_level: hardnessLevel,
      questions_tried: questionsTried,
      attempt_id: attemptId
    };
    await fetchQuizQuestion(submission);
  };

  const handleCompleteQuiz = () => {
    onCompleteQuiz();
  };

  const integrityScore = 100 - cheatScore;

  if (isComplete) {
    return (
      <div className="quiz1-container">
        <h2>Assessment Complete</h2>
        <p>You have completed the Assesment! Check your scores.</p>
        <p style={{ marginLeft: '20px', paddingLeft: '10px', textAlign: 'left' }}>Score: {score} / {questionsTried}</p>
        <p style={{ marginLeft: '20px', paddingLeft: '10px', textAlign: 'left' }}>Total Questions Tried: {questionsTried}</p>
        <p style={{ marginLeft: '20px', paddingLeft: '10px', textAlign: 'left' }}>Final Difficulty Level: {hardnessLevel}</p>
        <div style={{ marginLeft: '20px', paddingLeft: '10px', textAlign: 'left' }}>Integrity Level<span style={{ fontSize: '0.9em', color: '#666' }}>(helps you answer faster)</span>: {integrityScore}%</div>
   <div className="study-guide-container">
  <p className="study-guide-title">
    চলুন, এবার আমরা আপনার পড়াশোনা শুরু করি!
  </p>
  <p className="study-guide-text">
    প্রথমে একটি <span className="highlight-keyword">বিষয় (SUBJECT)</span> বেছে নেওয়া হবে। এরপর সহজভাবে সেটি <span className="highlight-keyword">ব্যাখ্যা (EXPLAIN)</span> করা হবে, যাতে আপনি ভালোভাবে বুঝতে পারেন।
  </p>
  <p className="study-guide-text">
    তারপর আপনি কিছু <span className="highlight-keyword">অনুশীলন (PRACTISE)</span> করবেন, আর শেষে থাকবে কিছু <span className="highlight-keyword">কুইজ (QUIZ)</span>—যা দেখে বোঝা যাবে আপনি কতটা শিখেছেন!
  </p>
  <p className="study-guide-text">
    এভাবেই ধাপে ধাপে আপনি হয়ে উঠবেন এসএসসি পরীক্ষার জন্য পুরোপুরি প্রস্তুত!
  </p>
</div>
        
        
        
        <button onClick={handleCompleteQuiz} className="primary-button">SUBJECT<div style={{ fontSize: '0.8em' }}>Tutors you the subject</div></button>
      
      </div>
    );
  }

  if (isLoading || !currentQuestion) {
    return (
      <div className="quiz1-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading quiz question...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz1-container">
      <div className="quiz-header">
  <h2>Assessment</h2>
</div>
<div className="quiz-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
  <div className="left-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
    <p style={{ margin: '5px 0', fontWeight: 'normal' }}>
      Question {questionsTried + 1} |{' '}
      <span style={{ color: 'rgb(128, 128, 128)' }}>
        Difficulty Level: {hardnessLevel}
      </span>
    </p>
    <p style={{ margin: '5px 0', fontWeight: 'normal' }}>Score: {score} / {questionsTried}</p>
  </div>
  <div className="right-section">
    <Stopwatch reset={timerReset} onTimeExpired={handleTimeExpired} pause={isTimerPaused} />
  </div>
</div>
<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '10px' }}>
  <div style={{ width: '100%' }}>
    <IntegrityScore integrityScore={integrityScore} cheatScore={cheatScore} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '2px' }}>
    <span style={{ fontWeight: 'normal', fontSize: '0.7em' }}>Integrity mode (helps you answer faster)</span>
    <span style={{ fontWeight: 'normal', fontSize: '0.7em' }}>{integrityScore}%</span>
  </div>
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
                disabled={isAnswerSubmitted}
              />
              <label htmlFor={`q-${currentQuestion.id}-${option}`}>
                {option.toUpperCase()}: <MathText>{currentQuestion[`option_${option}`]}</MathText>
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
  <strong>Correct Answer:</strong> {currentQuestion.correct_option.toUpperCase()}: <MathText>{currentQuestion[`option_${currentQuestion.correct_option}`]}</MathText>
</p>
              <p className="explanation indented-text" style={{ marginLeft: '20px', paddingLeft: '10px', textAlign: 'left' }}>
                <strong>Explanation:</strong><MathText> {currentQuestion.explanation}</MathText>
              </p>
            </div>
            <div className="action-buttons" >
              <button onClick={handleNextQuestion} className="next-button" style={{ display: 'flex', justifyContent: 'center', width: '100%' }} >
                Next Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quiz1;