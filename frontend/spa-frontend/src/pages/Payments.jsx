import React, { useEffect, useState } from "react";
import { confirmPayment, createPayment, getBookings, getPayments } from "../api/api";
import "./Payments.css";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";

export default function Payments() {
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [booking, setBooking] = useState(searchParams.get("booking") || "");
  const [method, setMethod] = useState("mpesa_stk");
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(null);
  const role = getTokenRole();
  const isClient = role === "client";

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
      const response = await createPayment({ booking, method, phone_number: phone, customer_reference: reference });
      if (response.data.checkout_url) { window.location.href = response.data.checkout_url; return; }
      setMessage(response.data.message || "Payment submitted successfully.");
      setBooking("");
      await load();
    } catch (error) {
      const data = error.response?.data;
      setMessage(data ? Object.values(data).flat().join(" ") : "Payment could not be recorded.");
    }
  };

  const confirm = async (payment) => {
    setConfirming(payment.id);
    setMessage("");
    try {
      await confirmPayment(payment.id, payment.customer_reference || "");
      setMessage(`Payment #${payment.id} confirmed. The receipt is now available.`);
      await load();
    } catch (error) {
      setMessage(error.response?.data?.detail || "Payment could not be confirmed.");
    } finally {
      setConfirming(null);
    }
  };

  const submitLabel = method === 'mpesa_stk'
    ? 'Send M-PESA prompt'
    : method === 'card'
      ? 'Continue to card payment'
      : 'Submit for staff verification';

  return <div className="page">
    <div className="page-header"><div><span className="eyebrow">SIMPLE & SECURE</span><h1>Payments</h1></div></div>
    <div className="payment-layout">
      {isClient ? <form className="panel booking-form" onSubmit={submit}>
        <h2>Complete a payment</h2><p className="muted">Choose your appointment and preferred payment method. The amount is calculated securely from the service.</p>
        {message && <p className="message">{message}</p>}
        <div className="field"><label>Booking</label><select value={booking} onChange={e=>setBooking(e.target.value)} required><option value="">Select booking</option>{bookings.map(b=><option key={b.id} value={b.id}>Booking #{b.id} · {b.date} {b.time}</option>)}</select></div>
        <div className="payment-methods">
          {[['mpesa_stk','M-PESA prompt'],['mpesa_till','Paid via Till'],['card','Card'],['cash','Cash']].map(([value,label])=><label className={method===value?'selected':''} key={value}><input type="radio" name="method" value={value} checked={method===value} onChange={e=>setMethod(e.target.value)}/><b>{label}</b><small>{value==='mpesa_stk'?'Receive a prompt on your phone':value==='mpesa_till'?'Submit your M-PESA transaction code':value==='card'?'Continue to secure Flutterwave checkout':'Confirm payment at reception'}</small></label>)}
        </div>
        {method==='mpesa_stk'&&<div className="field"><label>M-PESA phone number</label><input placeholder="07XX XXX XXX" value={phone} onChange={e=>setPhone(e.target.value)} required/></div>}
        {method==='mpesa_till'&&<div className="field"><label>M-PESA transaction code</label><input placeholder="e.g. TKA12ABC34" value={reference} onChange={e=>setReference(e.target.value.toUpperCase())} required/></div>}
        <button className="submit-button">{submitLabel}</button>
        {(method==='cash'||method==='mpesa_till')&&<small className="verification-note">This will remain pending until reception verifies the payment.</small>}
      </form> : <section className="panel verification-panel"><span className="eyebrow">STAFF CHECKOUT</span><h2>Verify payments</h2><p className="muted">Confirm cash and Till payments only after checking the money or transaction code. Gateway payments update automatically after a verified callback.</p>{message&&<p className="message">{message}</p>}</section>}
      <section><h2>Payment history</h2><ul className="data-list">{payments.map(p=><li className="data-card" key={p.id}><div><b>{p.receipt_number||`Payment #${p.id}`}</b><p>Booking #{p.booking} · {p.method.replaceAll('_',' ').toUpperCase()} · <span className={`payment-status ${p.status}`}>{p.status}</span></p></div><div className="payment-actions"><strong>KES {p.amount}</strong>{p.can_confirm&&<button className="verify-button" disabled={confirming===p.id} onClick={()=>confirm(p)}>{confirming===p.id?'Confirming…':'Mark as paid'}</button>}{p.status==='paid'&&<Link className="receipt-link" to={`/dashboard/receipts/${p.id}`}>Receipt</Link>}{isClient&&p.status==='pending'&&<small>Awaiting staff verification</small>}</div></li>)}</ul>{payments.length===0&&<div className="panel empty">No payments recorded yet.</div>}</section>
    </div>
  </div>;
}

function getTokenRole() {
  try {
    const token = localStorage.getItem("token");
    const encoded = token?.split(".")[1];
    if (!encoded) return "client";
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(window.atob(padded)).role || "client";
  } catch {
    return "client";
  }
}
