import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Selection.css';
import { useNavigate } from 'react-router-dom';

const Selection = ({ user, API_BASE_URL, onSelectionSubmit,  onSelectionChange, initialValues }) => {
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subtopics, setSubtopics] = useState([]);
  // const [selectedSubject, setSelectedSubject] = useState('');
  // const [selectedTopic, setSelectedTopic] = useState('');
  // const [selectedSubtopic, setSelectedSubtopic] = useState('');
  // Replace the useState declarations in Selection.js with:
const [selectedSubject, setSelectedSubject] = useState(initialValues?.selectedSubject || '');
const [selectedTopic, setSelectedTopic] = useState(initialValues?.selectedTopic || '');
const [selectedSubtopic, setSelectedSubtopic] = useState(initialValues?.selectedSubtopic || '');
const navigate = useNavigate();

  // Fetch subjects when the component mounts
  useEffect(() => {
    const fetchSubjects = async () => {
     try {
    const response = await axios.get(`${API_BASE_URL}/subjects/`, {
      headers: { 'user-id': user.user_id },
      withCredentials: true
    });
    
    // Filter out unwanted subjects
    const filteredSubjects = response.data.filter(subject => 
      !['Higher Math', 'General Math', 'quiz1'].includes(subject.name)
    );
    
    setSubjects(filteredSubjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    alert('Error fetching subjects. Please try again.');
  }
};
    fetchSubjects();
  }, [API_BASE_URL, user.user_id, navigate]);

  // Fetch topics when a subject is selected
  useEffect(() => {
    if (selectedSubject) {
      const fetchTopics = async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/${selectedSubject}/topics/`, {
            headers: { 'user-id': user.user_id },
            withCredentials: true
          });
          let sortedTopics;
          if  (selectedSubject !== "English") {
              sortedTopics = response.data.sort((a, b) => a.name.localeCompare(b.name, 'bn', { numeric: true }));
            } else {
              sortedTopics=response.data;
            }
          setTopics(sortedTopics);
        } catch (error) {
          console.error('Error fetching topics:', error);
          alert('Error fetching topics. Please try again.');
        }
      };
      fetchTopics();
    }
  }, [selectedSubject, API_BASE_URL, user, navigate]);

  // Fetch subtopics when a topic is selected
  useEffect(() => {
    if (selectedTopic && selectedSubject) {
      const fetchSubtopics = async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/${selectedSubject}/${selectedTopic}/subtopics/`, {
            headers: { 'user-id': user.user_id },
            withCredentials: true
          });
          setSubtopics(response.data);
        } catch (error) {
          console.error('Error fetching subtopics:', error);
          alert('Error fetching subtopics. Please try again.');
        }
      };
      fetchSubtopics();
    }
  }, [selectedTopic, selectedSubject, API_BASE_URL, user.user_id]);
// Update App.js whenever selections change
useEffect(() => {
  if (onSelectionChange) {
    onSelectionChange({
      selectedSubject,
      selectedTopic,
      selectedSubtopic
    });
  }
}, [selectedSubject, selectedTopic, selectedSubtopic, onSelectionChange]);


  // Handle form submission for confirmation
  const handleConfirmSelection = async (e) => {
    e.preventDefault();
    if (!selectedSubject || !selectedTopic || !selectedSubtopic) {
      alert('Please select a subject, topic, and subtopic');
      return;
    }

    try {
      // Make the selection API call
      const response = await axios.post(
        `${API_BASE_URL}/select/`,
        { subject: selectedSubject, topic: selectedTopic, subtopic: selectedSubtopic },
        {
          headers: { 'user-id': user.user_id },
          withCredentials: true
        }
      );

      // Notify App.js of the confirmed selection
      onSelectionSubmit({ selectedSubject, selectedTopic, selectedSubtopic });
      
      // Store selections in localStorage
      localStorage.setItem(
        'selectedValues',
        JSON.stringify({ selectedSubject, selectedTopic, selectedSubtopic })
      );
      // Navigate to Explains route
      //navigate('/explains');
    } catch (error) {
      console.error('Error during selection:', error);
      if (error.response) {

        alert(`Error: ${error.response.status} - ${error.response.data.message || 'Server error'}`);

      } else if (error.request) {

        alert('Network error: Unable to reach the server. Please check your connection or server status.');

      } else {

        alert(`Error: ${error.message}`);

      }
    }
  };

  return (
    <div className="selection-component-container">
      <h2>Please Select</h2>
      <form onSubmit={handleConfirmSelection}>
        <div className="selection-group-component">
          <label>Subject</label>
          <select
            value={selectedSubject}
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setSelectedTopic('');
              setSelectedSubtopic('');
            }}
            required
          >
            <option value="">Select a Subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.name}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        <div className="selection-group-component">
          <label>Topic</label>
          <select
            value={selectedTopic}
            onChange={(e) => {
              setSelectedTopic(e.target.value);
              setSelectedSubtopic('');
            }}
            disabled={!selectedSubject}
            required
          >
            <option value="">Select a Topic</option>
            {topics.map((topic) => (
                     <option 
                        key={topic.id} 
                        value={topic.name}
                        disabled={!topic.has_questions}
                        style={{
                          color: topic.has_questions ? '#1a6c7b' : '#cccccc',
                          backgroundColor: topic.has_questions ? 'white' : '#f5f5f5'
                        }}
                      >
                        {topic.name} {!topic.has_questions ? '(No questions available)' : ''}
                     </option>
            ))}
          </select>
        </div>

        <div className="selection-group-component">
          <label>Subtopic</label>
          <select
            value={selectedSubtopic}
            onChange={(e) => setSelectedSubtopic(e.target.value)}
            disabled={!selectedTopic}
            required
          >
            <option value="">Select a Subtopic</option>
            {subtopics.map((subtopic) => (
              <option key={subtopic.id} value={subtopic.name}>
                {subtopic.name}
              </option>
            ))}
          </select>
        </div>
        
       {/* <button type="submit" className="selection-submit-button">
           Confirm Selection
        </button> */} 
      </form>
    </div>
  );
};

export default Selection;