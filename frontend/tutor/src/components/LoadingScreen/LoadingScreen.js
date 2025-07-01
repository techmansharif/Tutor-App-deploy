import React, { useState, useEffect } from 'react';
import './LoadingScreen.css';

// Sample data for text and images
const loadingItems = [
  {
    text: "একটু অপেক্ষা করুন...",
    image: "/FacialExpression/john/dreamy.png",  
  },
  {
    text: "আরও একটু অপেক্ষা করুন...",
    image: "/FacialExpression/hashi/dreamy.png",
  },
  {
    text: "প্রায় পৌছিয়ে গিয়েছি!",
    image: "/FacialExpression/harriet/dreamy.png",
  },
];

const LoadingScreen = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % loadingItems.length);
    }, 2700); // 2.5s animation + 0.2s buffer for smooth transition

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <img
          key={`image-${currentIndex}`}
          src={loadingItems[currentIndex].image}
          alt="Loading"
          className="loading-image"
        />
        <p
          key={`text-${currentIndex}`}
          className="loading-text"
        >
          {loadingItems[currentIndex].text}
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;