import React, { useEffect, useMemo, useRef, useState } from "react";
import { getDashboardReport, getBookings, updateBookingStatus } from "../api/api";
import "./Operations.css";

const money = value => new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
}).format(Number(value || 0));

const attentionCopy = {
  unconfirmed: "Confirm now to reduce drop-off",
  no_show: "Review and follow up with the guest",
  rebooking: "Send a thoughtful WhatsApp reminder",
};

export default function Operations() {
  const [report, setReport] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [focus, setFocus] = useState(null);
  const appointmentsRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const [reportResponse, bookingResponse] = await Promise.all([
        getDashboardReport(),
        getBookings(),
      ]);
      setReport(reportResponse.data);
      setBookings(bookingResponse.data);
      setError("");
      setLastUpdated(new Date());
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not load operations data. Your role may not have owner access.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const move = async (id, status) => {
    try {
      await updateBookingStatus(id, status);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "The appointment could not be updated.");
    }
  };

  const focusedBookings = useMemo(() => {
    if (!focus) return bookings;
    if (focus === "unconfirmed") return bookings.filter(item => ["pending", "booked"].includes(item.status));
    if (focus === "no_show") return bookings.filter(item => item.status === "no_show");
    if (focus === "rebooking") {
      const cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0);
      cutoff.setDate(cutoff.getDate() - 28);
      return bookings.filter(item => item.status === "completed" && new Date(`${item.date}T00:00:00`) <= cutoff);
    }
    return bookings;
  }, [bookings, focus]);

  const openAttention = kind => {
    setFocus(kind);
    window.setTimeout(() => appointmentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const sendWhatsAppReminder = booking => {
    const phone = normalizePhone(booking.client_phone);
    if (!phone) {
      setError(`${booking.client_name} does not have a WhatsApp number saved.`);
      return;
    }
    const message = `Hello ${booking.client_name}, this is a friendly reminder from Serenity Spa about your ${booking.service_name} appointment on ${booking.date} at ${booking.time.slice(0, 5)}. Please reply here if you need any help or want to reschedule.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  const fallbacks = [
    { kind: "unconfirmed", count: "—", label: "appointments need confirmation" },
    { kind: "no_show", count: "—", label: "no-shows today" },
    { kind: "rebooking", count: "—", label: "clients due for rebooking" },
  ];

  return <div className="ops-page">
    <header className="ops-head"><div><span>TODAY · SPA OPERATIONS</span><h1>What needs attention</h1><p>Act on the work that protects revenue and guest trust.</p></div><div className="refresh-wrap"><button disabled={loading} onClick={load}>{loading ? "Refreshing…" : "Refresh"}</button>{lastUpdated && <small>Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</small>}</div></header>
    {error && <div className="ops-error">{error}<button onClick={() => setError("")} aria-label="Dismiss">×</button></div>}
    <section className="metric-row"><Metric label="Daily sales" value={money(report?.sales)}/><Metric label="Appointments" value={report?.appointments ?? "—"}/><Metric label="Utilization" value={report ? `${report.staff_utilization}%` : "—"}/><Metric label="No-shows" value={report?.no_shows ?? "—"}/></section>
    <section className="attention-grid">{(report?.attention || fallbacks).map((item, index) => <button type="button" className={`attention-card tone-${index} ${focus === item.kind ? "active" : ""}`} onClick={() => openAttention(item.kind)} key={item.kind}><b>{item.count}</b><div><h3>{item.label}</h3><p>{attentionCopy[item.kind] || "Open the relevant appointments"}</p></div><span aria-hidden="true">→</span></button>)}</section>
    <section className="ops-panel" ref={appointmentsRef}><div className="panel-title"><div><span>LIVE WORKFLOW</span><h2>{focus ? attentionTitle(focus) : "Appointments"}</h2></div><div>{focus && <button className="clear-focus" onClick={() => setFocus(null)}>Show all</button>}<small>booked → confirmed → arrived → completed</small></div></div><div className="appointment-list">{focusedBookings.length ? focusedBookings.slice(0, 12).map(booking => <article key={booking.id}><div><b>{booking.time?.slice(0, 5)}</b><small>{booking.date}</small></div><div className="appointment-main"><strong>{booking.client_name}</strong><span>{booking.service_name} · {booking.therapist_name}</span></div><em className={`booking-status ${booking.status}`}>{booking.status.replaceAll("_", " ")}</em><div className="status-actions"><button className="whatsapp-action" disabled={!booking.client_phone} title={booking.client_phone ? "Open a pre-filled WhatsApp reminder" : "No WhatsApp number saved"} onClick={() => sendWhatsAppReminder(booking)}>WhatsApp</button>{["confirmed", "arrived", "completed", "no_show"].map(status => <button disabled={booking.status === status} onClick={() => move(booking.id, status)} key={status}>{status.replaceAll("_", " ")}</button>)}</div></article>) : <p className="empty">No appointments need this action right now.</p>}</div></section>
    <section className="mvp-grid"><Info title="Staff & resources" lines={["Availability, breaks and time off", "Skills and certification matching", "Room and equipment conflict protection"]}/><Info title="Client safety" lines={["Preferences and visit history", "Allergies and contraindications", "Consent forms and private notes"]}/><Info title="Revenue controls" lines={["Deposits or full payment", "Discounts, taxes, tips and receipts", "Audit trail and daily reporting"]}/></section>
  </div>;
}

function normalizePhone(value = "") {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if ((digits.startsWith("7") || digits.startsWith("1")) && digits.length === 9) return `254${digits}`;
  return digits;
}

function attentionTitle(kind) {
  return {
    unconfirmed: "Appointments awaiting confirmation",
    no_show: "No-show follow-up",
    rebooking: "Clients due for rebooking",
  }[kind] || "Appointments";
}

function Metric({ label, value }) { return <article className="metric"><span>{label}</span><strong>{value}</strong></article>; }
function Info({ title, lines }) { return <article className="info-card"><h3>{title}</h3>{lines.map(line => <p key={line}>✓ {line}</p>)}</article>; }
