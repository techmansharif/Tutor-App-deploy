import React, { useState, useEffect } from 'react';

function Login({ API_BASE_URL, onLogin, onLogout }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data on component mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/user`, {
      credentials: 'include'
    })
      .then(response => response.json())
      .then(data => {
        setUser(data.user);
        if (data.user) {
          onLogin(data.user);
          console.log('User Email:', data.user.email);
          console.log('User ID:', data.user.id);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching user:', error);
        setLoading(false);
      });
  }, [API_BASE_URL, onLogin]);

  // Handle login
  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/login`;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="login-container">
      {!user && (
        <div>
          <h2>AI Tutor Login</h2>
          <button onClick={handleLogin}>Login with Google</button>
        </div>
      )}
    </div>
  );
}

export default Login;