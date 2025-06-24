import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// Import your pages
import Login from './pages/Login';
import Explain from './pages/Explain';
import Dash from './pages/Dash';
import Assessment from './pages/Assessment';
import Subject from './pages/Subject';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dash />} />
        <Route path="/explain" element={<Explain />} />
        <Route path="/assess" element={<Assessment />} />
        <Route path="/subject" element={<Subject />} />
      </Routes>
    </Router>
  );
}

export default App;
