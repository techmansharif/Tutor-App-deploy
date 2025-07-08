import React from 'react';
import './Login.css';

const Login = ({API_BASE_URL }) => {
 
  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/login`;
  };
 

  return (
    <div className="login-container text-center">
      <h2 className="text-2xl mb-4">Please Log In</h2>
      <button
        onClick={handleLogin}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Login with Google
      </button>
    </div>
  );
};


export default Login;