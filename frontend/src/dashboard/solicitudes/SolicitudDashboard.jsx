// src/dashboard/solicitudes/SolicitudDashboard.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { FilePlus, ClipboardList, Info, DollarSign, TrendingUp, PieChart, LayoutGrid } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, RadialBarChart, RadialBar, Tooltip, Cell, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import NuevaSolicitud from "./NuevaSolicitud";
import MisSolicitudes from "./MisSolicitudes";
import "tippy.js/dist/tippy.css";
import { STATE_COLORS, TYPE_COLORS } from "@/components/ui/colors";
import KpiCard from "@/components/ui/KpiCard";
import ChartWrapped, { tooltipFormatter, radialTooltipFormatter } from "@/components/ui/ChartWrapped";
import EventBus from "@/components/EventBus";

const STATE_COLOR_VALUES = Object.values(STATE_COLORS);
const TYPE_COLOR_VALUES = Object.values(TYPE_COLORS);

function nombresMesesLargos() {
  return Array.from({ length: 12 }, (_, i) =>
    new Date(0, i).toLocaleString("es-PE", { month: "long" })
  );
}

export default function SolicitudDashboard() {
  const { authUser: user } = useAuth();
  const meses = nombresMesesLargos();

  const defaultStats = {
    total: 0,
    montoTotalSoles: 0,
    montoTotalDolares: 0,
    promedioSoles: 0,
    promedioDolares: 0,
    chartAreaMes: meses.map((m) => ({ mes: m.charAt(0).toUpperCase() + m.slice(1), solicitudes: 0 })),
    chartRadialEstado: Object.keys(STATE_COLORS).map((name) => ({ name, value: 0 })),
    chartTreemapTipo: Object.keys(TYPE_COLORS).map((name) => ({ name, value: 0 })),
  };

  const [stats, setStats] = useState(defaultStats);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState(null);
  const [openModal, setOpenModal] = useState(null);
  const [openMisSolicitudes, setOpenMisSolicitudes] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("Sesión expirada, inicia sesión nuevamente.");
      return;
    }

    try {
      setLoadingStats(true);
      setError(null);

      const res = await api.get("/boleta/solicitudes/dashboard/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const incoming = res.data || {};

      const chartArea =
        incoming.chartAreaMes && incoming.chartAreaMes.length === 12
          ? incoming.chartAreaMes.map((r, i) => ({
              mes: meses[i].charAt(0).toUpperCase() + meses[i].slice(1),
              solicitudes: r.solicitudes ?? r.value ?? 0,
            }))
          : defaultStats.chartAreaMes;

      const radialFromBackend =
        incoming.chartRadialEstado && incoming.chartRadialEstado.length
          ? Object.keys(STATE_COLORS).map((name) => {
              const found = (incoming.chartRadialEstado || []).find(
                (e) => String(e.name).toLowerCase().includes(String(name).toLowerCase())
              );
              return { name, value: found ? Number(found.value || 0) : 0 };
            })
          : defaultStats.chartRadialEstado;

      let tipos = [];
      if (incoming.chartTreemapTipo && incoming.chartTreemapTipo.length) {
        tipos = incoming.chartTreemapTipo.map((t) => ({ name: t.name, value: Number(t.value || 0) }));
        Object.keys(TYPE_COLORS).forEach((k) => {
          if (!tipos.find((x) => String(x.name).toLowerCase() === k.toLowerCase())) {
            tipos.push({ name: k, value: 0 });
          }
        });
      } else {
        tipos = defaultStats.chartTreemapTipo;
      }

      setStats((s) => ({
        ...s,
        ...incoming,
        chartAreaMes: chartArea,
        chartRadialEstado: radialFromBackend,
        chartTreemapTipo: tipos,
      }));
    } catch (e) {
      console.error("Error al cargar datos", e);
      setError(e.message || "No se pudieron cargar los datos.");
      setStats(defaultStats);
    } finally {
      setLoadingStats(false);
    }
  };

  // -------------------------
  // Escucha eventos del EventBus
  useEffect(() => {
    fetchData();

    const unsubscribeCreated = EventBus.on("solicitudCreada", () => fetchData());
    const unsubscribeEnviada = EventBus.on("solicitudEnviada", () => fetchData());

    return () => {
      unsubscribeCreated();
      unsubscribeEnviada();
    };
  }, [user]);
  // -------------------------

  if (!user || loadingStats) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-1/3 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-gray-200 h-24 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) return <p className="text-red-500 font-semibold p-6">{error}</p>;

  const kpis = [
    { label: "Total Solicitudes", value: stats.total ?? 0, icon: ClipboardList, gradient: "linear-gradient(135deg,#3b82f6cc,#60a5fa99)", tooltip: "Número total de solicitudes registradas." },
    { label: "Monto Total S/.", value: parseFloat(stats.montoTotalSoles ?? 0), icon: DollarSign, gradient: "linear-gradient(135deg,#0ea5e9cc,#60a5fa99)", tooltip: "Suma total en soles." },
    { label: "Monto Total $", value: parseFloat(stats.montoTotalDolares ?? 0), icon: DollarSign, gradient: "linear-gradient(135deg,#7c3aedcc,#a78bfa99)", tooltip: "Suma total en dólares." },
    { label: "Promedio S/.", value: parseFloat(stats.promedioSoles ?? 0), icon: Info, gradient: "linear-gradient(135deg,#14b8a6cc,#34d39999)", tooltip: "Promedio por solicitud en soles." },
    { label: "Promedio $", value: parseFloat(stats.promedioDolares ?? 0), icon: Info, gradient: "linear-gradient(135deg,#f59e0bcc,#fbbf24aa)", tooltip: "Promedio por solicitud en dólares." },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col p-4 sm:p-6 bg-gray-50 overflow-auto">
      {/* Título */}
      <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800 mb-6">
        <FilePlus className="w-7 h-7 text-gray-800" /> Solicitud de Gasto
      </h2>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mb-6">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            gradient={kpi.gradient}
            tooltip={kpi.tooltip}
            decimals={Number.isInteger(kpi.value) ? 0 : 2}
          />
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Estados de Solicitudes */}
        <ChartWrapped
          title="Estados de Solicitudes"
          icon={<PieChart className="w-5 h-5 text-gray-700" />}
          subtitle="Última actualización"
          className="h-[350px] w-[550px]"
        >
          <div className="flex flex-col lg:flex-row gap-4 h-full items-stretch">
            {/* Gráfico */}
            <div className="flex-1 min-h-[220px]">
              <ResponsiveContainer width="100%" height={260}>
                <RadialBarChart innerRadius="10%" outerRadius="95%" data={stats.chartRadialEstado}>
                  <RadialBar minAngle={10} background clockWise dataKey="value" cornerRadius={8}>
                    {stats.chartRadialEstado.map((entry, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={STATE_COLOR_VALUES[i % STATE_COLOR_VALUES.length]}
                      />
                    ))}
                  </RadialBar>
                  <Tooltip formatter={radialTooltipFormatter} wrapperStyle={{ outline: "none" }} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>

            {/* Leyenda */}
            <div className="w-full lg:w-48 flex-shrink-0">
              {stats.chartRadialEstado.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      background: STATE_COLOR_VALUES[i % STATE_COLOR_VALUES.length],
                      display: "inline-block",
                      borderRadius: 3,
                    }}
                  />
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs text-gray-500 ml-2">({s.value})</span>
                </div>
              ))}
            </div>
          </div>
        </ChartWrapped>

        {/* Tipos de Solicitud */}
        <ChartWrapped
          title="Tipos de Solicitudes"
          icon={<LayoutGrid className="w-5 h-5 text-gray-700" />}
          className="h-[350px] w-[550px]"
        >
          <div className="flex flex-col lg:flex-row gap-4 h-full items-stretch">
            {/* Gráfico */}
            <div className="flex-1 min-h-[220px]">
              <ResponsiveContainer width="100%" height={260}>
                <RadialBarChart innerRadius="10%" outerRadius="95%" data={stats.chartTreemapTipo}>
                  <RadialBar minAngle={10} background clockWise dataKey="value" cornerRadius={8}>
                    {stats.chartTreemapTipo.map((entry, i) => (
                      <Cell
                        key={`cell-type-${i}`}
                        fill={TYPE_COLOR_VALUES[i % TYPE_COLOR_VALUES.length] || "#334155"}
                      />
                    ))}
                  </RadialBar>
                  <Tooltip formatter={radialTooltipFormatter} wrapperStyle={{ outline: "none" }} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>

            {/* Leyenda */}
            <div className="w-full lg:w-48 flex-shrink-0">
              {stats.chartTreemapTipo.map((t, i) => (
                <div key={t.name} className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      background: TYPE_COLOR_VALUES[i % TYPE_COLOR_VALUES.length] || "#334155",
                      display: "inline-block",
                      borderRadius: 3,
                    }}
                  />
                  <span className="font-medium">{t.name}</span>
                  <span className="text-xs text-gray-500 ml-2">({t.value})</span>
                </div>
              ))}
            </div>
          </div>
        </ChartWrapped>
      </div>

      {/* Evolución Mensual */}
      <div className="grid grid-cols-1 mt-6">
        <ChartWrapped
          title="Evolución Mensual"
          icon={<TrendingUp className="w-5 h-5 text-gray-700" />}
          className="h-[420px]"
          tooltipFormatter={tooltipFormatter}
        >
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={stats.chartAreaMes}>
              <defs>
                <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="mes" stroke="#6b7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6b7280" domain={[0, "dataMax + 1"]} allowDecimals={false} />
              <Tooltip wrapperStyle={{ outline: "none" }} />
              <Area
                type="monotone"
                dataKey="solicitudes"
                stroke="#3b82f6"
                fill="url(#colorArea)"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartWrapped>
      </div>

      {/* Botones */}
      <div className="flex flex-wrap gap-4 mt-6">
        {/* Nueva Solicitud */}
        <Button
          onClick={() => setOpenModal("nueva")}
          className="bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white text-sm px-4 py-2 rounded-lg shadow-md transition flex items-center gap-2 justify-center"
        >
          <FilePlus className="w-5 h-5" /> Nueva Solicitud
        </Button>

        {/* Mis Solicitudes */}
        <Button
          onClick={() => setOpenMisSolicitudes(true)}
          className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white text-sm px-4 py-2 rounded-lg shadow-md transition flex items-center gap-2 justify-center"
        >
          <ClipboardList className="w-5 h-5" /> Mis Solicitudes
        </Button>
      </div>

      {/* Modales */}
      <NuevaSolicitud
        open={openModal === "nueva"}
        onClose={() => setOpenModal(null)}
        onCreated={fetchData}
      />

      <MisSolicitudes
        open={openMisSolicitudes}
        onClose={() => setOpenMisSolicitudes(false)}
        onRefresh={fetchData}
      />
    </div>
  );
}
