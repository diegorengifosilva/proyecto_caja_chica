// src/axiosInstance.js
import axios from "axios";

// --- Configuración base del axios instance ---
const BASE_URL = "http://192.168.1.22:8000"; // IP de tu PC en la red local

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: false, // usamos JWT, no cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// --- Interceptor para añadir automáticamente el token JWT a cada request ---
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("access_token"); // coincidente con AuthContext
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Interceptor para manejar expiración del token ---
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token"); 
        if (!refreshToken) throw new Error("No refresh token found");

        // Refresh token usando la misma base URL
        const response = await axios.post(
          `${BASE_URL}/api/token/refresh/`,
          { refresh: refreshToken }
        );

        const { access } = response.data;
        localStorage.setItem("access_token", access);
        originalRequest.headers.Authorization = `Bearer ${access}`;

        // Reintenta la request original con el nuevo access token
        return axiosInstance(originalRequest);
      } catch (err) {
        // Si el refresh falla, logout
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("auth_user");
        window.location.href = "/login";
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
