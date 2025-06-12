import React, { useState, useEffect } from 'react';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const fetch_location = 'http://localhost:8000';

  // Get token from localStorage or URL parameter
  useEffect(() => {
    // Check if token is in URL (from OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    
    if (tokenFromUrl) {
      // Store token and clean URL
      localStorage.setItem('access_token', tokenFromUrl);
      setToken(tokenFromUrl);
      // Remove token from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // Check if token exists in localStorage
      const storedToken = localStorage.getItem('access_token');
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, []);

  // Fetch user data when token changes
  useEffect(() => {
    if (token) {
      fetch(`${fetch_location}/api/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
        .then(response => response.json())
        .then(data => {
          setUser(data.user);
          if (data.user) {
            console.log('User Email:', data.user.email);
            console.log('User ID:', data.user.id);
          }
          setLoading(false);
        })
        .catch(error => {
          console.error('Error fetching user:', error);
          // If token is invalid, remove it
          localStorage.removeItem('access_token');
          setToken(null);
          setUser(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token, fetch_location]);

  // Handle login
  const handleLogin = () => {
    window.location.href = `${fetch_location}/login`;
  };

  // Handle logout
  const handleLogout = () => {
    fetch(`${fetch_location}/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(() => {
        // Remove token from localStorage
        localStorage.removeItem('access_token');
        setToken(null);
        setUser(null);
      })
      .catch(error => {
        console.error('Error logging out:', error);
        // Even if logout fails on server, clear local state
        localStorage.removeItem('access_token');
        setToken(null);
        setUser(null);
      });
  };

  // Example function to call a protected endpoint
  const callProtectedEndpoint = () => {
    fetch(`${fetch_location}/api/protected`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.json())
      .then(data => {
        console.log('Protected endpoint response:', data);
        alert(data.message);
      })
      .catch(error => {
        console.error('Error calling protected endpoint:', error);
      });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {user ? (
        <div>
          {user.picture && (
            <img 
              src={user.picture} 
              alt="Profile" 
              style={{ width: '50px', height: '50px', borderRadius: '50%' }}
            />
          )}
          <h2>Welcome, {user.name}!</h2>
          <p>Email: {user.email}</p>
          <p>User ID: {user.id}</p>
          <div style={{ marginTop: '20px' }}>
            <button 
              onClick={handleLogout}
              style={{ 
                marginRight: '10px', 
                padding: '10px 20px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
            <button 
              onClick={callProtectedEndpoint}
              style={{ 
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Test Protected Route
            </button>
          </div>
        </div>
      ) : (
        <div>
          <h2>Google OAuth Demo with JWT</h2>
          <button 
            onClick={handleLogin}
            style={{ 
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Login with Google
          </button>
        </div>
      )}
    </div>
  );
}

export default App;