import React, { useState } from 'react';
import './Login.css';

const Login = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  const handleSignUp = () => {
    alert(`Sign Up: ${firstName} ${lastName}, ${email}`);
  };

  const handleGoogleLogin = () => {
    alert('Logging in with Google...');
  };

  const toggleMenu = () => {
    document.getElementById('mobile-menu').classList.toggle('active');
  };

  return (
    <div>
      <div className="navbar">
        <div className="logo"><span>BRIM</span> AI Tutor</div>
        <div className="menu">
          <a href="#">HOME</a>
          <a href="#">BLOG</a>
          <a href="#">CONTACT</a>
        </div>
        <div className="menu-button" onClick={toggleMenu}>☰</div>
      </div>

      <div className="mobile-menu" id="mobile-menu">
        <a href="#">HOME</a>
        <a href="#">BLOG</a>
        <a href="#">CONTACT</a>
      </div>

      <div className="container">
        <div className="left">
          <h1>Learn and Practice SSC Content from the comfort of your home!</h1>
          <div className="button">
            <a href="#">VIEW Subjects &gt;</a>
          </div>
        </div>
        <div className="right">
          <h2>Log in</h2>
          <input
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button onClick={handleSignUp}>Sign Up</button>
          <button onClick={handleGoogleLogin}>Log in with Google</button>
        </div>
      </div>
    </div>
  );
};

export default Login;
