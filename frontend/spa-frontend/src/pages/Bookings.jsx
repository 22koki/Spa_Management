import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getBookings, updateBookingStatus } from "../api/api";
import { formatMoney, useBusiness } from "../context/BusinessContext";
import "./Bookings.css";

const prettyDate = value => new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

export default function Bookings({ user }) {
  const { business } = useBusiness();
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState("upcoming");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(null);
  const isClient = user?.role === "client";
  const isPractitioner = ["therapist", "practitioner"].includes(user?.role);

  const load = async () => {
    try {
      const response = await getBookings();
      setBookings(response.data);
      setError("");
    } catch {
      setError("We couldn't load the appointments.");
    }
  };
  useEffect(() => { load(); }, []);

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const sorted = [...bookings].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
    return {
      upcoming: sorted.filter(item => new Date(`${item.date}T${item.time}`) >= now && !["completed", "cancelled", "no_show"].includes(item.status)),
      past: sorted.filter(item => new Date(`${item.date}T${item.time}`) < now || ["completed", "cancelled", "no_show"].includes(item.status)).reverse(),
    };
  }, [bookings]);

  const move = async (booking, status) => {
    if (status === "cancelled" && !window.confirm("Cancel this appointment? The spa cancellation policy will apply.")) return;
    setWorking(booking.id);
    try {
      await updateBookingStatus(booking.id, status);
      await load();
    } catch (requestError) {
      const data = requestError.response?.data;
      setError(data ? Object.values(data).flat().join(" ") : "The appointment could not be updated.");
    } finally {
      setWorking(null);
    }
  };

  const shown = tab === "upcoming" ? upcoming : past;
  const next = upcoming[0];
  const title = isClient ? "My Bookings" : isPractitioner ? "My Schedule" : "Appointments";
  const eyebrow = isClient ? "YOUR WELLNESS CALENDAR" : isPractitioner ? "SERVICE DELIVERY" : "TEAM CALENDAR";

  return <div className="page">
    <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></div>{isClient && <Link className="gold-button" to="/dashboard/book">Book a treatment</Link>}</div>
    {error && <p className="message">{error}</p>}
    {next && <section className="next-appointment"><div className="date-tile"><small>{new Date(`${next.date}T00:00:00`).toLocaleString("default", { month: "short" })}</small><strong>{new Date(`${next.date}T00:00:00`).getDate()}</strong></div><div><small>NEXT APPOINTMENT</small><h2>{next.service_name}</h2><p>{next.time.slice(0, 5)} · {next.duration} min · {isPractitioner ? next.client_name : `with ${next.therapist_name}`}</p></div>{isClient && !next.is_paid && <Link className="gold-button" to={`/dashboard/payments?booking=${next.id}`}>Pay now →</Link>}</section>}
    <div className="booking-tabs"><button className={tab === "upcoming" ? "active" : ""} onClick={() => setTab("upcoming")}>Upcoming ({upcoming.length})</button><button className={tab === "past" ? "active" : ""} onClick={() => setTab("past")}>Past ({past.length})</button></div>
    <div className="appointment-grid">{shown.map(booking => <article className="appointment-card" key={booking.id}><div className="appointment-top"><div><span className="eyebrow">{prettyDate(booking.date)}</span><h3>{booking.service_name}</h3></div><span className={`status ${booking.status}`}>{booking.status.replaceAll("_", " ")}</span></div><div className="appointment-details">◷ {booking.time.slice(0, 5)} · {booking.duration} minutes<br/>{isClient ? `♢ Practitioner: ${booking.therapist_name}` : `◎ Guest: ${booking.client_name}`}<br/>{formatMoney(booking.price, business.currency)} · {booking.is_paid ? "Paid" : "Payment pending"}{booking.whatsapp_reminder_status && <><br/>◉ WhatsApp reminder {booking.whatsapp_reminder_status}</>}</div><div className="appointment-actions">{isClient && !booking.is_paid && tab === "upcoming" && <Link className="primary" to={`/dashboard/payments?booking=${booking.id}`}>Pay now</Link>}{isClient && <Link to={`/dashboard/book?service=${booking.service}`}>Book again</Link>}{isClient && tab === "upcoming" && <button disabled={working === booking.id} onClick={() => move(booking, "cancelled")}>Cancel</button>}{!isClient && tab === "upcoming" && <StatusActions booking={booking} working={working} move={move}/>}</div></article>)}</div>
    {shown.length === 0 && !error && <div className="panel empty"><h2>{tab === "upcoming" ? "The calendar is clear" : "No past appointments yet"}</h2><p>{isClient ? "Choose a treatment and make time for yourself." : "Appointments assigned to this workspace will appear here."}</p>{isClient && tab === "upcoming" && <Link className="gold-button" to="/dashboard/book">Book your first treatment</Link>}</div>}
  </div>;
}

function StatusActions({ booking, working, move }) {
  const actions = {
    pending: [["confirmed", "Confirm"]],
    booked: [["confirmed", "Confirm"]],
    confirmed: [["arrived", "Mark arrived"], ["no_show", "No-show"]],
    arrived: [["completed", "Complete"]],
  }[booking.status] || [];
  return actions.map(([status, label]) => <button className={status === "completed" ? "primary-action" : ""} disabled={working === booking.id} key={status} onClick={() => move(booking, status)}>{label}</button>);
}
