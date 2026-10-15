import React, { useState } from "react";
import { Link } from "react-router-dom";
import { login, setAuthToken } from "../api/api";
import { useBusiness } from "../context/BusinessContext";
import "./Login.css";

export default function Login({ setToken }) {
  const { business } = useBusiness();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await login(username, password);
      setAuthToken(response.data.access);
      localStorage.setItem("token", response.data.access);
      localStorage.setItem("refreshToken", response.data.refresh);
      setToken(response.data.access);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "The username or password is incorrect.");
    } finally {
      setLoading(false);
    }
  };

  return <main className="login-shell">
    <section className="login-story"><Link className="login-brand" to="/book"><span>♢</span><div><b>{business.name}</b><small>{business.tagline}</small></div></Link><div><span className="eyebrow">SPA OPERATING SYSTEM</span><h1>Calm for your guests. Clarity for your team.</h1><p>Appointments, clients, payments and the work needing attention—connected in one beautiful workspace.</p></div><small>SECURE · ROLE-BASED · MOBILE READY</small></section>
    <section className="login-panel"><div className="login-card"><span className="eyebrow">WELCOME BACK</span><h2>Sign in to your workspace</h2><p>Use your customer, practitioner, receptionist or owner account.</p>{error && <div className="login-error">{error}</div>}<form onSubmit={handleSubmit}><label>Username<input autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} required autoFocus/></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required/></label><button disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button></form><div className="login-divider"><span>or</span></div><Link className="guest-booking-link" to="/book">Book an appointment as a customer →</Link></div></section>
  </main>;
}
