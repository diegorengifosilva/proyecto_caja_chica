// src/dashboard/atencion_solicitudes/AtencionSolicitudes.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import DetalleSolicitudModal from "./DetalleSolicitudModal";
import { toast } from "react-toastify";
import "tippy.js/dist/tippy.css";
import EventBus from "@/components/EventBus";
import { RefreshCw, DollarSign, ListChecks, Eye, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, YAxis, CartesianGrid, RadialBarChart, RadialBar, Cell, PieChart } from "recharts";
import { STATE_CLASSES, STATE_COLORS } from "@/components/ui/colors";
import KpiCard from "@/components/ui/KpiCard";
import Table from "@/components/ui/table";
import ChartWrapped, { tooltipFormatter, radialTooltipFormatter } from "@/components/ui/ChartWrapped";

export default function AtencionSolicitudes() {
  const { authUser: user, logout } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  // -------------------------------
  // Fetch solicitudes filtrando por destinatario_id y estado
  // -------------------------------
  const fetchSolicitudes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token");
      const { data } = await api.get("/boleta/solicitudes/pendientes/", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          destinatario_id: user.id,
          estado: "Pendiente para Atención",
        },
      });
      setSolicitudes(data);
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar las solicitudes pendientes.");
      if (e?.response?.status === 401) logout();
    } finally {
      setLoading(false);
    }
  }, [user, logout]);

  // -------------------------------
  // Escuchar eventos globales (EventBus)
  // -------------------------------
  useEffect(() => {
    EventBus.on("solicitudEnviada", fetchSolicitudes);
    EventBus.on("solicitudAtendida", fetchSolicitudes);
    EventBus.on("solicitudRechazada", fetchSolicitudes);

    return () => {
      EventBus.off("solicitudEnviada", fetchSolicitudes);
      EventBus.off("solicitudAtendida", fetchSolicitudes);
      EventBus.off("solicitudRechazada", fetchSolicitudes);
    };
  }, [fetchSolicitudes]);

  useEffect(() => {
    fetchSolicitudes();
  }, [fetchSolicitudes]);

  // -------------------------------
  // KPIs y datos gráficos
  // -------------------------------
  const { kpis, serie, estados } = useMemo(() => {
    const totalPendientes = solicitudes.filter(s => s.estado === "Pendiente para Atención").length;
    const totalAtendidas = solicitudes.filter(s => s.estado === "Atendido, Pendiente de Liquidación").length;
    const totalRechazadas = solicitudes.filter(s => s.estado === "Rechazado").length;

    const montoPendienteSoles = solicitudes
      .filter(s => s.estado === "Pendiente para Atención")
      .reduce((acc, s) => acc + (parseFloat(s.total_soles) || 0), 0);
    const montoAtendidoSoles = solicitudes
      .filter(s => s.estado === "Atendido, Pendiente de Liquidación")
      .reduce((acc, s) => acc + (parseFloat(s.total_soles) || 0), 0);
    const montoRechazadoSoles = solicitudes
      .filter(s => s.estado === "Rechazado")
      .reduce((acc, s) => acc + (parseFloat(s.total_soles) || 0), 0);

    // Serie diaria de pendientes últimos 30 días
    const byDayMap = new Map();
    solicitudes.forEach((s) => {
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

    // Conteo por estado
    const estadoCounts = {};
    solicitudes.forEach((s) => {
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
  }, [solicitudes]);

  // -------------------------------
  // Render loading
  // -------------------------------
  if (loading) {
    return (
      <div className="p-6 space-y-6 min-h-screen flex flex-col">
        <div className="h-8 w-2/3 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-72 bg-gray-200 rounded-2xl animate-pulse" />
        <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  // -------------------------------
  // Render error
  // -------------------------------
  if (error) {
    return (
      <div className="p-6 min-h-screen flex flex-col">
        <p className="text-red-500 font-semibold">{error}</p>
      </div>
    );
  }

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
          <button
            onClick={fetchSolicitudes}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
          >
            <RefreshCw size={18} />
          </button>
        </h2>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6 mb-6">
        {[ 
          { label: "Pendientes", value: kpis.totalPendientes, gradient: "linear-gradient(135deg, #f97316cc, #fb923c99)", icon: Clock },
          { label: "Atendidas", value: kpis.totalAtendidas, gradient: "linear-gradient(135deg,#3b82f6cc,#60a5fa99)", icon: CheckCircle },
          { label: "Rechazadas", value: kpis.totalRechazadas, gradient: "linear-gradient(135deg, #ef4444cc, #f8717199)", icon: XCircle },
          { label: "Monto Pendiente S/.", value: kpis.montoPendienteSoles, gradient: "linear-gradient(135deg, #facc15cc, #fcd34d99)", icon: DollarSign },
          { label: "Monto Atendido S/.", value: kpis.montoAtendidoSoles, gradient: "linear-gradient(135deg, #10b981cc, #34d39999)", icon: DollarSign },
          { label: "Monto Rechazado S/.", value: kpis.montoRechazadoSoles, gradient: "linear-gradient(135deg, #ef4444cc, #f8717199)", icon: DollarSign },
        ].map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} decimals={isNaN(kpi.value) ? 0 : String(kpi.value).includes(".") ? 2 : 0} />
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartWrapped title="Evolución de solicitudes" icon={<FileText size={18} />} className="h-80" tooltipFormatter={tooltipFormatter}>
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

        <ChartWrapped title="Distribución por estado" icon={<PieChart size={18} />} className="h-80" tooltipFormatter={radialTooltipFormatter}>
          <div className="flex flex-col lg:flex-row h-full gap-4 items-stretch">
            <div className="flex-1 min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="10%" outerRadius="95%" data={estados}>
                  <RadialBar minAngle={10} background clockWise dataKey="value" cornerRadius={8}>
                    {estados.map((entry, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={STATE_COLORS[entry.name] || "#9ca3af"}
                      />
                    ))}
                  </RadialBar>
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ChartWrapped>
      </div>

      {/* Tabla */}
      <Table
        headers={["N° Solicitud","Solicitante","Tipo","Monto S/.","Monto $","Fecha","Estado","Acciones"]}
        data={solicitudes}
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
              <span className={`text-xs px-2 py-1 rounded-full ${STATE_CLASSES[s.estado] || "bg-gray-100 text-gray-700"}`}>{s.estado || "Sin estado"}</span>
            </td>
            <td className="px-3 sm:px-4 py-3 text-center">
              <button
                className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg shadow-md flex items-center gap-2 justify-center"
                onClick={() => setSelectedId(s.id)}
              >
                <Eye size={16} /> Revisar
              </button>
            </td>
          </>
        )}
      />

      {/* Modal detalle */}
      {selectedId && (
        <DetalleSolicitudModal
          solicitudId={selectedId}
          onClose={() => setSelectedId(null)}
          onDecided={(msg) => {
            if (msg) toast.success(msg);
            setSelectedId(null);
            fetchSolicitudes();
          }}
        />
      )}
    </div>
  );
}
