import React, { useState } from "react";
import "./styles/home.css";
import blueTransparent from "../blueTransparent.png";
import Registration from "../components/RegistrationForm";
import { login } from "../utils/api";

const Home = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await login(email, password);
    if (res.success) {
      window.location.href = res.nextRoute || "/";
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  return (
    <div className="home">
      <div className="home__container">
        <img src={blueTransparent} alt="logo" className="home__logo" />
        <h2 className="home__subtitle">Welcome to</h2>
        <h1 className="home__title">Cause Connect</h1>
        <p className="home__description">Where service meets passion</p>
      </div>

      <div className="login-container">
        {!showRegistration ? (
          <div className="tab-container">
            <div className="signin-container">
              <h1 className="signin">Start Connecting!</h1>
            </div>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <input
                  type="text"
                  id="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <input
                  type="password"
                  id="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="login-btn">
                {loading ? "Logging in..." : "Login"}
              </button>
              {error && <p className="error-text">{error}</p>}
              <p className="register">
                Don't have an account?{" "}
                <span className="register-link" onClick={() => setShowRegistration(true)}>
                  Register here
                </span>
              </p>
            </form>
          </div>
        ) : (
          <Registration />
        )}
      </div>
    </div>
  );
};

export default Home;
