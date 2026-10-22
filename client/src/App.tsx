import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './views/home';
import LandingPage from './views/landing-page';
import OrgOpportunity from './views/org-opportunity';
import CreateEvent from './views/create-opportunity';
import OrganizationProfile from './views/organization-profile';
import UserProfile from './views/user-profile';
import MyEvents from './views/user-my-events';
import OrgMyEvents from './views/org-my-events';
import SettingsPage from './views/settings-page';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/landing-page" element={<LandingPage />} />
        <Route path="/organization-page" element={<OrgOpportunity />} />
        <Route path="/create-opportunity" element={<CreateEvent />} />
        <Route path="/user-profile" element={<UserProfile />} />
        <Route path="/organization-profile" element={<OrganizationProfile />} />
        <Route path="/my-events" element={<MyEvents />} />
        <Route path="/org-my-events" element={<OrgMyEvents />} />
        <Route path="/settings-page" element={<SettingsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
