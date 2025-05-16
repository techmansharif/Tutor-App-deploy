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
  const [explainText, setExplainText] = useState('');
  const [explainImage, setExplainImage] = useState(null);
  const [isExplainLoading, setIsExplainLoading] = useState(false);
  const [explainFinished, setExplainFinished] = useState(false);
  const [userQuery, setUserQuery] = useState(''); // New state for user input
  const initialFetchRef = useRef(false);

  // Fetch explanation when component mounts (initial "continue" query)
  useEffect(() => {
    if (!initialFetchRef.current) {
      initialFetchRef.current = true;
      fetchExplain("continue");
    }
    
    return () => {
      // Cleanup logic if needed (e.g., cancel pending requests)
    };
  }, []);

// Helper function to process the explanation text
  const processExplanation = (text) => {
    let processed = text;

    // Step 1: Fix missing closing dollar signs within backticks
    processed = processed.replace(/`(\$+)([^`$]*?)(?=`)/g, (match, p1, p2) => {
      // p1: The opening dollar signs ($ or $$)
      // p2: The content inside (e.g., b^2 - 4ac)
      // If p2 doesn't contain a closing $, add one matching p1
      if (!p2.includes('$')) {
        return `\`${p1}${p2}${p1}\``;
      }
      return match;
    });

    // Step 2: Normalize mismatched dollar signs within backticks
    processed = processed.replace(/`(\$+)([^$]*?)(\$+)([^`]*?)`/g, (match, p1, p2, p3, p4) => {
      // p1: Opening dollar signs ($ or $$)
      // p2: LaTeX expression (e.g., x)
      // p3: Closing dollar signs ($ or $$)
      // p4: Additional text after LaTeX (e.g., -axis)
      const dollarCount = Math.min(p1.length, p3.length);
      const dollars = '$'.repeat(dollarCount);
      return `\`${dollars}${p2}${dollars}${p4}\``;
    });

    // Step 3: Remove single quotes or backticks surrounding LaTeX expressions (both $...$ and $$...$$), even with spaces
    processed = processed.replace(/(['`])\s*(\$+)([^\$]*)\2\s*\1/g, '$2$3$2');

    // Step 4: Remove backticks from LaTeX expressions followed by additional text
    processed = processed.replace(/`(\$+)([^$]*?)(\$+)([^`]*?)`/g, (match, p1, p2, p3, p4) => {
      return `${p1}${p2}${p3}${p4}`;
    });

    // Step 5: Normalize mismatched dollar signs in the entire text (after backticks are removed)
    processed = processed.replace(/(\$+)([^$]*?)(\$+)/g, (match, p1, p2, p3) => {
      const dollarCount = Math.min(p1.length, p3.length);
      const dollars = '$'.repeat(dollarCount);
      return `${dollars}${p2}${dollars}`;
    });

    // Step 6: Remove backticks from single words that do not contain a $ (LaTeX indicator)
    processed = processed.replace(/`([^$\s]*?)`/g, (match, p1) => {
      if (p1.includes('$')) {
        return match;
      }
      return p1;
    });

    // Step 7: No need to replace * with •; keep * for markdown list parsing
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
  // Fetch explanation from API
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
        setExplainText(response.data.answer);
        setExplainImage(null);
      } else {
        setExplainText(response.data.answer);
        setExplainImage(response.data.image);
      }
    } catch (error) {
      console.error('Error fetching explanation:', error);
      alert('Error fetching explanation. Please try again.');
    } finally {
      setIsExplainLoading(false);
    }
  };

  // Handle moving to next explanation
  const handleContinueExplain = () => {
    fetchExplain("continue");
  };

  // Handle asking for explanation again
  const handleExplainAgain = () => {
    fetchExplain("Explain");
  };

  // Handle custom user query
  const handleCustomQuery = () => {
    if (userQuery.trim()) { // Only fetch if the query is not empty
      fetchExplain(userQuery);
      setUserQuery(''); // Clear the input after submission
    }
  };

  return (
    <div className="explains-component-container">
      <h2>Learning: {selectedSubject} - {selectedTopic} - {selectedSubtopic}</h2>
      
      {isExplainLoading ? (
        <div className="loading-component">
          <div className="loading-spinner-component"></div>
          <p>Loading explanation...</p>
        </div>
      ) : (
        <div className="explanation-content-component">
          <ReactMarkdown
            children={processExplanation(explainText)}
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
          {explainImage && (
            <div className="explanation-image-component">
              <img
                src={`data:image/png;base64,${explainImage}`}
                alt="Explanation diagram"
                style={{ maxWidth: '100%', marginTop: '20px' }}
              />
            </div>
          )}
          {explainText && !explainFinished && (
            <AudioPlayer text={processExplanation(explainText)} />
          )}
        </div>
      )}
      
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