// src/dashboard/liquidaciones/LiquidacionesPendientes.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FileText, FolderKanban, DollarSign, Clock, ChartBarDecreasing, ChartColumnIncreasing } from "lucide-react";
import PresentarDocumentacionModal from "./PresentarDocumentacionModal";
import axios from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
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

  // -------------------------------
  // Fetch liquidaciones pendientes
  // -------------------------------
  const fetchLiquidaciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token");
      const { data } = await axios.get("/boleta/liquidaciones_pendientes/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("✅ Liquidaciones pendientes raw:", data);

      // Limpiar posibles correos en el nombre del solicitante
      const dataLimpia = data.map((s) => ({
        ...s,
        solicitante: s.solicitante?.replace(/\s*<.*?>/, "").trim() || "-",
      }));

      console.log("✅ Liquidaciones pendientes limpias:", dataLimpia);
      setLiquidaciones(dataLimpia);
    } catch (e) {
      console.error("Error cargando solicitudes pendientes:", e);
      setError(
        e?.response?.data?.detail || 
        "No se pudieron cargar las liquidaciones pendientes."
      );
      if (e?.response?.status === 401) logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  // -------------------------------
  // EventBus: refrescar al recibir eventos
  // -------------------------------
  useEffect(() => {
    EventBus.on("solicitudAtendida", fetchLiquidaciones);
    EventBus.on("solicitudRechazada", fetchLiquidaciones);

    return () => {
      EventBus.off("solicitudAtendida", fetchLiquidaciones);
      EventBus.off("solicitudRechazada", fetchLiquidaciones);
    };
  }, [fetchLiquidaciones]);

  // -------------------------------
  // Fetch inicial
  // -------------------------------
  useEffect(() => {
    fetchLiquidaciones();
  }, [fetchLiquidaciones]);

  // -------------------------------
  // Lista de solicitantes únicos
  // -------------------------------
  const solicitantes = useMemo(() => {
    const unique = new Set(liquidaciones.map((l) => l.solicitante));
    return Array.from(unique);
  }, [liquidaciones]);

  // -------------------------------
  // Filtro principal para la tabla
  // -------------------------------
  const solicitudesFiltradas = useMemo(() => {
    return liquidaciones.filter((l) => {
      const matchSearch =
        l.solicitante.toLowerCase().includes(search.toLowerCase()) ||
        l.numero_solicitud.toString().includes(search);

      const matchSolicitante =
        filtroSolicitante === "" || l.solicitante === filtroSolicitante;

      const matchTipo = filtroTipo === "" || l.tipo_solicitud === filtroTipo;

      const matchFecha =
        (!fechaInicio || new Date(l.fecha) >= new Date(fechaInicio)) &&
        (!fechaFin || new Date(l.fecha) <= new Date(fechaFin));

      return matchSearch && matchSolicitante && matchTipo && matchFecha;
    });
  }, [liquidaciones, search, filtroSolicitante, filtroTipo, fechaInicio, fechaFin]);

  // === KPIs ===
  const stats = useMemo(() => {
    const total = solicitudesFiltradas.length;
    const totalSoles = solicitudesFiltradas.reduce(
      (sum, l) => sum + (l.total_soles || 0),
      0
    );
    const totalDolares = solicitudesFiltradas.reduce(
      (sum, l) => sum + (l.total_dolares || 0),
      0
    );
    const promedio = total ? (totalSoles / total).toFixed(2) : 0;
    return { total, totalSoles, totalDolares, promedio };
  }, [solicitudesFiltradas]);

  // === Datos para gráficos ===
  const dataTipo = useMemo(() => {
    return Object.entries(
      solicitudesFiltradas.reduce((acc, l) => {
        acc[l.tipo_solicitud] = (acc[l.tipo_solicitud] || 0) + 1;
        return acc;
      }, {})
    ).map(([tipo_solicitud, value]) => ({ name: tipo_solicitud, value }));
  }, [solicitudesFiltradas]);

  const dataMontoPorTipo = useMemo(() => {
    return Object.entries(
      solicitudesFiltradas.reduce((acc, l) => {
        acc[l.tipo_solicitud] = (acc[l.tipo_solicitud] || 0) + (l.total_soles || 0);
        return acc;
      }, {})
    ).map(([tipo, value]) => ({
      name: tipo,
      value: Number(value.toFixed(2)),
    }));
  }, [solicitudesFiltradas]);

  const handleAccion = (id, accion, solicitud) => {
    setSelectedSolicitud(solicitud);
    if (accion === "Ver Detalle") {
      setShowDocumentoModal(true);
      setOcrData(solicitud);
    } else {
      setShowPresentarModal(true);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full">

      {/* Header */}
      <div className="flex justify-center md:justify-start items-center mb-4">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2 text-black">
          <FolderKanban className="w-5 sm:w-6 h-5 sm:h-6" /> Liquidaciones Pendientes
        </h2>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-4 sm:gap-x-4 sm:gap-y-5 md:gap-x-6 md:gap-y-6 mb-6 w-full justify-items-stretch">
        {[
          { label: "Total Pendientes", value: stats.total, gradient: "linear-gradient(135deg, #f97316cc, #fb923c99)", icon: Clock, tooltip: "Número total de solicitudes pendientes." },
          { label: "Monto Total (S/)", value: stats.totalSoles, gradient: "linear-gradient(135deg, #3b82f6cc, #60a5fa99)", icon: DollarSign, tooltip: "Monto acumulado en soles.", decimals: 2 },
          { label: "Monto Total ($)", value: stats.totalDolares, gradient: "linear-gradient(135deg, #10b981cc, #34d39999)", icon: DollarSign, tooltip: "Monto acumulado en dólares.", decimals: 2 },
          { label: "Promedio por Solicitud (S/)", value: stats.promedio, gradient: "linear-gradient(135deg, #f59e0bcc, #fcd34d99)", icon: DollarSign, tooltip: "Promedio por solicitud.", decimals: 2 },
        ].map((kpi) => (
          <div key={kpi.label} className="flex-1 min-w-0">
            <KpiCard
              label={kpi.label}
              value={loading ? 0 : kpi.value}
              icon={kpi.icon}
              gradient={kpi.gradient}
              tooltip={kpi.tooltip}
              decimals={Number.isInteger(kpi.value) ? 0 : 2}
              className="text-xs sm:text-sm md:text-base w-full p-2 sm:p-3"
            />
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <ChartWrapped
          title="Montos por Tipo de Solicitud (S/.)"
          icon={<ChartBarDecreasing className="w-4 h-4" />}
          className="h-64 sm:h-72 lg:h-80"
          tooltipFormatter={(val) => `S/ ${val.toLocaleString()}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataMontoPorTipo} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip formatter={(val) => `S/ ${val.toLocaleString()}`} />
              <Bar dataKey="value" barSize={25}>
                {dataMontoPorTipo.map((entry, i) => (
                  <Cell key={i} fill={TYPE_COLORS[entry.name] || "#9CA3AF"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapped>

        <ChartWrapped
          title="Distribución por Tipo"
          icon={<ChartColumnIncreasing className="w-4 h-4" />}
          className="h-64 sm:h-72 lg:h-80"
          tooltipFormatter={tooltipFormatter}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataTipo}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={tooltipFormatter} />
              <Bar dataKey="value" barSize={25}>
                {dataTipo.map((entry, i) => (
                  <Cell key={i} fill={TYPE_COLORS[entry.name] || "#9CA3AF"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapped>
      </div>

      {/* Filtros */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm mb-6 w-full overflow-x-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-end">
          {/* Solicitante */}
          <div className="flex flex-col w-full">
            <label className="text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span> Solicitante
            </label>
            <select
              value={filtroSolicitante}
              onChange={(e) => setFiltroSolicitante(e.target.value)}
              className="border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none w-full"
            >
              <option value="">Todos</option>
              {solicitantes.map((sol) => (
                <option key={sol} value={sol}>{sol}</option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div className="flex flex-col w-full">
            <label className="text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span> Tipo
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none w-full"
            >
              <option value="">Todos</option>
              {Object.keys(TYPE_COLORS).map((tipo_solicitud) => (
                <option key={tipo_solicitud} value={tipo_solicitud}>{tipo_solicitud}</option>
              ))}
            </select>
          </div>

          {/* Fechas */}
          <div className="flex flex-col w-full">
            <label className="text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span> Rango de Fechas
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none w-full sm:w-auto"
              />
              <span className="text-gray-400 text-xs hidden sm:inline">→</span>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none w-full sm:w-auto"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <Table
          headers={[
            "N° Solicitud",
            "Tipo",
            "Monto (S/.)",
            "Monto ($)",
            "Fecha",
            "Concepto",
            "Estado",
            "Acción",
          ]}
          data={solicitudesFiltradas}
          emptyMessage="No hay solicitudes en este estado o rango de fechas."
          renderRow={(s) => (
            <>
              <td className="px-2 sm:px-3 py-2 text-center font-semibold">{s.numero_solicitud}</td>
              <td className="px-2 sm:px-3 py-2 text-center">
                <span className={`text-xs px-2 py-1 rounded-full ${TIPO_SOLICITUD_CLASSES[s.tipo_solicitud] || "bg-gray-200 text-gray-700"}`}>{s.tipo_solicitud}</span>
              </td>
              <td className="px-2 sm:px-3 py-2 text-center">{s.total_soles ? `S/. ${s.total_soles}` : "-"}</td>
              <td className="px-2 sm:px-3 py-2 text-center">{s.total_dolares ? `$ ${s.total_dolares}` : "-"}</td>
              <td className="px-2 sm:px-3 py-2 text-center">{s.fecha}</td>
              <td className="px-2 sm:px-3 py-2 text-center">{s.concepto_gasto ?? "-"}</td>
              <td className="px-2 sm:px-3 py-2 text-center">
                <span className={`text-xs px-2 py-1 rounded-full ${STATE_CLASSES[s.estado] || "bg-gray-200 text-gray-700"}`}>{s.estado}</span>
              </td>
              <td className="px-2 sm:px-3 py-2 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAccion(s.id, "Presentar Documentación", s)}
                  className="flex items-center justify-center gap-1 w-full sm:w-auto"
                >
                  <FileText className="w-4 h-4" /> Presentar
                </Button>
              </td>
            </>
          )}
        />
      </div>

      {/* Modals */}
      {showPresentarModal && (
        <PresentarDocumentacionModal
          open={showPresentarModal}
          onClose={() => setShowPresentarModal(false)}
          solicitud={selectedSolicitud}
        />
      )}

    </div>
  );
}