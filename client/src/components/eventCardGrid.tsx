import React, { useEffect, useState } from 'react';
import EventCard from './eventCard';
import "../views/styles/eventGrid.css";
import { Event, UserType } from "../types/types";

const PAGE_SIZE = 12;

interface EventCardGridProps {
  events: Event[];
  userType: UserType;
  onEventUpdated?: () => void;
}

const EventCardGrid: React.FC<EventCardGridProps> = ({ events, userType, onEventUpdated }) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const hasMore = visibleCount < events.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [events]);

  useEffect(() => {
    if (!hasMore) return;
    const showMoreNearBottom = () => {
      const scrolledTo = window.innerHeight + document.documentElement.scrollTop;
      if (scrolledTo >= document.documentElement.offsetHeight - 100) {
        setVisibleCount((count) => count + PAGE_SIZE);
      }
    };
    window.addEventListener('scroll', showMoreNearBottom);
    return () => window.removeEventListener('scroll', showMoreNearBottom);
  }, [hasMore]);

  return (
    <div className="event-card-grid">
      {events.slice(0, visibleCount).map((event) => (
        <EventCard key={event.id} event={event} userType={userType} onEventUpdated={onEventUpdated} />
      ))}

      {hasMore && (
        <div className="show-more-container">
          <button onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="show-more-button">
            Show More
          </button>
        </div>
      )}
    </div>
  );
};

export default EventCardGrid;
