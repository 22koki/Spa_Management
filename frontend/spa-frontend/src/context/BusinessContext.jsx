import React, { createContext, useContext, useEffect, useState } from "react";
import { getBusinessSettings } from "../api/api";

const defaults = {
  name: "Serenity Spa",
  tagline: "Restore · Rebalance · Belong",
  currency: "KES",
  whatsapp_number: "",
  cancellation_policy: "Please cancel or reschedule at least 24 hours before your appointment.",
  payment_methods: { cash: true, mpesa_till: true, mpesa_stk: false, card: false },
};

const BusinessContext = createContext({ business: defaults, loading: true, refreshBusiness: async () => {} });

export function BusinessProvider({ children }) {
  const [business, setBusiness] = useState(defaults);
  const [loading, setLoading] = useState(true);

  const refreshBusiness = async () => {
    try {
      const response = await getBusinessSettings();
      setBusiness({ ...defaults, ...response.data });
    } catch {
      setBusiness(current => ({ ...defaults, ...current }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshBusiness(); }, []);
  return <BusinessContext.Provider value={{ business, loading, refreshBusiness }}>{children}</BusinessContext.Provider>;
}

export const useBusiness = () => useContext(BusinessContext);

export function formatMoney(value, currency = "KES") {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
