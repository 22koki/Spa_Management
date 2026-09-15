import React, { useState, useEffect } from "react";
import { getServices, getTherapists, createBooking } from "../api/api";

export default function BookService() {
  const [services, setServices] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [serviceId, setServiceId] = useState("");
  const [therapistId, setTherapistId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchServices();
    fetchTherapists();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await getServices();
      setServices(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTherapists = async () => {
    try {
      const res = await getTherapists();
      setTherapists(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      await createBooking({ service: serviceId, therapist: therapistId, date, time });
      setMessage("Booking created successfully!");
      setServiceId("");
      setTherapistId("");
      setDate("");
      setTime("");
    } catch (err) {
      const errors = err.response?.data;
      const detail = errors && typeof errors === "object"
        ? Object.values(errors).flat().join(" ")
        : null;
      setMessage(detail || "Error creating booking");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2>Book a Service</h2>
      {message && <p>{message}</p>}
      <form onSubmit={handleBooking}>
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
          <option value="">Select Service</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select value={therapistId} onChange={(e) => setTherapistId(e.target.value)} required>
          <option value="">Select Therapist</option>
          {therapists.map((t) => (
            <option key={t.id} value={t.id}>{t.username}</option>
          ))}
        </select>

        <input type="date" min={new Date().toISOString().split("T")[0]} value={date} onChange={(e) => setDate(e.target.value)} required />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        <button type="submit" disabled={submitting}>{submitting ? "Booking..." : "Book"}</button>
      </form>
    </div>
  );
}
