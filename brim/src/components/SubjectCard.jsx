import React from 'react';
import './SubjectCard.css';

const SubjectCard = ({ title, chapters, img }) => {
  return (
    <div className="card">
      <img src={img} alt={title} />
      <h3>{title}</h3>
      <p>{chapters} Chapters</p>
    </div>
  );
}

export default SubjectCard;
