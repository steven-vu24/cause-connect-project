import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Event, UserType } from "../types/types";
import {
  deleteOpportunity,
  getJoinedEventIds,
  getNonprofitProfile,
  joinEvent,
  leaveEvent,
  updateOpportunity,
} from "../utils/api";
import { formatDate, formatTimeRange } from "../utils/time";
import "../views/styles/eventCard.css";
import "../views/styles/expandedEventCard.css";

interface ExpandedCardProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  userType: UserType;
  isPast: boolean;
  onEventUpdated?: () => void;
}

const pastMessageStyle = { color: '#666', fontStyle: 'italic', textAlign: 'center', margin: '20px 0' } as const;

const ExpandedCardPortal: React.FC<ExpandedCardProps> = ({ isOpen, onClose, event, userType, isPast, onEventUpdated }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState<Event>({ ...event });
  const [hasJoined, setHasJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingJoinStatus, setIsCheckingJoinStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || userType !== "student") return;

    setHasJoined(false);
    setIsCheckingJoinStatus(true);
    setError(null);
    getJoinedEventIds()
      .then((ids) => setHasJoined(ids.includes(event.id)))
      .catch(() => setHasJoined(false))
      .finally(() => setIsCheckingJoinStatus(false));
  }, [isOpen, event.id, userType]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedEvent((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await getNonprofitProfile();
      await updateOpportunity(editedEvent.id, {
        nonprofit_name: profile.nonprofit_name,
        title: editedEvent.title,
        description: editedEvent.body,
        date: editedEvent.startDate,
        time: editedEvent.startTime,
        end_time: editedEvent.endTime,
        location: editedEvent.location,
      });
      setIsEditing(false);
      onEventUpdated?.();
      onClose();
    } catch {
      setError('Failed to update event. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;

    setIsLoading(true);
    setError(null);
    try {
      await deleteOpportunity(event.id);
      onEventUpdated?.();
      onClose();
    } catch {
      setError('Failed to delete event. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinToggle = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (hasJoined) {
        await leaveEvent(event.id);
        setHasJoined(false);
      } else {
        await joinEvent(event.id);
        setHasJoined(true);
      }
    } catch (err) {
      if (!hasJoined && err instanceof Error && err.message.includes('already')) {
        setHasJoined(true);
        setError('You have already joined this event!');
      } else {
        setError(hasJoined ? 'Failed to cancel signup. Please try again.' : 'Failed to join event. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const joinButtonText = isLoading
    ? 'Processing...'
    : isCheckingJoinStatus
      ? 'Checking...'
      : hasJoined
        ? 'Leave Event'
        : 'Join Event';

  return createPortal(
    <>
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="expanded-card">
        <button className="close-button" onClick={onClose}>
          <i className="material-icons">close</i>
        </button>

        {error && (
          <div
            className="error-message"
            style={{ background: '#fee', color: '#c33', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}
          >
            {error}
          </div>
        )}

        {isEditing ? (
          <div className="expanded-card-editing">
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input name="title" id="title" value={editedEvent.title} onChange={handleChange} disabled={isLoading} />
            </div>

            <div className="form-group">
              <label htmlFor="organization">Organization</label>
              <input
                name="organization"
                id="organization"
                value={editedEvent.organization}
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startDate">Date</label>
                <input
                  type="date"
                  name="startDate"
                  id="startDate"
                  value={editedEvent.startDate}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startTime">Start Time</label>
                <input
                  type="time"
                  name="startTime"
                  id="startTime"
                  value={editedEvent.startTime}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="endTime">End Time</label>
                <input
                  type="time"
                  name="endTime"
                  id="endTime"
                  value={editedEvent.endTime || ''}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                name="location"
                id="location"
                value={editedEvent.location}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="body">Description</label>
              <textarea
                name="body"
                id="body"
                value={editedEvent.body}
                onChange={handleChange}
                rows={4}
                disabled={isLoading}
              />
            </div>

            <div className="expanded-card-action-buttons">
              <button className="delete-button" onClick={handleDelete} disabled={isLoading}>
                {isLoading ? 'Deleting...' : 'Delete Event'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="event-card__title">{event.title}</h2>
            <p><span className="event-card_label">Organization: </span>{event.organization}</p>
            <p><span className="event-card_label">Date: </span>{formatDate(event.startDate)}</p>
            <p><span className="event-card_label">Time (PST): </span>{formatTimeRange(event.startTime, event.endTime)}</p>
            <p><span className="event-card_label">Location: </span>{event.location}</p>
            <p><span className="event-card_label">Description: </span>{event.body}</p>
          </>
        )}

        <div className="expanded-card-action-buttons">
          {userType === "student" ? (
            !isPast ? (
              <button
                className={`expanded-card-join-event-button${hasJoined ? ' joined' : ''}`}
                onClick={handleJoinToggle}
                disabled={isLoading || isCheckingJoinStatus}
              >
                {joinButtonText}
              </button>
            ) : (
              <p className="past-event-message" style={pastMessageStyle}>
                This event has already occurred.
              </p>
            )
          ) : !isPast ? (
            isEditing ? (
              <>
                <button className="expanded-card-save-button" onClick={handleSave} disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
                <button
                  className="expanded-card-cancel-button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedEvent({ ...event });
                    setError(null);
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button className="expanded-card-edit-button" onClick={() => setIsEditing(true)}>
                Edit Event
              </button>
            )
          ) : (
            <p className="past-event-message" style={pastMessageStyle}>
              This event has already occurred and cannot be edited.
            </p>
          )}
        </div>
      </div>
    </>,
    document.body
  );
};

export default ExpandedCardPortal;
