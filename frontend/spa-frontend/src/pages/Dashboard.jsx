import React, { useEffect, useState } from "react";
import { Routes, Route, NavLink, Navigate, Link } from "react-router-dom";
import { getCurrentUser, getServices } from "../api/api";
import { formatMoney, useBusiness } from "../context/BusinessContext";
import Services from "./Services";
import Bookings from "./Bookings";
import Payments from "./Payments";
import BookService from "./BookService";
import Receipt from "./Receipt";
import Operations from "./Operations";
import BusinessSettings from "./BusinessSettings";
import Team from "./Team";
import Clients from "./Clients";
import WhatsAppContact from "../components/WhatsAppContact";

const links = {
  owner: [["operations", "!", "Today"], ["services", "✦", "Services"], ["bookings", "▤", "Appointments"], ["team", "♙", "Team & Rooms"], ["clients", "◎", "Clients"], ["payments", "▭", "Payments"], ["settings", "⚙", "Settings"]],
  manager: [["operations", "!", "Today"], ["services", "✦", "Services"], ["bookings", "▤", "Appointments"], ["team", "♙", "Team & Rooms"], ["clients", "◎", "Clients"], ["payments", "▭", "Payments"], ["settings", "⚙", "Settings"]],
  admin: [["operations", "!", "Today"], ["services", "✦", "Services"], ["bookings", "▤", "Appointments"], ["team", "♙", "Team & Rooms"], ["clients", "◎", "Clients"], ["payments", "▭", "Payments"], ["settings", "⚙", "Settings"]],
  receptionist: [["operations", "!", "Today"], ["bookings", "▤", "Appointments"], ["clients", "◎", "Clients"], ["payments", "▭", "Payments"]],
  therapist: [["bookings", "▤", "My schedule"], ["services", "✦", "Services"]],
  practitioner: [["bookings", "▤", "My schedule"], ["services", "✦", "Services"]],
  client: [["services", "✦", "Services"], ["book", "◫", "Book a Service"], ["bookings", "▤", "My Appointments"], ["payments", "▭", "Payments"]],
};

export default function Dashboard() {
  const { business } = useBusiness();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { getCurrentUser().then(response => setUser(response.data)).catch(() => setError("Your account could not be loaded.")); }, []);
  const logout = () => { localStorage.clear(); window.location.href = "/login"; };
  if (!user) return <div className="dashboard-loading">{error || "Preparing your workspace…"}</div>;
  const navItems = links[user.role] || links.client;
  const displayName = user.first_name || user.username;
  const canOperate = ["owner", "manager", "admin", "receptionist"].includes(user.role) || user.is_staff;
  const canManage = ["owner", "manager", "admin"].includes(user.role) || user.is_staff;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand">{business.logo_url ? <img src={business.logo_url} alt=""/> : <span>♢</span>}<strong>{business.name}</strong><small>{business.tagline}</small></div>
      <div className="role-chip">{user.role.replaceAll("_", " ")}</div>
      <nav className="side-nav"><NavLink to="/dashboard" end>⌂ Overview</NavLink>{navItems.map(([path, icon, label]) => <NavLink key={path} to={`/dashboard/${path}`}>{icon} {label}</NavLink>)}</nav>
      <button className="logout" onClick={logout}>↪ Logout</button><p className="sidebar-quote">“A calmer guest.<br/>A clearer day.”</p>
    </aside>
    <main className="main-area"><header className="topbar"><span>{canOperate ? "Today's priorities, appointments and revenue" : "Your wellness, beautifully organized"}</span><b>{displayName} · {user.role} ◌</b></header>
      <Routes>
        <Route index element={<Home user={user} business={business}/>}/>
        <Route path="operations" element={canOperate ? <Operations/> : <Navigate to="/dashboard" replace/>}/>
        <Route path="services" element={<Services user={user}/>}/>
        <Route path="bookings" element={<Bookings user={user}/>}/>
        <Route path="team" element={canManage ? <Team/> : <Navigate to="/dashboard" replace/>}/>
        <Route path="clients" element={canOperate ? <Clients/> : <Navigate to="/dashboard" replace/>}/>
        <Route path="payments" element={!["therapist", "practitioner"].includes(user.role) ? <Payments user={user}/> : <Navigate to="/dashboard/bookings" replace/>}/>
        <Route path="receipts/:id" element={<Receipt/>}/>
        <Route path="book" element={user.role === "client" ? <BookService/> : <Navigate to="/dashboard" replace/>}/>
        <Route path="settings" element={canManage ? <BusinessSettings/> : <Navigate to="/dashboard" replace/>}/>
        <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
      </Routes>
      <WhatsAppContact />
    </main>
  </div>;
}

function Home({ user, business }) {
  const [services, setServices] = useState([]);
  useEffect(() => { getServices().then(response => setServices(response.data.slice(0, 3))).catch(() => {}); }, []);
  const name = user.first_name || user.username;
  const isClient = user.role === "client";
  const destination = isClient ? "/dashboard/book" : ["therapist", "practitioner"].includes(user.role) ? "/dashboard/bookings" : "/dashboard/operations";
  const heroStyle = business.hero_image_url ? { backgroundImage: `linear-gradient(90deg,rgba(5,29,23,.95),rgba(6,27,22,.5) 48%,transparent 75%),url('${business.hero_image_url}')` } : undefined;
  return <><section className="hero" style={heroStyle}><div><small>{isClient ? "WELLNESS LIVES HERE" : "YOUR SPA, IN FOCUS"}</small><h1>Welcome back, {name}</h1><p>{isClient ? "Take time for what matters most—you.\nRelax. Reconnect. Be well." : "See what needs attention, keep the team aligned, and protect every guest experience."}</p><Link className="gold-button" to={destination}>{isClient ? "Book your escape" : "Open today's workspace"} →</Link></div></section><section className="content-section"><div className="section-heading"><div><span>OUR COLLECTION</span><h2>Signature treatments</h2></div><Link to="/dashboard/services">Explore all →</Link></div><div className="feature-grid">{services.length ? services.map((service, index) => <Card key={service.id} cls={["massage", "tissue", "aroma"][index % 3]} name={service.name} text={service.description} price={formatMoney(service.price, business.currency)} duration={service.duration}/>) : <div className="panel empty">Add services to bring this collection to life.</div>}</div><div className="wellness-note"><span>✦</span><div><small>{business.name.toUpperCase()}</small><h3>{business.tagline}</h3></div><Link to={destination}>{isClient ? "Reserve your moment" : "View priorities"}</Link></div></section></>;
}

function Card({ cls, name, text, price, duration }) { return <article className={`feature-card ${cls}`}><div><h3>{name}</h3><p>{text}</p><b>{duration} min · {price}</b></div></article>; }
