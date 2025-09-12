// src/services/solicitudService.js

import api from "./api"; // Usa tu instancia de Axios

export const crearSolicitud = async (formData) => {
  const response = await api.post("/guardar-solicitud/", formData);
  return response.data;
};