import React, { useState, useRef, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import './Dash.css';

const Dash = () => {
  const [sidebarActive, setSidebarActive] = useState(false);
  const sidebarRef = useRef(null);
  const menuButtonRef = useRef(null);

  const toggleSidebar = (e) => {
    e.stopPropagation();
    console.log('Toggling sidebar, new state:', !sidebarActive); // Debug log
    setSidebarActive((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        sidebarActive &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(e.target)
      ) {
        console.log('Click outside, closing sidebar'); // Debug log
        setSidebarActive(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [sidebarActive]);

  return (
    <div className="dash-container">
      <Navbar onMenuClick={toggleSidebar} menuButtonRef={menuButtonRef} />
      <Sidebar active={sidebarActive} sidebarRef={sidebarRef} />

      <div className="dash-content">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <div>Welcome, User</div>
        </div>

        <div className="cards">
          <div className="card">
            <img src="/img/subjects/math.png" alt="Math" />
            <h3>Mathematics</h3>
            <p>20 Chapters</p>
          </div>
          <div className="card">
            <img src="/img/subjects/hmath.png" alt="Higher Math" />
            <h3>Higher Mathematics</h3>
            <p>15 Chapters</p>
          </div>
          <div className="card">
            <img src="/img/subjects/eng.png" alt="English" />
            <h3>English</h3>
            <p>10 Chapters</p>
          </div>
          <div className="card">
            <img src="/img/subjects/bangla.png" alt="Bangla" />
            <h3>Bangla</h3>
            <p>12 Chapters</p>
          </div>
          <div className="card">
            <img src="/img/subjects/bio.png" alt="Biology" />
            <h3>Biology</h3>
            <p>12 Chapters</p>
          </div>
          <div className="card">
            <img src="/img/subjects/chem.jpg" alt="Chemistry" />
            <h3>Chemistry</h3>
            <p>12 Chapters</p>
          </div>
        </div>

        <div className="continue-learning">
          <div className="section-title">Continue Learning</div>
          <div className="cards">
            <div className="course-box">
              <h3>ICT</h3>
              <div className="progress-bar">
                <div className="progress" style={{ width: '50%' }}></div>
              </div>
              <p>In Progress</p>
            </div>
            <div className="course-box">
              <h3>Bangla</h3>
              <div className="progress-bar">
                <div className="progress" style={{ width: '80%' }}></div>
              </div>
              <p>In Progress</p>
            </div>
            <div className="course-box">
              <h3>Chemistry</h3>
              <div className="progress-bar">
                <div className="progress" style={{ width: '60%' }}></div>
              </div>
              <p>In Progress</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dash;