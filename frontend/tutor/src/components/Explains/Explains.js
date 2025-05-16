import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import AudioPlayer from '../AudioPlayer/AudioPlayer';
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

  useEffect(() => {
    if (!initialFetchRef.current) {
      initialFetchRef.current = true;
      fetchExplain("continue");
    }
    
    return () => {
      // Cleanup logic if needed
    };
  }, []);

  useEffect(() => {
    if (explanationContainerRef.current) {
      explanationContainerRef.current.scrollTop = explanationContainerRef.current.scrollHeight;
    }
  }, [explanationHistory, isExplainLoading]); // Also scroll when loading state changes

  const processExplanation = (text) => {
    let processed = text;

    processed = processed.replace(/`(\$+)([^`$]*?)(?=`)/g, (match, p1, p2) => {
      if (!p2.includes('$')) {
        return `\`${p1}${p2}${p1}\``;
      }
      return match;
    });

    processed = processed.replace(/`(\$+)([^$]*?)(\$+)([^`]*?)`/g, (match, p1, p2, p3, p4) => {
      const dollarCount = Math.min(p1.length, p3.length);
      const dollars = '$'.repeat(dollarCount);
      return `\`${dollars}${p2}${dollars}${p4}\``;
    });

    processed = processed.replace(/(['`])\s*(\$+)([^\$]*)\2\s*\1/g, '$2$3$2');

    processed = processed.replace(/`(\$+)([^$]*?)(\$+)([^`]*?)`/g, (match, p1, p2, p3, p4) => {
      return `${p1}${p2}${p3}${p4}`;
    });

    processed = processed.replace(/(\$+)([^$]*?)(\$+)/g, (match, p1, p2, p3) => {
      const dollarCount = Math.min(p1.length, p3.length);
      const dollars = '$'.repeat(dollarCount);
      return `${dollars}${p2}${dollars}`;
    });

    processed = processed.replace(/`([^$\s]*?)`/g, (match, p1) => {
      if (p1.includes('$')) {
        return match;
      }
      return p1;
    });

    const lines = processed.split('\n');
    processed = lines
      .map((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('*')) {
          const indent = line.match(/^\s*/)[0];
          return `${indent}* ${trimmedLine.slice(1).trim()}`;
        }
        return line;
      })
      .join('\n');

    console.log(processed);
    return processed;
  };

  const fetchExplain = async (query) => {
    setIsExplainLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/${selectedSubject}/${selectedTopic}/${selectedSubtopic}/explains/`,
        { query },
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
    fetchExplain("Explain");
  };

  const handleCustomQuery = () => {
    if (userQuery.trim()) {
      fetchExplain(userQuery);
      setUserQuery('');
    }
  };

  return (
    <div className="explains-component-container">
      <h2>Learning: {selectedSubject} - {selectedTopic} - {selectedSubtopic}</h2>
      
      <div
        className="explanation-content-component chat-container"
        ref={explanationContainerRef}
      >
        {explanationHistory.map((entry, index) => (
          <div key={index} className="explanation-entry">
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
            {!explainFinished && (
              <AudioPlayer text={processExplanation(entry.text)} />
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
            <button onClick={handleContinueExplain} className="primary-button-component">
              Let's Move On
            </button>
            <button onClick={handleExplainAgain} className="secondary-button-component">
              Explain Once Again
            </button>
            <div className="custom-query-container">
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Ask a question..."
                className="custom-query-input"
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