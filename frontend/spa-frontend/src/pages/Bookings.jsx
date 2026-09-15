import React, { useState, useEffect } from "react";
import { getBookings } from "../api/api";

export default function Bookings() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await getBookings();
      setBookings(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page"><div className="page-header"><div><span className="eyebrow">YOUR WELLNESS CALENDAR</span><h1>My Bookings</h1></div></div>
      <ul className="data-list">
        {bookings.map((b) => (
          <li className="data-card" key={b.id}><div><b>Appointment #{b.id}</b><p>Service {b.service} · {b.date} at {b.time}</p></div><span className="status">{b.status}</span></li>
        ))}
      </ul>{bookings.length === 0 && <div className="panel empty">No bookings yet. Your next moment of calm starts here.</div>}
    </div>
  );
}
