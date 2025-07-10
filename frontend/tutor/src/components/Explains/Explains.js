import React, { useEffect, useState, useRef, memo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import AudioPlayer from '../AudioPlayer/AudioPlayer';
import LoadingScreen from '../LoadingScreen/LoadingScreen';
import { processExplanation, preprocessMath, postprocessMath } from '../ProcessText/ProcessExplain';
import './Explains.css';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { trackInteraction, INTERACTION_TYPES } from '../../utils/trackInteractions';
import { useNavigate } from 'react-router-dom';

const Explains = ({
  selectedSubject,
  selectedTopic,
  selectedSubtopic,
  user, 
  API_BASE_URL,
  // onProceedToPractice
}) => {
  const [explanationHistory, setExplanationHistory] = useState([]);
  const [isExplainLoading, setIsExplainLoading] = useState(false);
  const [nextId, setNextId] = useState(1);
  const [explainFinished, setExplainFinished] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const initialFetchRef = useRef(false);
  const explanationContainerRef = useRef(null);
  const [previousHistoryLength, setPreviousHistoryLength] = useState(0);
  const [newlyAddedIndices, setNewlyAddedIndices] = useState(new Set());
  const [explainAgainIndices, setExplainAgainIndices] = useState(new Set());
  const audioPlayerRefs = useRef(new Map());
  const isComponentMountedRef = useRef(true);
  const [currentController, setCurrentController] = useState(null);
  const navigate = useNavigate();

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

  const handleAudioPlayerRef = useCallback((entryId, ref) => {
    if (ref) {
      console.log(`Registering AudioPlayer for entry ${entryId}`);
      audioPlayerRefs.current.set(entryId, ref);
    } else {
      console.log(`Unregistering AudioPlayer for entry ${entryId}`);
      audioPlayerRefs.current.delete(entryId);
    }
  }, []);

  const stopAllAudio = useCallback(() => {
    console.log('Explains: Stopping all audio players...');
    return new Promise((resolve) => {
      const cleanupPromises = [];
      audioPlayerRefs.current.forEach((audioPlayerRef, entryId) => {
        if (audioPlayerRef && audioPlayerRef.cleanup) {
          console.log(`Cleaning up AudioPlayer for entry ${entryId}`);
          const cleanupPromise = Promise.resolve(audioPlayerRef.cleanup()).catch(error => {
            if (error.name !== 'AbortError') {
              console.warn(`Error cleaning up AudioPlayer for entry ${entryId}:`, error);
            }
          });
          cleanupPromises.push(cleanupPromise);
        }
      });
      Promise.all(cleanupPromises).then(() => {
        console.log(`Explains: Cleaned up ${cleanupPromises.length} AudioPlayer instances`);
        resolve();
      }).catch(error => {
        if (error.name !== 'AbortError') {
          console.warn('Error resolving cleanup promises:', error);
        }
        resolve();
      });
    });
  }, []);

  const onProceedToPractice = () => {
    if (selectedSubject && selectedTopic && selectedSubtopic) {
      navigate(`/practice/${encodeURIComponent(selectedSubject)}/${encodeURIComponent(selectedTopic)}/${encodeURIComponent(selectedSubtopic)}`);
    } else {
      navigate('/select');
    }
  };

  useEffect(() => {
    return () => {
      console.log('Explains: Component unmounting - cleaning up all audio');
      isComponentMountedRef.current = false;
      stopAllAudio();
    };
  }, [stopAllAudio]);

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
  }, [selectedSubject, selectedTopic, selectedSubtopic, user.user_id, API_BASE_URL]);

  useEffect(() => {
    if (explanationContainerRef.current && explanationHistory.length > previousHistoryLength) {
      if (!isExplainLoading) {
        const container = explanationContainerRef.current;
        const entries = container.querySelectorAll('.explanation-entry');
        if (entries.length > 0) {
          const newestEntry = entries[entries.length - 1];
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

  const fetchExplain = async (query, isInitial = false, isExplainAgain = false) => {
    setIsExplainLoading(true);
    
    if (!isInitial && explanationContainerRef.current) {
      setTimeout(() => {
        const container = explanationContainerRef.current;
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }

    const token = localStorage.getItem('access_token');
    const encodedSubject = encodeURIComponent(selectedSubject);
    const encodedTopic = encodeURIComponent(selectedTopic);
    const encodedSubtopic = encodeURIComponent(selectedSubtopic);
    
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
          body: JSON.stringify({ query, is_initial: isInitial }),
          
        }
      );

      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';
        let imageData = null;
        let entryIndex = -1;

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
                  accumulatedText += data.content;
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
                  imageData = data.image;
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
                  break;
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      } else {
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

  const handleContinueExplain = async () => {
    stopAllAudio().then(() => {
      trackInteraction(INTERACTION_TYPES.CONTINUE_CLICKED, {
        subject: selectedSubject,
        topic: selectedTopic,
        subtopic: selectedSubtopic
      }, user.user_id, API_BASE_URL);
      fetchExplain("continue");
    }).catch(error => {
      console.error('Error during audio cleanup:', error);
      fetchExplain("continue"); // Proceed even if cleanup fails to avoid blocking
    });
  };

  const handleExplainAgain = () => {
    stopAllAudio().then(() => {
      trackInteraction(INTERACTION_TYPES.EXPLAIN_AGAIN_CLICKED, {
        subject: selectedSubject,
        topic: selectedTopic,
        subtopic: selectedSubtopic
      }, user.user_id, API_BASE_URL);
      fetchExplain("explain", false, true);
    }).catch(error => {
      console.error('Error during audio cleanup:', error);
      fetchExplain("explain", false, true); // Proceed even if cleanup fails
    });
  };

  const handleCustomQuery = () => {
    if (userQuery.trim()) {
      stopAllAudio().then(() => {
        trackInteraction(INTERACTION_TYPES.CUSTOM_QUERY_SUBMITTED, {
          subject: selectedSubject,
          topic: selectedTopic,
          subtopic: selectedSubtopic,
          query: userQuery
        }, user.user_id, API_BASE_URL);
        fetchExplain(userQuery);
        setUserQuery('');
      }).catch(error => {
        console.error('Error during audio cleanup:', error);
        fetchExplain(userQuery); // Proceed even if cleanup fails
        setUserQuery('');
      });
    }
  };

  const handleRefresh = () => {
    stopAllAudio().then(() => {
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
      setNextId(1);
      fetchExplain("refresh");
    }).catch(error => {
      console.error('Error during audio cleanup:', error);
      setExplanationHistory([]);
      setExplainFinished(false);
      setPreviousHistoryLength(0);
      setNewlyAddedIndices(new Set());
      setExplainAgainIndices(new Set());
      setNextId(1);
      fetchExplain("refresh"); // Proceed even if cleanup fails
    });
  };

  const ExplanationEntry = memo(({ entry, selectedSubject, onAudioPlayerRef }) => {
    const audioPlayerRef = useRef(null);
    
    useEffect(() => {
      if (audioPlayerRef.current) {
        onAudioPlayerRef(entry.id, audioPlayerRef.current);
      }
      return () => {
        onAudioPlayerRef(entry.id, null);
      };
    }, [entry.id, onAudioPlayerRef]);

    return (
      <div className={`explanation-entry ${entry.isNewest ? 'newest-entry' : ''} ${entry.isExplainAgain ? 'explain-again-entry' : ''}`}>
        <div className="audio-player-container">
          <AudioPlayer 
            ref={audioPlayerRef}
            text={processExplanation(entry.text)} 
            API_BASE_URL={API_BASE_URL} 
            user={user} 
          />
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

      <div
        className={`explanation-content-component chat-container ${selectedSubject.toLowerCase() === 'english' ? 'english-subject' : ''}`}
        ref={explanationContainerRef}
      >
        {explanationHistory.map((entry, index) => (
          <ExplanationEntry 
            key={entry.id} 
            entry={entry} 
            selectedSubject={selectedSubject}
            onAudioPlayerRef={handleAudioPlayerRef}
          />
        ))}

        {isExplainLoading && (
          <div className="loading-component">
            <LoadingScreen />
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
            <div className="button-row">
              <div className="refresh-button-group">
                <button onClick={handleRefresh} className="restart-button-component">
                  <svg
                    width="35"
                    height="35"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18A2 2 0 0 0 3.54 21H20.46A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z"
                      stroke="#FF0000"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="button-text">
                    Refresh <br />Screen
                  </span>
                </button>
              </div>
              
              <div className="button-with-text">
                <button
                  onClick={handleExplainAgain}
                  className="secondary-button-component"
                  disabled={explainFinished}
                >
                  আরও সহজে <br />বলুন
                </button>
              </div>
              
              <div className="button-with-text">
                <button
                  onClick={handleContinueExplain}
                  className="primary-button-component"
                  disabled={explainFinished}
                >
                  পরবর্তী অংশে যান
                </button>
              </div>
            </div>
            
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