import React, { useEffect, useState } from 'react';
import { Event, UserType } from "../types/types";
import "../views/styles/eventCard.css";
import "../views/styles/expandedEventCard.css";
import ExpandedCardPortal from "./expandedCard";
import { formatDate, formatTimeRange, hasStarted, startsWithinDays } from "../utils/time";

interface EventCardProps {
  event: Event;
  userType: UserType;
  onEventUpdated?: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, userType, onEventUpdated }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  return (
    <>
      <div className="event-card">
        <div className={`card-container ${isOpen ? "background-disabled" : ""}`}>
          {startsWithinDays(event, 7) && (
            <div className="event-badge upcoming">
              <span>Upcoming</span>
            </div>
          )}

          <div className="event-header">
            <h2 className="event-card__title">{event.title}</h2>
          </div>

          <div className="event-datetime">
            <div className="datetime-group">
              <label className="datetime-label">📅 Date</label>
              <div className="datetime-content">
                <span className="event-card__startdate">{formatDate(event.startDate)}</span>
                {event.endDate && event.endDate !== event.startDate && (
                  <>
                    <span className="date-separator">-</span>
                    <span className="event-card__enddate">{formatDate(event.endDate)}</span>
                  </>
                )}
              </div>
            </div>

            <div className="datetime-group">
              <label className="datetime-label">🕐 Time (PST)</label>
              <div className="datetime-content">
                <span className="event-card__time-range">{formatTimeRange(event.startTime, event.endTime)}</span>
              </div>
            </div>
          </div>

          <div className="event-location">
            <label className="location-label">📍 Location</label>
            <p className="event-card__location">{event.location}</p>
          </div>

          <div className="event-actions">
            {userType === "student" ? (
              <button className="action-button view-button" onClick={() => setIsOpen(!isOpen)}>
                <i className="material-icons">visibility</i>
                <span>View Details</span>
              </button>
            ) : (
              <button className="action-button edit-button-styled" onClick={() => setIsOpen(!isOpen)}>
                <i className="material-icons">edit_note</i>
                <span>Edit Event</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <ExpandedCardPortal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        event={event}
        userType={userType}
        isPast={hasStarted(event)}
        onEventUpdated={onEventUpdated}
      />
    </>
  );
};

export default EventCard;
