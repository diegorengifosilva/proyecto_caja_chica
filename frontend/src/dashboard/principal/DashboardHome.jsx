// src/dashboard/Layout/DashboardHome.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { 
  DollarSign, 
  PieChart, 
  ClipboardList, 
  FileText, 
  CheckCircle2, 
  FilePlus, 
  BarChart 
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
import KpiCard from "@/components/ui/KpiCard";
import { STATE_COLORS, TYPE_COLORS } from "@/components/ui/colors";
import ChartWrapped, { tooltipFormatter, radialTooltipFormatter } from "@/components/ui/ChartWrapped";

const DashboardHome = () => {
  const { authUser: user } = useAuth();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const getSaludo = () => {
    const hora = new Date().getHours();
    if (hora < 12) return "Buenos días";
    if (hora < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get("/dashboard/home-stats/");
        setStats(response.data.stats || {});
      } catch (error) {
        console.error("Error cargando estadísticas del Dashboard Home:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const kpis = [
    { label: "Solicitudes Pendientes", value: stats.solicitudesPendientes ?? 0, icon: ClipboardList, gradient: "linear-gradient(135deg,#f97316cc,#fb923c99)", tooltip: "Solicitudes que aún no han sido atendidas o aprobadas." },
    { label: "Liquidaciones Pendientes", value: stats.liquidacionesPendientes ?? 0, icon: FileText, gradient: "linear-gradient(135deg,#0ea5e9cc,#38bdf899)", tooltip: "Solicitudes en estado pendiente de liquidación o aprobación." },
    { label: "Liquidaciones Aprobadas (Mes)", value: stats.liquidacionesAprobadasMes ?? 0, icon: CheckCircle2, gradient: "linear-gradient(135deg,#16a34acc,#4ade8099)", tooltip: "Cantidad de liquidaciones aprobadas este mes." },
    { label: "Monto Total Solicitado (Mes)", value: parseFloat(stats.montoTotalSolicitadoMes ?? 0), icon: DollarSign, gradient: "linear-gradient(135deg,#7c3aedcc,#a78bfa99)", tooltip: "Monto total solicitado en caja chica este mes." },
  ];

  const handleNavegar = (url) => alert(`Ir a: ${url}`);

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

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 font-sans">
      <div className="flex-1 flex flex-col px-4 sm:px-6 md:px-8 py-4 lg:py-6">

        {/* Encabezado */}
        <header className="mb-4 sm:mb-6">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-lg sm:text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-2"
          >
            {getSaludo()}, {user?.nombre ? `${user.nombre} ${user.apellido || ""}` : "Usuario"} 👋
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mt-1 text-xs sm:text-sm md:text-base text-gray-600 italic"
          >
            Bienvenido a <span className="font-semibold text-blue-600">V&C</span>. Aquí tienes un resumen de hoy.
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

        {/* Gráficos */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 mb-6 w-full">

          {/* Distribución por tipo de solicitud */}
          <ChartWrapped
            title="Distribución por tipo de solicitud"
            icon={<PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />}
            tooltipFormatter={tooltipFormatter}
            className="flex-1 h-56 sm:h-64 md:h-80 xl:h-[28rem] w-full"
          >
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-full items-stretch">
              <div className="flex-1 min-h-[160px] sm:min-h-[200px] md:min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={datosTiposSolicitud}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="50%"
                      outerRadius="80%"
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
              <div className="w-full lg:w-40 flex-shrink-0 mt-3 lg:mt-0">
                {datosTiposSolicitud.map((t) => (
                  <div key={t.name} className="flex items-center gap-2 text-[10px] sm:text-xs md:text-sm text-gray-700 mb-2">
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
            className="flex-1 h-56 sm:h-64 md:h-80 xl:h-[28rem] w-full"
          >
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-full items-stretch">
              <div className="flex-1 min-h-[160px] sm:min-h-[200px] md:min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="95%" barSize={14} data={datosEstadosSolicitud}>
                    <RadialBar minAngle={15} background clockWise dataKey="value" cornerRadius={6}>
                      {datosEstadosSolicitud.map((entry, i) => (
                        <Cell key={i} fill={STATE_COLORS[entry.name] || "#334155"} />
                      ))}
                    </RadialBar>
                    <RechartsTooltip />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>

              {/* Leyenda */}
              <div className="w-full lg:w-40 flex-shrink-0 mt-3 lg:mt-0">
                {datosEstadosSolicitud.map((e) => (
                  <div key={e.name} className="flex items-center gap-2 text-[10px] sm:text-xs md:text-sm text-gray-700 mb-2">
                    <span style={{ width: 14, height: 14, background: STATE_COLORS[e.name] || "#334155", display: "inline-block", borderRadius: 3 }} />
                    <span className="font-medium">{e.name}</span>
                    <span className="text-gray-500 ml-1">({e.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartWrapped>

        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-6 w-full">
          {[
            { label: "Nueva Solicitud", icon: FilePlus, url: "/nueva-solicitud", bg: "blue", desc: "Registra una nueva solicitud de gasto." },
            { label: "Ver Liquidaciones", icon: PieChart, url: "/liquidaciones", bg: "emerald", desc: "Consulta el estado de tus liquidaciones." },
            { label: "Reportes", icon: BarChart, url: "/reportes", bg: "indigo", desc: "Estadísticas y reportes ejecutivos." },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={() => handleNavegar(btn.url)}
              className={`
                group relative flex flex-col items-center justify-center rounded-2xl p-3 sm:p-4 md:p-5 bg-white
                border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300
                transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-${btn.bg}-400 focus:ring-offset-2
              `}
            >
              {/* Icono con animación */}
              <div className={`
                flex items-center justify-center rounded-full p-2 sm:p-3 md:p-4 mb-2 sm:mb-3
                bg-${btn.bg}-50 group-hover:bg-gradient-to-br group-hover:from-${btn.bg}-400 group-hover:to-${btn.bg}-200
                transition-all duration-500 transform group-hover:scale-105 sm:group-hover:scale-110
              `}>
                <btn.icon size={20 + (window.innerWidth > 768 ? 8 : 0)} className={`text-${btn.bg}-600 group-hover:text-white transition-colors duration-500`} />
              </div>

              {/* Texto principal */}
              <h4 className="text-gray-800 font-semibold text-sm sm:text-base md:text-lg text-center group-hover:text-gray-900 transition-colors duration-300">{btn.label}</h4>

              {/* Descripción */}
              <p className="text-gray-500 text-[10px] sm:text-sm md:text-base text-center mt-1 group-hover:text-gray-700 transition-colors duration-300">{btn.desc}</p>

              {/* Efecto sutil de brillo */}
              <span className={`
                absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent
                opacity-10 group-hover:opacity-100 pointer-events-none transition-opacity duration-500
              `} />
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};

export default DashboardHome;
