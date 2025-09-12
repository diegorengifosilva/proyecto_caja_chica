// src/dashboard/ReporteExcel.jsx

import React, { useState } from "react";
import api from "@/services/api";

export default function ReporteExcel() {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [loading, setLoading] = useState(false);

  const descargarReporte = async () => {
    if (!fechaInicio || !fechaFin) {
      alert("Selecciona fecha de inicio y fin");
      return;
    }
    if (fechaFin < fechaInicio) {
      alert("La fecha fin debe ser igual o mayor a la fecha inicio");
      return;
    }

    setLoading(true);
    try {
      const response = await api.get("boleta/reporte/exportar/", {
        params: {
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
        },
        responseType: "blob",
      });

      // Crear URL de descarga
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "reporte_caja_solicitudes.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error descargando reporte", error);
      alert("Error al descargar reporte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">📥 Exportar Reporte Excel</h2>

      <div className="flex gap-4 mb-4">
        <input
          type="date"
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="date"
          value={fechaFin}
          onChange={(e) => setFechaFin(e.target.value)}
          className="border p-2 rounded"
        />
      </div>

      <button
        onClick={descargarReporte}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        disabled={loading}
      >
        {loading ? "Descargando..." : "Descargar Excel"}
      </button>
    </div>
  );
}