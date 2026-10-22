import React, { useEffect, useState } from "react";
import NavBar from "../components/navBar";
import { dummyOrganization } from "../constants/dummyOrgs";
import { Event, NonprofitProfile, Volunteer } from "../types/types";
import { getEventVolunteers, getMyOpportunities, getNonprofitProfile, removeVolunteer } from "../utils/api";
import { formatDate, formatTime, splitPastAndUpcoming } from "../utils/time";
import "./styles/orgMyEvents.css";

type EventWithVolunteers = Event & { volunteers: Volunteer[] };

interface VolunteerRowProps {
  volunteer: Volunteer;
  expanded: boolean;
  onToggle: () => void;
  onRemove?: () => void;
}

const VolunteerRow = ({ volunteer, expanded, onToggle, onRemove }: VolunteerRowProps) => (
  <div className="volunteer-item">
    <div className="volunteer-basic-info" onClick={onToggle}>
      <span className="volunteer-name">{volunteer.full_name}</span>
      {onRemove ? (
        <div className="volunteer-actions">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="remove-volunteer-btn"
            title="Remove volunteer"
          >
            ✕
          </button>
          <span className="expand-volunteer-icon">{expanded ? '▼' : '▶'}</span>
        </div>
      ) : (
        <span className="expand-volunteer-icon">{expanded ? '▼' : '▶'}</span>
      )}
    </div>

    {expanded && (
      <div className="volunteer-details">
        <div className="detail-row">
          <strong>Age:</strong> {volunteer.age}
        </div>
        <div className="detail-row">
          <strong>Location:</strong> {volunteer.school}
        </div>
        <div className="detail-row">
          <strong>Email:</strong> {volunteer.email}
        </div>
        {volunteer.bio && (
          <div className="detail-row">
            <strong>Bio:</strong> {volunteer.bio}
          </div>
        )}
        {volunteer.interests && (
          <div className="detail-row">
            <strong>Interests:</strong> {volunteer.interests}
          </div>
        )}
      </div>
    )}
  </div>
);

function OrgMyEvents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [events, setEvents] = useState<EventWithVolunteers[]>([]);
  const [organizationProfile, setOrganizationProfile] = useState<NonprofitProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
  const [expandedVolunteer, setExpandedVolunteer] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setOrganizationProfile(await getNonprofitProfile());
        const opportunities = await getMyOpportunities();
        setEvents(
          await Promise.all(
            opportunities.map(async (event) => ({
              ...event,
              volunteers: await getEventVolunteers(event.id).catch(() => []),
            }))
          )
        );
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRemoveVolunteer = async (eventId: number, userId: number) => {
    if (!window.confirm('Are you sure you want to remove this volunteer from the event?')) return;
    try {
      await removeVolunteer(eventId, userId);
      setEvents((prev) =>
        prev.map((event) =>
          event.id === eventId ? { ...event, volunteers: event.volunteers.filter((v) => v.user_id !== userId) } : event
        )
      );
    } catch {
      alert('Failed to remove volunteer. Please try again.');
    }
  };

  if (loading) {
    return (
      <>
        <NavBar userType="nonprofit" />
        <div className="landing-page__content">
          <p>Loading...</p>
        </div>
      </>
    );
  }

  const query = searchQuery.toLowerCase();
  const filteredEvents = events.filter(
    (event) =>
      event.title.toLowerCase().includes(query) ||
      event.location.toLowerCase().includes(query) ||
      event.volunteers.some((volunteer) => volunteer.full_name.toLowerCase().includes(query))
  );
  const { upcoming: upcomingEvents, past: pastEvents } = splitPastAndUpcoming(filteredEvents);

  const renderVolunteers = (event: EventWithVolunteers, canRemove: boolean, emptyMessage: string) => (
    <div className="volunteers-list">
      {event.volunteers.length > 0 ? (
        event.volunteers.map((volunteer) => (
          <VolunteerRow
            key={volunteer.user_id}
            volunteer={volunteer}
            expanded={expandedVolunteer === volunteer.user_id}
            onToggle={() => setExpandedVolunteer(expandedVolunteer === volunteer.user_id ? null : volunteer.user_id)}
            onRemove={canRemove ? () => handleRemoveVolunteer(event.id, volunteer.user_id) : undefined}
          />
        ))
      ) : (
        <p className="no-volunteers">{emptyMessage}</p>
      )}
    </div>
  );

  return (
    <>
      <NavBar userType="nonprofit" />

      <div className="landing-page__content">
        <div className="landing-page-header">
          <h1 className="landing-page__greeting">
            Hello, <span className="highlight">{organizationProfile?.nonprofit_name || dummyOrganization.name}</span>
          </h1>
          <p className="landing-page__welcome">
            Here are your events and <span className="highlight">volunteers</span>
          </p>
        </div>

        <div className="search-container-centered">
          <input
            type="text"
            placeholder="Search events or volunteers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="events-split-container">
        <div className="events-section-half past-events-section">
          <h2 className="section-title">Past Events</h2>

          {pastEvents.length > 0 ? (
            <div className="events-list">
              {pastEvents.map((event) => (
                <div key={event.id} className="event-item past-event">
                  <div className="event-header" onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}>
                    <div className="event-info">
                      <h3 className="event-title">{event.title}</h3>
                      <div className="event-details">
                        <span className="event-date-past">
                          {formatDate(event.startDate)} at {formatTime(event.startTime)} (PST)
                        </span>
                        <span className="event-location">{event.location}</span>
                      </div>
                    </div>
                    <div className="event-stats">
                      <span className="volunteer-count">{event.volunteers.length} participated</span>
                      <span className="expand-icon">{expandedEvent === event.id ? '▼' : '▶'}</span>
                    </div>
                  </div>

                  {expandedEvent === event.id && renderVolunteers(event, false, 'No volunteers participated')}
                </div>
              ))}
            </div>
          ) : (
            <p className="no-events">{searchQuery ? "No past events match your search." : "No past events found."}</p>
          )}
        </div>

        <div className="events-section-half upcoming-events-section">
          <h2 className="section-title">Upcoming Events</h2>
          <p className="events-count">
            {searchQuery ? `Found ${upcomingEvents.length} upcoming events` : `You have ${upcomingEvents.length} upcoming events`}
          </p>

          {upcomingEvents.length > 0 ? (
            <div className="events-list">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="event-item">
                  <div className="event-header" onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}>
                    <div className="event-info">
                      <h3 className="event-title">{event.title}</h3>
                      <div className="event-details">
                        <span className="event-date">
                          {formatDate(event.startDate)} at {formatTime(event.startTime)} (PST)
                        </span>
                        <span className="event-location">{event.location}</span>
                      </div>
                    </div>
                    <div className="event-stats">
                      <span className="volunteer-count">{event.volunteers.length} volunteers</span>
                      <span className="expand-icon">{expandedEvent === event.id ? '▼' : '▶'}</span>
                    </div>
                  </div>

                  {expandedEvent === event.id && renderVolunteers(event, true, 'No volunteers signed up yet')}
                </div>
              ))}
            </div>
          ) : (
            <p className="no-events">
              {searchQuery ? "No upcoming events match your search." : "No upcoming events at this time."}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

export default OrgMyEvents;
