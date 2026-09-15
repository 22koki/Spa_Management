import React, { useEffect, useState } from "react";
import { createPayment, getBookings, getPayments } from "../api/api";
import "./Payments.css";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [booking, setBooking] = useState("");
  const [method, setMethod] = useState("mpesa");
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const [paymentResponse, bookingResponse] = await Promise.all([getPayments(), getBookings()]);
      setPayments(paymentResponse.data);
      setBookings(bookingResponse.data);
    } catch (error) { console.error(error); }
  };

  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      await createPayment({ booking, method });
      setMessage("Payment recorded successfully.");
      setBooking("");
      await load();
    } catch (error) {
      const data = error.response?.data;
      setMessage(data ? Object.values(data).flat().join(" ") : "Payment could not be recorded.");
    }
  };

  return <div className="page">
    <div className="page-header"><div><span className="eyebrow">SIMPLE & SECURE</span><h1>Payments</h1></div></div>
    <div className="payment-layout">
      <form className="panel booking-form" onSubmit={submit}>
        <h2>Complete a payment</h2><p className="muted">Choose your appointment and preferred payment method. The amount is calculated securely from the service.</p>
        {message && <p className="message">{message}</p>}
        <div className="field"><label>Booking</label><select value={booking} onChange={e=>setBooking(e.target.value)} required><option value="">Select booking</option>{bookings.map(b=><option key={b.id} value={b.id}>Booking #{b.id} · {b.date} {b.time}</option>)}</select></div>
        <div className="payment-methods">
          {[['mpesa','M-PESA'],['card','Card'],['cash','Cash']].map(([value,label])=><label className={method===value?'selected':''} key={value}><input type="radio" name="method" value={value} checked={method===value} onChange={e=>setMethod(e.target.value)}/><b>{label}</b><small>{value==='mpesa'?'Pay with your mobile wallet':value==='card'?'Credit or debit card':'Pay at the spa'}</small></label>)}
        </div>
        <button className="submit-button">Confirm payment</button>
      </form>
      <section><h2>Payment history</h2><ul className="data-list">{payments.map(p=><li className="data-card" key={p.id}><div><b>Payment #{p.id}</b><p>Booking #{p.booking} · {p.method.toUpperCase()}</p></div><strong>${p.amount}</strong></li>)}</ul>{payments.length===0&&<div className="panel empty">No payments recorded yet.</div>}</section>
    </div>
  </div>;
}
