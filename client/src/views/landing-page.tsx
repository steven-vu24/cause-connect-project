import React, { useEffect, useState } from "react";
import NavBar from "../components/navBar";
import EventCard from "../components/eventCard";
import EventCardCarousel from "../components/eventCardCarousel";
import EventCardGrid from "../components/eventCardGrid";
import { dummyStudent } from "../constants/dummyStudent";
import { Event, StudentProfile } from "../types/types";
import { getNearbyEvents, getProfile, getUpcomingEvents } from "../utils/api";
import { sharesCause } from "../utils/causes";
import { hasStarted } from "../utils/time";
import "./styles/landing-page.css";

const EXPLORE_LIMIT = 9;
const emptyStateStyle = {
  textAlign: 'center',
  color: '#666',
  margin: '20px 0',
  padding: '20px',
  backgroundColor: '#f9f9f9',
  borderRadius: '8px',
} as const;

const notStarted = (events: Event[]) => events.filter((event) => !hasStarted(event));

const LandingPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentLocation, setCurrentLocation] = useState("");
  const [selectedDistance, setSelectedDistance] = useState("all");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [locationManuallyChanged, setLocationManuallyChanged] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const studentProfile = (await getProfile()) as StudentProfile;
        setProfile(studentProfile);
        setCurrentLocation(studentProfile.school || dummyStudent.school);
        setLocationDetected(!!studentProfile.school);
      } catch {
        setProfile(null);
        setCurrentLocation(dummyStudent.school);
        setLocationDetected(false);
      }

      try {
        const events = notStarted(await getUpcomingEvents());
        setAllEvents(events);
        setFilteredEvents(events);
      } catch (err) {
        console.error("Error fetching events:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!currentLocation || allEvents.length === 0) return;
    if (selectedDistance === "all") {
      setFilteredEvents(allEvents);
      return;
    }

    setIsLoadingLocation(true);
    getNearbyEvents(currentLocation, parseInt(selectedDistance))
      .then((nearby) => setFilteredEvents(notStarted(nearby)))
      .catch(() => setFilteredEvents(allEvents))
      .finally(() => setIsLoadingLocation(false));
  }, [currentLocation, selectedDistance, allEvents]);

  const handleLocationChange = (newLocation: string) => {
    setCurrentLocation(newLocation);
    setLocationDetected(false);
    setLocationManuallyChanged(true);
  };

  const query = searchQuery.toLowerCase();
  const searchFilteredEvents = filteredEvents.filter(
    (event) =>
      event.title.toLowerCase().includes(query) ||
      event.location.toLowerCase().includes(query) ||
      (event.organization && event.organization.toLowerCase().includes(query))
  );

  const interestMatchedEvents = profile?.interests
    ? filteredEvents.filter((event) => sharesCause(profile.interests, event.cause))
    : [];

  const exploreEvents = searchQuery.trim() ? searchFilteredEvents : searchFilteredEvents.slice(0, EXPLORE_LIMIT);
  const distanceSuffix = selectedDistance !== 'all' ? ` within ${selectedDistance} miles` : '';

  if (loading) {
    return (
      <div className="landing-page">
        <NavBar userType="student" />
        <div className="landing-page__content">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-page">
      <NavBar userType="student" />
      <div className="landing-page__content">
        <div className="landing-page-header">
          <h1 className="landing-page__greeting">
            Hello, <span className="highlight">{profile?.full_name || dummyStudent.full_name}</span>
          </h1>
          <p className="landing-page__welcome">
            Welcome back to <span className="highlight"> your</span> platform for{" "}
            <span className="highlight">connecting</span> with{" "}
            <span className="highlight">causes</span> you{" "}
            <span className="highlight">care</span> about
          </p>
        </div>

        <div className="location-filter-container">
          <div className="location-filter">
            <div className="location-info">
              <span className="location-label">📍 Current Location: </span>
              <span className="location-text">{currentLocation}</span>
              <span className={`location-status ${locationDetected ? 'detected' : locationManuallyChanged ? 'custom' : 'default'}`}>
                {locationDetected ? '(detected)' : locationManuallyChanged ? '(custom)' : '(default)'}
              </span>
            </div>

            <div className="location-controls">
              <input
                type="text"
                placeholder="Change location..."
                className="location-input"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  const input = e.target as HTMLInputElement;
                  const newLocation = input.value.trim();
                  if (newLocation) {
                    handleLocationChange(newLocation);
                    input.value = '';
                  }
                }}
              />

              <select
                value={selectedDistance}
                onChange={(e) => setSelectedDistance(e.target.value)}
                className="distance-select"
              >
                <option value="all">All Events</option>
                <option value="5">Within 5 miles</option>
                <option value="10">Within 10 miles</option>
                <option value="25">Within 25 miles</option>
                <option value="50">Within 50 miles</option>
              </select>
            </div>

            <div className="filter-status">
              {isLoadingLocation ? (
                <span>Loading...</span>
              ) : (
                <span>
                  {filteredEvents.length} upcoming events found{distanceSuffix}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="landing-page-events">
          <h2 className="header-events">Dive Deeper into your Interests</h2>
          {profile?.interests ? (
            <>
              <p style={{ margin: '10px 0', fontSize: '14px', textAlign: 'center', color: 'black', fontStyle: "italic" }}>
                Upcoming events from organizations matching your interests: <strong>{profile.interests}</strong>
                {selectedDistance !== 'all' && ` (within ${selectedDistance} miles)`}
              </p>
              <p className="number_of_events">
                You have {interestMatchedEvents.length} upcoming event{interestMatchedEvents.length !== 1 ? 's' : ''} matching your interests
                {distanceSuffix}
              </p>
              {isLoadingLocation ? (
                <p>Loading events...</p>
              ) : interestMatchedEvents.length > 0 ? (
                <EventCardCarousel
                  events={interestMatchedEvents}
                  userType="student"
                  renderCard={(event, userType) => <EventCard event={event} userType={userType} />}
                />
              ) : (
                <div style={emptyStateStyle}>
                  <p>No upcoming events found from organizations matching your current interests{distanceSuffix}.</p>
                  {selectedDistance !== 'all' ? (
                    <p>Try increasing your distance range or check out the "Explore New Causes" section below!</p>
                  ) : (
                    <p>Check out the "Explore New Causes" section below to discover new opportunities!</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={emptyStateStyle}>
              <p>Complete your profile to see personalized event recommendations!</p>
              <p>Visit your profile page to add your interests.</p>
            </div>
          )}
        </div>

        <div className="landing-page-explore">
          <h2 className="header-explore">Explore New Causes</h2>

          <div className="search-bar-container">
            <input
              type="text"
              className="search-bar"
              placeholder="Search for upcoming events by title, location, or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {searchQuery.trim() && (
            <p style={{ margin: '10px 0', color: '#666', textAlign: 'center' }}>
              {exploreEvents.length} upcoming event{exploreEvents.length !== 1 ? 's' : ''} found for "{searchQuery}"
              {distanceSuffix}
            </p>
          )}

          {isLoadingLocation ? (
            <p style={{ textAlign: 'center', margin: '20px 0' }}>Loading events...</p>
          ) : (
            <EventCardGrid events={exploreEvents} userType="student" />
          )}

          {!searchQuery.trim() && !isLoadingLocation && searchFilteredEvents.length > EXPLORE_LIMIT && (
            <p style={{ margin: '20px 0', color: '#666', textAlign: 'center', fontStyle: 'italic' }}>
              Showing {EXPLORE_LIMIT} of {searchFilteredEvents.length} upcoming events{distanceSuffix}. Use the search bar to find specific events.
            </p>
          )}

          {!isLoadingLocation && exploreEvents.length === 0 && (
            <div style={emptyStateStyle}>
              <p>No upcoming events available{distanceSuffix}.</p>
              {selectedDistance !== 'all' && <p>Try increasing your distance range to see more events!</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
