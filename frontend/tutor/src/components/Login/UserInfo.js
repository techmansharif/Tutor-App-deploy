import React from 'react';
import './UserInfo.css';


const UserInfo = ({ user, setUser, setQuizStage, setSelectedValues, API_BASE_URL }) => {
 const handleLogout = () => {
    fetch(`${API_BASE_URL}/logout`, {
      credentials: 'include'
    })
      .then(() => {
        setUser(null);
        setQuizStage('quiz1');
        setSelectedValues({ selectedSubject: '', selectedTopic: '', selectedSubtopic: '' });
      })
      .catch(error => console.error('Error logging out:', error));
  };

  return (
    <div className="user-info flex items-center justify-center gap-4 mt-2">
      {user.picture && (
        <img src={user.picture} alt="Profile" className="w-10 h-10 rounded-full" />
      )}
      <span>Welcome, {user.name}</span>
      <button
        onClick={handleLogout}
        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded"
      >
        Logout
      </button>
    </div>
  );
};

export default UserInfo;