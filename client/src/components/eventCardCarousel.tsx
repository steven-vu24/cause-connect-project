import React, { useState } from 'react';
import "../views/styles/eventCardCarousel.css";
import { Event, UserType } from "../types/types";

interface EventCardCarouselProps {
  events: Event[];
  userType: UserType;
  renderCard: (event: Event, userType: UserType) => React.ReactElement;
}

const EventCardCarousel: React.FC<EventCardCarouselProps> = ({ events, renderCard, userType }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => Math.min(prevIndex + 1, events.length - 1));
  };

  return (
    <div className="carousel-container">
      <button onClick={handlePrev} className="carousel-btn" disabled={currentIndex === 0}>
        ‹
      </button>

      <div className="carousel-content">
        <div
          className="carousel-track"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {events.map((event) => (
            <div key={event.id} className="carousel-item">
              {renderCard(event, userType)}
            </div>
          ))}
        </div>
      </div>

      <button onClick={handleNext} className="carousel-btn" disabled={currentIndex === events.length - 1}>
        ›
      </button>
    </div>
  );
};

export default EventCardCarousel;
