// boleta_project/frontend/src/dashboard/programacion/api.js

import axios from "axios";

const API_BASE_URL = "http://localhost:8000/api"; // Cambia a tu dominio si está en producción

// Configuración de axios con token (JWT) si estás usando autenticación
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Middleware para inyectar token antes de cada petición
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// =========================
//   PROGRAMACIONES - API
// =========================

// Obtener todas las programaciones
export const getProgramaciones = async () => {
  const res = await api.get("/programaciones/");
  return res.data;
};

// Obtener una programación por ID
export const getProgramacionById = async (id) => {
  const res = await api.get(`/programaciones/${id}/`);
  return res.data;
};

// Crear nueva programación
export const createProgramacion = async (programacionData) => {
  const res = await api.post("/programaciones/", programacionData);
  return res.data;
};

// Actualizar programación existente
export const updateProgramacion = async (id, programacionData) => {
  const res = await api.put(`/programaciones/${id}/`, programacionData);
  return res.data;
};

// Eliminar programación
export const deleteProgramacion = async (id) => {
  const res = await api.delete(`/programaciones/${id}/`);
  return res.data;
};

export default {
  getProgramaciones,
  getProgramacionById,
  createProgramacion,
  updateProgramacion,
  deleteProgramacion,
};
