import React, { useEffect, useState } from "react";
import { updateBusinessSettings } from "../api/api";
import { useBusiness } from "../context/BusinessContext";
import "./BusinessSettings.css";

const fields = [
  ["name", "Business name"], ["tagline", "Tagline"], ["email", "Business email"],
  ["phone", "Phone number"], ["whatsapp_number", "WhatsApp number"], ["address", "Address"],
  ["currency", "Currency"], ["timezone", "Timezone"], ["cancellation_hours", "Cancellation notice (hours)"],
  ["no_show_fee_percent", "No-show fee (%)"], ["tax_percent", "Tax (%)"], ["logo_url", "Logo image URL"],
  ["hero_image_url", "Hero image URL"],
];

export default function BusinessSettings() {
  const { business, refreshBusiness } = useBusiness();
  const [form, setForm] = useState(business);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(business); }, [business]);

  const submit = async event => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await updateBusinessSettings(form);
      await refreshBusiness();
      setMessage("Business settings saved.");
    } catch (error) {
      const data = error.response?.data;
      setMessage(data ? Object.values(data).flat().join(" ") : "Settings could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="page settings-page"><div className="page-header"><div><span className="eyebrow">OWNER CONTROLS</span><h1>Business settings</h1></div></div><div className="settings-layout"><form className="panel settings-form" onSubmit={submit}>{message && <p className="message">{message}</p>}<div className="settings-grid">{fields.map(([name, label]) => <label key={name}>{label}<input type={name.includes("percent") || name === "cancellation_hours" ? "number" : name.includes("email") ? "email" : "text"} min="0" name={name} value={form[name] ?? ""} onChange={event => setForm({ ...form, [name]: event.target.value })}/></label>)}</div><label>Cancellation and no-show policy<textarea value={form.cancellation_policy || ""} onChange={event => setForm({ ...form, cancellation_policy: event.target.value })}/></label><button className="submit-button" disabled={saving}>{saving ? "Saving…" : "Save business settings"}</button></form><aside className="settings-status"><div className="panel"><span className="eyebrow">INTEGRATIONS</span><h2>Readiness</h2>{Object.entries(business.payment_methods || {}).map(([method, ready]) => <div className="integration-row" key={method}><span>{method.replaceAll("_", " ")}</span><b className={ready ? "ready" : "setup"}>{ready ? "Ready" : "Setup needed"}</b></div>)}</div><div className="panel policy-preview"><span className="eyebrow">CUSTOMER PREVIEW</span><h2>{form.name}</h2><p>{form.tagline}</p><small>{form.address}</small></div></aside></div></div>;
}
