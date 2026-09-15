import React from "react";
import { Routes, Route, NavLink, Navigate, Link } from "react-router-dom";
import Services from "./Services";
import Bookings from "./Bookings";
import Payments from "./Payments";
import BookService from "./BookService";

const items = [["services","✦","Services"],["book","◫","Book a Service"],["bookings","▤","My Bookings"],["payments","▭","Payments"]];

export default function Dashboard() {
  const logout=()=>{localStorage.clear();window.location.href="/login"};
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span>♢</span><strong>Serenity Spa</strong><small>RESTORE · REBALANCE · BELONG</small></div>
      <nav className="side-nav"><NavLink to="/dashboard" end>⌂ Dashboard</NavLink>{items.map(([p,i,l])=><NavLink key={p} to={`/dashboard/${p}`}>{i} {l}</NavLink>)}</nav>
      <button className="logout" onClick={logout}>↪ Logout</button><p className="sidebar-quote">“A calmer you.<br/>A brighter tomorrow.”</p>
    </aside>
    <main className="main-area"><header className="topbar"><span>⌕ &nbsp; Find your moment of calm...</span><b>Welcome, Wyonna ◌</b></header>
      <Routes><Route index element={<Home/>}/><Route path="services" element={<Services/>}/><Route path="bookings" element={<Bookings/>}/><Route path="payments" element={<Payments/>}/><Route path="book" element={<BookService/>}/><Route path="*" element={<Navigate to="/dashboard" replace/>}/></Routes>
    </main>
  </div>;
}

function Home(){return <><section className="hero"><div><small>WELLNESS LIVES HERE</small><h1>Welcome back, Wyonna</h1><p>Take time for what matters most—you.<br/>Relax. Reconnect. Be well.</p><Link className="gold-button" to="/dashboard/book">Book your escape →</Link></div></section><section className="content-section"><div className="section-heading"><div><span>OUR COLLECTION</span><h2>Signature treatments</h2></div><Link to="/dashboard/services">Explore all →</Link></div><div className="feature-grid"><Card cls="massage" name="Swedish Massage" text="Relaxing, restorative, and made for total renewal." price="$50"/><Card cls="tissue" name="Deep Tissue" text="Release tension and restore natural movement." price="$75"/><Card cls="aroma" name="Aromatherapy" text="Botanical calm for a happier, healthier you." price="$65"/></div><div className="wellness-note"><span>✦</span><div><small>YOUR TIME TO RESTORE</small><h3>Self-care isn't a luxury. It's a better you.</h3></div><Link to="/dashboard/book">Reserve your moment</Link></div></section></>}
function Card({cls,name,text,price}){return <article className={`feature-card ${cls}`}><div><h3>{name}</h3><p>{text}</p><b>60 min · {price}</b></div></article>}
