import React, { useState, useEffect } from "react";
import { getPayments } from "../api/api";

export default function Payments() {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await getPayments();
      setPayments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Payments</h2>
      <ul>
        {payments.map((p) => (
          <li key={p.id}>
            Payment #{p.id}: Amount ${p.amount} - Method {p.method} - Booking ID {p.booking}
          </li>
        ))}
      </ul>
    </div>
  );
}
