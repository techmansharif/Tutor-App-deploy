/**
 * Track user interactions in the application
 * @param {string} interactionType - Type of interaction (e.g., 'CONTINUE_CLICKED', 'CUSTOM_QUERY_SUBMITTED')
 * @param {object} details - Additional details about the interaction
 * @param {number} userId - User ID from the component
 * @param {string} apiBaseUrl - Optional API base URL from the component
 */
export const trackInteraction = async (interactionType, details = {}, userId, apiBaseUrl = null) => {
  try {
    const token = localStorage.getItem('access_token');
    
    if (!token || !userId) {
      console.log('No auth token or user ID found, skipping tracking');
      return;
    }
    
    // Use provided API URL or fallback to defaults
    const API_BASE_URL = apiBaseUrl || window.API_BASE_URL || process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
    
    console.log('Tracking interaction:', {
      type: interactionType,
      userId: userId,
      url: `${API_BASE_URL}/api/track-interaction/`
    });
    
    // Make the tracking request
    const response = await fetch(`${API_BASE_URL}/api/track-interaction/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'user-id': userId.toString()  // Match the Python side expectation
      },
      body: JSON.stringify({
        interaction_type: interactionType,
        details: {
          ...details,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          viewport: `${window.innerWidth}x${window.innerHeight}`
        }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Failed to track interaction:', response.status, errorData);
    } else {
      const data = await response.json();
      console.log('Interaction tracked successfully:', data);
    }
    
  } catch (error) {
    // Log error with more details
    console.error('Error tracking interaction:', error);
  }
};

/**
 * Track page view
 * @param {string} pageName - Name of the page
 * @param {object} additionalDetails - Additional details about the page view
 * @param {number} userId - User ID
 * @param {string} apiBaseUrl - Optional API base URL
 */
export const trackPageView = async (pageName, additionalDetails = {}, userId, apiBaseUrl = null) => {
  await trackInteraction(`PAGE_VIEW_${pageName.toUpperCase()}`, additionalDetails, userId, apiBaseUrl);
};

/**
 * Track time spent on a page or component
 * @param {string} componentName - Name of the component
 * @param {number} timeSpent - Time spent in milliseconds
 * @param {object} additionalDetails - Additional details
 * @param {number} userId - User ID
 * @param {string} apiBaseUrl - Optional API base URL
 */
export const trackTimeSpent = async (componentName, timeSpent, additionalDetails = {}, userId, apiBaseUrl = null) => {
  await trackInteraction('TIME_SPENT', {
    component: componentName,
    timeSpentMs: timeSpent,
    timeSpentSeconds: Math.round(timeSpent / 1000),
    ...additionalDetails
  }, userId, apiBaseUrl);
};

// Interaction type constants for consistency
export const INTERACTION_TYPES = {
  // Explains component interactions
  CONTINUE_CLICKED: 'CONTINUE_CLICKED',
  EXPLAIN_AGAIN_CLICKED: 'EXPLAIN_AGAIN_CLICKED',
  CUSTOM_QUERY_SUBMITTED: 'CUSTOM_QUERY_SUBMITTED',
  REFRESH_CLICKED: 'REFRESH_CLICKED',
  START_PRACTICE_CLICKED: 'START_PRACTICE_CLICKED',
  EXPLAIN_PAGE_LOADED: 'EXPLAIN_PAGE_LOADED',
  
  // Navigation interactions
  NAVIGATION_CLICKED: 'NAVIGATION_CLICKED',
  
  // Quiz interactions
  QUIZ_STARTED: 'QUIZ_STARTED',
  QUIZ_COMPLETED: 'QUIZ_COMPLETED',
  QUIZ_QUESTION_ANSWERED: 'QUIZ_QUESTION_ANSWERED',
  
  // Practice interactions
  PRACTICE_STARTED: 'PRACTICE_STARTED',
  PRACTICE_COMPLETED: 'PRACTICE_COMPLETED',
  PRACTICE_QUESTION_ANSWERED: 'PRACTICE_QUESTION_ANSWERED',
  
  // Selection interactions
  SUBJECT_SELECTED: 'SUBJECT_SELECTED',
  TOPIC_SELECTED: 'TOPIC_SELECTED',
  SUBTOPIC_SELECTED: 'SUBTOPIC_SELECTED',
  
  // General interactions
  PAGE_VIEW: 'PAGE_VIEW',
  TIME_SPENT: 'TIME_SPENT',
  ERROR_OCCURRED: 'ERROR_OCCURRED'
};