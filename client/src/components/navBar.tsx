import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import "../views/styles/navBar.css";
import "../views/styles/dropDownMenu.css";
import blueTransparent from "../blueTransparent.png";
import { getMe, logout } from "../utils/api";
import { createAvatarFromName } from "../utils/profile-pic-utils";
import { NonprofitProfile, StudentProfile, UserType } from "../types/types";

interface NavBarProps {
  userType: UserType;
}

const NavBar: React.FC<NavBarProps> = ({ userType }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const isNonprofit = userType === "nonprofit";

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const me = await getMe<StudentProfile & NonprofitProfile>();
        if (me.profile) {
          setName(isNonprofit ? me.profile.nonprofit_name : me.profile.full_name);
          setEmail(me.email);
        } else {
          setError(isNonprofit ? 'No organization profile found' : 'No student profile found');
        }
      } catch {
        setError('Failed to fetch profile');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [isNonprofit]);

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    navigate('/');
  };

  const displayName = name || (isNonprofit ? "Organization" : "Student");
  const avatarUrl = createAvatarFromName(displayName);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to={isNonprofit ? "/organization-page" : "/landing-page"} className="navbar-logo-link">
          <div className="navbar-logo">
            <img src={blueTransparent} alt="Logo" />
            <h1>Cause Connect</h1>
          </div>
        </Link>
      </div>

      <div className="navbar-profile">
        <button className="dropdown-button" onClick={() => setIsOpen(!isOpen)}>
          <img src={avatarUrl} alt="Profile" className="navbar-profile-pic" />
        </button>

        {isOpen && (
          <div className="dropdown-menu">
            <div className="dropdown-profile">
              <img src={avatarUrl} alt="Profile" className="dropdown-profile-pic" />
              {loading ? (
                <>
                  <h4>Loading...</h4>
                  <p>Loading...</p>
                </>
              ) : error ? (
                <>
                  <h4>Error loading profile</h4>
                  <p>{error}</p>
                </>
              ) : (
                <>
                  <h4>{displayName}</h4>
                  <p>{email || 'No email'}</p>
                </>
              )}
            </div>

            <div className="dropdown-list-container">
              <button
                className="dropdown-list"
                onClick={() => navigate(isNonprofit ? '/organization-profile' : '/user-profile')}
              >
                View Profile
              </button>
            </div>

            <div>
              <button className="dropdown-list" onClick={() => navigate(isNonprofit ? '/org-my-events' : '/my-events')}>
                {isNonprofit ? 'View Volunteer Signups' : 'My Events'}
              </button>
            </div>

            <div>
              <button className="dropdown-list" onClick={() => navigate('/settings-page')}>
                Settings
              </button>
            </div>

            <div>
              <button className="dropdown-list" onClick={handleLogout}>
                Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavBar;
