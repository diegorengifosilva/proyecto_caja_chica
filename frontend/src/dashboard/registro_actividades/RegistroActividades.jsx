// src/dashboard/registro_actividades/RegistroActividades.jsx
import React, { useEffect, useState, useMemo } from "react";
import api from "@/services/api";
import CountUp from "react-countup";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { DEV_FAKE_DATA } from "@/config/dev";
import FiltroActividades from "./FiltroActividades";
import TablaActividades from "./TablaActividades";
import ActividadDetalleModal from "./ActividadDetalleModal";
import {
  ClipboardList,
  Users,
  FileText,
  Clock,
  TrendingUp,
  Percent,
  PieChart as PieChartIcon,
  BarChart2,
  Activity,
} from "lucide-react";

// 🎨 Colores personalizados para KPIs y gráficos
const KPI_COLORS = {
  total: "#3b82f6", // azul
  usuarios: "#22c55e", // verde
  promedio: "#8b5cf6", // morado
  frecuente: "#f59e0b", // amarillo
  ultima: "#6366f1", // indigo
  eficiencia: "#10b981", // esmeralda
};

// 🎨 Colores personalizados para estados (igual que en Guias de Salida)
const ESTADO_COLORS = {
  pendiente: "bg-yellow-200 text-yellow-800",
  enviada: "bg-blue-200 text-blue-800",
  recibida: "bg-green-200 text-green-800",
  aprobado: "bg-green-200 text-green-800",
  rechazado: "bg-red-200 text-red-800",
  devolucion: "bg-orange-200 text-orange-800",
};

const COLORS = {
  aprobado: "#22c55e",
  rechazado: "#ef4444",
  devolucion: "#f97316",
  pendiente: "#f59e0b",
  azul: "#3b82f6",
  morado: "#a78bfa",
};

// ✨ Estilos de hover para zoom (como en Caja Chica)
const hoverCardStyle = 
  "rounded-xl p-4 shadow-md transform transition-transform hover:scale-[1.02] text-center";
const hoverRowStyle =
  "transition-all duration-300 hover:scale-[1.01] hover:shadow-md";

export default function RegistroActividades() {
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal detalle
  const [modalOpen, setModalOpen] = useState(false);
  const [actividadSeleccionada, setActividadSeleccionada] = useState(null);

  // Filtros
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroFechaInicio, setFiltroFechaInicio] = useState("");
  const [filtroFechaFin, setFiltroFechaFin] = useState("");

  // Ordenamiento
  const [sortKey, setSortKey] = useState("fecha");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    cargarActividades();
  }, []);

  const cargarActividades = async () => {
    setLoading(true);
    setError(null);
    try {
      let data = [];
      if (DEV_FAKE_DATA) {
        data = [
          {
            id: 1,
            fecha: "2025-08-14 | 08:30:00",
            usuario: "Juan",
            tipo: "Liquidaciones",
            accion: "Aprobado",
            descripcion: "Liquidación aprobada correctamente",
          },
          {
            id: 2,
            fecha: "2025-08-14 | 09:15:00",
            usuario: "Maria",
            tipo: "Solicitudes",
            accion: "Pendiente",
            descripcion: "Solicitud de reembolso creada",
          },
          {
            id: 3,
            fecha: "2025-08-14 | 10:45:00",
            usuario: "Carlos",
            tipo: "Liquidaciones",
            accion: "Rechazado",
            descripcion: "Liquidación con errores",
          },
          {
            id: 4,
            fecha: "2025-08-14 | 11:30:00",
            usuario: "Ana",
            tipo: "Solicitudes",
            accion: "Devolución",
            descripcion: "Solicitud devuelta para corrección",
          },
        ];
      } else {
        const res = await api.get("boleta/actividades/");
        data = res.data ?? [];
      }
      setActividades(data);
    } catch (err) {
      console.error(err);
      setError("Error cargando actividades.");
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (actividad) => {
    setActividadSeleccionada(actividad);
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setActividadSeleccionada(null);
  };

  const actividadesFiltradas = useMemo(() => {
    return actividades
      .filter((act) => {
        const cumpleUsuario = filtroUsuario
          ? act.usuario?.toLowerCase().includes(filtroUsuario.toLowerCase())
          : true;
        const cumpleTipo = filtroTipo
          ? act.tipo?.toLowerCase().includes(filtroTipo.toLowerCase())
          : true;
        const fechaActividad = new Date(act.fecha);
        const cumpleFechaInicio = filtroFechaInicio
          ? fechaActividad >= new Date(filtroFechaInicio)
          : true;
        const cumpleFechaFin = filtroFechaFin
          ? fechaActividad <= new Date(filtroFechaFin)
          : true;
        return cumpleUsuario && cumpleTipo && cumpleFechaInicio && cumpleFechaFin;
      })
      .sort((a, b) => {
        if (sortKey === "fecha") {
          return sortOrder === "asc"
            ? new Date(a.fecha) - new Date(b.fecha)
            : new Date(b.fecha) - new Date(a.fecha);
        } else {
          const valA = (a[sortKey] ?? "").toString().toLowerCase();
          const valB = (b[sortKey] ?? "").toString().toLowerCase();
          if (valA < valB) return sortOrder === "asc" ? -1 : 1;
          if (valA > valB) return sortOrder === "asc" ? 1 : -1;
          return 0;
        }
      });
  }, [actividades, filtroUsuario, filtroTipo, filtroFechaInicio, filtroFechaFin, sortKey, sortOrder]);

  // 📊 KPIs mejorados
  const totalActividades = actividadesFiltradas.length;
  const usuariosActivos = new Set(actividadesFiltradas.map((a) => a.usuario)).size;
  const promedioActividades =
    usuariosActivos > 0 ? (totalActividades / usuariosActivos).toFixed(1) : 0;
  const accionesConteo = actividadesFiltradas.reduce((acc, act) => {
    acc[act.accion] = (acc[act.accion] || 0) + 1;
    return acc;
  }, {});
  const accionMasFrecuente =
    Object.entries(accionesConteo).sort((a, b) => b[1] - a[1])[0] || [];
  const ultimaActividad =
    actividadesFiltradas.length > 0 ? actividadesFiltradas[0].fecha : "Sin registros";
  const eficiencia = accionesConteo["Aprobado"]
    ? ((accionesConteo["Aprobado"] / totalActividades) * 100).toFixed(1)
    : 0;

  // Datos gráficos
  const dataPie = Object.entries(accionesConteo).map(([name, value]) => ({ name, value }));
  const dataBar = Object.entries(accionesConteo).map(([name, value]) => ({ name, count: value }));
  const dataLine = Object.values(
    actividadesFiltradas.reduce((acc, act) => {
      const fecha = new Date(act.fecha).toLocaleDateString();
      acc[fecha] = (acc[fecha] || 0) + 1;
      return acc;
    }, {})
  ).map((count, idx) => ({
    fecha: Object.keys(accionesConteo)[idx],
    count,
  }));

  const toggleSort = (key) => {
    if (sortKey === key) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  return (
    <div className="p-6">
      {/* Título */}
      <h1 className={`text-2xl font-bold mb-6 flex items-center gap-2`}>
        <ClipboardList className="w-7 h-7 text-gray-800" />
        Registro de Actividades
      </h1>

      {/* 🔑 KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 text-center mb-8">
        {[
          { label: "Total Actividades", value: totalActividades, color: KPI_COLORS.total, icon: Activity },
          { label: "Usuarios Activos", value: usuariosActivos, color: KPI_COLORS.usuarios, icon: Users },
          { label: "Promedio por Usuario", value: promedioActividades, color: KPI_COLORS.promedio, icon: FileText },
          {
            label: "Acción más Frecuente",
            value: accionMasFrecuente.length > 0 ? `${accionMasFrecuente[0]} (${accionMasFrecuente[1]})` : "N/A",
            color: KPI_COLORS.frecuente,
            icon: TrendingUp,
          },
          { label: "Última Actividad", value: ultimaActividad, color: KPI_COLORS.ultima, icon: Clock },
          { label: "% Aprobaciones", value: eficiencia + "%", color: KPI_COLORS.eficiencia, icon: Percent },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className={`flex flex-col items-center justify-center text-white p-4 rounded-xl cursor-pointer ${hoverCardStyle}`}
            style={{ background: `linear-gradient(135deg, ${kpi.color}cc, ${kpi.color}99)` }}
          >
            <kpi.icon className="w-6 h-6 mb-2 opacity-90" />
            <p className="text-sm">{kpi.label}</p>
            <p className="text-2xl font-bold">
              {typeof kpi.value === "number" ? <CountUp end={kpi.value} duration={1.2} separator="," /> : kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* 📊 Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Pie Chart */}
        <div className={`bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md ${hoverCardStyle}`}>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <PieChartIcon className="w-5 h-5 text-blue-500" /> Distribución de Acciones
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={dataPie} dataKey="value" nameKey="name" outerRadius={110} label>
                {dataPie.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[entry.name.toLowerCase()] || COLORS.azul}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#1f2937", color: "#fff", borderRadius: "8px" }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className={`bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md ${hoverCardStyle}`}>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <BarChart2 className="w-5 h-5 text-green-600" /> Cantidad por Acción
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dataBar} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip contentStyle={{ background: "#1f2937", color: "#fff", borderRadius: "8px" }} />
              <Legend />
              {dataBar.map((d, idx) => (
                <Bar
                  key={idx}
                  dataKey="count"
                  fill={COLORS[d.name.toLowerCase()] || COLORS.azul}
                  name={d.name}
                  radius={[6, 6, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart */}
        <div className={`bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md ${hoverCardStyle}`}>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-purple-600" /> Evolución en el Tiempo
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dataLine}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="fecha" />
              <YAxis />
              <Tooltip contentStyle={{ background: "#1f2937", color: "#fff", borderRadius: "8px" }} />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke={COLORS.morado}
                strokeWidth={3}
                dot={{ r: 5, strokeWidth: 2, fill: COLORS.morado }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4">
        <FiltroActividades
          filtroUsuario={filtroUsuario}
          setFiltroUsuario={setFiltroUsuario}
          filtroTipo={filtroTipo}
          setFiltroTipo={setFiltroTipo}
          filtroFechaInicio={filtroFechaInicio}
          setFiltroFechaInicio={setFiltroFechaInicio}
          filtroFechaFin={filtroFechaFin}
          setFiltroFechaFin={setFiltroFechaFin}
        />
      </div>

      {/* Error / Loading */}
      {error && (
        <div className={`mb-4 p-3 bg-red-100 text-red-700 rounded ${hoverRowStyle}`}>{error}</div>
      )}
      {loading && <p>Cargando actividades...</p>}

      {/* Tabla */}
      {!loading && (
        <div className={hoverCardStyle}>
          <TablaActividades
            actividades={actividadesFiltradas}
            abrirModal={abrirModal}
          />
        </div>
      )}

      {/* Modal detalle */}
      {modalOpen && actividadSeleccionada && (
        <ActividadDetalleModal actividad={actividadSeleccionada} cerrarModal={cerrarModal} />
      )}
    </div>
  );
}
