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
  const initialFetchRef = useRef(false);

  // Fetch explanation when component mounts (initial "continue" query)
  // Use a ref to track if we've already fetched to prevent duplicate requests
  useEffect(() => {
    if (!initialFetchRef.current) {
      initialFetchRef.current = true;
      fetchExplain("continue");
    }
    
    return () => {
      // Cleanup logic if needed (e.g., cancel pending requests)
    };
  }, []); // Empty dependency array - runs încep

// Helper function to process the explanation text
  const processExplanation = (text) => {
    // Step 1: Remove single quotes or backticks surrounding LaTeX expressions (both $...$ and $$...$$), even with spaces
    let processed = text.replace(/(['`])\s*(\$+)([^\$]*)\2\s*\1/g, '$2$3$2');

    // Step 2: Remove backticks from LaTeX expressions followed by additional text
    // Matches patterns like `$X$-axis` or `$$X$$-axis` inside backticks
    processed = processed.replace(/`(\$+)([^\$]*)\1([^`]*?)`/g, (match, p1, p2, p3) => {
      // p1: The dollar signs ($ or $$)
      // p2: The LaTeX expression (e.g., X)
      // p3: The additional text after the LaTeX (e.g., -axis)
      return `${p1}${p2}${p1}${p3}`; // Reconstruct without backticks
    });

    // Step 3: Remove backticks from single words that do not contain a $ (LaTeX indicator)
    processed = processed.replace(/`([^$\s]*?)`/g, (match, p1) => {
      if (p1.includes('$')) {
        return match;
      }
      return p1;
    });

    // Step 4: No need to replace * with •; keep * for markdown list parsing
    // We can trim lines to clean up extra spaces, but keep the * intact
    const lines = processed.split('\n');
    processed = lines
      .map((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('*')) {
          const indent = line.match(/^\s*/)[0]; // Preserve indentation
          return `${indent}* ${trimmedLine.slice(1).trim()}`; // Ensure clean formatting
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
        setExplainText(response.data.answer); // Store the message
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
            children={processExplanation(explainText)} // Apply processing for consistent LaTeX rendering
            remarkPlugins={[remarkGfm, remarkMath]} // Ensure remarkMath processes LaTeX
            rehypePlugins={[rehypeKatex]} // Ensure rehypeKatex renders LaTeX
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
            <AudioPlayer text={processExplanation(explainText)} /> // Apply processing only for AudioPlayer
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
          </>
        )}
      </div>
    </div>
  );
};

export default Explains;