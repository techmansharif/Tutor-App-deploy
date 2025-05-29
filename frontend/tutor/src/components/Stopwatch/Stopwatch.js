import React, { useState, useEffect } from 'react';
import './Stopwatch.css';

const Stopwatch = ({ reset, onTimeExpired, pause,  initialTime = 60 }) => {
  const [time, setTime] = useState(initialTime); // Start at initialTime

  useEffect(() => {
    setTime(60); // Reset time when reset prop changes
  }, [reset]);

  useEffect(() => {
    if (pause || time <= 0) {
      return; // Do not run timer if paused or time is up
    }

    const timer = setInterval(() => {
      setTime((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          onTimeExpired(); // Call callback when time expires
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer); // Cleanup interval
  }, [time, pause, onTimeExpired]);

  // Calculate color: interpolate from green (0, 128, 0) to yellow (255, 255, 0) to red (255, 0, 0)
  const getColor = () => {
    const ratio = time / 60; // 1 at 60s, 0 at 0s
    if (ratio > 0.5) {
      // Green to yellow: 60s to 30s
      const subRatio = (ratio - 0.5) * 2; // 1 to 0
      const red = Math.round(255 * (1 - subRatio)); // 0 to 255
      const green = Math.round(128 + 127 * (1 - subRatio)); // 128 to 255
      return `rgb(${red}, ${green}, 0)`;
    } else {
      // Yellow to red: 30s to 0s
      const subRatio = ratio * 2; // 1 to 0
      const red = 255; // Stays 255
      const green = Math.round(255 * subRatio); // 255 to 0
      return `rgb(${red}, ${green}, 0)`;
    }
  };

  return (
    <div className="stopwatch" style={{ backgroundColor: getColor() }}>
      {time}
    </div>
  );
};

export default Stopwatch;