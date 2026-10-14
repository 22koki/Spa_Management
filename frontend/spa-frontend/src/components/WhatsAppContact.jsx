import React from "react";
import "./WhatsAppContact.css";

const configuredNumber = process.env.REACT_APP_SPA_WHATSAPP_NUMBER || "";

function normalizePhone(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if ((digits.startsWith("7") || digits.startsWith("1")) && digits.length === 9) return `254${digits}`;
  return digits;
}

export default function WhatsAppContact() {
  const phone = normalizePhone(configuredNumber);
  if (!phone) return null;
  const message = "Hello Serenity Spa, I need some help with my booking.";
  return <a className="whatsapp-contact" href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" aria-label="Chat with Serenity Spa on WhatsApp"><span>◉</span><b>Chat with the spa</b></a>;
}
