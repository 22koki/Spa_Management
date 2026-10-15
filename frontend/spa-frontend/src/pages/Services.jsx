import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createService, deleteService, getServices, updateService } from "../api/api";
import { formatMoney, useBusiness } from "../context/BusinessContext";
import "./Services.css";

const emptyForm = { name: "", description: "", duration: 60, price: "", cleanup_buffer: 15, deposit_percent: 30, preparation: "", aftercare: "" };

export default function Services({ user }) {
  const { business } = useBusiness();
  const [services, setServices] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const canManage = user?.is_staff || ["owner", "manager", "admin"].includes(user?.role);
  const isClient = user?.role === "client";

  const load = () => getServices().then(response => setServices(response.data)).catch(() => setError("We couldn't load the treatment menu right now."));
  useEffect(() => { load(); }, []);

  const startEdit = service => {
    setEditing(service.id);
    setForm({ ...emptyForm, ...service, required_skills: service.required_skills || [] });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const reset = () => { setEditing(null); setForm(emptyForm); setShowForm(false); setError(""); };
  const save = async event => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) await updateService(editing, form); else await createService(form);
      await load();
      reset();
    } catch (requestError) {
      const data = requestError.response?.data;
      setError(data ? Object.values(data).flat().join(" ") : "The service could not be saved.");
    } finally { setSaving(false); }
  };
  const remove = async service => {
    if (!window.confirm(`Delete ${service.name}? Existing appointments may prevent deletion.`)) return;
    try { await deleteService(service.id); await load(); } catch { setError("This service cannot be deleted while appointments use it."); }
  };

  return <div className="page">
    <div className="page-header"><div><span className="eyebrow">{canManage ? "SERVICE CATALOGUE" : "CURATED FOR YOU"}</span><h1>{canManage ? "Services and pricing" : "Rituals for restoration"}</h1></div>{canManage && <button className="gold-button service-add" onClick={() => { setShowForm(!showForm); setEditing(null); setForm(emptyForm); }}>{showForm ? "Close" : "+ Add service"}</button>}</div>
    <p className="services-intro">{canManage ? "Control the treatments customers can book, including price, duration, deposits and cleanup time." : "Every treatment is a pause from the noise—thoughtfully designed to release tension, restore energy, and bring you back to yourself."}</p>
    {error && <p className="ops-error">{error}</p>}
    {canManage && showForm && <form className="panel service-editor" onSubmit={save}><h2>{editing ? "Edit treatment" : "Create a treatment"}</h2><div className="service-editor-grid"><label>Treatment name<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required/></label><label>Price ({business.currency})<input type="number" min="0" step="0.01" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} required/></label><label>Duration (minutes)<input type="number" min="5" value={form.duration} onChange={event => setForm({ ...form, duration: event.target.value })} required/></label><label>Cleanup buffer<input type="number" min="0" value={form.cleanup_buffer} onChange={event => setForm({ ...form, cleanup_buffer: event.target.value })}/></label><label>Deposit (%)<input type="number" min="0" max="100" value={form.deposit_percent} onChange={event => setForm({ ...form, deposit_percent: event.target.value })}/></label><label className="wide">Description<textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} required/></label><label className="wide">Preparation instructions<textarea value={form.preparation} onChange={event => setForm({ ...form, preparation: event.target.value })}/></label><label className="wide">Aftercare instructions<textarea value={form.aftercare} onChange={event => setForm({ ...form, aftercare: event.target.value })}/></label></div><div className="editor-actions"><button type="button" onClick={reset}>Cancel</button><button className="submit-button" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create service"}</button></div></form>}
    <div className="treatment-grid">{services.map((service, index) => <article className="treatment-card" key={service.id}><div className={`treatment-photo photo-${index % 3}`} role="img" aria-label={`${service.name} treatment`}></div><div className="treatment-body"><span className="eyebrow">SIGNATURE TREATMENT</span><h2>{service.name}</h2><p>{service.description}</p><div className="treatment-meta"><span>◷ {service.duration} min</span><span>•</span><span>{formatMoney(service.price, business.currency)}</span></div>{isClient && <Link className="treatment-link" to={`/dashboard/book?service=${service.id}`}><span>Book this treatment</span><span>→</span></Link>}{canManage && <div className="service-actions"><button onClick={() => startEdit(service)}>Edit</button><button onClick={() => remove(service)}>Delete</button></div>}</div></article>)}</div>
    {services.length === 0 && !error && <div className="panel empty">No services yet. Add the first treatment to open online booking.</div>}
    <div className="services-promise"><div><span className="eyebrow">THE {business.name.toUpperCase()} PROMISE</span><h3>Unhurried care, tailored to every guest.</h3><p>Clear preparation, safe treatments and thoughtful aftercare.</p></div><span className="brand-mark">♢</span></div>
  </div>;
}
