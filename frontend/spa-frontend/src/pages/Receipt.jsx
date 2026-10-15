import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPayments } from "../api/api";
import { formatMoney, useBusiness } from "../context/BusinessContext";
import "./Receipt.css";

export default function Receipt(){
  const {business}=useBusiness();
  const {id}=useParams();const [payment,setPayment]=useState(null);
  useEffect(()=>{getPayments().then(r=>setPayment(r.data.find(p=>String(p.id)===id)||false))},[id]);
  if(payment===null)return <div className="page">Preparing receipt…</div>;
  if(!payment||payment.status!=='paid')return <div className="page"><div className="panel empty">A receipt is available only after payment is confirmed.</div></div>;
  return <div className="page receipt-page"><div className="receipt-actions"><button onClick={()=>window.print()}>Print / Save as PDF</button></div><article className="receipt"><header><div className="receipt-logo">{business.logo_url?<img src={business.logo_url} alt="" style={{width:64,height:64,objectFit:"contain"}}/>:"♢"}</div><h1>{business.name}</h1><p>{business.tagline?.toUpperCase()}</p></header><div className="paid-stamp">PAID</div><section><h2>Payment receipt</h2><p className="receipt-number">{payment.receipt_number}</p><dl><dt>Client</dt><dd>{payment.client_name}</dd><dt>Service</dt><dd>{payment.service_name}</dd><dt>Appointment</dt><dd>{payment.appointment_date} · Booking #{payment.booking}</dd><dt>Payment method</dt><dd>{payment.method.replaceAll('_',' ').toUpperCase()}</dd><dt>Provider reference</dt><dd>{payment.provider_reference||payment.customer_reference||'Confirmed by spa'}</dd><dt>Date paid</dt><dd>{new Date(payment.date_paid).toLocaleString()}</dd></dl></section><div className="receipt-total"><span>Total paid</span><strong>{formatMoney(payment.amount,business.currency)}</strong></div><footer>Thank you for choosing {business.name}.<br/>This computer-generated receipt is proof of payment.</footer></article></div>;
}
