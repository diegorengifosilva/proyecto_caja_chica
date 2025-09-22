// src/dashboard/atencion_solicitudes/AtencionSolicitudes.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import DetalleSolicitudModal from "./DetalleSolicitudModal";
import { toast } from "react-toastify";
import "tippy.js/dist/tippy.css";
import { Button } from "@/components/ui/button";
import EventBus from "@/components/EventBus";
import { RefreshCw, DollarSign, ListChecks, Eye, FileText, Clock, CheckCircle, XCircle, PieChart } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, YAxis, CartesianGrid, RadialBarChart, RadialBar, Cell } from "recharts";
import { STATE_CLASSES, STATE_COLORS } from "@/components/ui/colors";
import KpiCard from "@/components/ui/KpiCard";
import Table from "@/components/ui/table";
import ChartWrapped, { tooltipFormatter, radialTooltipFormatter } from "@/components/ui/ChartWrapped";

export default function AtencionSolicitudes() {
  const { authUser: user, logout } = useAuth();

  // -------------------------------
  // Estados
  // -------------------------------
  const [solicitudesTabla, setSolicitudesTabla] = useState([]);
  const [solicitudesAll, setSolicitudesAll] = useState([]);

  const [loadingTabla, setLoadingTabla] = useState(true);
  const [loadingAll, setLoadingAll] = useState(true);

  const [errorTabla, setErrorTabla] = useState(null);
  const [errorAll, setErrorAll] = useState(null);

  const [selectedId, setSelectedId] = useState(null);

  // -------------------------------
  // Fetch solicitudes pendientes
  // -------------------------------
  const fetchTabla = useCallback(async () => {
    if (!user) return;
    setLoadingTabla(true);
    setErrorTabla(null);
    try {
      const token = localStorage.getItem("access_token");
      const { data } = await api.get("/boleta/solicitudes/pendientes/", {
        headers: { Authorization: `Bearer ${token}` },
        params: { destinatario_id: user.id, estado: "Pendiente para Atención" },
      });
      setSolicitudesTabla(data);
    } catch (e) {
      console.error(e);
      setErrorTabla("No se pudieron cargar las solicitudes pendientes.");
      if (e?.response?.status === 401) logout();
    } finally {
      setLoadingTabla(false);
    }
  }, [user, logout]);

  // -------------------------------
  // Fetch todas para KPIs y gráficos
  // -------------------------------
  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoadingAll(true);
    setErrorAll(null);
    try {
      const token = localStorage.getItem("access_token");
      const { data } = await api.get("/boleta/solicitudes/pendientes/", {
        headers: { Authorization: `Bearer ${token}` },
        params: { destinatario_id: user.id },
      });
      setSolicitudesAll(data);
    } catch (e) {
      console.error(e);
      setErrorAll("No se pudieron cargar los datos de KPI.");
      if (e?.response?.status === 401) logout();
    } finally {
      setLoadingAll(false);
    }
  }, [user, logout]);

  // -------------------------------
  // Listeners globales
  // -------------------------------
  useEffect(() => {
    const actualizar = () => {
      fetchTabla();
      fetchAll();
    };
    EventBus.on("solicitudEnviada", actualizar);
    EventBus.on("solicitudAtendida", actualizar);
    EventBus.on("solicitudRechazada", actualizar);
    return () => {
      EventBus.off("solicitudEnviada", actualizar);
      EventBus.off("solicitudAtendida", actualizar);
      EventBus.off("solicitudRechazada", actualizar);
    };
  }, [fetchTabla, fetchAll]);

  useEffect(() => {
    fetchTabla();
    fetchAll();
  }, [fetchTabla, fetchAll]);

  // -------------------------------
  // KPIs y gráficos
  // -------------------------------
  const { kpis, serie, estados } = useMemo(() => {
    const solicitudes = solicitudesAll;

    const totalPendientes = solicitudes.filter(s => s.estado === "Pendiente para Atención").length;
    const totalAtendidas = solicitudes.filter(s => s.estado === "Atendido, Pendiente de Liquidación").length;
    const totalRechazadas = solicitudes.filter(s => s.estado === "Rechazado").length;

    const montoPendienteSoles = solicitudes.filter(s => s.estado === "Pendiente para Atención").reduce((acc, s) => acc + (parseFloat(s.total_soles) || 0), 0);
    const montoAtendidoSoles = solicitudes.filter(s => s.estado === "Atendido, Pendiente de Liquidación").reduce((acc, s) => acc + (parseFloat(s.total_soles) || 0), 0);
    const montoRechazadoSoles = solicitudes.filter(s => s.estado === "Rechazado").reduce((acc, s) => acc + (parseFloat(s.total_soles) || 0), 0);

    const byDayMap = new Map();
    solicitudes.forEach(s => {
      if (s.estado === "Pendiente para Atención") {
        const d = new Date(s.fecha);
        const key = d.toLocaleDateString("es-PE");
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
    solicitudes.forEach(s => {
      const est = s.estado || "Sin estado";
      estadoCounts[est] = (estadoCounts[est] || 0) + 1;
    });

    return {
      kpis: {
        totalPendientes,
        totalAtendidas,
        totalRechazadas,
        montoPendienteSoles,
        montoAtendidoSoles,
        montoRechazadoSoles,
      },
      serie: list,
      estados: Object.entries(estadoCounts).map(([name, value]) => ({ name, value })),
    };
  }, [solicitudesAll]);

  // -------------------------------
  // Render principal
  // -------------------------------
  return (
    <div className="p-6 w-full space-y-8 min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-black flex items-center gap-3">
          <ListChecks size={24} />
          Atención de Solicitudes
        </h2>
        <Button
          variant="outline"
          onClick={() => { fetchTabla(); fetchAll(); }}
          className="flex items-center gap-2 px-3 py-2"
        >
          <RefreshCw size={18} /> Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-3 gap-y-4 sm:gap-x-4 sm:gap-y-5 md:gap-x-6 md:gap-y-6 mb-6 w-full justify-items-stretch">
        {[
          { label: "Pendientes", value: kpis.totalPendientes, gradient: "linear-gradient(135deg, #f97316cc, #fb923c99)", icon: Clock },
          { label: "Atendidas", value: kpis.totalAtendidas, gradient: "linear-gradient(135deg,#3b82f6cc,#60a5fa99)", icon: CheckCircle },
          { label: "Rechazadas", value: kpis.totalRechazadas, gradient: "linear-gradient(135deg, #ef4444cc, #f8717199)", icon: XCircle },
          { label: "Monto Pendiente S/.", value: kpis.montoPendienteSoles, gradient: "linear-gradient(135deg, #facc15cc, #fcd34d99)", icon: DollarSign },
          { label: "Monto Atendido S/.", value: kpis.montoAtendidoSoles, gradient: "linear-gradient(135deg, #10b981cc, #34d39999)", icon: DollarSign },
          { label: "Monto Rechazado S/.", value: kpis.montoRechazadoSoles, gradient: "linear-gradient(135deg, #ef4444cc, #f8717199)", icon: DollarSign },
        ].map((kpi) => (
          <div key={kpi.label} className="flex-1 min-w-0">
            <KpiCard
              label={kpi.label}
              value={loadingAll ? 0 : kpi.value}
              icon={kpi.icon}
              gradient={kpi.gradient}
              decimals={isNaN(kpi.value) ? 0 : String(kpi.value).includes(".") ? 2 : 0}
              className="text-xs sm:text-sm md:text-base w-full p-3 sm:p-4"
            />
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full mb-6">
        {/* Evolución de solicitudes */}
        <ChartWrapped
          title="Evolución de solicitudes"
          icon={<FileText size={18} />}
          className="w-full h-64 sm:h-72 md:h-80 xl:h-[28rem]"
          tooltipFormatter={tooltipFormatter}
        >
          <div className="w-full h-full min-h-[220px] sm:min-h-[260px] md:min-h-[300px]">
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
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "none",
                    boxShadow: "0 6px 18px rgba(0,0,0,.12)",
                  }}
                  labelStyle={{ fontWeight: 600 }}
                  formatter={tooltipFormatter}
                />
                <Area
                  type="monotone"
                  dataKey="pendientes"
                  stroke="#2563eb"
                  fill="url(#colorPend)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartWrapped>

        {/* Distribución por estado */}
        <ChartWrapped
          title="Distribución por estado"
          icon={<PieChart size={18} />}
          className="w-full h-64 sm:h-72 md:h-80 xl:h-[28rem]"
          tooltipFormatter={radialTooltipFormatter}
        >
          <div className="flex flex-col lg:flex-row h-full gap-4 items-stretch">
            {/* Gráfico */}
            <div className="flex-1 min-h-[200px] sm:min-h-[240px] md:min-h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="10%" outerRadius="95%" data={estados}>
                  <RadialBar minAngle={10} background clockWise dataKey="value" cornerRadius={8}>
                    {estados.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={STATE_COLORS[entry.name] || "#9ca3af"} />
                    ))}
                  </RadialBar>
                </RadialBarChart>
              </ResponsiveContainer>
            </div>

            {/* Leyenda (opcionalmente ajustable) */}
            <div className="w-full lg:w-40 flex-shrink-0 mt-3 lg:mt-0">
              {estados.map((s, i) => (
                <div
                  key={s.name}
                  className="flex items-center gap-2 text-xs md:text-sm text-gray-700 mb-2"
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      background: STATE_COLORS[s.name] || "#9ca3af",
                      display: "inline-block",
                      borderRadius: 3,
                    }}
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
      <div className="overflow-x-auto">
        <Table
          headers={["N° Solicitud","Solicitante","Tipo","Monto S/.","Monto $","Fecha","Estado","Acciones"]}
          data={solicitudesTabla}
          emptyMessage="No hay solicitudes pendientes por ahora."
          renderRow={(s) => (
            <>
              <td className="px-3 sm:px-4 py-3 font-semibold text-center">{s.numero_solicitud || "-"}</td>
              <td className="px-3 sm:px-4 py-3 text-center">{s.solicitante_nombre || "-"}</td>
              <td className="px-3 sm:px-4 py-3 text-center hidden sm:table-cell">{s.tipo_solicitud || "-"}</td>
              <td className="px-3 sm:px-4 py-3 text-center">S/ {(Number(s.total_soles) || 0).toFixed(2)}</td>
              <td className="px-3 sm:px-4 py-3 text-center">$ {(Number(s.total_dolares) || 0).toFixed(2)}</td>
              <td className="px-3 sm:px-4 py-3 text-center hidden sm:table-cell">{s.fecha ? new Date(s.fecha).toLocaleDateString("es-PE") : "-"}</td>
              <td className="px-3 sm:px-4 py-3 text-center">
                <span className={`text-xs px-2 py-1 rounded-full ${STATE_CLASSES[s.estado] || "bg-gray-100 text-gray-700"}`}>
                  {s.estado || "Sin estado"}
                </span>
              </td>
              <td className="px-3 sm:px-4 py-3 text-center">
                <Button
                  size="sm"
                  fromColor="#a8d8d8"
                  toColor="#81c7c7"
                  hoverFrom="#81c7c7"
                  hoverTo="#5eb0b0"
                  onClick={() => setSelectedId(s.id)}
                  className="flex items-center gap-2 px-3 py-1.5 justify-center"
                >
                  <Eye className="w-4 h-4" /> Revisar
                </Button>
              </td>
            </>
          )}
        />
      </div>

      {/* Modal detalle */}
      {selectedId && (
        <DetalleSolicitudModal
          solicitudId={selectedId}
          onClose={() => setSelectedId(null)}
          onDecided={(msg) => {
            if (msg) toast.success(msg);
            setSelectedId(null);
            fetchTabla();
            fetchAll();
          }}
        />
      )}
    </div>
  );
}
