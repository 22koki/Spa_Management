import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { confirmPayment, createPayment, getBookings, getPayments } from "../api/api";
import { formatMoney, useBusiness } from "../context/BusinessContext";
import "./Payments.css";

const options = [
  { value: "mpesa_stk", label: "M-PESA prompt", help: "Receive an STK prompt on your phone" },
  { value: "mpesa_till", label: "Paid via Till", help: "Submit your M-PESA transaction code" },
  { value: "card", label: "Card", help: "Continue to secure Flutterwave checkout" },
  { value: "cash", label: "Cash", help: "Pay and confirm at reception" },
];

export default function Payments({ user }) {
  const { business } = useBusiness();
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [booking, setBooking] = useState(searchParams.get("booking") || "");
  const [method, setMethod] = useState("");
  const [paymentType, setPaymentType] = useState("full");
  const [tip, setTip] = useState("0");
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const isClient = user?.role === "client";

  const availableMethods = useMemo(
    () => options.filter(option => business.payment_methods?.[option.value]),
    [business.payment_methods],
  );

  useEffect(() => {
    if (!availableMethods.some(option => option.value === method)) {
      setMethod(availableMethods[0]?.value || "");
    }
  }, [availableMethods, method]);

  const load = async () => {
    try {
      const [paymentResponse, bookingResponse] = await Promise.all([getPayments(), getBookings()]);
      setPayments(paymentResponse.data);
      setBookings(bookingResponse.data);
    } catch {
      setMessage("Payments could not be loaded. Please refresh and try again.");
    }
  };

  useEffect(() => { load(); }, []);

  const payableBookings = bookings.filter(item =>
    !item.is_paid && !payments.some(payment =>
      payment.booking === item.id && ["pending", "processing"].includes(payment.status)
    )
  );
  const selectedBooking = bookings.find(item => String(item.id) === String(booking));
  const subtotal = selectedBooking
    ? Number(selectedBooking.price) * (paymentType === "deposit" ? Number(selectedBooking.deposit_percent || 0) / 100 : 1)
    : 0;
  const estimatedTax = subtotal * Number(business.tax_percent || 0) / 100;
  const estimatedTotal = subtotal + estimatedTax + Number(tip || 0);

  const submit = async event => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const response = await createPayment({
        booking,
        method,
        payment_type: paymentType,
        tip: tip || 0,
        phone_number: phone,
        customer_reference: reference,
      });
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
        return;
      }
      setMessage(response.data.message || "Payment submitted successfully.");
      setBooking("");
      setReference("");
      await load();
    } catch (error) {
      const data = error.response?.data;
      setMessage(data ? Object.values(data).flat().join(" ") : "Payment could not be recorded.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirm = async payment => {
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

  const submitLabel = method === "mpesa_stk"
    ? "Send M-PESA prompt"
    : method === "card"
      ? "Continue to card payment"
      : "Submit for staff verification";

  return <div className="page">
    <div className="page-header"><div><span className="eyebrow">SIMPLE & SECURE</span><h1>Payments</h1></div></div>
    <div className="payment-layout">
      {isClient ? <form className="panel booking-form" onSubmit={submit}>
        <h2>Complete a payment</h2>
        <p className="muted">Only payment methods that are ready for this spa are shown. Final totals are calculated by the server.</p>
        {message && <p className="message">{message}</p>}
        <div className="field"><label>Booking</label><select value={booking} onChange={event => setBooking(event.target.value)} required><option value="">Select booking</option>{payableBookings.map(item => <option key={item.id} value={item.id}>#{item.id} · {item.service_name} · {item.date}</option>)}</select></div>
        {selectedBooking && <div className="payment-type-row"><label><input type="radio" name="paymentType" value="deposit" checked={paymentType === "deposit"} onChange={event => setPaymentType(event.target.value)}/> Deposit ({selectedBooking.deposit_percent}%)</label><label><input type="radio" name="paymentType" value="full" checked={paymentType === "full"} onChange={event => setPaymentType(event.target.value)}/> Full payment</label></div>}
        <div className="payment-methods">{availableMethods.map(option => <label className={method === option.value ? "selected" : ""} key={option.value}><input type="radio" name="method" value={option.value} checked={method === option.value} onChange={event => setMethod(event.target.value)}/><b>{option.label}</b><small>{option.help}</small></label>)}</div>
        {!availableMethods.length && <p className="message">No payment method is configured. Please contact reception.</p>}
        {method === "mpesa_stk" && <div className="field"><label>M-PESA phone number</label><input placeholder="07XX XXX XXX" value={phone} onChange={event => setPhone(event.target.value)} required/></div>}
        {method === "mpesa_till" && <div className="field"><label>M-PESA transaction code</label><input placeholder="e.g. TKA12ABC34" value={reference} onChange={event => setReference(event.target.value.toUpperCase())} required/></div>}
        <div className="field"><label>Tip (optional)</label><input type="number" min="0" step="1" value={tip} onChange={event => setTip(event.target.value)}/></div>
        {selectedBooking && <div className="payment-summary"><span>Subtotal <b>{formatMoney(subtotal, business.currency)}</b></span><span>Tax <b>{formatMoney(estimatedTax, business.currency)}</b></span><strong>Total <b>{formatMoney(estimatedTotal, business.currency)}</b></strong></div>}
        <button className="submit-button" disabled={submitting || !method || !booking}>{submitting ? "Submitting…" : submitLabel}</button>
        {(method === "cash" || method === "mpesa_till") && <small className="verification-note">This remains pending until reception verifies the payment.</small>}
      </form> : <section className="panel verification-panel"><span className="eyebrow">STAFF CHECKOUT</span><h2>Verify payments</h2><p className="muted">Confirm cash and Till payments only after checking the money or transaction code. Gateway payments update through verified callbacks.</p>{message && <p className="message">{message}</p>}</section>}
      <section><h2>Payment history</h2><ul className="data-list">{payments.map(payment => <li className="data-card" key={payment.id}><div><b>{payment.receipt_number || `Payment #${payment.id}`}</b><p>Booking #{payment.booking} · {payment.method.replaceAll("_", " ").toUpperCase()} · <span className={`payment-status ${payment.status}`}>{payment.status}</span></p></div><div className="payment-actions"><strong>{formatMoney(payment.amount, business.currency)}</strong>{payment.can_confirm && <button className="verify-button" disabled={confirming === payment.id} onClick={() => confirm(payment)}>{confirming === payment.id ? "Confirming…" : "Mark as paid"}</button>}{payment.status === "paid" && <Link className="receipt-link" to={`/dashboard/receipts/${payment.id}`}>Receipt</Link>}{isClient && payment.status === "pending" && <small>Awaiting staff verification</small>}</div></li>)}</ul>{payments.length === 0 && <div className="panel empty">No payments recorded yet.</div>}</section>
    </div>
  </div>;
}
