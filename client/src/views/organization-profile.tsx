import React, { useEffect, useState } from "react";
import "./styles/userProfile.css";
import avatar from "../default-avatar.png";
import NavBar from "../components/navBar";
import CauseSelect from "../components/causeSelect";
import { NonprofitProfile } from "../types/types";
import { getMe, saveProfile } from "../utils/api";
import { joinCauses, parseCauses } from "../utils/causes";
import { createAvatarFromName } from "../utils/profile-pic-utils";

const emptyProfile: NonprofitProfile = { nonprofit_name: '', location: '', category: '', statement: '' };

function OrganizationProfile() {
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<NonprofitProfile | null>(null);
  const [formData, setFormData] = useState<NonprofitProfile>(emptyProfile);
  const [selectedCauses, setSelectedCauses] = useState<string[]>([]);
  const [showNameWarning, setShowNameWarning] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe<NonprofitProfile>()
      .then((me) => {
        if (!me.profile) {
          setError('No profile data found');
          return;
        }
        setEmail(me.email);
        setProfile(me.profile);
        setFormData({ ...emptyProfile, ...me.profile });
        setSelectedCauses(parseCauses(me.profile.category));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load profile data'))
      .finally(() => setLoading(false));
  }, []);

  const toggleCause = (cause: string) =>
    setSelectedCauses((prev) => (prev.includes(cause) ? prev.filter((item) => item !== cause) : [...prev, cause]));

  const handleInputChange = (field: keyof NonprofitProfile, value: string) => {
    if (field === 'nonprofit_name' && profile?.nonprofit_name && value !== profile.nonprofit_name) {
      setShowNameWarning(true);
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const saveChanges = async () => {
    const updated = { ...formData, category: joinCauses(selectedCauses) };
    setSaving(true);
    setError(null);
    try {
      await saveProfile(updated);
      setProfile(updated);
      setEditMode(false);
      setShowNameWarning(false);
    } catch {
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditToggle = () => {
    if (!editMode) setEditMode(true);
    else if (!saving) saveChanges();
  };

  if (loading) {
    return (
      <>
        <NavBar userType="nonprofit" />
        <div className="user-profile">
          <div className="loading-message">Loading profile...</div>
        </div>
      </>
    );
  }

  if (error && !profile) {
    return (
      <>
        <NavBar userType="nonprofit" />
        <div className="user-profile">
          <div className="error-message">Error: {error}</div>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </>
    );
  }

  const displayData = profile || {
    nonprofit_name: 'Unknown Organization',
    location: 'Unknown Location',
    category: 'No categories listed',
    statement: 'No statement available',
  };
  const imageUrl = formData.nonprofit_name ? createAvatarFromName(formData.nonprofit_name) : avatar;

  return (
    <>
      <NavBar userType="nonprofit" />
      <div className="user-profile">
        <div className="left-container">
          <div className="profile-pic-container">
            <img src={imageUrl} alt="Profile" className="user-profile-profile-pic" />
          </div>

          <div>
            <span className="username">{displayData.nonprofit_name}'s profile page</span>
          </div>

          <button className="edit-profile-btn" onClick={handleEditToggle} disabled={saving}>
            {saving ? "Saving..." : editMode ? "Save Profile" : "Edit Profile"}
          </button>

          {error && <div className="error-message" style={{ marginTop: '10px', color: 'red' }}>{error}</div>}
        </div>

        <div className="right-container">
          <h2 className="section-title">Profile Information</h2>

          {showNameWarning && (
            <div
              style={{
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '5px',
                padding: '15px',
                marginBottom: '20px',
                color: '#856404',
              }}
            >
              <strong>⚠️ Warning:</strong> Changing your organization name will only affect new events you create.
              All current and active events will still display your previous name.
            </div>
          )}

          <div className="info-grid">
            <div className="info-item">
              <h2 className="info-label">
                <span className="info-icon">👤</span> Name
              </h2>
              {editMode ? (
                <input
                  type="text"
                  className="info-input"
                  value={formData.nonprofit_name}
                  onChange={(e) => handleInputChange('nonprofit_name', e.target.value)}
                />
              ) : (
                <p className="user-info">{displayData.nonprofit_name}</p>
              )}
            </div>

            <div className="info-item">
              <h2 className="info-label">
                <span className="info-icon">✉️</span> Email
              </h2>
              {editMode ? (
                <input type="email" className="info-input" value={email || ""} disabled />
              ) : (
                <p className="user-info">{email || "No email"}</p>
              )}
            </div>

            <div className="info-item">
              <h2 className="info-label">
                <span className="info-icon">💼</span> Location
              </h2>
              {editMode ? (
                <input
                  type="text"
                  className="info-input"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                />
              ) : (
                <p className="user-info">{displayData.location}</p>
              )}
            </div>

            <div className="info-item">
              <h2 className="info-label">
                <span className="info-icon">❤️</span> Specializations
              </h2>
              {editMode ? (
                <CauseSelect selected={selectedCauses} onToggle={toggleCause} />
              ) : (
                <p className="user-info">{joinCauses(selectedCauses) || displayData.category}</p>
              )}
            </div>

            <div className="info-item bio-item">
              <h2 className="info-label">
                <span className="info-icon">📝</span> Statement
              </h2>
              {editMode ? (
                <textarea
                  className="bio-input"
                  value={formData.statement}
                  onChange={(e) => handleInputChange('statement', e.target.value)}
                />
              ) : (
                <p className="user-bio">{displayData.statement}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default OrganizationProfile;
