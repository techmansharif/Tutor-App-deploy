import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import AudioPlayer from '../AudioPlayer/AudioPlayer';
import { processExplanation } from '../ProcessText/ProcessExplain'; 
import './Explains.css';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

const Explains = ({
  selectedSubject,
  selectedTopic,
  selectedSubtopic,
  user, 
  API_BASE_URL,
  onProceedToPractice
}) => {
  const [explanationHistory, setExplanationHistory] = useState([]);
  const [isExplainLoading, setIsExplainLoading] = useState(false);
  const [explainFinished, setExplainFinished] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const initialFetchRef = useRef(false);
  const explanationContainerRef = useRef(null);
  const [previousHistoryLength, setPreviousHistoryLength] = useState(0); // Add this

  useEffect(() => {
    if (!initialFetchRef.current) {
      initialFetchRef.current = true;
      fetchExplain("explain", true);
    }
    
    return () => {
      // Cleanup logic if needed
    };
  }, []);

useEffect(() => {
  if (explanationContainerRef.current && explanationHistory.length > previousHistoryLength) {
    // Only scroll when new content is added (not during loading)
    if (!isExplainLoading) {
      const container = explanationContainerRef.current;
      const entries = container.querySelectorAll('.explanation-entry');
      
      if (entries.length > 0) {
        // Scroll to the start of the newest entry
        const newestEntry = entries[entries.length - 1];
        newestEntry.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
      
      setPreviousHistoryLength(explanationHistory.length);
    }
  }
}, [explanationHistory, isExplainLoading, previousHistoryLength]);
  const fetchExplain = async (query, isInitial = false) => {
    setIsExplainLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/${selectedSubject}/${selectedTopic}/${selectedSubtopic}/explains/`,
        { query, is_initial: isInitial },
        {
          headers: { 'user-id': user.user_id },
          withCredentials: true
        }
      );
      
      if (response.data.answer === "Congratulations, you have mastered the topic!") {
        setExplainFinished(true);
        setExplanationHistory((prev) => [
          ...prev,
          { text: response.data.answer, image: null }
        ]);
      } else if (response.data.initial_response && isInitial) {
        // Handle initial response with previous answers from chat_memory
        const answers = response.data.initial_response.map(answer => ({
          text: answer,
          image: null
        }));
        setExplanationHistory((prev) => [...prev, ...answers]);
      } else {
        setExplanationHistory((prev) => [
          ...prev,
          { text: response.data.answer, image: response.data.image }
        ]);
      }
    } catch (error) {
      console.error('Error fetching explanation:', error);
      alert('Error fetching explanation. Please try again.');
    } finally {
      setIsExplainLoading(false);
    }
  };

  const handleContinueExplain = () => {
    fetchExplain("continue");
  };

  const handleExplainAgain = () => {
    fetchExplain("explain");
  };

  const handleCustomQuery = () => {
    if (userQuery.trim()) {
      fetchExplain(userQuery);
      setUserQuery('');
    }
  };

  const handleRefresh = () => {
    setExplanationHistory([]);
    setExplainFinished(false);
      setPreviousHistoryLength(0); // Add this line
    fetchExplain("refresh");
  };

  return (
    <div className="explains-component-container">
      <h2>Learning: {selectedSubject} - {selectedTopic} - {selectedSubtopic}</h2>


<div className="button-row">
  <div className="button-with-text">
    <button onClick={handleContinueExplain} className="primary-button-component">
    </button>
    <span className="button-label-1">Go To<br/>Next Topic</span>
  </div>

  <div className="button-with-text">
    <button onClick={handleExplainAgain} className="secondary-button-component">
    </button>
    <span className="button-label-2">Explain again but<br/>differently (AI)</span>
  </div>

  <div className="refresh-button-group">
    <button onClick={handleRefresh} className="restart-button-component">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18A2 2 0 0 0 3.54 21H20.46A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z" stroke="#FF0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="button-text">Refresh <br/>Screen</span>
    </button>
  </div>
</div>

      <div
        className="explanation-content-component chat-container"
        ref={explanationContainerRef}
      >
        {explanationHistory.map((entry, index) => (
          <div key={index} className="explanation-entry">
               <div className="audio-player-container"><AudioPlayer text={processExplanation(entry.text)} /> </div>
            <ReactMarkdown
              children={processExplanation(entry.text)}
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                table: ({node, ...props}) => (
                  <div className="table-container">
                    <table {...props} className="markdown-table" />
                  </div>
                ),
                code: ({node, inline, className, children, ...props}) => {
                  return inline ? (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  ) : (
                    <div className="code-block-container">
                      <pre>
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    </div>
                  );
                }
              }}
            />
            {entry.image && (
              <div className="explanation-image-component">
                <img
                  src={`data:image/png;base64,${entry.image}`}
                  alt="Explanation diagram"
                  style={{ maxWidth: '100%', marginTop: '20px' }}
                />
              </div>
            )}
          </div>
        ))}
        {isExplainLoading && (
          <div className="loading-component">
            <div className="loading-spinner-component"></div>
            <p>Loading explanation...</p>
          </div>
        )}
      </div>
      
    <div className="explain-controls-component">
  {explainFinished ? (
    <button onClick={onProceedToPractice} className="primary-button-component">
      Start Practice
    </button>
  ) : (
    <>
      <div className="custom-query-container">
        <textarea
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          placeholder="Ask a question..."
          className="custom-query-input"
          rows="1"
          onInput={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
        />
        <button onClick={handleCustomQuery} className="custom-query-button">
          Submit
        </button>
      </div>
    </>
  )}
</div>
    </div>
  );
};

export default Explains;