import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import "./App.css";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || null);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />
        <Route
          path="/login"
          element={!token ? <Login setToken={setToken} /> : <Navigate to="/dashboard" />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route
          path="/dashboard/*"
          element={token ? <Dashboard /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
}

export default App;
