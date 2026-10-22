import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import NavBar from "../components/navBar";
import EventCard from "../components/eventCard";
import EventCardCarousel from "../components/eventCardCarousel";
import EventCardGrid from "../components/eventCardGrid";
import { dummyOrganization } from "../constants/dummyOrgs";
import { Event } from "../types/types";
import { getMyOpportunities, getNonprofitProfile } from '../utils/api';
import { splitPastAndUpcoming } from "../utils/time";
import "./styles/landing-page.css";
import "./styles/orgOpportunity.css";

function OrgOpportunity() {
  const navigate = useNavigate();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [activeEvents, setActiveEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  useEffect(() => {
    getNonprofitProfile()
      .then((profile) => setOrganizationName(profile.nonprofit_name))
      .catch(() => setOrganizationName(dummyOrganization.name))
      .finally(() => setIsLoading(false));
  }, []);

  const refreshEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      const { upcoming, past } = splitPastAndUpcoming(await getMyOpportunities());
      setActiveEvents(upcoming);
      setPastEvents(past);
    } catch {
      setActiveEvents([]);
      setPastEvents([]);
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  if (isLoading) {
    return (
      <div className="org-opportunity">
        <NavBar userType="nonprofit" />
        <div className="landing-page__content">
          <div className="landing-page-header">
            <h1 className="landing-page__greeting">Loading...</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="org-opportunity">
      <NavBar userType="nonprofit" />

      <div className="landing-page__content">
        <div className="landing-page-header">
          <h1 className="landing-page__greeting">
            Hello, <span className='highlight'> {organizationName || 'Organization'}</span>
          </h1>
          <p className="landing-page__welcome">
            Welcome back to <span className="highlight"> your</span> platform for{" "}
            <span className="highlight">connecting</span> with{" "}
            <span className="highlight">causes</span> you{" "}
            <span className="highlight">care</span> about
          </p>
        </div>
      </div>

      <div className="landing-page-events">
        <h2 className="header-events">Active Opportunities</h2>
        <p className="number_of_events">You have {activeEvents.length} active event{activeEvents.length !== 1 ? 's' : ''}</p>
        {isLoadingEvents ? (
          <p>Loading events...</p>
        ) : activeEvents.length > 0 ? (
          <EventCardCarousel
            events={activeEvents}
            userType="nonprofit"
            renderCard={(event, userType) => (
              <EventCard event={event} userType={userType} onEventUpdated={refreshEvents} />
            )}
          />
        ) : (
          <p className="no-events-message">You have no active events at this time.</p>
        )}
      </div>

      <div className="landing-page_new-opportunities">
        <button
          onClick={() => navigate('/create-opportunity')}
          className="create-opportunity-button"
          aria-label="Create a new opportunity"
        >
          <div className="create-button-content">
            <span className="create-button-icon">+</span>
            <span className="create-button-text">Create a new opportunity</span>
          </div>
        </button>
      </div>

      <div className="past-opportunities">
        <h2 className="header-pastOpps">Past Opportunities</h2>
        <p className="number_of_events">You have {pastEvents.length} past event{pastEvents.length !== 1 ? 's' : ''}</p>
        {isLoadingEvents ? (
          <p>Loading events...</p>
        ) : pastEvents.length > 0 ? (
          <div className="past-opportunities-grid">
            <EventCardGrid events={pastEvents} userType="nonprofit" onEventUpdated={refreshEvents} />
          </div>
        ) : (
          <p className="no-events-message">You have no past events at this time.</p>
        )}
      </div>
    </div>
  );
}

export default OrgOpportunity;
