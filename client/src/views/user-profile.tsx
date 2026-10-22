import React, { useEffect, useState } from "react";
import "./styles/userProfile.css";
import avatar from "../default-avatar.png";
import NavBar from "../components/navBar";
import CauseSelect from "../components/causeSelect";
import { StudentProfile } from "../types/types";
import { getMe, saveProfile } from "../utils/api";
import { joinCauses, parseCauses } from "../utils/causes";
import { createAvatarFromName } from "../utils/profile-pic-utils";

const emptyProfile: StudentProfile = { full_name: '', age: 0, school: '', bio: '', interests: '' };

function UserProfile() {
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [formData, setFormData] = useState<StudentProfile>(emptyProfile);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe<StudentProfile>()
      .then((me) => {
        if (!me.profile) {
          setError('No profile data found');
          return;
        }
        setEmail(me.email);
        setProfile(me.profile);
        setFormData({ ...emptyProfile, ...me.profile });
        setSelectedInterests(parseCauses(me.profile.interests));
      })
      .catch(() => setError('Failed to load profile data'))
      .finally(() => setLoading(false));
  }, []);

  const toggleInterest = (interest: string) =>
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((item) => item !== interest) : [...prev, interest]
    );

  const handleInputChange = (field: keyof StudentProfile, value: string | number) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const saveChanges = async () => {
    const updated = { ...formData, interests: joinCauses(selectedInterests) };
    setSaving(true);
    setError(null);
    try {
      await saveProfile(updated);
      setProfile(updated);
      setEditMode(false);
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
        <NavBar userType="student" />
        <div className="user-profile">
          <div className="loading-message">Loading profile...</div>
        </div>
      </>
    );
  }

  if (error && !profile) {
    return (
      <>
        <NavBar userType="student" />
        <div className="user-profile">
          <div className="error-message">Error: {error}</div>
        </div>
      </>
    );
  }

  const displayData = profile || {
    full_name: 'Unknown User',
    age: 0,
    school: 'Unknown Location',
    bio: 'No bio available',
    interests: 'No interests listed',
  };
  const imageUrl = formData.full_name ? createAvatarFromName(formData.full_name) : avatar;

  return (
    <>
      <NavBar userType="student" />
      <div className="user-profile">
        <div className="left-container">
          <div className="profile-pic-container">
            <img src={imageUrl} alt="Profile" className="user-profile-profile-pic" />
          </div>

          <div>
            <span className="username">{displayData.full_name}'s profile page</span>
          </div>

          <button className="edit-profile-btn" onClick={handleEditToggle} disabled={saving}>
            {saving ? "Saving..." : editMode ? "Save Profile" : "Edit Profile"}
          </button>

          {error && <div className="error-message" style={{ marginTop: '10px', color: 'red' }}>{error}</div>}
        </div>

        <div className="right-container">
          <h2 className="section-title">Profile Information</h2>

          <div className="info-grid">
            <div className="info-item">
              <h2 className="info-label">
                <span className="info-icon">👤</span> Name
              </h2>
              {editMode ? (
                <input
                  type="text"
                  className="info-input"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                />
              ) : (
                <p className="user-info">{displayData.full_name}</p>
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
                <span className="info-icon">🎂</span> Age
              </h2>
              {editMode ? (
                <input
                  type="number"
                  className="info-input"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 0)}
                />
              ) : (
                <p className="user-info">{displayData.age}</p>
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
                  value={formData.school}
                  onChange={(e) => handleInputChange('school', e.target.value)}
                />
              ) : (
                <p className="user-info">{displayData.school}</p>
              )}
            </div>

            <div className="info-item">
              <h2 className="info-label">
                <span className="info-icon">❤️</span> Interests
              </h2>
              {editMode ? (
                <CauseSelect selected={selectedInterests} onToggle={toggleInterest} />
              ) : (
                <p className="user-info">{joinCauses(selectedInterests) || displayData.interests}</p>
              )}
            </div>

            <div className="info-item bio-item">
              <h2 className="info-label">
                <span className="info-icon">📝</span> Bio
              </h2>
              {editMode ? (
                <textarea
                  className="bio-input"
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                />
              ) : (
                <p className="user-bio">{displayData.bio}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default UserProfile;
