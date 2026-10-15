import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createBooking, getServices, getTherapists, login, register, setAuthToken } from "../api/api";
import { formatMoney, useBusiness } from "../context/BusinessContext";
import "./PublicBooking.css";

export default function PublicBooking({ setToken }) {
  const { business } = useBusiness();
  const [services, setServices] = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [form, setForm] = useState({ service: "", therapist: "", date: "", time: "", notes: "", whatsapp_phone: "" });
  const [account, setAccount] = useState({ username: "", password: "", first_name: "", last_name: "", email: "" });
  const [authMode, setAuthMode] = useState("register");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isSignedIn = Boolean(localStorage.getItem("token"));

  useEffect(() => {
    Promise.all([getServices(), getTherapists()])
      .then(([serviceResponse, practitionerResponse]) => {
        setServices(serviceResponse.data);
        setPractitioners(practitionerResponse.data);
      })
      .catch(() => setError("The booking menu could not be loaded. Please try again."));
  }, []);

  const changeForm = event => setForm({ ...form, [event.target.name]: event.target.value });
  const changeAccount = event => setAccount({ ...account, [event.target.name]: event.target.value });

  const authenticate = async () => {
    if (!isSignedIn && authMode === "register") {
      await register({ ...account, phone: form.whatsapp_phone });
    }
    if (!isSignedIn) {
      const response = await login(account.username, account.password);
      localStorage.setItem("token", response.data.access);
      localStorage.setItem("refreshToken", response.data.refresh);
      setAuthToken(response.data.access);
      setToken(response.data.access);
    }
  };

  const submit = async event => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await authenticate();
      await createBooking({
        ...form,
        whatsapp_reminder: Boolean(form.whatsapp_phone),
      });
      setMessage("Your appointment request is confirmed. You can now view it in your customer dashboard.");
    } catch (requestError) {
      const data = requestError.response?.data;
      setError(data && typeof data === "object" ? Object.values(data).flat().join(" ") : "The booking could not be completed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (message) return <main className="public-booking"><section className="booking-success"><span>✓</span><p className="eyebrow">APPOINTMENT REQUESTED</p><h1>Your time to restore is reserved.</h1><p>{message}</p><Link className="public-primary" to="/dashboard/bookings">Open my appointments</Link></section></main>;

  return <main className="public-booking">
    <header className="public-nav"><Link to="/book" className="public-brand"><span>♢</span><div><b>{business.name}</b><small>{business.tagline}</small></div></Link><Link to="/login">Staff or customer sign in</Link></header>
    <section className="public-booking-hero"><div><span className="eyebrow">ONLINE BOOKING</span><h1>Choose how you want to feel.</h1><p>Book in a few quiet steps. Your appointment, payment and reminder stay connected.</p><div className="public-promise"><b>Simple scheduling</b><b>Secure checkout</b><b>WhatsApp reminders</b></div></div></section>
    <form className="public-booking-form" onSubmit={submit}>
      <section className="public-form-card"><span className="step-number">01</span><h2>Select your treatment</h2><div className="public-services">{services.map(service => <label className={String(form.service) === String(service.id) ? "selected" : ""} key={service.id}><input type="radio" name="service" value={service.id} checked={String(form.service) === String(service.id)} onChange={changeForm} required/><div><b>{service.name}</b><small>{service.duration} minutes · {formatMoney(service.price, business.currency)}</small><p>{service.description}</p></div></label>)}</div></section>
      <section className="public-form-card"><span className="step-number">02</span><h2>Choose your time</h2><div className="public-fields"><label>Practitioner<select name="therapist" value={form.therapist} onChange={changeForm} required><option value="">Choose a practitioner</option>{practitioners.map(person => <option value={person.id} key={person.id}>{person.display_name}</option>)}</select></label><label>Date<input name="date" type="date" min={new Date().toISOString().split("T")[0]} value={form.date} onChange={changeForm} required/></label><label>Time<input name="time" type="time" value={form.time} onChange={changeForm} required/></label><label className="full">Treatment notes<textarea name="notes" placeholder="Preferences, allergies or anything we should know" value={form.notes} onChange={changeForm}/></label><label className="full">WhatsApp number <small>Optional — add it to receive appointment reminders</small><input name="whatsapp_phone" type="tel" placeholder="+254 712 345 678" value={form.whatsapp_phone} onChange={changeForm}/></label></div></section>
      {!isSignedIn && <section className="public-form-card"><span className="step-number">03</span><h2>{authMode === "register" ? "Your details" : "Welcome back"}</h2><div className="account-switch"><button type="button" className={authMode === "register" ? "active" : ""} onClick={() => setAuthMode("register")}>New customer</button><button type="button" className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>I have an account</button></div><div className="public-fields">{authMode === "register" && <><label>First name<input name="first_name" value={account.first_name} onChange={changeAccount} required/></label><label>Last name<input name="last_name" value={account.last_name} onChange={changeAccount} required/></label><label className="full">Email<input name="email" type="email" value={account.email} onChange={changeAccount} required/></label></>}<label>Username<input name="username" value={account.username} onChange={changeAccount} required/></label><label>Password<input name="password" type="password" minLength="8" value={account.password} onChange={changeAccount} required/></label></div></section>}
      <section className="public-submit-card"><div><small>BOOKING POLICY</small><p>{business.cancellation_policy}</p></div>{error && <p className="public-error">{error}</p>}<button className="public-primary" disabled={submitting}>{submitting ? "Reserving your appointment…" : "Request appointment"}</button></section>
    </form>
  </main>;
}
