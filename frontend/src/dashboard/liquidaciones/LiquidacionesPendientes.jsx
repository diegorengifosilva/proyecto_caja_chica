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
      <div className="flex-1 flex flex-col px-4 sm:px-6 md:px-8 py-4 lg:py-6">

        {/* Header */}
        <div className="flex justify-center md:justify-start items-center mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold flex items-center gap-2 text-black">
            <FolderKanban className="w-5 sm:w-6 md:w-7 lg:w-8 h-5 sm:h-6 md:h-7 lg:h-8" /> Liquidaciones Pendientes
          </h2>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 w-full">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="flex-1 min-w-0">
              <KpiCard
                label={kpi.label}
                value={loading ? 0 : kpi.value}
                icon={kpi.icon}
                gradient={kpi.gradient}
                tooltip={kpi.tooltip}
                decimals={Number.isInteger(kpi.value) ? 0 : 2}
              />
            </div>
          ))}
        </div>

        {/* Gráficos */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 mb-6 w-full">

          <ChartWrapped
            title="Montos por Tipo de Solicitud (S/.)"
            icon={<ChartBarDecreasing className="w-4 sm:w-5 md:w-6 lg:w-7 h-4 sm:h-5 md:h-6 lg:h-7" />}
            tooltipFormatter={(val) => `S/ ${val.toLocaleString()}`}
            className="flex-1 w-full min-w-0 h-[25vw] sm:h-[20vw] md:h-[18vw] xl:h-[28rem]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataMontoPorTipo} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip formatter={(val) => `S/ ${val.toLocaleString()}`} />
                <Bar dataKey="value" barSize={25}>
                  {dataMontoPorTipo.map((entry, i) => <Cell key={i} fill={TYPE_COLORS[entry.name] || "#9CA3AF"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapped>

          <ChartWrapped
            title="Distribución por Tipo"
            icon={<ChartColumnIncreasing className="w-4 sm:w-5 md:w-6 lg:w-7 h-4 sm:h-5 md:h-6 lg:h-7" />}
            tooltipFormatter={tooltipFormatter}
            className="flex-1 w-full min-w-0 h-[25vw] sm:h-[20vw] md:h-[18vw] xl:h-[28rem]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataTipo}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={tooltipFormatter} />
                <Bar dataKey="value" barSize={25}>
                  {dataTipo.map((entry, i) => <Cell key={i} fill={TYPE_COLORS[entry.name] || "#9CA3AF"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapped>

        </div>

        {/* Filtros */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm mb-6 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 items-end">
            {/* Solicitante */}
            <div className="flex flex-col w-full">
              <label className="text-xs sm:text-sm md:text-base font-semibold text-gray-600 mb-1 flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span> Solicitante
              </label>
              <select value={filtroSolicitante} onChange={(e) => setFiltroSolicitante(e.target.value)} className="border rounded-lg px-2 py-1 sm:py-2 text-xs sm:text-sm md:text-base w-full focus:ring-2 focus:ring-blue-400 focus:outline-none">
                <option value="">Todos</option>
                {solicitantes.map((sol) => <option key={sol} value={sol}>{sol}</option>)}
              </select>
            </div>

            {/* Tipo */}
            <div className="flex flex-col w-full">
              <label className="text-xs sm:text-sm md:text-base font-semibold text-gray-600 mb-1 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span> Tipo
              </label>
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="border rounded-lg px-2 py-1 sm:py-2 text-xs sm:text-sm md:text-base w-full focus:ring-2 focus:ring-green-400 focus:outline-none">
                <option value="">Todos</option>
                {Object.keys(TYPE_COLORS).map((tipo_solicitud) => <option key={tipo_solicitud} value={tipo_solicitud}>{tipo_solicitud}</option>)}
              </select>
            </div>

            {/* Fechas */}
            <div className="flex flex-col w-full">
              <label className="text-xs sm:text-sm md:text-base font-semibold text-gray-600 mb-1 flex items-center gap-1">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span> Rango de Fechas
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="border rounded-lg px-2 py-1 text-xs sm:text-sm md:text-base w-full sm:w-auto focus:ring-2 focus:ring-purple-400 focus:outline-none" />
                <span className="text-gray-400 text-xs sm:text-sm hidden sm:inline">→</span>
                <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="border rounded-lg px-2 py-1 text-xs sm:text-sm md:text-base w-full sm:w-auto focus:ring-2 focus:ring-purple-400 focus:outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabla scrollable */}
        <div className="overflow-x-auto w-full flex-1 min-w-0">
          <Table
            headers={["N°", "Tipo", "S/.", "$", "Fecha", "Concepto", "Estado", "Acción"]}
            data={solicitudesFiltradas}
            emptyMessage="No hay solicitudes en este estado o rango de fechas."
            renderRow={(s) => (
              <>
                <td className="px-1 sm:px-2 py-1 sm:py-2 text-center text-xs sm:text-sm md:text-base font-semibold whitespace-nowrap">{s.numero_solicitud}</td>
                <td className="px-1 sm:px-2 py-1 sm:py-2 text-center text-xs sm:text-sm md:text-base whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-xs md:text-sm ${TIPO_SOLICITUD_CLASSES[s.tipo_solicitud] || "bg-gray-200 text-gray-700"}`}>{s.tipo_solicitud}</span>
                </td>
                <td className="px-1 sm:px-2 py-1 sm:py-2 text-center text-xs sm:text-sm md:text-base whitespace-nowrap">{s.total_soles ? `S/. ${s.total_soles}` : "-"}</td>
                <td className="px-1 sm:px-2 py-1 sm:py-2 text-center text-xs sm:text-sm md:text-base whitespace-nowrap">{s.total_dolares ? `$ ${s.total_dolares}` : "-"}</td>
                <td className="px-1 sm:px-2 py-1 sm:py-2 text-center text-xs sm:text-sm md:text-base whitespace-nowrap">{s.fecha}</td>
                <td className="px-1 sm:px-2 py-1 sm:py-2 text-center text-xs sm:text-sm md:text-base truncate max-w-[120px] sm:max-w-[160px] md:max-w-[200px]">{s.concepto_gasto ?? "-"}</td>
                <td className="px-1 sm:px-2 py-1 sm:py-2 text-center text-xs sm:text-sm md:text-base whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-xs md:text-sm ${STATE_CLASSES[s.estado] || "bg-gray-200 text-gray-700"}`}>{s.estado}</span>
                </td>
                <td className="px-1 sm:px-2 py-1 sm:py-2 text-center text-xs sm:text-sm md:text-base whitespace-nowrap">
                  <Button variant="outline" size="sm" onClick={() => handleAccion(s.id, "Presentar Documentación", s)} className="flex items-center justify-center gap-1 px-2 py-1 sm:px-3 sm:py-2">
                    <FileText className="w-4 sm:w-5 md:w-6 lg:w-7 h-4 sm:h-5 md:h-6 lg:h-7" /> Presentar
                  </Button>
                </td>
              </>
            )}
          />
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
