import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getServices } from "../api/api";
import "./Services.css";

export default function Services() {
  const [services, setServices] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getServices().then((response) => setServices(response.data)).catch(() => setError("We couldn't load the treatment menu right now."));
  }, []);

  return <div className="page">
    <div className="page-header"><div><span className="eyebrow">CURATED FOR YOU</span><h1>Rituals for restoration</h1></div></div>
    <p className="services-intro">Every treatment is a pause from the noise—thoughtfully designed to release tension, restore energy, and bring you back to yourself.</p>
    {error && <p className="message">{error}</p>}
    <div className="treatment-grid">
      {services.map((service, index) => <article className="treatment-card" key={service.id}>
        <div className={`treatment-photo photo-${index % 3}`} role="img" aria-label={`${service.name} treatment`}></div>
        <div className="treatment-body">
          <span className="eyebrow">SIGNATURE TREATMENT</span><h2>{service.name}</h2><p>{service.description}</p>
          <div className="treatment-meta"><span>◷ {service.duration} min</span><span>•</span><span>${service.price}</span></div>
          <Link className="treatment-link" to="/dashboard/book"><span>Book this treatment</span><span>→</span></Link>
        </div>
      </article>)}
    </div>
    {services.length === 0 && !error && <div className="panel empty">Your treatment menu is being prepared.</div>}
    <div className="services-promise"><div><span className="eyebrow">THE SERENITY PROMISE</span><h3>Unhurried care, tailored to you.</h3><p>Arrive early, breathe deeply, and let us take care of the rest.</p></div><span className="brand-mark">♢</span></div>
  </div>;
}
