// src/dashboard/liquidaciones/LiquidacionesPendientes.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FileText, FolderKanban, DollarSign, Clock, ChartBarDecreasing, ChartColumnIncreasing } from "lucide-react";
import PresentarDocumentacionModal from "./PresentarDocumentacionModal";
import axios from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { TYPE_COLORS, TIPO_SOLICITUD_CLASSES, STATE_CLASSES } from "@/components/ui/colors";
import KpiCard from "@/components/ui/KpiCard";
import Table from "@/components/ui/table";
import ChartWrapped, { tooltipFormatter } from "@/components/ui/ChartWrapped";
import EventBus from "@/components/EventBus";

export default function LiquidacionesPendientes() {
  const { authUser: user, logout } = useAuth();

  const [liquidaciones, setLiquidaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filtroSolicitante, setFiltroSolicitante] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  const [showPresentarModal, setShowPresentarModal] = useState(false);

  const fetchLiquidaciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token");
      const { data } = await axios.get("/boleta/liquidaciones_pendientes/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataLimpia = data.map((s) => ({
        ...s,
        solicitante: s.solicitante?.replace(/\s*<.*?>/, "").trim() || "-",
      }));
      setLiquidaciones(dataLimpia);
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudieron cargar las liquidaciones pendientes.");
      if (e?.response?.status === 401) logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    EventBus.on("solicitudAtendida", fetchLiquidaciones);
    EventBus.on("solicitudRechazada", fetchLiquidaciones);
    return () => {
      EventBus.off("solicitudAtendida", fetchLiquidaciones);
      EventBus.off("solicitudRechazada", fetchLiquidaciones);
    };
  }, [fetchLiquidaciones]);

  useEffect(() => { fetchLiquidaciones(); }, [fetchLiquidaciones]);

  const solicitantes = useMemo(() => Array.from(new Set(liquidaciones.map((l) => l.solicitante))), [liquidaciones]);

  const solicitudesFiltradas = useMemo(() => liquidaciones.filter((l) => {
    const matchSearch = l.solicitante.toLowerCase().includes(search.toLowerCase()) || l.numero_solicitud.toString().includes(search);
    const matchSolicitante = !filtroSolicitante || l.solicitante === filtroSolicitante;
    const matchTipo = !filtroTipo || l.tipo_solicitud === filtroTipo;
    const matchFecha = (!fechaInicio || new Date(l.fecha) >= new Date(fechaInicio)) && (!fechaFin || new Date(l.fecha) <= new Date(fechaFin));
    return matchSearch && matchSolicitante && matchTipo && matchFecha;
  }), [liquidaciones, search, filtroSolicitante, filtroTipo, fechaInicio, fechaFin]);

  const stats = useMemo(() => {
    const total = solicitudesFiltradas.length;
    const totalSoles = solicitudesFiltradas.reduce((sum, l) => sum + (l.total_soles || 0), 0);
    const totalDolares = solicitudesFiltradas.reduce((sum, l) => sum + (l.total_dolares || 0), 0);
    const promedio = total ? (totalSoles / total).toFixed(2) : 0;
    return { total, totalSoles, totalDolares, promedio };
  }, [solicitudesFiltradas]);

  const dataTipo = useMemo(() =>
    Object.entries(solicitudesFiltradas.reduce((acc, l) => { acc[l.tipo_solicitud] = (acc[l.tipo_solicitud] || 0) + 1; return acc; }, {}))
      .map(([name, value]) => ({ name, value })), [solicitudesFiltradas]);

  const dataMontoPorTipo = useMemo(() =>
    Object.entries(solicitudesFiltradas.reduce((acc, l) => { acc[l.tipo_solicitud] = (acc[l.tipo_solicitud] || 0) + (l.total_soles || 0); return acc; }, {}))
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) })), [solicitudesFiltradas]);

  const handleAccion = (id, accion, solicitud) => {
    setSelectedSolicitud(solicitud);
    setShowPresentarModal(true);
  };

  const kpis = [
    { label: "Total Pendientes", value: stats.total, gradient: "linear-gradient(135deg, #f97316cc, #fb923c99)", icon: Clock, tooltip: "Número total de solicitudes pendientes." },
    { label: "Monto Total (S/)", value: stats.totalSoles, gradient: "linear-gradient(135deg, #3b82f6cc, #60a5fa99)", icon: DollarSign, tooltip: "Monto acumulado en soles.", decimals: 2 },
    { label: "Monto Total ($)", value: stats.totalDolares, gradient: "linear-gradient(135deg, #10b981cc, #34d39999)", icon: DollarSign, tooltip: "Monto acumulado en dólares.", decimals: 2 },
    { label: "Promedio por Solicitud (S/)", value: stats.promedio, gradient: "linear-gradient(135deg, #f59e0bcc, #fcd34d99)", icon: DollarSign, tooltip: "Promedio por solicitud.", decimals: 2 },
  ];

return (
  <div className="min-h-screen w-full flex flex-col bg-gray-50 font-sans">
    <div className="flex-1 flex flex-col px-3 sm:px-6 py-3 sm:py-4">

      {/* Header */}
      <div className="flex justify-center md:justify-start items-center mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-2xl font-bold flex items-center gap-2 text-black">
          <FolderKanban className="w-5 h-5 sm:w-6 sm:h-6" />
          Liquidaciones Pendientes
        </h2>
      </div>

      {/* KPIs en 2 columnas para móvil */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6 w-full">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="flex-1 min-w-0 p-3 rounded-xl text-white flex flex-col items-center justify-center text-center shadow-md
                       hover:scale-105 hover:shadow-lg transition-transform"
            style={{ background: kpi.gradient }}
          >
            {kpi.icon && <kpi.icon className="w-5 h-5 mb-1 sm:w-6 sm:h-6 opacity-90" />}
            <p className="text-[9px] sm:text-xs opacity-90">{kpi.label}</p>
            <p className="text-lg sm:text-xl font-bold">
              {loading
                ? 0
                : Number(kpi.value).toLocaleString(undefined, {
                    minimumFractionDigits: kpi.decimals || 0,
                    maximumFractionDigits: kpi.decimals || 0,
                  })}
            </p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm mb-4 sm:mb-6 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 items-end">
          {/* Solicitante */}
          <div className="flex flex-col w-full">
            <label className="text-[10px] sm:text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span> Solicitante
            </label>
            <select
              value={filtroSolicitante}
              onChange={(e) => setFiltroSolicitante(e.target.value)}
              className="border rounded-lg px-2 py-1 text-[10px] sm:text-xs w-full focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              <option value="">Todos</option>
              {solicitantes.map((sol) => (
                <option key={sol} value={sol}>
                  {sol}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div className="flex flex-col w-full">
            <label className="text-[10px] sm:text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span> Tipo
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="border rounded-lg px-2 py-1 text-[10px] sm:text-xs w-full focus:ring-2 focus:ring-green-400 focus:outline-none"
            >
              <option value="">Todos</option>
              {Object.keys(TYPE_COLORS).map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          {/* Fechas */}
          <div className="flex flex-col w-full sm:col-span-2">
            <label className="text-[10px] sm:text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span> Rango de Fechas
            </label>
            <div className="flex gap-2 w-full">
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="border rounded-lg px-2 py-1 text-[10px] sm:text-xs w-full focus:ring-2 focus:ring-purple-400 focus:outline-none"
              />
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="border rounded-lg px-2 py-1 text-[10px] sm:text-xs w-full focus:ring-2 focus:ring-purple-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla scrollable, fila clickeable */}
      <div className="overflow-x-auto overflow-y-auto max-h-[65vh] w-full">
        <table className="min-w-[720px] w-full table-auto border-collapse text-[10px] sm:text-xs">
          <thead className="bg-gray-100 text-gray-700 font-semibold">
            <tr>
              {["N°", "Tipo", "S/.", "$", "Fecha", "Concepto", "Estado"].map((header, i) => (
                <th key={i} className="px-1 py-1 border border-gray-200 text-center">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-gray-50">
            {solicitudesFiltradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-6 text-gray-500 italic border border-gray-200">
                  No hay solicitudes en este estado o rango de fechas.
                </td>
              </tr>
            ) : (
              solicitudesFiltradas.map((s, idx) => (
                <tr
                  key={s.id || idx}
                  className="hover:bg-gray-100 transition cursor-pointer"
                  onClick={() => {
                    setSelectedSolicitud(s);
                    setShowPresentarModal(true);
                  }}
                >
                  <td className="px-1 py-1 font-semibold text-center">{s.numero_solicitud}</td>
                  <td className="px-1 py-1 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] ${TIPO_SOLICITUD_CLASSES[s.tipo_solicitud] || "bg-gray-200 text-gray-700"}`}>
                      {s.tipo_solicitud}
                    </span>
                  </td>
                  <td className="px-1 py-1 text-center">{s.total_soles ? `S/. ${s.total_soles}` : "-"}</td>
                  <td className="px-1 py-1 text-center">{s.total_dolares ? `$ ${s.total_dolares}` : "-"}</td>
                  <td className="px-1 py-1 text-center">{s.fecha}</td>
                  <td className="px-1 py-1 text-center truncate max-w-[100px] sm:max-w-[140px]">{s.concepto_gasto ?? "-"}</td>
                  <td className="px-1 py-1 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] ${STATE_CLASSES[s.estado] || "bg-gray-200 text-gray-700"}`}>
                      {s.estado}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPresentarModal && (
        <PresentarDocumentacionModal
          open={showPresentarModal}
          onClose={() => setShowPresentarModal(false)}
          solicitud={selectedSolicitud}
        />
      )}

    </div>
  </div>
);

}
