import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './Dashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = ({ user, API_BASE_URL, onGoToSelection }) => {
  const { subject } = useParams(); // Get subject from URL
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(subject || '');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [progressData, setProgressData] = useState([]);
  const [totalQuizAttempts, setTotalQuizAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasCompletedQuiz1, setHasCompletedQuiz1] = useState(true);
  const [showGraph, setShowGraph] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState([]);

  // Placeholder images for subjects based on the image
  const subjectImages = {
    "গণিত": '/bookcovers/math.jpg',
    "English": '/bookcovers/english.png',
    "উচ্চতর গণিত": '/bookcovers/highermath.jpg'
  };

  useEffect(() => {
    const checkQuiz1Status = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await axios.get(`${API_BASE_URL}/quiz1/status/?user_id=${user.user_id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            withCredentials: true,
          });
        setHasCompletedQuiz1(response.data.completed);
      } catch (err) {
        console.error('Error checking Quiz1 status:', err);
        setHasCompletedQuiz1(true);
      }
    };

    checkQuiz1Status();

    axios
      .get(`${API_BASE_URL}/subjects/`)
      .then((response) => {
        const filteredSubjects = response.data.filter(
          (subject) => !['Higher Math', 'General Math', 'quiz1', 'data'].includes(subject.name)
        );
        setSubjects(filteredSubjects);
      })
      .catch((err) => {
        console.error('Error fetching subjects:', err);
        setError('Failed to load subjects.');
      });
  }, [API_BASE_URL, user.user_id]);

  useEffect(() => {
    if (selectedSubject) {
      axios
        .get(`${API_BASE_URL}/${selectedSubject}/topics/`)
        .then((response) => {
          let sortedTopics;
          if (selectedSubject !== 'English') {
            sortedTopics = response.data.sort((a, b) =>
              a.name.localeCompare(b.name, 'bn', { numeric: true })
            );
          } else {
            sortedTopics = response.data;
          }
          setTopics(sortedTopics);
          setSelectedTopic('');
          setProgressData([]);
          setTotalQuizAttempts(0);
          setShowGraph(false);
        })
        .catch((err) => {
          console.error('Error fetching topics:', err);
          setError('Failed to load topics.');
        });
    } else {
      setTopics([]);
      setSelectedTopic('');
      setProgressData([]);
      setTotalQuizAttempts(0);
      setShowGraph(false);
    }
  }, [selectedSubject, API_BASE_URL]);

  useEffect(() => {
    if (selectedSubject && selectedTopic) {
      setLoading(true);
      setShowGraph(false);
      const token = localStorage.getItem('access_token');
      axios
        .get(`${API_BASE_URL}/dashboard/${selectedSubject}/${selectedTopic}/`, {
          headers: {
            'user-id': user.user_id,
            Authorization: `Bearer ${token}`,
          },
        })
        .then((response) => {
          const transformedData = response.data.subtopics.map((subtopic) => ({
            subtopic_name: subtopic.name,
            completion_percentage: subtopic.completion_percentage,
            quiz_taken: subtopic.quiz_taken,
          }));
          setProgressData(transformedData);
          setTotalQuizAttempts(response.data.total_quiz_attempts || 0);
          setLoading(false);
          setError(null);
        })
        .catch((err) => {
          console.error('Error fetching progress:', err);
          setError('Failed to load progress data.');
          setProgressData([]);
          setTotalQuizAttempts(0);
          setLoading(false);
        });
    } else {
      setProgressData([]);
      setTotalQuizAttempts(0);
      setShowGraph(false);
    }
  }, [selectedSubject, selectedTopic, user.user_id, API_BASE_URL]);

  const handleSubjectClick = (subjectName) => {
    setSelectedSubject(subjectName);
    navigate(`/dashboard/${encodeURIComponent(subjectName)}`);
    setError(null);
  };

  const handleTopicChange = (e) => {
    setSelectedTopic(e.target.value);
    setError(null);
  };

  const handleStartLearning = () => {
    if (selectedSubject && selectedTopic) {
      onGoToSelection();
    } else {
      setError('Please select both a subject and a topic.');
    }
  };

  const fetchAnalyticsData = async () => {
    if (selectedSubject && selectedTopic) {
      try {
        const token = localStorage.getItem('access_token');
        const response = await axios.get(
          `${API_BASE_URL}/analytics/${selectedSubject}/${selectedTopic}/`,
          {
            headers: { 
              'user-id': user.user_id,
              'Authorization': `Bearer ${token}`
            }
          }
        );
        setAnalyticsData(response.data.analytics);
        setShowAnalytics(true);
        setShowGraph(false); // Hide graph when showing analytics
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics data.');
      }
    }
  };

  const getOverallProgress = () => {
    if (progressData.length === 0) return 0;
    const totalProgress = progressData.reduce((sum, item) => sum + item.completion_percentage, 0);
    return Math.round(totalProgress / progressData.length);
  };

  const getCompletedSubtopics = () => {
    return progressData.filter((item) => item.completion_percentage >= 75).length;
  };

  const getQuizzesTaken = () => {
    return totalQuizAttempts;
  };

  const getSortedProgressData = () => {
    return [...progressData].sort((a, b) => b.completion_percentage - a.completion_percentage);
  };

  // Helper function to format time in seconds to minutes and seconds

  const formatTime = (seconds) => {

    if (seconds <= 0) return 'N/A';

    

    if (seconds < 60) {

      return `${seconds}s`;

    }

    

    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = Math.round(seconds % 60);

    

    if (remainingSeconds === 0) {

      return `${minutes} min`;

    } else {

      return `${minutes} min ${remainingSeconds}s`;

    }

  };

  const chartData = {
    labels: getSortedProgressData().map((item) => item.subtopic_name),
    datasets: [
      {
        label: 'Completion Percentage',
        data: getSortedProgressData().map((item) => item.completion_percentage),
        backgroundColor: getSortedProgressData().map((item) =>
          item.completion_percentage >= 75
            ? 'rgba(40, 167, 69, 0.6)' // Green for completed
            : item.completion_percentage > 0
            ? 'rgba(255, 193, 7, 0.6)' // Yellow for in progress
            : 'rgba(220, 53, 69, 0.6)' // Red for not started
        ),
        borderColor: getSortedProgressData().map((item) =>
          item.completion_percentage >= 75
            ? 'rgba(40, 167, 69, 1)'
            : item.completion_percentage > 0
            ? 'rgba(255, 193, 7, 1)'
            : 'rgba(220, 53, 69, 1)'
        ),
        borderWidth: 2,
        borderRadius: 0,
        borderSkipped: false,
        minBarLength: 5,
        barPercentage: 0.45,
      },
    ],
  };

  const chartOptions = {
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Completion Percentage (%)',
          font: {
            size: 14,
            weight: 'bold',
          },
        },
        ticks: {
          callback: function (value) {
            return value + '%';
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Subtopics',
          font: {
            size: 14,
            weight: 'bold',
          },
        },
        ticks: {
          maxRotation: 0,
          minRotation: 0,
          callback: function (value, index, values) {
            const label = chartData.labels[index];
            if (typeof label !== 'string') return label;

            const words = label.split(' ');
            const maxCharsPerLine = 10;
            const lines = [];
            let currentLine = '';

            for (const word of words) {
              if (currentLine.length + word.length + 1 > maxCharsPerLine) {
                if (currentLine) lines.push(currentLine.trim());
                currentLine = word;
              } else {
                currentLine += (currentLine ? ' ' : '') + word;
              }
            }
            if (currentLine) lines.push(currentLine.trim());

            return lines;
          },
          font: {
            size: 12,
          },
          padding: 10,
        },
        grid: {
          display: false,
        },
      },
    },
    plugins: {
      legend: {
        display: false, // Disable the default legend
      },
      title: {
        display: true,
        text: `${selectedTopic ? `${selectedTopic} ` : ''}Subtopics Completion Progress`,
        font: {
          size: 18,
          weight: 'bold',
        },
        padding: 20,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const percentage = context.parsed.y;
            const dataIndex = context.dataIndex;
            const quizTaken = getSortedProgressData()[dataIndex]?.quiz_taken;
            const status =
              percentage >= 75 ? 'Completed ✅' : percentage > 0 ? 'In Progress 🔄' : 'Not Started ❌';
            return [
              `Completion: ${Math.round(percentage)}%`,
              `Status: ${status}`,
              `Quiz taken: ${quizTaken ? 'Yes ✅' : 'No ❌'}`,
            ];
          },
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderWidth: 1,
      },
    },
    maintainAspectRatio: false,
    responsive: true,
    animation: {
      delay: (context) => {
        return context.dataIndex * 100;
      },
      duration: 1000,
    },
  };

  if (!hasCompletedQuiz1) {
    return (
      <div className="dashboard-container">
        <h2>PROGRESS</h2>
        <div className="alert alert-info">
          <h3>🧠 Complete Quiz 1 to Get Started</h3>
          <p>Quiz 1 helps us understand your current level and customize your learning experience.</p>
          <p>It consists of 10 questions from various subjects and topics.</p>
          <button
            className="dashboard-button"
            onClick={() => navigate('/quiz1')}
            style={{ marginTop: '15px' }}
          >
            Take Quiz 1 Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h2>🎓 PROGRESS</h2>

      {error && <p className="error">⚠️ {error}</p>}

      {!selectedSubject ? (
        <div className="subject-selection-section">
          <h4>আপনার অগ্রগতি দেখুন! </h4>
          <div className="subject-cards">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="subject-card"
                onClick={() => handleSubjectClick(subject.name)}
              >
                <img
                  src={subjectImages[subject.name] || 'https://via.placeholder.com/150?text=Subject'}
                  alt={subject.name}
                  className="subject-image"
                />
                <h3>{subject.name}</h3>
                {subject.name === 'গণিত' && <p>নবম-দশম শ্রেণী</p>}
                {subject.name === 'উচ্চতর গণিত' && <p>নবম-দশম শ্রেণী</p>}
                {subject.name === 'English' && <p>Classes Nine and Ten</p>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="selection-section">
          <h4>আপনার অগ্রগতি দেখুন!</h4>
          <div className="selection-group">
            <label>Selected Subject:</label>
            <span className="selected-subject">{selectedSubject}</span>
            <button
              className="back-button"
              onClick={() => {
                setSelectedSubject('');
                navigate('/dashboard');
              }}
            >
              Change Subject
            </button>
          </div>

          <div className="selection-group">
            <label htmlFor="topic">Topic:</label>
            <select
              id="topic"
              value={selectedTopic}
              onChange={handleTopicChange}
              disabled={!selectedSubject}
            >
              <option value="">Choose a topic</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.name}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading your progress...</p>
        </div>
      )}

      {selectedSubject && selectedTopic && progressData.length > 0 && (
        <div className="progress-section">
          <h3>
            <span className="progress-title">Your Progress</span>
            <span className="progress-topic">{selectedTopic}</span>
          </h3>

          <div className="progress-summary">
            <div className="progress-stats-matrix">
              <div className="stat-box">
                <span className="stat-number">{getOverallProgress()}%</span>
                <span className="stat-label">Overall Progress</span>
              </div>
              <div className="stat-box">
                <span className="stat-number">{getCompletedSubtopics()}</span>
                <span className="stat-label">Completed Subtopics</span>
              </div>
              <div className="stat-box">
                <span className="stat-number">{getQuizzesTaken()}</span>
                <span className="stat-label">Quizzes Taken</span>
              </div>
              <div className="stat-box">
                <span className="stat-number">{progressData.length}</span>
                <span className="stat-label">Total Subtopics</span>
              </div>
            </div>
          </div>

          <div className="subtopics-section">
            <h3>Subtopics Score</h3>
            <div className="subtopics-list">
              {getSortedProgressData().map((item, index) => (
                <div key={index} className="subtopic-item">
                  <span className="subtopic-percentage">{Math.round(item.completion_percentage)}%</span>
                  <span className="subtopic-name">{item.subtopic_name}</span>
                </div>
              ))}
            </div>
            <div className="button-group">
              <button 
                className="graph-toggle-button" 
                onClick={() => {
                  setShowGraph(!showGraph);
                  setShowAnalytics(false);
                }}
              >
                {showGraph ? 'Hide Graph' : 'See Graph'}
              </button>
              <button 
                  className="analytics-toggle-button"
                  onClick={fetchAnalyticsData}
                >
                  Analytics
              </button>
            </div>
          </div>

          {showGraph && (
            <div className="chart-section">
              <div className="chart-header">
                <h4>Progress Graph</h4>
                <button 
                  className="close-graph-button"
                  onClick={() => setShowGraph(false)}
                >
                  ✕ Close
                </button>
              </div>
              <div className="chart-container">
                <Bar data={chartData} options={chartOptions} />
              </div>

              <div className="legend">
                <div className="legend-item">
                  <span className="legend-color completed"></span>
                  <span>
                    <strong>Completed (≥75%)</strong>
                  </span>
                </div>
                <div className="legend-item">
                  <span className="legend-color in-progress"></span>
                  <span>
                    <strong>In Progress (0%)</strong>
                  </span>
                </div>
                <div className="legend-item">
                  <span className="legend-color not-started"></span>
                  <span>
                    <strong>Not Started (0%)</strong>
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {showAnalytics && (
            <div className="analytics-section">
              <div className="analytics-header">
                <h4> Response Time Analytics</h4>
                <button 
                  className="close-analytics-button"
                  onClick={() => setShowAnalytics(false)}
                >
                  ✕ Close
                </button>
              </div>
              
              <div className="analytics-table-container">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Subtopic Name</th>
                      <th>Quiz Date</th>
                      <th>Avg Response<br />Time(sec)</th>
                      <th>Total Response<br />Time(sec)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.map((item, index) => (
                      <tr key={index}>
                        <td>{item.subtopic_name}</td>
                        <td>{item.quiz_date || 'No quiz taken'}</td>
                        <td>{formatTime(item.average_response_time)}</td>
                        <td>{formatTime(item.total_response_time)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedSubject && selectedTopic && progressData.length === 0 && !loading && (
        <div className="no-progress">
          <h4>📝 No Progress Data Available</h4>
          <p>
            <strong>No quiz data available for this topic yet.</strong>
          </p>
          <p>Start your learning journey by selecting subtopics and taking quizzes to see your progress here!</p>
          <p>
            💡 <em>Tip: Subtopics are considered "completed" when you score 75% or higher on quizzes.</em>
          </p>
          <button className="dashboard-button" onClick={handleStartLearning} style={{ marginTop: '15px' }}>
            Begin Learning Now
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;