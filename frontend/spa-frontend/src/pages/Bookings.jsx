import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getBookings } from "../api/api";
import "./Bookings.css";

const prettyDate = value => new Date(`${value}T00:00:00`).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});

export default function Bookings(){
  const [bookings,setBookings]=useState([]);const [tab,setTab]=useState('upcoming');const [error,setError]=useState('');
  useEffect(()=>{getBookings().then(r=>setBookings(r.data)).catch(()=>setError("We couldn't load your appointments."))},[]);
  const {upcoming,past}=useMemo(()=>{
    const now=new Date();
    const sorted=[...bookings].sort((a,b)=>new Date(`${a.date}T${a.time}`)-new Date(`${b.date}T${b.time}`));
    return {upcoming:sorted.filter(b=>new Date(`${b.date}T${b.time}`)>=now&&!['completed','cancelled'].includes(b.status)),past:sorted.filter(b=>new Date(`${b.date}T${b.time}`)<now||['completed','cancelled'].includes(b.status)).reverse()};
  },[bookings]);
  const shown=tab==='upcoming'?upcoming:past;const next=upcoming[0];
  return <div className="page"><div className="page-header"><div><span className="eyebrow">YOUR WELLNESS CALENDAR</span><h1>My Bookings</h1></div><Link className="gold-button" to="/dashboard/book">Book a treatment</Link></div>
    {error&&<p className="message">{error}</p>}
    {next&&<section className="next-appointment"><div className="date-tile"><small>{new Date(`${next.date}T00:00:00`).toLocaleString('default',{month:'short'})}</small><strong>{new Date(`${next.date}T00:00:00`).getDate()}</strong></div><div><small>NEXT APPOINTMENT</small><h2>{next.service_name}</h2><p>{next.time.slice(0,5)} · {next.duration} min · with {next.therapist_name}</p></div>{!next.is_paid&&<Link className="gold-button" to={`/dashboard/payments?booking=${next.id}`}>Pay now →</Link>}</section>}
    <div className="booking-tabs"><button className={tab==='upcoming'?'active':''} onClick={()=>setTab('upcoming')}>Upcoming ({upcoming.length})</button><button className={tab==='past'?'active':''} onClick={()=>setTab('past')}>Past ({past.length})</button></div>
    <div className="appointment-grid">{shown.map(b=><article className="appointment-card" key={b.id}><div className="appointment-top"><div><span className="eyebrow">{prettyDate(b.date)}</span><h3>{b.service_name}</h3></div><span className={`status ${b.status}`}>{b.status}</span></div><div className="appointment-details">◷ {b.time.slice(0,5)} · {b.duration} minutes<br/>♢ Therapist: {b.therapist_name}<br/>${b.price} · {b.is_paid?'Paid':'Payment pending'}</div><div className="appointment-actions">{!b.is_paid&&tab==='upcoming'&&<Link className="primary" to={`/dashboard/payments?booking=${b.id}`}>Pay now</Link>}<Link to={`/dashboard/book?service=${b.service}`}>Book again</Link></div></article>)}</div>
    {shown.length===0&&!error&&<div className="panel empty"><h2>{tab==='upcoming'?'Your calm awaits':'No past visits yet'}</h2><p>{tab==='upcoming'?'You have no upcoming appointments. Choose a treatment and make time for yourself.':'Your completed treatments will appear here.'}</p>{tab==='upcoming'&&<Link className="gold-button" to="/dashboard/book">Book your first treatment</Link>}</div>}
  </div>;
}
