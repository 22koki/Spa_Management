import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPayments } from "../api/api";
import "./Receipt.css";

export default function Receipt(){
  const {id}=useParams();const [payment,setPayment]=useState(null);
  useEffect(()=>{getPayments().then(r=>setPayment(r.data.find(p=>String(p.id)===id)||false))},[id]);
  if(payment===null)return <div className="page">Preparing receipt…</div>;
  if(!payment||payment.status!=='paid')return <div className="page"><div className="panel empty">A receipt is available only after payment is confirmed.</div></div>;
  return <div className="page receipt-page"><div className="receipt-actions"><button onClick={()=>window.print()}>Print / Save as PDF</button></div><article className="receipt"><header><div className="receipt-logo">♢</div><h1>Serenity Spa</h1><p>RESTORE · REBALANCE · BELONG</p></header><div className="paid-stamp">PAID</div><section><h2>Payment receipt</h2><p className="receipt-number">{payment.receipt_number}</p><dl><dt>Client</dt><dd>{payment.client_name}</dd><dt>Service</dt><dd>{payment.service_name}</dd><dt>Appointment</dt><dd>{payment.appointment_date} · Booking #{payment.booking}</dd><dt>Payment method</dt><dd>{payment.method.replaceAll('_',' ').toUpperCase()}</dd><dt>Provider reference</dt><dd>{payment.provider_reference||payment.customer_reference||'Confirmed by spa'}</dd><dt>Date paid</dt><dd>{new Date(payment.date_paid).toLocaleString()}</dd></dl></section><div className="receipt-total"><span>Total paid</span><strong>KES {payment.amount}</strong></div><footer>Thank you for choosing Serenity Spa.<br/>This computer-generated receipt is proof of payment.</footer></article></div>;
}
