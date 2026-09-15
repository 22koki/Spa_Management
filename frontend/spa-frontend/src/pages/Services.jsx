import React, { useState, useEffect } from "react";
import { getServices } from "../api/api";

export default function Services() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await getServices();
      setServices(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page">
      <div className="page-header"><div><span className="eyebrow">CURATED FOR YOU</span><h1>Our Services</h1></div></div>
      <div className="service-grid">
        {services.map((service) => (
          <article className="panel" key={service.id}><span className="eyebrow">SIGNATURE TREATMENT</span><h2>{service.name}</h2><p>{service.description}</p><b>{service.duration} min &nbsp; · &nbsp; ${service.price}</b></article>
        ))}
      </div>
    </div>
  );
}
