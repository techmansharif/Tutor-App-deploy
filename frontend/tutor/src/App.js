import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

import Login from './components/Login/Login';
import UserInfo from './components/Login/UserInfo';

import axios from 'axios';
import './App.css';

const LoadingScreen = lazy(() => import('./components/LoadingScreen/LoadingScreen'));
const Quiz1 = lazy(() => import('./components/Quiz1/quiz1'));
const Selection = lazy(() => import('./components/Selection/Selection'));
const Explains = lazy(() => import('./components/Explains/Explains'));
const PracticeQuiz = lazy(() => import('./components/Practise/Practise'));
const Quiz = lazy(() => import('./components/Quiz/quiz'));
const Welcome = lazy(() => import('./components/Welcome/Welcome'));
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'));
const Revise = lazy(() => import('./components/Revise/Revise'));

// ✅ FIXED: Correctly structured ProtectedRoute
const ProtectedRoute = ({ user, token, children, redirectTo }) => {
  if (!user || !token) {
    return <Navigate to={redirectTo || '/login'} replace />;
  }
  return children;
};

const NavigationButtons = ({ selectionsComplete, onProceedToPractice }) => {
  const navigate = useNavigate();
  const currentPath = window.location.pathname;
  const { selectedSubject, selectedTopic, selectedSubtopic } = selectionsComplete;
  const isEarlyStage = ['/welcome', '/quiz1'].includes(currentPath);

  return (
    <div className="navigation-button-container">
      <div className="navigation-buttons">
        {/* Navigation buttons unchanged */}
        <button onClick={() => navigate('/select')} className={`nav-button ${currentPath === '/select' ? 'nav-button-active' : ''}`}>
          SUBJECT
          <div style={{ fontSize: '0.8em' }}> বিষয় বাছাই </div>
        </button>
        <button
          onClick={() => (selectionsComplete ? navigate(`/explains/${selectedSubject}/${selectedTopic}/${selectedSubtopic}`) : navigate('/select'))}
          className={`nav-button ${currentPath === `/explains/${selectedSubject}/${selectedTopic}/${selectedSubtopic}` ? 'nav-button-active' : ''} ${!selectionsComplete ? 'nav-button-disabled' : ''}`}
          disabled={!selectionsComplete}
        >
          EXPLAIN
          <div style={{ fontSize: '0.8em' }}> সহজভাবে শেখা </div>
        </button>
        <button
          onClick={() => (selectionsComplete ? onProceedToPractice() : navigate('/select'))}
          className={`nav-button ${currentPath === `/practice/${selectedSubject}/${selectedTopic}/${selectedSubtopic}` ? 'nav-button-active' : ''} ${!selectionsComplete ? 'nav-button-disabled' : ''}`}
          disabled={!selectionsComplete}
        >
          PRACTICE
          <div style={{ fontSize: '0.8em' }}> বিষয় চর্চা </div>
        </button>
        <button
          onClick={() => (selectionsComplete ? navigate(`/quiz/${selectedSubject}/${selectedTopic}/${selectedSubtopic}`) : navigate('/select'))}
          className={`nav-button ${currentPath === `/quiz/${selectedSubject}/${selectedTopic}/${selectedSubtopic}` ? 'nav-button-active' : ''} ${!selectionsComplete ? 'nav-button-disabled' : ''}`}
          disabled={!selectionsComplete}
        >
          QUIZ
          <div style={{ fontSize: '0.8em' }}> কতদূর শিখলাম </div>
        </button>
        <button
          onClick={() => navigate('/revise')}
          className={`nav-button ${currentPath === '/revise' ? 'nav-button-active' : ''} ${isEarlyStage ? 'nav-button-disabled' : ''}`}
          disabled={isEarlyStage}
        >
          REVISE
          <div style={{ fontSize: '0.8em' }}> ভুল সংশোধন </div>
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className={`nav-button ${currentPath === '/dashboard' ? 'nav-button-active' : ''} ${isEarlyStage ? 'nav-button-disabled' : ''}`}
          disabled={isEarlyStage}
        >
          PROGRESS
          <div style={{ fontSize: '0.8em' }}> অগ্রগতি </div>
        </button>
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedValues, setSelectedValues] = useState({ selectedSubject: '', selectedTopic: '', selectedSubtopic: '' });
  const [hasCompletedQuiz1, setHasCompletedQuiz1] = useState(null);

  // ✅ FIXED: Initialize token from localStorage
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));

  const [hasRedirected, setHasRedirected] = useState(false);
  const API_BASE_URL = 'https://fastapi-tutor-app-backend-208251878692.asia-south1.run.app';
  const navigate = useNavigate();

  useEffect(() => {
    if (token && !hasRedirected) {
      fetch(`${API_BASE_URL}/api/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((data) => {
          const userData = {
            email: data.user.email,
            user_id: data.user.id,
            picture: data.user.picture,
            name: data.user.name,
          };
          setUser(userData);

          axios
            .get(`${API_BASE_URL}/quiz1/status/`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              withCredentials: true,
            })
            .then((response) => {
              setHasCompletedQuiz1(response.data.completed);
              setLoading(false);

              const currentPath = window.location.pathname;
              const shouldRedirect = currentPath === '/' || currentPath === '/login';

              if (shouldRedirect) {
                navigate(response.data.completed ? '/select' : '/welcome');
                setHasRedirected(true);
              }
            })
            .catch((err) => {
              console.error('Error checking Quiz1 status:', err);
              setHasCompletedQuiz1(true);
              navigate('/select');
              setHasRedirected(true);
            })
            .finally(() => setLoading(false));
        })
        .catch((error) => {
          console.log('Error with token');
          localStorage.removeItem('access_token');
          setToken(null);
          setUser(null);
          setLoading(false);
        });
    } else if (!token) {
      setLoading(false);
    }
  }, [token, hasRedirected, navigate]);

  useEffect(() => {
    const savedValues = localStorage.getItem('selectedValues');
    if (savedValues) {
      try {
        const parsed = JSON.parse(savedValues);
        setSelectedValues(parsed);
      } catch (error) {
        console.error('Error parsing saved values:', error);
      }
    }
  }, [user]);

  const onSelectionSubmit = useCallback((values) => {
    setSelectedValues(values);
    localStorage.setItem('selectedValues', JSON.stringify(values));
  }, []);

  const onSelectionChange = useCallback((values) => {
    setSelectedValues((prev) => {
      if (
        prev.selectedSubject !== values.selectedSubject ||
        prev.selectedTopic !== values.selectedTopic ||
        prev.selectedSubtopic !== values.selectedSubtopic
      ) {
        return values;
      }
      return prev;
    });
  }, []);

  const onProceedToPractice = () => {
    const { selectedSubject, selectedTopic, selectedSubtopic } = selectedValues;
    if (selectedSubject && selectedTopic && selectedSubtopic) {
      navigate(`/practice/${selectedSubject}/${selectedTopic}/${selectedSubtopic}`);
    } else {
      navigate('/select');
    }
  };

  if (loading) {
    return (
      <Suspense fallback={<div className="text-center mt-10">Loading...</div>}>
        <LoadingScreen />
      </Suspense>
    );
  }

  return (
    <div className="App min-h-screen flex flex-col">
      <header className="App-header bg-gray-800 text-white p-4 text-center">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: '10px' }}>
          <h1 className="text-3xl">BRIM AI TUTOR</h1>
          <p style={{ marginTop: '5px', color: 'rgb(15, 15, 15)' }} className="text-xs">
            SSC Exam, <span style={{ fontStyle: 'italic' }}>Limited Test Edition</span>
          </p>
        </div>
        {user && (
          <UserInfo
            user={user}
            setUser={setUser}
            setSelectedValues={setSelectedValues}
            API_BASE_URL={API_BASE_URL}
          />
        )}
      </header>

      <main className={`flex-grow p-4 main-content-${window.location.pathname.slice(1) || 'welcome'}`}>
        <Suspense fallback={<div className="text-center mt-10">Loading...</div>}>
          <Routes>
            <Route path="/login" element={<Login API_BASE_URL={API_BASE_URL} />} />
            <Route
              path="/welcome"
              element={
                <ProtectedRoute user={user} token={token} redirectTo={hasCompletedQuiz1 ? '/select' : '/login'}>
                  <Welcome user={user} API_BASE_URL={API_BASE_URL} onStartQuiz={() => navigate('/quiz1')} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz1"
              element={
                <ProtectedRoute user={user} token={token} redirectTo={hasCompletedQuiz1 ? '/select' : '/welcome'}>
                  <Quiz1 user={user} API_BASE_URL={API_BASE_URL} setHasCompletedQuiz1={setHasCompletedQuiz1} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/select"
              element={
                <ProtectedRoute user={user} token={token}>
                  <Selection
                    user={user}
                    API_BASE_URL={API_BASE_URL}
                    onSelectionSubmit={onSelectionSubmit}
                    onSelectionChange={onSelectionChange}
                    initialValues={selectedValues}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/explains/:subject/:topic/:subtopic"
              element={
                <ProtectedRoute user={user} token={token}>
                  <Explains {...selectedValues} user={user} API_BASE_URL={API_BASE_URL} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/practice/:subject/:topic/:subtopic"
              element={
                <ProtectedRoute user={user} token={token}>
                  <PracticeQuiz {...selectedValues} user={user} API_BASE_URL={API_BASE_URL} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz/:subject/:topic/:subtopic"
              element={
                <ProtectedRoute user={user} token={token}>
                  <Quiz {...selectedValues} user={user} API_BASE_URL={API_BASE_URL} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/revise"
              element={
                <ProtectedRoute user={user} token={token}>
                  <Revise user={user} API_BASE_URL={API_BASE_URL} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute user={user} token={token}>
                  <Dashboard user={user} API_BASE_URL={API_BASE_URL} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
              element={
                user && token ? (
                  <Navigate to={hasCompletedQuiz1 ? '/select' : '/quiz1'} replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
          </Routes>
          {user && token && (
            <NavigationButtons
              selectionsComplete={selectedValues.selectedSubject && selectedValues.selectedTopic && selectedValues.selectedSubtopic}
              onProceedToPractice={onProceedToPractice}
            />
          )}
        </Suspense>
      </main>
    </div>
  );
}

export default App;
