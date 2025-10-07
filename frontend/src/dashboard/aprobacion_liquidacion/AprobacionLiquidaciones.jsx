// src/dashboard/aprobacion_liquidacion/AprobacionLiquidaciones.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import EventBus from "@/components/EventBus";
import DetalleLiquidacionModal from "./LiquidacionDetalleModal";
import ConfirmacionModal from "./ConfirmacionModal";
import KpiCard from "@/components/ui/KpiCard";
import Table from "@/components/ui/table";
import ChartWrapped, { tooltipFormatter, radialTooltipFormatter } from "@/components/ui/ChartWrapped";
import { FileText, CheckCircle2, XCircle, Eye, PieChart as PieChartIcon, Banknote, CircleDollarSign } from "lucide-react";
import { STATE_CLASSES, STATE_COLORS, TIPO_SOLICITUD_CLASSES } from "@/components/ui/colors";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, RadialBarChart, RadialBar, Cell } from 'recharts';

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
  const [search, setSearch] = useState("");
  const [filtroSolicitante, setFiltroSolicitante] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  const [showPresentarModal, setShowPresentarModal] = useState(false);


  // -------------------------------
  // Debug user
  // -------------------------------
  useEffect(() => {
    console.log("Auth user:", user);
  }, [user]);

  // -------------------------------
  // Fetch tabla
  // -------------------------------
  const fetchTabla = useCallback(async () => {
    if (!user) return;
    setLoadingTabla(true);
    setErrorTabla(null);
    try {
      const token = localStorage.getItem("access_token");
      const { data } = await api.get("/boleta/solicitudes_pendientes_aprobacion/", {
        headers: { Authorization: `Bearer ${token}` },
        params: { estado: "Liquidación enviada para Aprobación" }
      });
      console.log("Tabla fetch:", data);
      setLiquidacionesTabla(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErrorTabla("No se pudieron cargar las solicitudes pendientes.");
    } finally {
      setLoadingTabla(false);
    }
  }, [user]);

  // -------------------------------
  // Fetch todas
  // -------------------------------
  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoadingAll(true);
    setErrorAll(null);
    try {
      const token = localStorage.getItem("access_token");
      const { data } = await api.get("/boleta/solicitudes_pendientes_aprobacion/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("All fetch:", data);
      setLiquidacionesAll(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErrorAll("No se pudieron cargar los datos de KPI.");
    } finally {
      setLoadingAll(false);
    }
  }, [user]);


  // -------------------------------
  // EventBus
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

  const solicitudesFiltradas = useMemo(
  () =>
    liquidacionesTabla.filter((s) => {
      const matchSearch =
        (s.solicitante_nombre?.toLowerCase() || "").includes(search.toLowerCase()) ||
        s.numero_solicitud.toString().includes(search);

      const matchSolicitante = !filtroSolicitante || s.solicitante_nombre === filtroSolicitante;
      const matchTipo = !filtroTipo || s.tipo_solicitud === filtroTipo;
      const matchFecha =
        (!fechaInicio || new Date(s.fecha) >= new Date(fechaInicio)) &&
        (!fechaFin || new Date(s.fecha) <= new Date(fechaFin));

      return matchSearch && matchSolicitante && matchTipo && matchFecha;
    }),
  [liquidacionesTabla, search, filtroSolicitante, filtroTipo, fechaInicio, fechaFin]
);


  // -------------------------------
  // Manejo de acción
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
  // Render
  // -------------------------------
  if (loadingTabla || loadingAll) return <p className="text-center py-10 animate-pulse">Cargando...</p>;
  if (errorTabla || errorAll) return <p className="text-center py-10 text-red-500">{errorTabla || errorAll}</p>;

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 font-sans">
      <div className="flex-1 flex flex-col px-4 sm:px-6 md:px-8 py-4 lg:py-6">
        {/* Encabezado */}
        <header className="mb-4 sm:mb-6">
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="text-lg sm:text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-7 md:w-7 md:h-7" /> Aprobación de Liquidaciones
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
            className="mt-1 text-xs sm:text-sm md:text-base text-gray-600 italic">
            Aquí puedes revisar, aprobar o rechazar las <span className="font-semibold text-blue-600">liquidaciones enviadas</span>.
          </motion.p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Pendientes", value: kpis.totalPendientes, icon: FileText, gradient: "linear-gradient(135deg,#0ea5e9cc,#38bdf899)" },
            { label: "Aprobadas", value: kpis.totalAprobadas, icon: CheckCircle2, gradient: "linear-gradient(135deg,#16a34acc,#4ade8099)" },
            { label: "Rechazadas", value: kpis.totalRechazadas, icon: XCircle, gradient: "linear-gradient(135deg,#ef4444cc,#f8717199)" },
            { label: "Total S/.", value: kpis.totalSoles, icon: Banknote, gradient: "linear-gradient(135deg,#facc15cc,#fcd34d99)" },
            { label: "Total $", value: kpis.totalDolares.toFixed(2), icon: CircleDollarSign, gradient: "linear-gradient(135deg,#22c55ecc,#5eead4cc)" },
          ].map((kpi) => (
            <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} icon={kpi.icon} gradient={kpi.gradient} decimals={2} className="p-3" />
          ))}
        </div>

        {/* Gráficos */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 mb-6 w-full">
          <ChartWrapped title="Evolución de liquidaciones" icon={<FileText size={18} />} className="w-full h-64 sm:h-72 md:h-80 xl:h-[28rem]" tooltipFormatter={tooltipFormatter}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serie} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 6px 18px rgba(0,0,0,.12)" }} labelStyle={{ fontWeight: 600 }} formatter={tooltipFormatter} />
                <Area type="monotone" dataKey="pendientes" stroke="#2563eb" fill="url(#colorPend)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartWrapped>

          <ChartWrapped title="Distribución por estado" icon={<PieChartIcon size={18} />} className="w-full h-64 sm:h-72 md:h-80 xl:h-[28rem]" tooltipFormatter={radialTooltipFormatter}>
            <div className="flex flex-col lg:flex-row h-full gap-4 items-stretch">
              <div className="flex-1 min-h-[200px] sm:min-h-[240px] md:min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart innerRadius="10%" outerRadius="95%" data={estados}>
                    <RadialBar minAngle={10} background clockwise dataKey="value" cornerRadius={8}>
                      {estados.map((entry, i) => <Cell key={i} fill={STATE_COLORS[entry.name] || "#9ca3af"} />)}
                    </RadialBar>
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full lg:w-40 flex-shrink-0 mt-3 lg:mt-0">
                {estados.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2 text-xs md:text-sm text-gray-700 mb-2">
                    <span style={{ width: 14, height: 14, background: STATE_COLORS[s.name] || "#9ca3af", display: "inline-block", borderRadius: 3 }} />
                    <span className="font-medium">{s.name}</span>
                    <span className="text-gray-500 ml-1">({s.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartWrapped>
        </div>

        {/* Tabla */}
        <div className="max-h-[70vh] overflow-y-auto w-full">
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
              <span className="break-words max-w-[120px] text-center">{s.numero_solicitud}</span>,
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs md:text-sm ${
                  TIPO_SOLICITUD_CLASSES[s.tipo_solicitud] || "bg-gray-200 text-gray-700"
                } break-words text-center`}
              >
                {s.tipo_solicitud}
              </span>,
              <span className="text-center break-words max-w-[100px]">
                {s.total_soles ? `S/. ${s.total_soles}` : "-"}
              </span>,
              <span className="text-center break-words max-w-[100px]">
                {s.total_dolares ? `$ ${s.total_dolares}` : "-"}
              </span>,
              <span className="break-words max-w-[120px] text-center">
                {s.fecha ? new Date(s.fecha).toLocaleDateString("es-PE") : "-"}
              </span>,
              <span className="break-words max-w-[200px] text-center">{s.concepto_gasto ?? "-"}</span>,
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs md:text-sm ${
                  STATE_CLASSES[s.estado] || "bg-gray-200 text-gray-700"
                } break-words text-center`}
              >
                {s.estado}
              </span>,
              <div className="hidden md:flex justify-center">
                <Button
                  variant="default"
                  size="sm"
                  fromColor="#a8d8d8"
                  toColor="#81c7c7"
                  hoverFrom="#81c7c7"
                  hoverTo="#5eb0b0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSolicitud(s);
                    setDetalleModalOpen(true);
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
                setDetalleModalOpen(true);
              }
            }}
          />
        </div>

        {/* Modal detalle */}
        {detalleModalOpen && selectedSolicitud && (
          <DetalleLiquidacionModal
            open={detalleModalOpen}
            liquidacion={selectedSolicitud}
            onClose={() => setDetalleModalOpen(false)}
          />
        )}

        {/* Modal confirmación */}
        {confirmModalOpen && selectedSolicitud && (
          <ConfirmacionModal
            title={accion === "aprobar" ? "Aprobar Solicitud" : "Rechazar Solicitud"}
            onCancel={() => setConfirmModalOpen(false)}
            onConfirm={handleAccion}
          />
        )}
      </div>
    </div>
  );
}
