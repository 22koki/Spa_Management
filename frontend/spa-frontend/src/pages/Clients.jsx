import React, { useEffect, useMemo, useState } from "react";
import { createClientProfile, getBookings, getClients, getUsers, updateClientProfile } from "../api/api";
import "./Workspace.css";

const emptyRecord = {
  preferences: "",
  allergies: "",
  contraindications: "",
  private_notes: "",
  consent_given: false,
  loyalty_points: 0,
};

export default function Clients() {
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [record, setRecord] = useState(emptyRecord);
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const [userResponse, profileResponse, bookingResponse] = await Promise.all([
        getUsers(), getClients(), getBookings(),
      ]);
      setUsers(userResponse.data);
      setProfiles(profileResponse.data);
      setBookings(bookingResponse.data);
      setMessage("");
    } catch {
      setMessage("Client records could not be loaded.");
    }
  };
  useEffect(() => { load(); }, []);

  const clients = useMemo(() => users.filter(user => user.role === "client").filter(user => {
    const haystack = `${user.first_name} ${user.last_name} ${user.username} ${user.email} ${user.phone}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  }), [users, search]);

  const profileFor = userId => profiles.find(profile => profile.user === userId);
  const visitsFor = userId => bookings
    .filter(booking => booking.client === userId)
    .sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));

  const edit = user => {
    const profile = profileFor(user.id);
    setSelected(user);
    setRecord(profile ? { ...emptyRecord, ...profile } : emptyRecord);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async event => {
    event.preventDefault();
    try {
      const profile = profileFor(selected.id);
      const payload = { ...record, user: selected.id };
      if (profile) await updateClientProfile(profile.id, payload);
      else await createClientProfile(payload);
      await load();
      setMessage("Client safety record saved.");
      setSelected(null);
    } catch (error) {
      const data = error.response?.data;
      setMessage(data ? Object.values(data).flat().join(" ") : "The client record could not be saved.");
    }
  };

  return <div className="page workspace-page">
    <div className="page-header"><div><span className="eyebrow">GUEST CARE</span><h1>Clients</h1></div><input className="client-search" placeholder="Search name, email or phone" value={search} onChange={event => setSearch(event.target.value)}/></div>
    {message && <p className="message">{message}</p>}
    {selected && <form className="panel client-editor" onSubmit={save}><div><span className="eyebrow">PRIVATE SAFETY RECORD</span><h2>{selected.first_name || selected.username} {selected.last_name}</h2><p>Only authorized spa staff should use these notes for safe service delivery.</p></div><div className="client-record-grid"><label>Preferences<textarea value={record.preferences} onChange={event => setRecord({ ...record, preferences: event.target.value })}/></label><label>Allergies<textarea value={record.allergies} onChange={event => setRecord({ ...record, allergies: event.target.value })}/></label><label>Contraindications<textarea value={record.contraindications} onChange={event => setRecord({ ...record, contraindications: event.target.value })}/></label><label>Private notes<textarea value={record.private_notes} onChange={event => setRecord({ ...record, private_notes: event.target.value })}/></label><label>Loyalty points<input type="number" min="0" value={record.loyalty_points} onChange={event => setRecord({ ...record, loyalty_points: Number(event.target.value) })}/></label><label className="check-row"><input type="checkbox" checked={record.consent_given} onChange={event => setRecord({ ...record, consent_given: event.target.checked })}/> Intake consent recorded</label></div><div className="editor-actions"><button type="button" onClick={() => setSelected(null)}>Cancel</button><button className="submit-button">Save client record</button></div></form>}
    <div className="client-grid">{clients.map(user => {
      const profile = profileFor(user.id);
      const visits = visitsFor(user.id);
      const completed = visits.filter(visit => visit.status === "completed");
      const warning = profile?.allergies || profile?.contraindications;
      return <article className="panel client-card" key={user.id}><div className="client-card-head"><div className="client-avatar">{(user.first_name || user.username).slice(0, 1).toUpperCase()}</div><div><h2>{user.first_name ? `${user.first_name} ${user.last_name}`.trim() : user.username}</h2><span>{user.phone || "No phone"} · {user.email || "No email"}</span></div></div>{warning && <p className="safety-warning">⚠ {profile.allergies && `Allergy: ${profile.allergies}`}{profile.allergies && profile.contraindications && " · "}{profile.contraindications && `Contraindication: ${profile.contraindications}`}</p>}<div className="client-meta"><span><b>{completed.length}</b> completed visits</span><span><b>{profile?.loyalty_points || 0}</b> loyalty points</span></div><p className="visit-line">{visits[0] ? `Last activity: ${visits[0].service_name} · ${visits[0].date} · ${visits[0].status}` : "No appointment history yet"}</p><button className="record-button" onClick={() => edit(user)}>{profile ? "Open safety record" : "Create safety record"}</button></article>;
    })}</div>
    {!clients.length && <div className="panel empty">No clients match this search.</div>}
  </div>;
}
