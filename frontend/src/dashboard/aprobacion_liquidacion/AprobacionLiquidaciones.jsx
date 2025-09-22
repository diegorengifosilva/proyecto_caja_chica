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
import { RefreshCw, FileText, CheckCircle2, XCircle, Eye, PieChart as PieChartIcon, Banknote, CircleDollarSign } from "lucide-react";
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

  const [liquidacionesTabla, setLiquidacionesTabla] = useState([]);
  const [liquidacionesAll, setLiquidacionesAll] = useState([]);
  const [loadingTabla, setLoadingTabla] = useState(true);
  const [loadingAll, setLoadingAll] = useState(true);
  const [errorTabla, setErrorTabla] = useState(null);
  const [errorAll, setErrorAll] = useState(null);

  const [selectedLiquidacion, setSelectedLiquidacion] = useState(null);
  const [accion, setAccion] = useState("");
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Fetch tabla
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

  // Fetch todas las liquidaciones
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

  const { kpis, serie, estados } = useMemo(() => {
    const liqus = liquidacionesAll;
    const totalPendientes = liqus.filter(l => l.estado === "Liquidación enviada para Aprobación").length;
    const totalAprobadas = liqus.filter(l => l.estado === "Aprobado").length;
    const totalRechazadas = liqus.filter(l => l.estado === "Rechazado").length;
    const totalSoles = liqus.reduce((acc, l) => acc + (l.monto_soles ?? 0), 0);
    const totalDolares = totalSoles / TASA_CAMBIO;

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

    const estadoCounts = {};
    liqus.forEach((l) => { estadoCounts[l.estado] = (estadoCounts[l.estado] || 0) + 1; });
    const estadosData = Object.entries(estadoCounts).map(([name, value]) => ({ name, value }));

    return { kpis: { totalPendientes, totalAprobadas, totalRechazadas, totalSoles, totalDolares }, serie: list, estados: estadosData };
  }, [liquidacionesAll]);

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

  if (loadingTabla || loadingAll) return <p className="text-center py-10 animate-pulse">Cargando...</p>;
  if (errorTabla || errorAll) return <p className="text-center py-10 text-red-500">{errorTabla || errorAll}</p>;

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 font-sans">
      <div className="flex-1 flex flex-col px-2 sm:px-4 md:px-6 lg:px-8 py-4 lg:py-6 w-full max-w-full 2xl:max-w-[2560px] mx-auto">

        {/* Header */}
        <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800 mb-6 w-full">
          <FileText className="w-6 h-6 sm:w-7 sm:h-7" /> Aprobación de Liquidaciones
          <button
            onClick={() => { fetchTabla(); fetchAll(); }}
            className="ml-auto p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
          >
            <RefreshCw size={18} />
          </button>
        </h2>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-3 gap-y-4 sm:gap-x-4 sm:gap-y-5 md:gap-x-6 md:gap-y-6 mb-6 w-full justify-items-stretch">
          {[
            { label: "Pendientes", value: kpis.totalPendientes, icon: FileText, gradient: "linear-gradient(135deg,#0ea5e9cc,#38bdf899)" },
            { label: "Aprobadas", value: kpis.totalAprobadas, icon: CheckCircle2, gradient: "linear-gradient(135deg,#16a34acc,#4ade8099)" },
            { label: "Rechazadas", value: kpis.totalRechazadas, icon: XCircle, gradient: "linear-gradient(135deg,#ef4444cc,#f8717199)" },
            { label: "Total S/.", value: kpis.totalSoles, icon: Banknote, gradient: "linear-gradient(135deg,#f59e0bcc,#fbbf2499)" },
            { label: "Total $", value: kpis.totalDolares, icon: CircleDollarSign, gradient: "linear-gradient(135deg,#6366f1cc,#818cf899)" },
          ].map(k => (
            <div key={k.label} className="flex-1 min-w-0">
              <KpiCard
                label={k.label}
                value={k.value}
                icon={k.icon}
                gradient={k.gradient}
                decimals={2}
                className="text-xs sm:text-sm md:text-base w-full p-3 sm:p-4"
              />
            </div>
          ))}
        </div>

        {/* Gráficos */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6 w-full">

          {/* Evolución */}
          <ChartWrapped
            title="Evolución de liquidaciones"
            icon={<FileText className="w-4 h-4 sm:w-5 sm:h-5" />}
            tooltipFormatter={tooltipFormatter}
            className="flex-1 min-w-0 h-64 sm:h-72 md:h-80 xl:h-[32rem] 2xl:h-[40rem] w-full"
          >
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
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 6px 18px rgba(0,0,0,.12)" }}
                  labelStyle={{ fontWeight: 600 }}
                  formatter={tooltipFormatter}
                />
                <Area type="monotone" dataKey="pendientes" stroke="#2563eb" fill="url(#colorPend)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartWrapped>

          {/* Distribución por estado */}
          <ChartWrapped
            title="Distribución por estado"
            icon={<PieChartIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
            tooltipFormatter={radialTooltipFormatter}
            className="flex-1 min-w-0 h-64 sm:h-72 md:h-80 xl:h-[32rem] 2xl:h-[40rem] w-full"
          >
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-full items-stretch">
              <div className="flex-1 min-h-[160px] sm:min-h-[200px] md:min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart innerRadius="10%" outerRadius="95%" data={estados} barSize={12}>
                    <RadialBar minAngle={15} background clockWise dataKey="value" cornerRadius={6}>
                      {estados.map((entry, i) => (
                        <Cell key={i} fill={STATE_COLORS[entry.name] || "#9ca3af"} />
                      ))}
                    </RadialBar>
                    <Tooltip wrapperStyle={{ outline: "none" }} formatter={radialTooltipFormatter} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full lg:w-72 flex-shrink-0 mt-3 lg:mt-0">
                {estados.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2 text-[10px] sm:text-xs md:text-sm text-gray-700 mb-2">
                    <span
                      style={{ width: 14, height: 14, background: STATE_COLORS[s.name] || "#9ca3af", display: "inline-block", borderRadius: 3 }}
                    />
                    <span className="font-medium">{s.name}</span>
                    <span className="text-gray-500 ml-1">({s.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartWrapped>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto w-full">
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
                  <span className={`text-xs px-2 py-1 rounded-full ${STATE_CLASSES[l.estado] || "bg-gray-100 text-gray-700"}`}>
                    {l.estado || "Sin estado"}
                  </span>
                </td>
                <td className="px-3 sm:px-4 py-3 text-center flex justify-center gap-2">
                  <Button size="sm" fromColor="#a8d8d8" toColor="#81c7c7" hoverFrom="#81c7c7" hoverTo="#5eb0b0" onClick={() => { setSelectedLiquidacion(l); setDetalleModalOpen(true); }} className="flex items-center gap-2 px-3 py-1.5 justify-center">
                    <Eye className="w-4 h-4" /> Detalle
                  </Button>
                  <Button size="sm" fromColor="#16a34acc" toColor="#4ade8099" hoverFrom="#16a34a" hoverTo="#22c55e" onClick={() => { setSelectedLiquidacion(l); setAccion("aprobar"); setConfirmModalOpen(true); }}>
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" fromColor="#ef4444cc" toColor="#f8717199" hoverFrom="#b91c1c" hoverTo="#991b1b" onClick={() => { setSelectedLiquidacion(l); setAccion("rechazar"); setConfirmModalOpen(true); }}>
                    <XCircle className="w-4 h-4" />
                  </Button>
                </td>
              </>
            )}
          />
        </div>

        {/* Modales */}
        {detalleModalOpen && selectedLiquidacion && (
          <DetalleLiquidacionModal open={detalleModalOpen} liquidacion={selectedLiquidacion} onClose={() => setDetalleModalOpen(false)} />
        )}
        {confirmModalOpen && selectedLiquidacion && (
          <ConfirmacionModal open={confirmModalOpen} accion={accion} onConfirm={handleAccion} onClose={() => setConfirmModalOpen(false)} />
        )}

      </div>
    </div>
  );
}
