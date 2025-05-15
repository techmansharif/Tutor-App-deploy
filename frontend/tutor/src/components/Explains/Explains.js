

// import React, { useEffect, useState, useRef } from 'react';
// import ReactMarkdown from 'react-markdown';
// import axios from 'axios';
// import AudioPlayer from '../AudioPlayer/AudioPlayer';
// import './Explains.css';
// import remarkMath from 'remark-math';
// import rehypeKatex from 'rehype-katex';
// import remarkGfm from 'remark-gfm';
// import 'katex/dist/katex.min.css';

// const Explains = ({
//   selectedSubject,
//   selectedTopic,
//   selectedSubtopic,
//   user,
//   API_BASE_URL,
//   onProceedToPractice
// }) => {
//   const [explainText, setExplainText] = useState('');
//   const [explainImage, setExplainImage] = useState(null);
//   const [isExplainLoading, setIsExplainLoading] = useState(false);
//   const [explainFinished, setExplainFinished] = useState(false);
//   const initialFetchRef = useRef(false);

//   // Fetch explanation when component mounts (initial "continue" query)
//   // Use a ref to track if we've already fetched to prevent duplicate requests
//   useEffect(() => {
//     if (!initialFetchRef.current) {
//       initialFetchRef.current = true;
//       fetchExplain("continue");
//     }
    
//     return () => {
//       // Cleanup logic if needed (e.g., cancel pending requests)
//     };
//   }, []); // Empty dependency array - runs once on mount

//   // Helper function to process the explanation text
//   const processExplanation = (text) => {
//     // Minimal preprocessing: only replace bullet points, avoid touching LaTeX
//     let processed = text.replace(/\n\s*\*\s+/g, '\n• ');
//     processed = processed.replace(/\n\n/g, '\n\n'); // Normalize newlines
//     return processed;
//   };

//   // Fetch explanation from API
//   const fetchExplain = async (query) => {
//     setIsExplainLoading(true);
//     try {
//       const response = await axios.post(
//         `${API_BASE_URL}/${selectedSubject}/${selectedTopic}/${selectedSubtopic}/explains/`,
//         { query },
//         {
//           headers: { 'user-id': user.user_id },
//           withCredentials: true
//         }
//       );
      
//       if (response.data.answer === "Congratulations, you have mastered the topic!") {
//         setExplainFinished(true);
//         setExplainText(response.data.answer); // Store the message
//         setExplainImage(null);
//       } else {
//         setExplainText(response.data.answer);
//         setExplainImage(response.data.image);
//       }
//     } catch (error) {
//       console.error('Error fetching explanation:', error);
//       alert('Error fetching explanation. Please try again.');
//     } finally {
//       setIsExplainLoading(false);
//     }
//   };

//   // Handle moving to next explanation
//   const handleContinueExplain = () => {
//     fetchExplain("continue");
//   };

//   // Handle asking for explanation again
//   const handleExplainAgain = () => {
//     fetchExplain("Explain");
//   };

//   return (
//   <ReactMarkdown
//   children="$b^2 - 4ac$"// The text containing LaTeX, e.g., "$b^2 - 4ac$"
//   remarkPlugins={[remarkMath]} // Processes LaTeX syntax
//   rehypePlugins={[rehypeKatex]} // Renders LaTeX to HTML using KaTeX
// />
//   );
// };

// export default Explains;




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
  }, []); // Empty dependency array - runs once on mount

  // Helper function to process the explanation text
  const processExplanation = (text) => {
    // Minimal preprocessing: only replace bullet points, avoid touching LaTeX
    let processed = text.replace(/\n\s*\*\s+/g, '\n• ');
    processed = processed.replace(/\n\n/g, '\n\n'); // Normalize newlines
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
            children={explainText} // Pass raw text directly
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


// import React, { useEffect, useState, useRef } from 'react';
// import ReactMarkdown from 'react-markdown';
// import axios from 'axios';
// import AudioPlayer from '../AudioPlayer/AudioPlayer';
// import './Explains.css';
// import remarkMath from 'remark-math';
// import rehypeKatex from 'rehype-katex';
// import remarkGfm from 'remark-gfm';
// import 'katex/dist/katex.min.css';

// const Explains = ({
//   selectedSubject,
//   selectedTopic,
//   selectedSubtopic,
//   user,
//   API_BASE_URL,
//   onProceedToPractice
// }) => {
//   const [explainText, setExplainText] = useState('');
//   const [explainImage, setExplainImage] = useState(null);
//   const [isExplainLoading, setIsExplainLoading] = useState(false);
//   const [explainFinished, setExplainFinished] = useState(false);
//   const initialFetchRef = useRef(false);

//   // Fetch explanation when component mounts (initial "continue" query)
//   // Use a ref to track if we've already fetched to prevent duplicate requests
//   useEffect(() => {
//     if (!initialFetchRef.current) {
//       initialFetchRef.current = true;
//       fetchExplain("continue");
//     }
    
//     return () => {
//       // Cleanup logic if needed (e.g., cancel pending requests)
//     };
//   }, []); // Empty dependency array - runs once on mount

//   // Helper function to process the explanation text
//   const processExplanation = (text) => {
//     let processed = text.replace(/\n\s*\*\s+/g, '\n• ');
//     processed = processed.replace(/\n\n/g, '\n\n');
//     return processed;
//   };

//   // Fetch explanation from API
//   const fetchExplain = async (query) => {
//     setIsExplainLoading(true);
//     try {
//       const response = await axios.post(
//         `${API_BASE_URL}/${selectedSubject}/${selectedTopic}/${selectedSubtopic}/explains/`,
//         { query },
//         {
//           headers: { 'user-id': user.user_id },
//           withCredentials: true
//         }
//       );
      
//       if (response.data.answer === "Congratulations, you have mastered the topic!") {
//         setExplainFinished(true);
//         setExplainText(response.data.answer); // Store the message
//         setExplainImage(null);
//       } else {
//         setExplainText(response.data.answer);
//         setExplainImage(response.data.image);
//       }
//     } catch (error) {
//       console.error('Error fetching explanation:', error);
//       alert('Error fetching explanation. Please try again.');
//     } finally {
//       setIsExplainLoading(false);
//     }
//   };

//   // Handle moving to next explanation
//   const handleContinueExplain = () => {
//     fetchExplain("continue");
//   };

//   // Handle asking for explanation again
//   const handleExplainAgain = () => {
//     fetchExplain("Explain");
//   };

//   return (
//     <div className="explains-component-container">
//       <h2>Learning: {selectedSubject} - {selectedTopic} - {selectedSubtopic}</h2>
      
//       {isExplainLoading ? (
//         <div className="loading-component">
//           <div className="loading-spinner-component"></div>
//           <p>Loading explanation...</p>
//         </div>
//       ) : (
//         <div className="explanation-content-component">
//           <ReactMarkdown
//             children={processExplanation(explainText)}
//             remarkPlugins={[remarkMath, remarkGfm]}
//             rehypePlugins={[rehypeKatex]}
//             components={{
//               table: ({node, ...props}) => (
//                 <div className="table-container">
//                   <table {...props} className="markdown-table" />
//                 </div>
//               ),
//               code: ({node, inline, className, children, ...props}) => {
//                 return inline ? (
//                   <code className={className} {...props}>
//                     {children}
//                   </code>
//                 ) : (
//                   <div className="code-block-container">
//                     <pre>
//                       <code className={className} {...props}>
//                         {children}
//                       </code>
//                     </pre>
//                   </div>
//                 );
//               }
//             }}
//           />
//           {explainImage && (
//             <div className="explanation-image-component">
//               <img
//                 src={`data:image/png;base64,${explainImage}`}
//                 alt="Explanation diagram"
//                 style={{ maxWidth: '100%', marginTop: '20px' }}
//               />
//             </div>
//           )}
//           {explainText && !explainFinished && (
//             <AudioPlayer text={explainText} />
//           )}
//         </div>
//       )}
      
//       <div className="explain-controls-component">
//         {explainFinished ? (
//           <button onClick={onProceedToPractice} className="primary-button-component">
//             Start Practice
//           </button>
//         ) : (
//           <>
//             <button onClick={handleContinueExplain} className="primary-button-component">
//               Let's Move On
//             </button>
//             <button onClick={handleExplainAgain} className="secondary-button-component">
//               Explain Once Again
//             </button>
//           </>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Explains;