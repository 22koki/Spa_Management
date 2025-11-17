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
    <div>
      <h2>Bookings</h2>
      <ul>
        {bookings.map((b) => (
          <li key={b.id}>
            Booking #{b.id}: Client {b.client} - Service {b.service} - {b.date} {b.time} - Status: {b.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
