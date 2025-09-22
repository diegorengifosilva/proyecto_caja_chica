// src/dashboard/liquidaciones/LiquidacionesPendientes.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { FolderKanban, DollarSign, Clock, Users, Filter, CalendarRange, Eye } from "lucide-react";
import PresentarDocumentacionModal from "./PresentarDocumentacionModal";
import axios from "@/services/api";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { TYPE_COLORS, TIPO_SOLICITUD_CLASSES, STATE_CLASSES } from "@/components/ui/colors";
import KpiCard from "@/components/ui/KpiCard";
import FilterCard from "@/components/ui/FilterCard";
import Table from "@/components/ui/table";
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

  useEffect(() => {
    fetchLiquidaciones();
  }, [fetchLiquidaciones]);

  const solicitantes = useMemo(
    () => Array.from(new Set(liquidaciones.map((l) => l.solicitante))),
    [liquidaciones]
  );

  const solicitudesFiltradas = useMemo(
    () =>
      liquidaciones.filter((l) => {
        const matchSearch =
          l.solicitante.toLowerCase().includes(search.toLowerCase()) ||
          l.numero_solicitud.toString().includes(search);
        const matchSolicitante = !filtroSolicitante || l.solicitante === filtroSolicitante;
        const matchTipo = !filtroTipo || l.tipo_solicitud === filtroTipo;
        const matchFecha =
          (!fechaInicio || new Date(l.fecha) >= new Date(fechaInicio)) &&
          (!fechaFin || new Date(l.fecha) <= new Date(fechaFin));
        return matchSearch && matchSolicitante && matchTipo && matchFecha;
      }),
    [liquidaciones, search, filtroSolicitante, filtroTipo, fechaInicio, fechaFin]
  );

  const stats = useMemo(() => {
    const total = solicitudesFiltradas.length;
    const totalSoles = solicitudesFiltradas.reduce((sum, l) => sum + (l.total_soles || 0), 0);
    const totalDolares = solicitudesFiltradas.reduce((sum, l) => sum + (l.total_dolares || 0), 0);
    const promedio = total ? (totalSoles / total).toFixed(2) : 0;
    return { total, totalSoles, totalDolares, promedio };
  }, [solicitudesFiltradas]);

  const kpis = [
    { label: "Total Pendientes", value: stats.total, gradient: "linear-gradient(135deg, #f97316cc, #fb923c99)", icon: Clock },
    { label: "Monto Total (S/)", value: stats.totalSoles, gradient: "linear-gradient(135deg, #3b82f6cc, #60a5fa99)", icon: DollarSign, decimals: 2 },
    { label: "Monto Total ($)", value: stats.totalDolares, gradient: "linear-gradient(135deg, #10b981cc, #34d39999)", icon: DollarSign, decimals: 2 },
    { label: "Promedio por Solicitud (S/)", value: stats.promedio, gradient: "linear-gradient(135deg, #f59e0bcc, #fcd34d99)", icon: DollarSign, decimals: 2 },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 font-sans">
      <div className="flex-1 flex flex-col px-4 sm:px-6 md:px-8 py-4 lg:py-6">

        {/* Encabezado tipo DashboardHome.jsx */}
        <header className="mb-4 sm:mb-6">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-lg sm:text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-2"
          >
            <FolderKanban className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
            Liquidaciones Pendientes
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mt-1 text-xs sm:text-sm md:text-base text-gray-600 italic"
          >
            Aquí puedes ver y gestionar todas las <span className="font-semibold text-blue-600">liquidaciones pendientes</span>.
          </motion.p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-4 sm:gap-x-4 sm:gap-y-5 md:gap-x-6 md:gap-y-6 mb-6 w-full justify-items-stretch">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="flex-1 min-w-0">
              <KpiCard
                label={kpi.label}
                value={loading ? 0 : kpi.value}
                icon={kpi.icon}
                gradient={kpi.gradient}
                tooltip={kpi.tooltip}
                decimals={Number.isInteger(kpi.value) ? 0 : 2}
                className="text-xs sm:text-sm md:text-base w-full p-3 sm:p-4"
              />
            </div>
          ))}
        </div>

        {/* Filtros */}
        <FilterCard title="Filtros" icon={<Filter size={16} />} className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-5 w-full">
            
            {/* Solicitante */}
            <div className="flex flex-col w-full">
              <label className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span> Solicitante
              </label>
              <select
                value={filtroSolicitante}
                onChange={(e) => setFiltroSolicitante(e.target.value)}
                className="border rounded-lg px-2 py-2 text-xs sm:text-sm md:text-base w-full focus:ring-2 focus:ring-blue-400 focus:outline-none"
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
              <label className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span> Tipo
              </label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="border rounded-lg px-2 py-2 text-xs sm:text-sm md:text-base w-full focus:ring-2 focus:ring-green-400 focus:outline-none"
              >
                <option value="">Todos</option>
                {Object.keys(TYPE_COLORS).map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            {/* Rango de Fechas */}
            <div className="flex flex-col w-full sm:col-span-2 md:col-span-1">
              <label className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span> Rango de Fechas
              </label>
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="border rounded-lg px-2 py-2 text-xs sm:text-sm md:text-base w-full sm:w-1/2 focus:ring-2 focus:ring-purple-400 focus:outline-none"
                />
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="border rounded-lg px-2 py-2 text-xs sm:text-sm md:text-base w-full sm:w-1/2 focus:ring-2 focus:ring-purple-400 focus:outline-none"
                />
              </div>
            </div>
            
          </div>
        </FilterCard>

        {/* Tabla */}
        <div className="overflow-x-auto max-h-[70vh] w-full">
          <Table
            headers={[
              "N° Solicitud",
              "Tipo de Solicitud",
              "Monto S/.",
              "Monto $",
              "Fecha",
              "Concepto",
              "Estado",
              <span key="accion" className="hidden md:table-cell">Acción</span>,
            ]}
            data={solicitudesFiltradas}
            emptyMessage="No hay solicitudes en este estado o rango de fechas."
            renderRow={(s) => [
              s.numero_solicitud,
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs md:text-sm ${
                  TIPO_SOLICITUD_CLASSES[s.tipo_solicitud] || "bg-gray-200 text-gray-700"
                } whitespace-pre-wrap break-words text-center`}
              >
                {s.tipo_solicitud}
              </span>,
              <span className="text-center">{s.total_soles ? `S/. ${s.total_soles}` : "-"}</span>,
              <span className="text-center">{s.total_dolares ? `$ ${s.total_dolares}` : "-"}</span>,
              <span className="whitespace-pre-wrap break-words text-center">{s.fecha}</span>,
              <span className="truncate sm:whitespace-normal max-w-[120px] sm:max-w-[200px] text-center">
                {s.concepto_gasto ?? "-"}
              </span>,
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs md:text-sm ${
                  STATE_CLASSES[s.estado] || "bg-gray-200 text-gray-700"
                } whitespace-pre-wrap break-words text-center`}
              >
                {s.estado.split(" ").length > 3 ? s.estado.replace(" ", "\n") : s.estado}
              </span>,
              <div className="hidden md:flex justify-center">
                <Button
                  variant="default"
                  size="sm"
                  fromColor="#a8d8d8"       // color base
                  toColor="#81c7c7"         // degradado suave
                  hoverFrom="#81c7c7"       // hover inicio
                  hoverTo="#5eb0b0"         // hover fin
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSolicitud(s);
                    setShowPresentarModal(true);
                  }}
                  className="flex items-center gap-1 px-2 py-1"
                >
                  <Eye className="w-4 h-4" /> Detalle
                </Button>
              </div>,
            ]}
            onRowClick={(s) => {
              if (window.innerWidth < 768) {
                setSelectedSolicitud(s);
                setShowPresentarModal(true);
              }
            }}
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
