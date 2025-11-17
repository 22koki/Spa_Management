import React, { useState, useEffect } from "react";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import Services from "./Services";
import Bookings from "./Bookings";
import Payments from "./Payments";
import BookService from "./BookService";

export default function Dashboard() {
  return (
    <div>
      <h1>Spa Management Dashboard</h1>
      <nav style={{ marginBottom: "20px" }}>
        <Link to="services" style={{ marginRight: "10px" }}>Services</Link>
        <Link to="bookings" style={{ marginRight: "10px" }}>Bookings</Link>
        <Link to="payments" style={{ marginRight: "10px" }}>Payments</Link>
        <Link to="book" style={{ marginRight: "10px" }}>Book a Service</Link>
      </nav>

      <Routes>
        <Route path="services" element={<Services />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="payments" element={<Payments />} />
        <Route path="book" element={<BookService />} />
        <Route path="/" element={<Navigate to="services" />} />
      </Routes>
    </div>
  );
}
