// src/dashboard/Layout/DashboardHome.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { BarChart, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, RadialBar, RadialBarChart} from "recharts";
import {
  DollarSign,
  PieChart as PieIcon,
  FileText,
  Info,
  Eye,
  ClipboardList,
  CheckCircle2, FilePlus
} from "lucide-react";
import KpiCard from "@/components/ui/KpiCard";
import Table from "@/components/ui/table";
import { STATE_COLORS, TYPE_COLORS } from "@/components/ui/colors";
import ChartWrapped, { tooltipFormatter, radialTooltipFormatter } from "@/components/ui/ChartWrapped";

const DashboardHome = () => {
  const { authUser: user } = useAuth();

  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [solicitudesRecientes, setSolicitudesRecientes] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [mostrarDetalle, setMostrarDetalle] = useState(null);

  // función para saludo dinámico
  const getSaludo = () => {
    const hora = new Date().getHours();
    if (hora < 12) return "Buenos días";
    if (hora < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const formatoMoneda = (valor) =>
    valor.toLocaleString("es-PE", { style: "currency", currency: "PEN" });

  // Cargar datos reales del backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get("/dashboard/home-stats/");
        setStats(response.data.stats || {});
        setSolicitudesRecientes(response.data.solicitudesRecientes || []);
        setAlertas(response.data.alertas || []);
      } catch (error) {
        console.error("Error cargando estadísticas del Dashboard Home:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // KPIs
  const kpis = [
    {
      label: "Solicitudes Pendientes",
      value: stats.solicitudesPendientes ?? 0,
      icon: ClipboardList,
      gradient: "linear-gradient(135deg,#f97316cc,#fb923c99)",
      tooltip: "Solicitudes que aún no han sido atendidas o aprobadas.",
    },
    {
      label: "Liquidaciones Pendientes",
      value: stats.liquidacionesPendientes ?? 0,
      icon: FileText,
      gradient: "linear-gradient(135deg,#0ea5e9cc,#38bdf899)",
      tooltip: "Solicitudes en estado pendiente de liquidación o aprobación.",
    },
    {
      label: "Liquidaciones Aprobadas (Mes)",
      value: stats.liquidacionesAprobadasMes ?? 0,
      icon: CheckCircle2,
      gradient: "linear-gradient(135deg,#16a34acc,#4ade8099)",
      tooltip: "Cantidad de liquidaciones aprobadas este mes.",
    },
    {
      label: "Monto Total Solicitado (Mes)",
      value: parseFloat(stats.montoTotalSolicitadoMes ?? 0),
      icon: DollarSign,
      gradient: "linear-gradient(135deg,#7c3aedcc,#a78bfa99)",
      tooltip: "Monto total solicitado en caja chica este mes.",
    },
  ];

  const handleNavegar = (url) => {
    alert(`Ir a: ${url}`);
  };

  // ⚡ Ejemplos temporales
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
    <div className="p-6 bg-gray-100 min-h-screen font-sans flex flex-col lg:flex-row gap-6">
      {/* Contenido principal */}
      <div className="flex-1">
        {/* Encabezado */}
        <header className="mb-6">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl font-bold text-gray-900 flex items-center gap-2"
          >
            {getSaludo()},{" "}
            {user?.nombre ? `${user.nombre} ${user.apellido || ""}` : "Usuario"} 👋
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mt-1 text-lg text-gray-600 italic"
          >
            Bienvenido a{" "}
            <span className="font-semibold text-blue-600">PMInsight</span>. Aquí
            tienes un resumen de hoy.
          </motion.p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
          {kpis.map((kpi) => (
            <KpiCard
              key={kpi.label}
              label={kpi.label}
              value={loading ? 0 : kpi.value}
              icon={kpi.icon}
              gradient={kpi.gradient}
              tooltip={kpi.tooltip}
              decimals={Number.isInteger(kpi.value) ? 0 : 2}
            />
          ))}
        </div>

        {/* Gráficos */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Distribución por tipo de solicitud */}
          <ChartWrapped
            title="Distribución por tipo de solicitud"
            icon={<PieIcon size={18} />}
            legend={datosTiposSolicitud.map((t) => ({
              name: t.name,
              value: t.value,
              color: TYPE_COLORS[t.name],
            }))}
            tooltipFormatter={tooltipFormatter}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={datosTiposSolicitud}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  label
                >
                  {datosTiposSolicitud.map((entry, index) => (
                    <Cell key={index} fill={TYPE_COLORS[entry.name]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartWrapped>

          {/* Estado de solicitudes */}
          <ChartWrapped
            title="Estado de solicitudes"
            icon={<BarChart size={18} />}
            legend={datosEstadosSolicitud.map((e) => ({
              name: e.name,
              value: e.value,
              color: STATE_COLORS[e.name],
            }))}
            tooltipFormatter={radialTooltipFormatter}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="20%"
                outerRadius="90%"
                barSize={15}
                data={datosEstadosSolicitud}
              >
                <RadialBar
                  minAngle={15}
                  label={{ position: "insideStart", fill: "#fff" }}
                  background
                  dataKey="value"
                />
                <Legend
                  iconSize={10}
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                />
                <RechartsTooltip />
              </RadialBarChart>
            </ResponsiveContainer>
          </ChartWrapped>
        </section>

        {/* Tabla Movimientos Recientes */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <FileText size={18} />
              Movimientos recientes
            </h3>
            <div className="text-sm text-gray-500">
              Total: {solicitudesRecientes.length}
            </div>
          </div>

          <Table
            headers={["N°", "Fecha", "Solicitante", "Estado", "Acciones"]}
            data={solicitudesRecientes}
            emptyMessage="No hay movimientos recientes."
            rowsPerPage={5}
            renderRow={(s) => [
              <span className="font-semibold">{s.nro}</span>,
              s.fecha,
              s.solicitante,
              <span
                className={`font-bold ${
                  s.estado === "Aprobada"
                    ? "text-green-600"
                    : s.estado === "Pendiente"
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {s.estado}
              </span>,
              <button
                className="bg-gradient-to-r from-blue-400 to-blue-600 text-white text-sm px-4 py-1.5 rounded-lg shadow-md transition flex items-center gap-2 justify-center"
                onClick={() => setMostrarDetalle(s.nro)}
              >
                <Eye size={16} />
                Revisar
              </button>,
            ]}
          />
        </section>
      
      {/* Accesos Rápidos */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
          <div
            onClick={() => handleNavegar("/nueva-solicitud")}
            className="group bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl shadow-md p-6 flex flex-col items-center justify-center cursor-pointer transition transform hover:scale-105 hover:shadow-lg"
          >
            <div className="bg-white/20 rounded-full p-3 mb-3 group-hover:bg-white/30 transition">
              <FilePlus size={28} />
            </div>
            <h4 className="font-semibold text-lg">Nueva Solicitud</h4>
            <p className="text-sm opacity-80 text-center mt-1">
              Registra una nueva solicitud de gasto.
            </p>
          </div>

          <div
            onClick={() => handleNavegar("/liquidaciones")}
            className="group bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-2xl shadow-md p-6 flex flex-col items-center justify-center cursor-pointer transition transform hover:scale-105 hover:shadow-lg"
          >
            <div className="bg-white/20 rounded-full p-3 mb-3 group-hover:bg-white/30 transition">
              <PieChart size={28} />
            </div>
            <h4 className="font-semibold text-lg">Ver Liquidaciones</h4>
            <p className="text-sm opacity-80 text-center mt-1">
              Consulta el estado de tus liquidaciones.
            </p>
          </div>

          <div
            onClick={() => handleNavegar("/reportes")}
            className="group bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-2xl shadow-md p-6 flex flex-col items-center justify-center cursor-pointer transition transform hover:scale-105 hover:shadow-lg"
          >
            <div className="bg-white/20 rounded-full p-3 mb-3 group-hover:bg-white/30 transition">
              <BarChart size={28} />
            </div>
            <h4 className="font-semibold text-lg">Reportes</h4>
            <p className="text-sm opacity-80 text-center mt-1">
              Estadísticas y reportes ejecutivos.
            </p>
          </div>
        </section>
      </div>

      {/* Ventana flotante de alertas */}
      {alertas.length > 0 && (
        <div className="fixed top-20 right-6 z-50 w-80 animate-slideIn">
          <div className="bg-white shadow-xl rounded-2xl border border-red-200 overflow-hidden">
            <div className="flex items-center justify-between bg-red-500 text-white px-4 py-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                ⚠️ Alertas Activas
              </h3>
              <button
                onClick={() => setAlertas([])}
                className="hover:text-gray-200 transition"
              >
                ✖
              </button>
            </div>
            <ul className="p-4 space-y-2 text-gray-700 text-sm max-h-64 overflow-y-auto">
              {alertas.map((alerta, i) => (
                <li
                  key={i}
                  className="bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                >
                  {alerta}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Modal detalle */}
      {mostrarDetalle && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-lg max-w-sm w-full">
            <h4 className="text-lg font-bold mb-2">
              Detalle Solicitud #{mostrarDetalle}
            </h4>
            <p className="mb-4">Aquí irían los datos detallados de la solicitud.</p>
            <button
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              onClick={() => setMostrarDetalle(null)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHome;