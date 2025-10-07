// src/dashboard/Layout/DashboardHome.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { 
  PieChart, 
  ClipboardList, 
  FileText, 
  CheckCircle2, 
  FilePlus, 
  BarChart,
  WalletMinimal
} from "lucide-react";
import { 
  ResponsiveContainer, 
  PieChart as RePieChart, 
  Pie, 
  Cell, 
  RadialBarChart, 
  RadialBar, 
  Tooltip as RechartsTooltip 
} from "recharts";
import { useNavigate } from "react-router-dom";

import KpiCard from "@/components/ui/KpiCard";
import { STATE_COLORS, TYPE_COLORS } from "@/components/ui/colors";
import ChartWrapped, { tooltipFormatter, radialTooltipFormatter } from "@/components/ui/ChartWrapped";
import { Button } from "@/components/ui/button";

const KPI_ANIM = {
  hidden: { opacity: 0, y: 8 },
  visible: (i = 1) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.45, ease: "easeOut" } })
};

const colorMap = {
  blue: {
    ring: "focus:ring-blue-400",
    bg50: "bg-blue-50",
    icon: "text-blue-600",
    hoverFrom: "from-blue-400",
    hoverTo: "to-blue-200"
  },
  emerald: {
    ring: "focus:ring-emerald-400",
    bg50: "bg-emerald-50",
    icon: "text-emerald-600",
    hoverFrom: "from-emerald-400",
    hoverTo: "to-emerald-200"
  },
  indigo: {
    ring: "focus:ring-indigo-400",
    bg50: "bg-indigo-50",
    icon: "text-indigo-600",
    hoverFrom: "from-indigo-400",
    hoverTo: "to-indigo-200"
  }
};

export default function DashboardHome() {
  const { authUser: user } = useAuth();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const getSaludo = () => {
    const hora = new Date().getHours();
    if (hora < 12) return "Buenos días";
    if (hora < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  const formattedDate = () => {
    return new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  };

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        const response = await api.get("/dashboard/home-stats/");
        if (mounted) setStats(response.data.stats || {});
      } catch (error) {
        console.error("Error cargando estadísticas del Dashboard Home:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchStats();
    return () => { mounted = false; };
  }, []);

  const kpis = [
    { label: "Solicitudes Pendientes", value: stats.solicitudesPendientes ?? 0, icon: ClipboardList, gradient: "linear-gradient(135deg,#f97316cc,#fb923c99)", tooltip: "Solicitudes que aún no han sido atendidas o aprobadas." },
    { label: "Liquidaciones Pendientes", value: stats.liquidacionesPendientes ?? 0, icon: FileText, gradient: "linear-gradient(135deg,#0ea5e9cc,#38bdf899)", tooltip: "Solicitudes en estado pendiente de liquidación o aprobación." },
    { label: "Liquidaciones Aprobadas (Mes)", value: stats.liquidacionesAprobadasMes ?? 0, icon: CheckCircle2, gradient: "linear-gradient(135deg,#16a34acc,#4ade8099)", tooltip: "Cantidad de liquidaciones aprobadas este mes." },
    { label: "Monto Total Solicitado (Mes)", value: parseFloat(stats.montoTotalSolicitadoMes ?? 0), icon: WalletMinimal, gradient: "linear-gradient(135deg,#7c3aedcc,#a78bfa99)", tooltip: "Monto total solicitado en caja chica este mes." },
  ];

  const handleNavegar = (url) => navigate(url);

  const datosTiposSolicitud = [
    { name: "Viáticos", value: 120 },
    { name: "Movilidad", value: 80 },
    { name: "Compras", value: 60 },
    { name: "Otros gastos", value: 40 },
  ];

  const datosEstadosSolicitud = [
    { name: "Pendiente de Envío", value: 15 },
    { name: "Pendiente para Atención", value: 10 },
    { name: "Atendido, Pendiente de Liquidación", value: 8 },
    { name: "Liquidación enviada para Aprobación", value: 12 },
    { name: "Liquidación Aprobada", value: 20 },
    { name: "Rechazado", value: 5 },
  ];

  // Access buttons config (uses colorMap keys)
  const quickButtons = [
    { label: "Nueva Solicitud", icon: FilePlus, url: "/dashboard/liquidaciones/solicitud/nueva", color: "blue", desc: "Registra una nueva solicitud de gasto." },
    { label: "Ver Liquidaciones", icon: PieChart, url: "/dashboard/liquidaciones/presentar", color: "emerald", desc: "Consulta el estado de tus liquidaciones." },
    { label: "Reportes", icon: BarChart, url: "/dashboard/reportes", color: "indigo", desc: "Estadísticas y reportes ejecutivos." },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-100 font-sans">
      <div className="flex-1 flex flex-col px-4 sm:px-6 md:px-8 py-4 lg:py-6 max-w-7xl mx-auto">

        {/* --- Top tiny status bar --- */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-gray-500 italic">{formattedDate()}</div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/60 px-3 py-1 rounded-full border border-gray-100 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 block" />
              <span className="text-xs text-gray-600">Sesión activa</span>
            </div>
          </div>
        </div>

        {/* Encabezado principal */}
        <header className="mb-4 sm:mb-6">
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-lg sm:text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
              {getSaludo()},
              <span className="text-gray-900">{user?.nomb_cort_usu ? user.nomb_cort_usu : (user?.nombre ? `${user.nombre} ${user.apellido || ""}` : "Usuario")}</span>
              <span className="text-2xl">👋</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm md:text-base text-gray-600 italic">
              Bienvenido al <span className="font-semibold text-blue-600">Sistema de Liquidaciones</span>. Aquí tienes un resumen.
            </p>
          </motion.div>

          {/* subtle divider */}
          <div className="mt-4 border-t border-gray-100" />
        </header>

        {/* KPIs */}
        <motion.div initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 w-full justify-items-stretch">
          {kpis.map((kpi, idx) => (
            <motion.div
              key={kpi.label}
              custom={idx}
              variants={KPI_ANIM}
              className="flex-1 min-w-0"
            >
              <KpiCard
                label={kpi.label}
                value={loading ? 0 : kpi.value}
                icon={kpi.icon}
                gradient={kpi.gradient}
                tooltip={kpi.tooltip}
                decimals={Number.isInteger(kpi.value) ? 0 : 2}
                className="text-xs sm:text-sm md:text-base w-full p-3 sm:p-4"
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Charts area */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 mb-6 w-full">
          {/* Distribución por tipo de solicitud */}
          <ChartWrapped
            title="Distribución por tipo de solicitud"
            icon={<PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />}
            tooltipFormatter={tooltipFormatter}
            className="flex-1 min-h-[260px] md:min-h-[320px] bg-white/60"
          >
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-full items-stretch">
              <div className="flex-1 min-h-[160px] sm:min-h-[200px] md:min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={datosTiposSolicitud}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      label
                    >
                      {datosTiposSolicitud.map((entry, index) => (
                        <Cell key={index} fill={TYPE_COLORS[entry.name] || "#334155"} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </div>

              {/* Leyenda */}
              <div className="w-full lg:w-44 flex-shrink-0 mt-3 lg:mt-0">
                {datosTiposSolicitud.map((t) => (
                  <div key={t.name} className="flex items-center gap-2 text-[11px] sm:text-xs md:text-sm text-gray-700 mb-2">
                    <span style={{ width: 14, height: 14, background: TYPE_COLORS[t.name] || "#334155", display: "inline-block", borderRadius: 3 }} />
                    <span className="font-medium">{t.name}</span>
                    <span className="text-gray-500 ml-1">({t.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartWrapped>

          {/* Estado de solicitudes */}
          <ChartWrapped
            title="Estado de solicitudes"
            icon={<BarChart className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />}
            tooltipFormatter={radialTooltipFormatter}
            className="flex-1 min-h-[260px] md:min-h-[320px] bg-white/60"
          >
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-full items-stretch">
              <div className="flex-1 min-h-[160px] sm:min-h-[200px] md:min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="95%" barSize={14} data={datosEstadosSolicitud}>
                    <RadialBar minAngle={15} background clockwise dataKey="value" cornerRadius={6}>
                      {datosEstadosSolicitud.map((entry, i) => (
                        <Cell key={i} fill={STATE_COLORS[entry.name] || "#334155"} />
                      ))}
                    </RadialBar>
                    <RechartsTooltip />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>

              {/* Leyenda */}
              <div className="w-full lg:w-44 flex-shrink-0 mt-3 lg:mt-0">
                {datosEstadosSolicitud.map((e) => (
                  <div key={e.name} className="flex items-center gap-2 text-[11px] sm:text-xs md:text-sm text-gray-700 mb-2">
                    <span style={{ width: 14, height: 14, background: STATE_COLORS[e.name] || "#334155", display: "inline-block", borderRadius: 3 }} />
                    <span className="font-medium">{e.name}</span>
                    <span className="text-gray-500 ml-1">({e.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartWrapped>
        </div>

        {/* Quick action cards mejorados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 w-full">
          {quickButtons.map((btn) => {
            const c = colorMap[btn.color] || colorMap.blue;
            return (
              <button
                key={btn.label}
                onClick={() => handleNavegar(btn.url)}
                className={`
                  group relative flex flex-col items-center justify-center rounded-2xl p-6 sm:p-7 md:p-8
                  bg-white border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300
                  transform hover:-translate-y-1 focus:outline-none ${c.ring}
                `}
              >
                {/* Icono dentro del círculo */}
                <div
                  className={`
                    flex items-center justify-center rounded-full p-4 sm:p-5 mb-4
                    ${c.bg50} transition-all duration-500 transform group-hover:scale-110
                  `}
                  style={{ backgroundImage: "none" }}
                >
                  <btn.icon
                    size={typeof window !== "undefined" && window.innerWidth > 768 ? 32 : 28}
                    className={`${c.icon} group-hover:text-white transition-colors duration-500`}
                  />
                </div>

                {/* Texto principal */}
                <h4 className="text-gray-800 font-semibold text-base sm:text-lg md:text-xl text-center leading-snug mb-1 group-hover:text-gray-900 transition-colors duration-300">
                  {btn.label}
                </h4>

                {/* Descripción */}
                <p className="text-gray-500 text-sm sm:text-base md:text-base text-center leading-relaxed group-hover:text-gray-700">
                  {btn.desc}
                </p>

                {/* Efecto sutil hover gradient */}
                <span className={`
                  absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent
                  opacity-10 group-hover:opacity-100 pointer-events-none transition-opacity duration-500
                `} />
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}
