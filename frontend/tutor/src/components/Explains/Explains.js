import React, { useEffect, useState, useRef,memo } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import AudioPlayer from '../AudioPlayer/AudioPlayer';
import { processExplanation, preprocessMath, postprocessMath } from '../ProcessText/ProcessExplain';
import './Explains.css';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { trackInteraction, INTERACTION_TYPES } from '../../utils/trackInteractions';


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
  const [nextId, setNextId] = useState(1);
  const [explainFinished, setExplainFinished] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const initialFetchRef = useRef(false);
  const explanationContainerRef = useRef(null);
  const [previousHistoryLength, setPreviousHistoryLength] = useState(0); // Add this
  const [newlyAddedIndices, setNewlyAddedIndices] = useState(new Set());
 const [explainAgainIndices, setExplainAgainIndices] = useState(new Set());


const createProcessedEntry = (text, image = null, isNewest = false, isExplainAgain = false) => {
  const entry = {
    id: nextId,
    text,
    processedText: processExplanation(text),
    image,
    isNewest,
    isExplainAgain
  };
  setNextId(prev => prev + 1);
  return entry;
};

  useEffect(() => {
    if (!initialFetchRef.current) {
      initialFetchRef.current = true;
         trackInteraction(INTERACTION_TYPES.EXPLAIN_PAGE_LOADED, {
      subject: selectedSubject,
      topic: selectedTopic,
      subtopic: selectedSubtopic
    }, user.user_id, API_BASE_URL);
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
        const container = explanationContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        const entryRect = newestEntry.getBoundingClientRect();
        const scrollOffset = entryRect.top - containerRect.top;

        container.scrollTo({
          top: container.scrollTop + scrollOffset,
          behavior: 'smooth'
        });
      }
      
      setPreviousHistoryLength(explanationHistory.length);
    }
  }
}, [explanationHistory, isExplainLoading, previousHistoryLength]);



const stopAllAudio = () => {
  // Stop all audio players - they'll handle their own cleanup
  const audioElements = document.querySelectorAll('audio');
  audioElements.forEach(audio => {
    audio.pause();
    audio.currentTime = 0;
  });
};

const fetchExplain = async (query, isInitial = false, isExplainAgain = false) => {
  setIsExplainLoading(true);
  // Add this scroll logic right after setting loading to true
  if (!isInitial && explanationContainerRef.current) {
    setTimeout(() => {
      const container = explanationContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }, 100); // Small delay to ensure loading component is rendered
  }
  
  const token = localStorage.getItem('access_token');
   // URL encode the path parameters to handle special characters
      const encodedSubject = encodeURIComponent(selectedSubject);
      const encodedTopic = encodeURIComponent(selectedTopic);
      const encodedSubtopic = encodeURIComponent(selectedSubtopic);
  
  // First, try a regular request to check if it's a streaming response
  try {
    const response = await fetch(
      `${API_BASE_URL}/${encodedSubject}/${encodedTopic}/${encodedSubtopic}/explains/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.user_id,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query, is_initial: isInitial })
      }
    );

    // Check if it's a streaming response
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let imageData = null;
      let entryIndex = -1;

    // Add placeholder entry for streaming content
    setExplanationHistory((prev) => {
      const entry = createProcessedEntry('', null, !isExplainAgain, isExplainAgain);
      const newHistory = [...prev, entry];
      entryIndex = newHistory.length - 1;
      if (isExplainAgain) {
        setExplainAgainIndices(new Set([entryIndex]));
        setNewlyAddedIndices(new Set());
      } else {
        setNewlyAddedIndices(new Set([entryIndex]));
        setExplainAgainIndices(new Set());
      }
      return newHistory;
    });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.content) {
                // Accumulate text content
                accumulatedText += data.content;
                // Update the entry with accumulated text
            // Update the entry with accumulated text
             // Update with image
setExplanationHistory((prev) => {
  const newHistory = [...prev];
  newHistory[entryIndex] = {
    ...newHistory[entryIndex],
    text: accumulatedText,
    processedText: processExplanation(accumulatedText),
    image: imageData
  };
  return newHistory;
});
              } else if (data.image) {
  // Store image data
  imageData = data.image;
  // Update with image
  setExplanationHistory((prev) => {
    const newHistory = [...prev];
    newHistory[entryIndex] = {
      ...newHistory[entryIndex],
      text: accumulatedText,
      processedText: processExplanation(accumulatedText),
      image: imageData
    };
    return newHistory;
  });
              } else if (data.status === 'complete') {
                // Streaming complete
                break;
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } else {
      // Handle regular JSON response (pre-generated, errors, etc.)
      const data = await response.json();
      
  if (data.answer === "Congratulations, you have mastered the topic!") {
  setExplainFinished(true);
  setExplanationHistory((prev) => {
    const entry = createProcessedEntry(data.answer, data.image, !isExplainAgain, false);
    const newHistory = [...prev, entry];
    if (!isExplainAgain) {
      setNewlyAddedIndices(new Set([newHistory.length - 1]));
    }
    return newHistory;
  });
} else if (data.initial_response && isInitial) {
  // Handle initial response with previous answers from chat_memory
  const answers = data.initial_response.map(answerObj => 
    createProcessedEntry(answerObj.text, answerObj.image, false, false)
  );
  setExplanationHistory((prev) => [...prev, ...answers]);
} else {
  setExplanationHistory((prev) => {
    const entry = createProcessedEntry(data.answer, data.image, !isExplainAgain, isExplainAgain);
    const newHistory = [...prev, entry];
    if (isExplainAgain) {
      setExplainAgainIndices(new Set([newHistory.length - 1]));
      setNewlyAddedIndices(new Set());
    } else if (!isExplainAgain) {
      setNewlyAddedIndices(new Set([newHistory.length - 1]));
      setExplainAgainIndices(new Set());
    }
    return newHistory;
  });
}
    }
  } catch (error) {
    console.error('Error fetching explanation:', error);
    alert('Error fetching explanation. Please try again.');
  } finally {
    setIsExplainLoading(false);
  }
};
  const handleContinueExplain = () => {
      stopAllAudio();
          trackInteraction(INTERACTION_TYPES.CONTINUE_CLICKED, {
      subject: selectedSubject,
      topic: selectedTopic,
      subtopic: selectedSubtopic
    }, user.user_id, API_BASE_URL);
    fetchExplain("continue");
  };

  const handleExplainAgain = () => {
      stopAllAudio();
       trackInteraction(INTERACTION_TYPES.EXPLAIN_AGAIN_CLICKED, {
      subject: selectedSubject,
      topic: selectedTopic,
      subtopic: selectedSubtopic
    }, user.user_id, API_BASE_URL);
    fetchExplain("explain",false,true);
  };

  const handleCustomQuery = () => {
  
    if (userQuery.trim()) {
        stopAllAudio();
          trackInteraction(INTERACTION_TYPES.CUSTOM_QUERY_SUBMITTED, {
        subject: selectedSubject,
        topic: selectedTopic,
        subtopic: selectedSubtopic,
        query: userQuery
      }, user.user_id, API_BASE_URL);
      fetchExplain(userQuery);
      setUserQuery('');
    }
  };

  const handleRefresh = () => {
  trackInteraction(INTERACTION_TYPES.REFRESH_CLICKED, {
  subject: selectedSubject,
  topic: selectedTopic,
  subtopic: selectedSubtopic,
  historyLength: explanationHistory.length
}, user.user_id, API_BASE_URL);
  setExplanationHistory([]);
  setExplainFinished(false);
    setPreviousHistoryLength(0);
      setNewlyAddedIndices(new Set());
setExplainAgainIndices(new Set());
  setNextId(1); // Add this line
  fetchExplain("refresh");
};

  // Memoized component for individual entries
  const ExplanationEntry = memo(({ entry, selectedSubject }) => {
    return (
      <div className={`explanation-entry ${entry.isNewest ? 'newest-entry' : ''} ${entry.isExplainAgain ? 'explain-again-entry' : ''}`}>
        <div className="audio-player-container">
          <AudioPlayer text={processExplanation(entry.text)} API_BASE_URL={API_BASE_URL} user={user} />
        </div>
        <ReactMarkdown
          children={entry.processedText}
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[
            [rehypeKatex, {
              throwOnError: false,
              strict: false,
              trust: true,
              displayMode: false,
              output: 'html'
            }]
          ]}
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
    );
  });

  ExplanationEntry.displayName = 'ExplanationEntry';
  return (
    <div className="explains-component-container">
 <div className="explains-header-compact">
  <h2 className="subject">{selectedSubject}</h2>
  <h2 className="topic">{selectedTopic}</h2>
  <h2 className="subtopic">{selectedSubtopic}</h2>
</div>


<div className="button-row">
<div className="button-with-text">
  <button onClick={handleContinueExplain} className="primary-button-component"  disabled={explainFinished}>
   পরবর্তী অংশে যান
  </button>

</div>

<div className="button-with-text">
  <button onClick={handleExplainAgain} className="secondary-button-component" disabled={explainFinished}>
    নতুনভাবে ও <br/> সহজ করে বলুন(AI)
  </button>
 
</div>

  <div className="refresh-button-group">
    <button onClick={handleRefresh} className="restart-button-component">
      <svg width="35" height="35" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18A2 2 0 0 0 3.54 21H20.46A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z" stroke="#FF0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="button-text">Refresh <br/>Screen</span>
    </button>
  </div>
</div>

    <div
  className={`explanation-content-component chat-container ${selectedSubject.toLowerCase() === 'english' ? 'english-subject' : ''}`}
  ref={explanationContainerRef}
>
        {explanationHistory.map((entry, index) => (
          <ExplanationEntry 
            key={entry.id} 
            entry={entry} 
            selectedSubject={selectedSubject} 
          />
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
          Ask AI
        </button>
      </div>
    </>
  )}
</div>
    </div>
  );
};

export default Explains;