// src/dashboard/DashboardVisualizaciones.jsx

import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import api from "@/services/api";

// Función para formatear fecha "YYYY-MM-DD" a "DD/MM"
const formatFecha = (fecha) => {
  try {
    const d = new Date(fecha);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  } catch {
    return fecha;
  }
};

// Tooltip personalizado para barras (mostrar con S/.)
const CustomTooltipBar = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border rounded shadow-lg">
        {payload.map((entry) => (
          <p key={entry.dataKey} style={{ color: entry.color }}>
            {entry.name}: S/ {entry.value.toFixed(2)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Tooltip personalizado para líneas
const CustomTooltipLine = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border rounded shadow-lg">
        {payload.map((entry) => (
          <p key={entry.dataKey} style={{ color: entry.color }}>
            {entry.name}: {entry.dataKey === "monto" ? `S/ ${entry.value.toFixed(2)}` : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardVisualizaciones() {
  const [datosCaja, setDatosCaja] = useState([]);
  const [datosSolicitudes, setDatosSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const resCaja = await api.get("boleta/caja_diaria/historial/");
      const resSolicitudes = await api.get("boleta/solicitudes/aprobadas/");

      setDatosCaja(Array.isArray(resCaja.data) ? resCaja.data : []);
      setDatosSolicitudes(Array.isArray(resSolicitudes.data) ? resSolicitudes.data : []);
    } catch (error) {
      console.error("Error cargando datos de gráficos", error);
      setDatosCaja([]);
      setDatosSolicitudes([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <h2 className="text-xl font-bold">📊 Gráficos de Fondos y Solicitudes</h2>

      {loading && <p>Cargando gráficos...</p>}

      {!loading && datosCaja.length === 0 && datosSolicitudes.length === 0 && (
        <p>No hay datos para mostrar.</p>
      )}

      {!loading && datosCaja.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Dinero Disponible vs Gastado (Últimos 7 días)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datosCaja}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="fecha"
                tickFormatter={formatFecha}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip content={<CustomTooltipBar />} />
              <Legend />
              <Bar dataKey="disponible" fill="#4f46e5" name="Disponible" />
              <Bar dataKey="gastado" fill="#ef4444" name="Gastado" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {!loading && datosSolicitudes.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Solicitudes Aprobadas (Últimos 7 días)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={datosSolicitudes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" tickFormatter={formatFecha} interval={0} angle={-45} textAnchor="end" height={60} />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip content={<CustomTooltipLine />} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="cantidad" stroke="#10b981" name="Cantidad" />
              <Line yAxisId="right" type="monotone" dataKey="monto" stroke="#3b82f6" name="Monto (S/)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}