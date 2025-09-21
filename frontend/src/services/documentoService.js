// src/services/documentoService.js
import axios from "axios";

/* 🌐 Cliente Axios con URL dinámica y soporte CORS + credenciales */
const api = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? "http://localhost:8000/api/boleta/documentos"
      : "https://proyecto-caja-chica-backend.onrender.com/api/boleta/documentos",
  timeout: 60000,
  headers: { Accept: "application/json" },
  withCredentials: true,
});

/* 🔄 Manejo centralizado de errores */
const manejarError = (error, mensajeDefault) => {
  console.error("❌ Error en servicio documentos:", error);

  if (error.response) {
    console.error("📡 Respuesta backend:", error.response.data);
    const detalle =
      typeof error.response.data === "string"
        ? error.response.data
        : error.response.data.error;
    throw new Error(detalle || mensajeDefault);
  } else if (error.request) {
    console.error("📡 Sin respuesta del servidor:", error.request);
    throw new Error("No hay respuesta del servidor. Revisa tu conexión.");
  } else {
    throw new Error(mensajeDefault);
  }
};

/* ========== 🧩 SERVICIO DE DOCUMENTOS OCR Y GASTOS ========== */

/**
 * Procesa un documento (imagen/PDF) con OCR en el backend.
 * Devuelve directamente los resultados.
 * @param {FormData} formData
 */
export const procesarDocumentoOCR = async (formData) => {
  try {
    console.log("📤 Enviando FormData:");
    for (let [key, value] of formData.entries()) console.log(key, value);

    const response = await api.post("/procesar/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    console.log("📥 Respuesta completa:", response);

    const data = response.data;

    if (data?.resultados) {
      console.log("✅ OCR procesado:", data.resultados);
      return data.resultados; // 🔹 Devuelve directamente los resultados
    }

    throw new Error(data?.error || "No se recibieron resultados del OCR");
  } catch (error) {
    manejarError(
      error,
      "No se pudo procesar el documento. Intenta nuevamente con otra imagen o revisa tu conexión."
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
