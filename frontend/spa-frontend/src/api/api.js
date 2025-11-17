import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000/api";

export const api = axios.create({
  baseURL: BASE_URL,
});

// Authorization header
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

// --- Auth ---
export const login = (username, password) =>
  api.post("/auth/login/", { username, password });

export const register = (userData) =>
  api.post("/auth/register/", userData);

// --- Services ---
export const getServices = () => api.get("/services/");

// --- Bookings ---
export const getBookings = () => api.get("/bookings/");
export const createBooking = (bookingData) =>
  api.post("/bookings/", bookingData);

// --- Payments ---
export const getPayments = () => api.get("/payments/");
export const createPayment = (paymentData) =>
  api.post("/payments/", paymentData);

// --- Therapists ---
export const getTherapists = () => api.get("/users/therapists/");
