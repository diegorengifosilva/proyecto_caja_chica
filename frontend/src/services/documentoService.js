// src/services/documentoService.js
import axios from "axios";

/* 🌐 Cliente Axios con URL dinámica */
const api = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? "http://localhost:8000/api/boleta/documentos"
      : "https://proyecto-caja-chica-backend.onrender.com/api/boleta/documentos",
  timeout: 60000,
  headers: {
    Accept: "application/json",
  },
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
 * Procesa un documento (imagen/PDF) con OCR en el backend.
 */
export const procesarDocumentoOCR = async (formData) => {
  try {
    // ⚡ DEBUG: mostrar payload enviado
    for (let pair of formData.entries()) {
      console.log("📤 Enviando:", pair[0], pair[1]);
    }

    const response = await api.post("/procesar/", formData);

    const resultados = response.data?.resultado || [];
    console.log("✅ OCR recibido:", resultados);

    if (resultados.length === 0) {
      console.warn("⚠️ No se detectaron datos en el OCR");
      return null;
    }

    // Retornamos directamente todos los resultados (por si hay varias páginas)
    return resultados.map((r) => r.datos_detectados || {});
  } catch (error) {
    manejarError(
      error,
      "No se pudo procesar el documento. Intenta nuevamente con otra imagen o revisa tu conexión."
    );
  }
};

/**
 * Prueba de OCR con un documento de ejemplo (debug).
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

/**
 * Guarda un documento de gasto procesado (pos-OCR).
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
 * Obtiene todos los documentos vinculados a una solicitud.
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
