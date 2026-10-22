import React, { useEffect, useState } from "react";
import NavBar from "../components/navBar";
import EventCard from "../components/eventCard";
import EventCardCarousel from "../components/eventCardCarousel";
import EventCardGrid from "../components/eventCardGrid";
import { Event, StudentProfile } from "../types/types";
import { getJoinedEvents, getProfile } from "../utils/api";
import { splitPastAndUpcoming } from "../utils/time";
import "./styles/UserMyEvents.css";

function MyEvents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setProfile((await getProfile()) as StudentProfile);
      } catch {
        setProfile(null);
      }

      try {
        setEvents(await getJoinedEvents());
      } catch (error) {
        console.error('Error fetching student events:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <>
        <NavBar userType="student" />
        <div className="loading-message">
          <p>Loading your events...</p>
        </div>
      </>
    );
  }

  const query = searchQuery.toLowerCase();
  const matchingEvents = events.filter(
    (event) =>
      event.title.toLowerCase().includes(query) ||
      event.location.toLowerCase().includes(query) ||
      (event.organization && event.organization.toLowerCase().includes(query))
  );
  const all = splitPastAndUpcoming(events);
  const matching = splitPastAndUpcoming(matchingEvents);

  return (
    <>
      <NavBar userType="student" />

      <div className="landing-page__content">
        <div className="landing-page-header">
          <h1 className="landing-page__greeting">
            Hello, <span className="highlight">{profile?.full_name || "there"}</span>
          </h1>
          <p className="landing-page__welcome">
            Here are <span className="highlight">your registered events</span>
          </p>
        </div>

        <div className="search-bar-container">
          <input
            type="text"
            className="search-bar"
            placeholder="Search your events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="landing-page-events">
        <h2 className="header-events">Upcoming Events You've Joined</h2>
        <p className="number_of_events">
          You have {all.upcoming.length} upcoming event{all.upcoming.length !== 1 ? 's' : ''}
        </p>
        {all.upcoming.length > 0 ? (
          <EventCardCarousel
            events={matching.upcoming}
            userType="student"
            renderCard={(event, userType) => <EventCard event={event} userType={userType} />}
          />
        ) : (
          <div className="empty-state">
            <p>You haven't joined any upcoming events yet.</p>
            <p>Visit the <a href="/landing-page">homepage</a> to discover new opportunities!</p>
          </div>
        )}
      </div>

      <div className="header-pastEvents">
        <h2 className="header-pastOpps">Past Events You Participated In</h2>
      </div>

      <div className="past-opportunities-grid">
        {all.past.length > 0 ? (
          <EventCardGrid events={matching.past} userType="student" />
        ) : (
          <div className="empty-state">
            <p>No past events found.</p>
            <p>Events you've participated in will appear here after they're completed.</p>
          </div>
        )}
      </div>
    </>
  );
}

export default MyEvents;
