import React, {useState} from 'react';
import './UserInfo.css';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

const UserInfo = ({ user, setUser, setSelectedValues, API_BASE_URL }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // State to toggle dropdown
  const navigate = useNavigate();

  // AFTER
const handleLogout = () => {
  const token = localStorage.getItem('access_token');
  fetch(`${API_BASE_URL}/logout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
    .then(() => {
      localStorage.removeItem('access_token');
      setUser(null);
      Navigate('/welcome')
      setSelectedValues({ selectedSubject: '', selectedTopic: '', selectedSubtopic: '' });
    })
    .catch(error => {
      console.error('Error logging out:', error);
      localStorage.removeItem('access_token');
      setUser(null);
      Navigate('/welcome')
      setSelectedValues({ selectedSubject: '', selectedTopic: '', selectedSubtopic: '' });
    });
};
  return (
    <div className="user-info flex items-center justify-center gap-4 mt-2">
      <div className="user-box">
        {user.picture && (
          <img src={user.picture} alt="Profile" className="w-10 h-10 rounded-full" />
        )}
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="dropdown-toggle"
        >
          <span className="arrow-down">▼</span>
        </button>
        {isDropdownOpen && (
          <div className="dropdown-menu">
          <button onClick={handleLogout}  className="logout-btn"> Logout </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default UserInfo;