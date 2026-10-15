import React from "react";
import { useBusiness } from "../context/BusinessContext";
import "./WhatsAppContact.css";

function normalizePhone(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if ((digits.startsWith("7") || digits.startsWith("1")) && digits.length === 9) return `254${digits}`;
  return digits;
}

export default function WhatsAppContact() {
  const { business } = useBusiness();
  const phone = normalizePhone(business.whatsapp_number || "");
  if (!phone) return null;
  const message = `Hello ${business.name}, I need some help with my booking.`;
  return <a className="whatsapp-contact" href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" aria-label={`Chat with ${business.name} on WhatsApp`}><span>◉</span><b>Chat with the spa</b></a>;
}
