import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // 🔑 Cambiado a true para que funcione con cookies cross-site si las usaras
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Interceptor: añade token a cada request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor: maneja expiración de token
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    // Solo intenta refresh si es 401 y no lo habíamos hecho ya
    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");

      if (!refreshToken) {
        localStorage.clear();
        window.location.replace("/login");
        return Promise.reject(err);
      }

      try {
        const res = await axios.post(`${API_URL}token/refresh/`, { refresh: refreshToken });
        const newAccess = res.data.access;

        localStorage.setItem("access_token", newAccess);
        api.defaults.headers.common["Authorization"] = `Bearer ${newAccess}`;
        originalRequest.headers["Authorization"] = `Bearer ${newAccess}`;

        return api(originalRequest);
      } catch (e) {
        localStorage.clear();
        window.location.replace("/login");
        return Promise.reject(e);
      }
    }

    return Promise.reject(err);
  }
);

export default api;
