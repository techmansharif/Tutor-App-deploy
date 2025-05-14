import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Login.css';

function Login({ setUser }) {
  const [user, setLocalUser] = useState(null); // Define local user state
  const [loading, setLoading] = useState(true);
  const API_BASE_URL = 'http://localhost:8000';

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/user`, {
          withCredentials: true,
        });
        setLocalUser(response.data.user); // Set local user state
        setUser(response.data.user); // Update parent (App.js) user state
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user:', error);
        setLocalUser(null);
        setUser(null);
        setLoading(false);
      }
    };
    fetchUser();
  }, [API_BASE_URL, setUser]);

  // Handle login
  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await axios.get(`${API_BASE_URL}/logout`, { withCredentials: true });
      setLocalUser(null);
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return <div className="login-loading">Loading...</div>;
  }

  return (
    <div className="login-container">
      {!user ? (
        <div className="login-box">
          <h2>AI Tutor Quiz Application</h2>
          <p>Please log in to continue</p>
          <button className="login-button" onClick={handleLogin}>
            Login with Google
          </button>
        </div>
      ) : (
        <div className="logged-in-box">
          <p>Logged in as {user.email}</p>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default Login;