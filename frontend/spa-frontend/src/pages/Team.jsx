import React, { useEffect, useMemo, useState } from "react";
import {
  createAvailability,
  createLocation,
  createRoom,
  createTimeOff,
  createUser,
  deleteAvailability,
  deleteTimeOff,
  getAvailability,
  getLocations,
  getRooms,
  getTimeOff,
  getUsers,
} from "../api/api";
import "./Workspace.css";

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Team() {
  const [data, setData] = useState({ users: [], availability: [], timeOff: [], locations: [], rooms: [] });
  const [message, setMessage] = useState("");
  const [staffForm, setStaffForm] = useState({ username: "", password: "", first_name: "", last_name: "", email: "", phone: "", role: "practitioner", is_active: true });
  const [scheduleForm, setScheduleForm] = useState({ staff: "", location: "", weekday: 0, start_time: "09:00", end_time: "17:00", is_break: false });
  const [leaveForm, setLeaveForm] = useState({ staff: "", starts_at: "", ends_at: "", reason: "", approved: true });
  const [resourceForm, setResourceForm] = useState({ locationName: "", address: "", roomName: "", equipment: "", roomLocation: "" });

  const load = async () => {
    try {
      const [users, availability, timeOff, locations, rooms] = await Promise.all([
        getUsers(), getAvailability(), getTimeOff(), getLocations(), getRooms(),
      ]);
      setData({
        users: users.data,
        availability: availability.data,
        timeOff: timeOff.data,
        locations: locations.data,
        rooms: rooms.data,
      });
      setMessage("");
    } catch {
      setMessage("Team and resource data could not be loaded.");
    }
  };
  useEffect(() => { load(); }, []);

  const practitioners = useMemo(
    () => data.users.filter(user => ["practitioner", "therapist"].includes(user.role)),
    [data.users],
  );
  const nameFor = id => {
    const person = data.users.find(user => user.id === Number(id));
    return person ? (person.first_name ? `${person.first_name} ${person.last_name}`.trim() : person.username) : "Unknown";
  };

  const saveStaff = async event => {
    event.preventDefault();
    try {
      await createUser(staffForm);
      setStaffForm({ username: "", password: "", first_name: "", last_name: "", email: "", phone: "", role: "practitioner", is_active: true });
      await load();
      setMessage("Team member added.");
    } catch (error) {
      setMessage(flattenError(error, "The team member could not be added."));
    }
  };
  const saveSchedule = async event => {
    event.preventDefault();
    try {
      await createAvailability({ ...scheduleForm, location: scheduleForm.location || null });
      await load();
      setMessage(scheduleForm.is_break ? "Break added." : "Working hours added.");
    } catch (error) {
      setMessage(flattenError(error, "The schedule could not be saved."));
    }
  };
  const saveLeave = async event => {
    event.preventDefault();
    try {
      await createTimeOff({
        ...leaveForm,
        starts_at: new Date(leaveForm.starts_at).toISOString(),
        ends_at: new Date(leaveForm.ends_at).toISOString(),
      });
      await load();
      setMessage("Time off saved.");
    } catch (error) {
      setMessage(flattenError(error, "Time off could not be saved."));
    }
  };
  const saveLocation = async event => {
    event.preventDefault();
    try {
      await createLocation({ name: resourceForm.locationName, address: resourceForm.address, timezone: "Africa/Nairobi", is_active: true });
      setResourceForm({ ...resourceForm, locationName: "", address: "" });
      await load();
      setMessage("Location added.");
    } catch (error) {
      setMessage(flattenError(error, "The location could not be added."));
    }
  };
  const saveRoom = async event => {
    event.preventDefault();
    try {
      await createRoom({ location: resourceForm.roomLocation, name: resourceForm.roomName, equipment: resourceForm.equipment, is_active: true });
      setResourceForm({ ...resourceForm, roomName: "", equipment: "" });
      await load();
      setMessage("Treatment room added.");
    } catch (error) {
      setMessage(flattenError(error, "The room could not be added."));
    }
  };

  return <div className="page workspace-page">
    <div className="page-header"><div><span className="eyebrow">PEOPLE & CAPACITY</span><h1>Team and resources</h1></div></div>
    {message && <p className="message">{message}</p>}
    <section className="workspace-stats"><article><strong>{practitioners.length}</strong><span>practitioners</span></article><article><strong>{data.locations.length}</strong><span>locations</span></article><article><strong>{data.rooms.length}</strong><span>treatment rooms</span></article><article><strong>{data.timeOff.filter(item => item.approved).length}</strong><span>approved leave records</span></article></section>
    <div className="workspace-grid">
      <section className="panel"><span className="eyebrow">TEAM ACCESS</span><h2>Add a team member</h2><form className="compact-form" onSubmit={saveStaff}><div className="two-fields"><label>First name<input value={staffForm.first_name} onChange={event => setStaffForm({ ...staffForm, first_name: event.target.value })} required/></label><label>Last name<input value={staffForm.last_name} onChange={event => setStaffForm({ ...staffForm, last_name: event.target.value })}/></label></div><div className="two-fields"><label>Username<input value={staffForm.username} onChange={event => setStaffForm({ ...staffForm, username: event.target.value })} required/></label><label>Temporary password<input type="password" minLength="8" value={staffForm.password} onChange={event => setStaffForm({ ...staffForm, password: event.target.value })} required/></label></div><div className="two-fields"><label>Role<select value={staffForm.role} onChange={event => setStaffForm({ ...staffForm, role: event.target.value })}><option value="practitioner">Practitioner</option><option value="receptionist">Receptionist</option><option value="manager">Manager</option><option value="client">Client</option></select></label><label>Phone<input value={staffForm.phone} onChange={event => setStaffForm({ ...staffForm, phone: event.target.value })}/></label></div><label>Email<input type="email" value={staffForm.email} onChange={event => setStaffForm({ ...staffForm, email: event.target.value })}/></label><button className="submit-button">Add team member</button></form></section>
      <section className="panel"><span className="eyebrow">WEEKLY CALENDAR</span><h2>Add hours or a break</h2><form className="compact-form" onSubmit={saveSchedule}><label>Practitioner<select value={scheduleForm.staff} onChange={event => setScheduleForm({ ...scheduleForm, staff: event.target.value })} required><option value="">Select practitioner</option>{practitioners.map(person => <option value={person.id} key={person.id}>{nameFor(person.id)}</option>)}</select></label><div className="two-fields"><label>Day<select value={scheduleForm.weekday} onChange={event => setScheduleForm({ ...scheduleForm, weekday: Number(event.target.value) })}>{weekdays.map((day, index) => <option value={index} key={day}>{day}</option>)}</select></label><label>Location<select value={scheduleForm.location} onChange={event => setScheduleForm({ ...scheduleForm, location: event.target.value })}><option value="">All locations</option>{data.locations.map(location => <option value={location.id} key={location.id}>{location.name}</option>)}</select></label></div><div className="two-fields"><label>Starts<input type="time" value={scheduleForm.start_time} onChange={event => setScheduleForm({ ...scheduleForm, start_time: event.target.value })} required/></label><label>Ends<input type="time" value={scheduleForm.end_time} onChange={event => setScheduleForm({ ...scheduleForm, end_time: event.target.value })} required/></label></div><label className="check-row"><input type="checkbox" checked={scheduleForm.is_break} onChange={event => setScheduleForm({ ...scheduleForm, is_break: event.target.checked })}/> This is a break</label><button className="submit-button">Save schedule</button></form></section>
      <section className="panel"><span className="eyebrow">TIME OFF</span><h2>Block unavailable time</h2><form className="compact-form" onSubmit={saveLeave}><label>Practitioner<select value={leaveForm.staff} onChange={event => setLeaveForm({ ...leaveForm, staff: event.target.value })} required><option value="">Select practitioner</option>{practitioners.map(person => <option value={person.id} key={person.id}>{nameFor(person.id)}</option>)}</select></label><div className="two-fields"><label>Starts<input type="datetime-local" value={leaveForm.starts_at} onChange={event => setLeaveForm({ ...leaveForm, starts_at: event.target.value })} required/></label><label>Ends<input type="datetime-local" value={leaveForm.ends_at} onChange={event => setLeaveForm({ ...leaveForm, ends_at: event.target.value })} required/></label></div><label>Reason<input value={leaveForm.reason} onChange={event => setLeaveForm({ ...leaveForm, reason: event.target.value })}/></label><button className="submit-button">Approve time off</button></form></section>
      <section className="panel"><span className="eyebrow">LOCATIONS & ROOMS</span><h2>Resource setup</h2><form className="compact-form resource-form" onSubmit={saveLocation}><div className="two-fields"><label>Location name<input value={resourceForm.locationName} onChange={event => setResourceForm({ ...resourceForm, locationName: event.target.value })} required/></label><label>Address<input value={resourceForm.address} onChange={event => setResourceForm({ ...resourceForm, address: event.target.value })}/></label></div><button>Add location</button></form><form className="compact-form resource-form" onSubmit={saveRoom}><label>Location<select value={resourceForm.roomLocation} onChange={event => setResourceForm({ ...resourceForm, roomLocation: event.target.value })} required><option value="">Select location</option>{data.locations.map(location => <option value={location.id} key={location.id}>{location.name}</option>)}</select></label><div className="two-fields"><label>Room name<input value={resourceForm.roomName} onChange={event => setResourceForm({ ...resourceForm, roomName: event.target.value })} required/></label><label>Equipment<input value={resourceForm.equipment} onChange={event => setResourceForm({ ...resourceForm, equipment: event.target.value })}/></label></div><button>Add room</button></form></section>
    </div>
    <section className="panel record-panel"><div className="record-head"><div><span className="eyebrow">ACTIVE SCHEDULE RULES</span><h2>Working hours and approved leave</h2></div></div><div className="record-list">{data.availability.map(item => <article key={`availability-${item.id}`}><div><b>{nameFor(item.staff)}</b><span>{weekdays[item.weekday]} · {item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)} · {item.is_break ? "Break" : "Available"}</span></div><button onClick={async () => { await deleteAvailability(item.id); load(); }}>Remove</button></article>)}{data.timeOff.map(item => <article key={`leave-${item.id}`}><div><b>{nameFor(item.staff)}</b><span>{new Date(item.starts_at).toLocaleString()} – {new Date(item.ends_at).toLocaleString()} · {item.reason || "Time off"}</span></div><button onClick={async () => { await deleteTimeOff(item.id); load(); }}>Remove</button></article>)}</div></section>
  </div>;
}

function flattenError(error, fallback) {
  const data = error.response?.data;
  return data && typeof data === "object" ? Object.values(data).flat().join(" ") : fallback;
}
