// src/dashboard/aprobacion_liquidacion/AprobacionLiquidaciones.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import EventBus from "@/components/EventBus";
import DetalleLiquidacionModal from "./LiquidacionDetalleModal";
import ConfirmacionModal from "./ConfirmacionModal";
import KpiCard from "@/components/ui/KpiCard";
import Table from "@/components/ui/table";
import ChartWrapped, { tooltipFormatter, radialTooltipFormatter } from "@/components/ui/ChartWrapped";
import { RefreshCw, DollarSign, FileText, CheckCircle2, XCircle, Eye, PieChart as PieChartIcon } from "lucide-react";
import { STATE_CLASSES, STATE_COLORS } from "@/components/ui/colors";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  PieChart,
  Pie,
  RadialBarChart,
  RadialBar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

const TASA_CAMBIO = 3.52;

export default function AprobacionLiquidaciones() {
  const { authUser: user, logout } = useAuth();

  // Tabla y datos
  const [liquidacionesTabla, setLiquidacionesTabla] = useState([]);
  const [liquidacionesAll, setLiquidacionesAll] = useState([]);
  const [loadingTabla, setLoadingTabla] = useState(true);
  const [loadingAll, setLoadingAll] = useState(true);
  const [errorTabla, setErrorTabla] = useState(null);
  const [errorAll, setErrorAll] = useState(null);

  // Modales y selección
  const [selectedLiquidacion, setSelectedLiquidacion] = useState(null);
  const [accion, setAccion] = useState("");
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // -------------------------------
  // Fetch tabla
  // -------------------------------
  const fetchTabla = useCallback(async () => {
    if (!user) return;
    setLoadingTabla(true);
    setErrorTabla(null);
    try {
      const token = localStorage.getItem("access_token");
      const { data } = await api.get("/boleta/liquidaciones_pendientes/", {
        headers: { Authorization: `Bearer ${token}` },
        params: { destinatario_id: user.id, estado: "Liquidación enviada para Aprobación" },
      });
      setLiquidacionesTabla(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErrorTabla("No se pudieron cargar las liquidaciones pendientes.");
      if (e?.response?.status === 401) logout();
    } finally {
      setLoadingTabla(false);
    }
  }, [user, logout]);

  // -------------------------------
  // Fetch todas las liquidaciones para KPIs
  // -------------------------------
  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoadingAll(true);
    setErrorAll(null);
    try {
      const token = localStorage.getItem("access_token");
      const { data } = await api.get("/boleta/liquidaciones_pendientes/", {
        headers: { Authorization: `Bearer ${token}` },
        params: { destinatario_id: user.id },
      });
      setLiquidacionesAll(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErrorAll("No se pudieron cargar los datos de KPI.");
      if (e?.response?.status === 401) logout();
    } finally {
      setLoadingAll(false);
    }
  }, [user, logout]);

  // -------------------------------
  // Escuchar eventos
  // -------------------------------
  useEffect(() => {
    const actualizar = () => { fetchTabla(); fetchAll(); };
    EventBus.on("liquidacionEnviada", actualizar);
    EventBus.on("liquidacionAprobada", actualizar);
    EventBus.on("liquidacionRechazada", actualizar);
    return () => {
      EventBus.off("liquidacionEnviada", actualizar);
      EventBus.off("liquidacionAprobada", actualizar);
      EventBus.off("liquidacionRechazada", actualizar);
    };
  }, [fetchTabla, fetchAll]);

  useEffect(() => { fetchTabla(); fetchAll(); }, [fetchTabla, fetchAll]);

  // -------------------------------
  // KPIs y gráficos
  // -------------------------------
  const { kpis, serie, estados } = useMemo(() => {
    const liqus = liquidacionesAll;
    const totalPendientes = liqus.filter(l => l.estado === "Liquidación enviada para Aprobación").length;
    const totalAprobadas = liqus.filter(l => l.estado === "Aprobado").length;
    const totalRechazadas = liqus.filter(l => l.estado === "Rechazado").length;
    const totalSoles = liqus.reduce((acc, l) => acc + (l.monto_soles ?? 0), 0);
    const totalDolares = totalSoles / TASA_CAMBIO;

    // Serie diaria últimos 30 días
    const byDayMap = new Map();
    liqus.forEach((l) => {
      if (l.estado === "Liquidación enviada para Aprobación") {
        const key = new Date(l.fecha).toLocaleDateString("es-PE");
        byDayMap.set(key, (byDayMap.get(key) || 0) + 1);
      }
    });
    const list = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("es-PE");
      list.push({ dia: key, pendientes: byDayMap.get(key) || 0 });
    }

    // Conteo por estado
    const estadoCounts = {};
    liqus.forEach((l) => {
      estadoCounts[l.estado] = (estadoCounts[l.estado] || 0) + 1;
    });

    const estadosData = Object.entries(estadoCounts).map(([name, value]) => ({ name, value }));

    return { kpis: { totalPendientes, totalAprobadas, totalRechazadas, totalSoles, totalDolares }, serie: list, estados: estadosData };
  }, [liquidacionesAll]);

  // -------------------------------
  // Accion aprobar/rechazar
  // -------------------------------
  const handleAccion = async () => {
    if (!selectedLiquidacion) return;
    try {
      const res = await api.post(`/boleta/liquidaciones/${selectedLiquidacion.id}/accion/`, { accion });
      setLiquidacionesTabla(prev => prev.map(l => (l.id === selectedLiquidacion.id ? res.data : l)));
      setConfirmModalOpen(false);
      setDetalleModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo ejecutar la acción.");
    }
  };

  // -------------------------------
  // Render loading / error
  // -------------------------------
  if (loadingTabla || loadingAll) return <p className="text-center py-10 animate-pulse">Cargando...</p>;
  if (errorTabla || errorAll) return <p className="text-center py-10 text-red-500">{errorTabla || errorAll}</p>;

  // -------------------------------
  // Render principal
  // -------------------------------
  return (
    <div className="p-6 w-full space-y-8 min-h-screen flex flex-col">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <FileText size={24} />
          Aprobación de Liquidaciones
          <button onClick={() => { fetchTabla(); fetchAll(); }} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition">
            <RefreshCw size={18} />
          </button>
        </h2>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {[
          { label: "Pendientes", value: kpis.totalPendientes, gradient: "linear-gradient(135deg,#0ea5e9cc,#38bdf899)", icon: FileText },
          { label: "Aprobadas", value: kpis.totalAprobadas, gradient: "linear-gradient(135deg,#16a34acc,#4ade8099)", icon: CheckCircle2 },
          { label: "Rechazadas", value: kpis.totalRechazadas, gradient: "linear-gradient(135deg,#ef4444cc,#f8717199)", icon: XCircle },
          { label: "Total S/.", value: kpis.totalSoles, gradient: "linear-gradient(135deg,#f59e0bcc,#fbbf2499)", icon: DollarSign },
          { label: "Total $", value: kpis.totalDolares, gradient: "linear-gradient(135deg,#6366f1cc,#818cf899)", icon: DollarSign },
        ].map(k => <KpiCard key={k.label} {...k} decimals={2} />)}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartWrapped title="Evolución de liquidaciones" icon={<FileText size={18} />} className="h-80" tooltipFormatter={tooltipFormatter}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 6px 18px rgba(0,0,0,.12)" }} labelStyle={{ fontWeight: 600 }} formatter={tooltipFormatter} />
              <Area type="monotone" dataKey="pendientes" stroke="#2563eb" fill="url(#colorPend)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartWrapped>

        <ChartWrapped title="Distribución por estado" icon={<PieChartIcon size={18} />} className="h-80" tooltipFormatter={radialTooltipFormatter}>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart innerRadius="10%" outerRadius="95%" data={estados}>
              <RadialBar minAngle={10} background clockWise dataKey="value" cornerRadius={8}>
                {estados.map((entry, i) => <Cell key={i} fill={STATE_COLORS[entry.name] || "#9ca3af"} />)}
              </RadialBar>
            </RadialBarChart>
          </ResponsiveContainer>
        </ChartWrapped>
      </div>

      {/* Tabla */}
      <Table
        headers={["N° Liquidación","Solicitante","Tipo","Monto S/.","Monto $","Fecha","Estado","Acciones"]}
        data={liquidacionesTabla}
        emptyMessage="No hay liquidaciones pendientes por ahora."
        renderRow={(l) => (
          <>
            <td className="px-3 sm:px-4 py-3 font-semibold text-center">{l.id || "-"}</td>
            <td className="px-3 sm:px-4 py-3 text-center">{l.solicitante_nombre || "-"}</td>
            <td className="px-3 sm:px-4 py-3 text-center hidden sm:table-cell">{l.tipo || "-"}</td>
            <td className="px-3 sm:px-4 py-3 text-center">S/ {(Number(l.monto_soles) || 0).toFixed(2)}</td>
            <td className="px-3 sm:px-4 py-3 text-center">$ {(Number(l.monto_dolares) || 0).toFixed(2)}</td>
            <td className="px-3 sm:px-4 py-3 text-center hidden sm:table-cell">{l.fecha ? new Date(l.fecha).toLocaleDateString("es-PE") : "-"}</td>
            <td className="px-3 sm:px-4 py-3 text-center">
              <span className={`text-xs px-2 py-1 rounded-full ${STATE_CLASSES[l.estado] || "bg-gray-100 text-gray-700"}`}>{l.estado || "Sin estado"}</span>
            </td>
            <td className="px-3 sm:px-4 py-3 text-center flex justify-center gap-2">
              <Button
                size="sm"
                fromColor="#a8d8d8"
                toColor="#81c7c7"
                hoverFrom="#81c7c7"
                hoverTo="#5eb0b0"
                onClick={() => { setSelectedLiquidacion(l); setDetalleModalOpen(true); }}
              >
                <Eye className="w-4 h-4" /> Detalle
              </Button>
              <Button
                size="sm"
                fromColor="#16a34acc"
                toColor="#4ade8099"
                hoverFrom="#16a34a"
                hoverTo="#22c55e"
                onClick={() => { setSelectedLiquidacion(l); setAccion("aprobar"); setConfirmModalOpen(true); }}
              >
                <CheckCircle2 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                fromColor="#ef4444cc"
                toColor="#f8717199"
                hoverFrom="#b91c1c"
                hoverTo="#991b1b"
                onClick={() => { setSelectedLiquidacion(l); setAccion("rechazar"); setConfirmModalOpen(true); }}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </td>
          </>
        )}
      />

      {/* Modales */}
      {detalleModalOpen && selectedLiquidacion && (
        <DetalleLiquidacionModal open={detalleModalOpen} liquidacion={selectedLiquidacion} onClose={() => setDetalleModalOpen(false)} />
      )}
      {confirmModalOpen && selectedLiquidacion && (
        <ConfirmacionModal open={confirmModalOpen} accion={accion} onConfirm={handleAccion} onClose={() => setConfirmModalOpen(false)} />
      )}

    </div>
  );
}
