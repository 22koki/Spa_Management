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
    <div>
      <h2>Services</h2>
      <ul>
        {services.map((service) => (
          <li key={service.id}>
            <b>{service.name}</b>: {service.description} - ${service.price} ({service.duration} mins)
          </li>
        ))}
      </ul>
    </div>
  );
}
