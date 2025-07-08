// ✅ SAME IMPORTS
import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Login/Login';
import UserInfo from './components/Login/UserInfo';
import axios from 'axios';
import './App.css';

// ✅ Lazy imports
const LoadingScreen = lazy(() => import('./components/LoadingScreen/LoadingScreen'));
const Quiz1 = lazy(() => import('./components/Quiz1/quiz1'));
const Selection = lazy(() => import('./components/Selection/Selection'));
const Explains = lazy(() => import('./components/Explains/Explains'));
const PracticeQuiz = lazy(() => import('./components/Practise/Practise'));
const Quiz = lazy(() => import('./components/Quiz/quiz'));
const Welcome = lazy(() => import('./components/Welcome/Welcome'));
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'));
const Revise = lazy(() => import('./components/Revise/Revise'));

// ✅ ProtectedRoute
const ProtectedRoute = ({ user, token, children, redirectTo }) => {
  if (!user || !token) {
    return <Navigate to={redirectTo || '/login'} replace />;
  }
  return children;
};

// ✅ Navigation Buttons
const NavigationButtons = ({ selectionsComplete, onProceedToPractice }) => {
  const navigate = useNavigate();
  const currentPath = window.location.pathname;
  const { selectedSubject, selectedTopic, selectedSubtopic } = selectionsComplete;
  const isEarlyStage = ['/welcome', '/quiz1'].includes(currentPath);

  return (
    <div className="navigation-button-container">
      <div className="navigation-buttons">
        <button onClick={() => navigate('/select')} className={`nav-button ${currentPath === '/select' ? 'nav-button-active' : ''}`}>
          SUBJECT<div style={{ fontSize: '0.8em' }}> বিষয় বাছাই </div>
        </button>
        <button
          onClick={() =>
            selectionsComplete ? navigate(`/explains/${selectedSubject}/${selectedTopic}/${selectedSubtopic}`) : navigate('/select')
          }
          className={`nav-button ${!selectionsComplete ? 'nav-button-disabled' : ''}`}
          disabled={!selectionsComplete}
        >
          EXPLAIN<div style={{ fontSize: '0.8em' }}> সহজভাবে শেখা </div>
        </button>
        <button
          onClick={() => (selectionsComplete ? onProceedToPractice() : navigate('/select'))}
          className={`nav-button ${!selectionsComplete ? 'nav-button-disabled' : ''}`}
          disabled={!selectionsComplete}
        >
          PRACTICE<div style={{ fontSize: '0.8em' }}> বিষয় চর্চা </div>
        </button>
        <button
          onClick={() => (selectionsComplete ? navigate(`/quiz/${selectedSubject}/${selectedTopic}/${selectedSubtopic}`) : navigate('/select'))}
          className={`nav-button ${!selectionsComplete ? 'nav-button-disabled' : ''}`}
          disabled={!selectionsComplete}
        >
          QUIZ<div style={{ fontSize: '0.8em' }}> কতদূর শিখলাম </div>
        </button>
        <button onClick={() => navigate('/revise')} className={`nav-button ${isEarlyStage ? 'nav-button-disabled' : ''}`} disabled={isEarlyStage}>
          REVISE<div style={{ fontSize: '0.8em' }}> ভুল সংশোধন </div>
        </button>
        <button onClick={() => navigate('/dashboard')} className={`nav-button ${isEarlyStage ? 'nav-button-disabled' : ''}`} disabled={isEarlyStage}>
          PROGRESS<div style={{ fontSize: '0.8em' }}> অগ্রগতি </div>
        </button>
      </div>
    </div>
  );
};

// ✅ App Component
function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [hasCompletedQuiz1, setHasCompletedQuiz1] = useState(null);
  const [selectedValues, setSelectedValues] = useState({ selectedSubject: '', selectedTopic: '', selectedSubtopic: '' });

  const API_BASE_URL = 'https://fastapi-tutor-app-backend-208251878692.asia-south1.run.app';
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE_URL}/api/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Invalid token');
          return res.json();
        })
        .then((data) => {
          const userData = {
            email: data.user.email,
            user_id: data.user.id,
            picture: data.user.picture,
            name: data.user.name,
          };
          setUser(userData);

          return axios.get(`${API_BASE_URL}/quiz1/status/`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          });
        })
        .then((res) => {
          setHasCompletedQuiz1(res.data.completed);
          const currentPath = window.location.pathname;
          if (currentPath === '/' || currentPath === '/login') {
            navigate(res.data.completed ? '/select' : '/welcome');
          }
        })
        .catch((err) => {
          console.error('Auth error:', err);
          localStorage.removeItem('access_token');
          setUser(null);
          setToken(null);
        })
        .finally(() => {
          setLoading(false);
          setAuthChecked(true);
        });
    } else {
      setLoading(false);
      setAuthChecked(true);
    }
  }, [token, navigate]);

  useEffect(() => {
    const savedValues = localStorage.getItem('selectedValues');
    if (savedValues) {
      try {
        setSelectedValues(JSON.parse(savedValues));
      } catch (err) {
        console.error('Failed to parse localStorage values');
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

  if (loading || !authChecked) {
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
          <p className="text-xs" style={{ marginTop: '5px', color: 'rgb(15, 15, 15)' }}>
            SSC Exam, <span style={{ fontStyle: 'italic' }}>Limited Test Edition</span>
          </p>
        </div>
        {user && (
          <UserInfo user={user} setUser={setUser} setSelectedValues={setSelectedValues} API_BASE_URL={API_BASE_URL} />
        )}
      </header>

      <main className={`flex-grow p-4 main-content-${window.location.pathname.slice(1) || 'welcome'}`}>
        <Suspense fallback={<div className="text-center mt-10">Loading...</div>}>
          <Routes>
            <Route path="/login" element={<Login API_BASE_URL={API_BASE_URL} />} />
            <Route
              path="/welcome"
              element={
                <ProtectedRoute user={user} token={token} redirectTo="/login">
                  <Welcome user={user} API_BASE_URL={API_BASE_URL} onStartQuiz={() => navigate('/quiz1')} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz1"
              element={
                <ProtectedRoute user={user} token={token} redirectTo="/welcome">
                  <Quiz1 user={user} API_BASE_URL={API_BASE_URL} setHasCompletedQuiz1={setHasCompletedQuiz1} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/select"
              element={
                <ProtectedRoute user={user} token={token}>
                  <Selection user={user} API_BASE_URL={API_BASE_URL} onSelectionSubmit={onSelectionSubmit} onSelectionChange={onSelectionChange} initialValues={selectedValues} />
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
            <Route path="/" element={
              user && token
                ? <Navigate to={hasCompletedQuiz1 ? '/select' : '/quiz1'} replace />
                : <Navigate to="/login" replace />
            } />
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
