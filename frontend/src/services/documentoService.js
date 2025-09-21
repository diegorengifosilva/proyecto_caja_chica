// src/services/documentoService.js
import axios from "axios";

/* 🌐 Cliente Axios con URL dinámica y soporte CORS + credenciales */
const api = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? "http://localhost:8000/api/boleta/documentos"
      : "https://proyecto-caja-chica-backend.onrender.com/api/boleta/documentos",
  timeout: 60000,
  headers: {
    Accept: "application/json",
    // ⚡ Content-Type se maneja automáticamente para FormData
  },
  withCredentials: true, // 🔹 obligatorio para CORS con cookies/JWT
});

/* 🔄 Manejo centralizado de errores */
const manejarError = (error, mensajeDefault) => {
  console.error("❌ Error en servicio documentos:", error);

  if (error.response) {
    console.error("📡 Respuesta backend:", error.response.data);
    throw new Error(error.response.data.error || mensajeDefault);
  } else if (error.request) {
    console.error("📡 Sin respuesta del servidor:", error.request);
    throw new Error("No hay respuesta del servidor. Revisa tu conexión.");
  } else {
    throw new Error(mensajeDefault);
  }
};

/* ========== 🧩 SERVICIO DE DOCUMENTOS OCR Y GASTOS ========== */

/**
 * Procesa un documento (imagen/PDF) con OCR en el backend usando Celery.
 * Retorna task_id para polling sin bloquear la UI.
 * @param {FormData} formData
 */
export const procesarDocumentoOCR = async (formData) => {
  try {
    // ⚡ DEBUG: mostrar payload enviado
    for (let pair of formData.entries()) {
      console.log("📤 Enviando:", pair[0], pair[1]);
    }

    const response = await api.post("/procesar/", formData);

    const taskId = response.data?.task_id;
    if (!taskId) {
      throw new Error("No se recibió task_id del servidor");
    }

    console.log("✅ Tarea OCR iniciada, task_id:", taskId);
    return { task_id: taskId };
  } catch (error) {
    manejarError(
      error,
      "No se pudo procesar el documento. Intenta nuevamente con otra imagen o revisa tu conexión."
    );
  }
};

/**
 * Obtiene el estado y resultado de una tarea OCR por task_id (Celery)
 * @param {string} taskId
 */
export const obtenerEstadoOCR = async (taskId) => {
  try {
    const response = await api.get(`/status/${taskId}/`);
    console.log(`📡 Estado OCR task_id ${taskId}:`, response.data);
    return response.data;
  } catch (error) {
    manejarError(
      error,
      `No se pudo obtener el estado del OCR para task_id ${taskId}.`
    );
  }
};

/**
 * Guarda un documento de gasto procesado (pos-OCR) en el backend.
 * @param {FormData} formData
 */
export const guardarDocumentoGasto = async (formData) => {
  try {
    const response = await api.post("/guardar/", formData);
    console.log("✅ Documento guardado:", response.data);
    return response.data;
  } catch (error) {
    manejarError(
      error,
      "Error al guardar el documento. Verifica los datos e intenta nuevamente."
    );
  }
};

/**
 * Obtiene todos los documentos vinculados a una solicitud
 * @param {number|string} solicitudId
 */
export const obtenerDocumentosPorSolicitud = async (solicitudId) => {
  try {
    const response = await api.get(`/solicitud/${solicitudId}/`, {
      timeout: 30000,
    });
    console.log(`📥 Documentos de solicitud ${solicitudId}:`, response.data);
    return response.data;
  } catch (error) {
    manejarError(
      error,
      "No se pudieron cargar los documentos de la solicitud."
    );
  }
};

/**
 * Test rápido de OCR (debug)
 */
export const testOCR = async () => {
  try {
    const response = await api.get("/test-ocr/");
    console.log("🧪 Test OCR:", response.data);
    return response.data;
  } catch (error) {
    manejarError(error, "No se pudo ejecutar el test de OCR.");
  }
};

