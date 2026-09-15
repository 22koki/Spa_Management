import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000/api";

export const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshRequest = null;
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original?._retry || original?.url === "/auth/refresh/") {
      return Promise.reject(error);
    }
    original._retry = true;
    const refresh = localStorage.getItem("refreshToken");
    if (!refresh) {
      localStorage.clear();
      window.location.href = "/login";
      return Promise.reject(error);
    }
    try {
      refreshRequest ||= axios.post(`${BASE_URL}/auth/refresh/`, { refresh });
      const response = await refreshRequest;
      const access = response.data.access;
      localStorage.setItem("token", access);
      if (response.data.refresh) localStorage.setItem("refreshToken", response.data.refresh);
      original.headers.Authorization = `Bearer ${access}`;
      return api(original);
    } catch (refreshError) {
      localStorage.clear();
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      refreshRequest = null;
    }
  }
);

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
