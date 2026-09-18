import { useState } from "react";
import { useNavigate } from "react-router-dom";
import bietLogo from "../assets/biet-logo.png";
import campusImage from "../assets/biet-campus.jpg";
import { login } from "../api";
import "../App.css";

function StudentLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      navigate("/student-dashboard");
    } catch (err) {
      setError(err.message || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-page"
      style={{ backgroundImage: `url(${campusImage})` }}
    >
      <div className="login-overlay"></div>

      <div className="login-card">

        <img
          src={bietLogo}
          alt="BIET Jhansi Logo"
          className="login-logo"
        />

        <h1>BIET Jhansi</h1>

        <p className="login-subtitle">
          Virtual Electronics Laboratory
        </p>

        <div className="login-divider"></div>

        <h2>Student Login</h2>

        <form onSubmit={handleLogin}>

          <label>Username</label>

          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>

        </form>

        {error && (
          <p className="login-error">
            {error}
          </p>
        )}

        <p className="login-note">
          Login using your BIET student credentials
        </p>

      </div>
    </div>
  );
}

export default StudentLogin;
