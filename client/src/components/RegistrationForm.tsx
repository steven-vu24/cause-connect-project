import React, { useState } from "react";
import "../views/styles/registration.css";
import { signup } from "../utils/api";
import { CAUSES, joinCauses } from "../utils/causes";
import { UserType } from "../types/types";

const isValidEmail = (email: string) => {
  const parts = email.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const labels = parts[1].split(".");
  return labels.length > 1 && labels[labels.length - 1].length >= 2;
};

const CauseButtons = ({ selected, onToggle }: { selected: string[]; onToggle: (cause: string) => void }) => (
  <div className="interests-grid">
    {CAUSES.map((cause) => (
      <button
        key={cause}
        type="button"
        className={`interest-btn ${selected.includes(cause) ? "selected" : ""}`}
        onClick={() => onToggle(cause)}
      >
        {selected.includes(cause) ? cause : `+ ${cause}`}
      </button>
    ))}
  </div>
);

const toggle = (list: string[], item: string) =>
  list.includes(item) ? list.filter((i) => i !== item) : [...list, item];

const Registration = () => {
  const [usertype, setUsertype] = useState<UserType | null>(null);
  const [slide, setSlide] = useState(0);

  const [fullname, setFullname] = useState("");
  const [age, setAge] = useState(0);
  const [school, setSchool] = useState("");
  const [bio, setBio] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const [nonprofitName, setNonprofitName] = useState("");
  const [location, setLocation] = useState("");
  const [mission, setMission] = useState("");
  const [selectedCauses, setSelectedCauses] = useState<string[]>([]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [emailValid, setEmailValid] = useState(true);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailValid(isValidEmail(value));
  };

  const handleUsertypeSelect = (type: UserType) => {
    setUsertype(type);
    setSlide(1);
  };

  const handleNextSlide = () => setSlide((prev) => prev + 1);
  const handlePreviousSlide = () => setSlide((prev) => Math.max(prev - 1, 0));

  const handleComplete = async () => {
    if (password !== confirmPassword) {
      setPasswordsMatch(false);
      return;
    }
    if (!email || !password || !usertype || !emailValid) return;
    setPasswordsMatch(true);

    const res = await signup(
      email,
      password,
      usertype,
      usertype === "student"
        ? { full_name: fullname, age, school, bio, interests: joinCauses(selectedInterests) }
        : { nonprofit_name: nonprofitName, location, category: joinCauses(selectedCauses), statement: mission }
    );
    if (!res.success) {
      alert("Registration failed: " + res.message);
      return;
    }
    setSlide(4);
    window.location.href = res.nextRoute || "/";
  };

  return (
    <div className="registration-flow-registration">
      {slide === 0 && (
        <div className="form-group-registration">
          <h2>Are you joining us as a...</h2>
          <div className="button-group-registration">
            <button onClick={() => handleUsertypeSelect("student")}>Student</button>
            <button onClick={() => handleUsertypeSelect("nonprofit")}>Nonprofit</button>
          </div>
        </div>
      )}

      {slide === 1 && usertype === "student" && (
        <form className="form-registration" onSubmit={(e) => { e.preventDefault(); handleNextSlide(); }}>
          <h2>Tell us about yourself..</h2>
          <input name="fullname" placeholder="Full Name" onBlur={(e) => setFullname(e.target.value)} required />
          <input name="age" type="number" placeholder="Age" onBlur={(e) => setAge(Number(e.target.value))} required />
          <input name="school" placeholder="Location" onBlur={(e) => setSchool(e.target.value)} required />
          <textarea name="bio" placeholder="Personal Bio" onBlur={(e) => setBio(e.target.value)} required />
          <div className="form-nav-buttons">
            <button type="button" onClick={handlePreviousSlide}>Back</button>
            <button type="submit">Next</button>
          </div>
        </form>
      )}

      {slide === 1 && usertype === "nonprofit" && (
        <form className="form-registration" onSubmit={(e) => { e.preventDefault(); handleNextSlide(); }}>
          <h2>Nonprofit Info</h2>
          <input name="name" placeholder="Nonprofit Name" onBlur={(e) => setNonprofitName(e.target.value)} required />
          <input name="location" placeholder="Location" onBlur={(e) => setLocation(e.target.value)} required />
          <textarea name="mission" placeholder="Mission Statement" onBlur={(e) => setMission(e.target.value)} required />
          <div className="form-nav-buttons">
            <button type="button" onClick={handlePreviousSlide}>Back</button>
            <button type="submit">Next</button>
          </div>
        </form>
      )}

      {slide === 2 && usertype === "student" && (
        <form className="form-registration" onSubmit={(e) => { e.preventDefault(); handleNextSlide(); }}>
          <h2>What are your interests and passions?</h2>
          <CauseButtons
            selected={selectedInterests}
            onToggle={(cause) => setSelectedInterests((prev) => toggle(prev, cause))}
          />
          <div className="form-nav-buttons">
            <button type="button" onClick={handlePreviousSlide}>Back</button>
            <button type="submit">Next</button>
          </div>
        </form>
      )}

      {slide === 2 && usertype === "nonprofit" && (
        <form className="form-registration" onSubmit={(e) => { e.preventDefault(); handleNextSlide(); }}>
          <h2>Select your cause(s)</h2>
          <p className="cause-prompt">What causes does your nonprofit focus on?</p>
          <CauseButtons
            selected={selectedCauses}
            onToggle={(cause) => setSelectedCauses((prev) => toggle(prev, cause))}
          />
          <div className="form-nav-buttons">
            <button type="button" onClick={handlePreviousSlide}>Back</button>
            <button type="submit">Next</button>
          </div>
        </form>
      )}

      {slide === 3 && (
        <form className="form-registration" onSubmit={(e) => { e.preventDefault(); handleComplete(); }}>
          <h2>Create your account!</h2>
          <input
            name="email"
            type="email"
            placeholder="Email"
            onBlur={(e) => handleEmailChange(e.target.value)}
            required
          />
          {!emailValid && email && (
            <p style={{ color: 'red' }}>Please enter a valid email address (must contain @ and a domain like .com)</p>
          )}
          <input
            name="password"
            type="password"
            placeholder="Password"
            onBlur={(e) => setPassword(e.target.value)}
            required
          />
          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm Password"
            onBlur={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {!passwordsMatch && (
            <p style={{ color: 'red' }}>Passwords do not match. Please try again.</p>
          )}
          <div className="form-nav-buttons final-step-buttons">
            <button type="button" onClick={handlePreviousSlide}>Back</button>
            <button
              type="submit"
              className="complete-registration"
              disabled={!emailValid || !email}
            >
              Complete Registration
            </button>
          </div>
        </form>
      )}

      {slide === 4 && (
        <div className="redirect-message-registration">
          <p>Redirecting...</p>
        </div>
      )}
    </div>
  );
};

export default Registration;
