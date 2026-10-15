import axios from "axios";

const BASE_URL = (process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

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
export const getCurrentUser = () => api.get("/auth/me/");
export const updateCurrentUser = (userData) => api.patch("/auth/me/", userData);
export const getUsers = () => api.get("/users/");
export const createUser = (userData) => api.post("/users/", userData);
export const getBusinessSettings = () => api.get("/business/");
export const updateBusinessSettings = (settings) => api.patch("/business/", settings);

// --- Services ---
export const getServices = () => api.get("/services/");
export const createService = (serviceData) => api.post("/services/", serviceData);
export const updateService = (id, serviceData) => api.patch(`/services/${id}/`, serviceData);
export const deleteService = (id) => api.delete(`/services/${id}/`);

// --- Bookings ---
export const getBookings = () => api.get("/bookings/");
export const createBooking = (bookingData) =>
  api.post("/bookings/", bookingData);

// --- Payments ---
export const getPayments = () => api.get("/payments/");
export const createPayment = (paymentData) =>
  api.post("/payments/", paymentData);
export const confirmPayment = (id, providerReference = "") =>
  api.post(`/payments/${id}/confirm/`, { provider_reference: providerReference });

// --- Therapists ---
export const getTherapists = () => api.get("/users/therapists/");
export const getDashboardReport = () => api.get("/reports/dashboard/");
export const updateBookingStatus = (id, status, reason = "") =>
  api.patch(`/bookings/${id}/status/`, { status, reason });
export const getLocations = () => api.get("/locations/");
export const createLocation = (data) => api.post("/locations/", data);
export const getRooms = () => api.get("/rooms/");
export const createRoom = (data) => api.post("/rooms/", data);
export const getAvailability = () => api.get("/availability/");
export const createAvailability = (data) => api.post("/availability/", data);
export const deleteAvailability = (id) => api.delete(`/availability/${id}/`);
export const getTimeOff = () => api.get("/time-off/");
export const createTimeOff = (data) => api.post("/time-off/", data);
export const deleteTimeOff = (id) => api.delete(`/time-off/${id}/`);
export const getClients = () => api.get("/client-profiles/");
export const createClientProfile = (data) => api.post("/client-profiles/", data);
export const updateClientProfile = (id, data) => api.patch(`/client-profiles/${id}/`, data);
export const getAuditEvents = () => api.get("/audit-events/");
