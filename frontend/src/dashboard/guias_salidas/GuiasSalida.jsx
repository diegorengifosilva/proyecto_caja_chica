// src/dashboard/guias_salida/GuiasSalida.jsx
import React, { useState, useEffect, useMemo } from "react";
import api from "@/services/api";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import { DEV_FAKE_DATA } from "@/config/dev";
import {
  FileText, User, Truck, Calendar, Filter, PlusCircle,
  ClipboardList, PieChart as PieChartIcon, Clock, CheckCircle,
  BarChart2
} from "lucide-react";
import CountUp from "react-countup";

// Componentes modulares
import GuiaFormModal from "./GuiaFormModal";
import GuiaDetalleModal from "./GuiaDetalleModal";
import TablaGuiasSalida from "./TablaGuiasSalida";

// Colores por estado
const KPI_COLORS = {
  Pendiente: "#f59e0b",
  Enviada: "#3b82f6",
  Recibida: "#10b981",
};

// Íconos por estado
const KPI_ICONS = {
  Pendiente: Clock,
  Enviada: Truck,
  Recibida: CheckCircle,
};

// Estilos
const cardStyle =
  "rounded-xl p-4 shadow-md transform transition-transform hover:scale-[1.02] text-center";
const hoverCardStyle =
  "rounded-xl p-4 shadow-md transform transition-transform hover:scale-[1.02] text-center";

export default function GuiasSalida() {
  const [guias, setGuias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [guiaSeleccionada, setGuiaSeleccionada] = useState(null);
  const [formModalOpen, setFormModalOpen] = useState(false);

  // Filtros
  const [filtroResponsable, setFiltroResponsable] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroFechaInicio, setFiltroFechaInicio] = useState("");
  const [filtroFechaFin, setFiltroFechaFin] = useState("");

  useEffect(() => {
    cargarGuias();
  }, []);

  const cargarGuias = async () => {
    setLoading(true);
    setError(null);
    try {
      let data = [];
      if (DEV_FAKE_DATA) {
        data = [
          {
            id: 1,
            fecha: "2025-08-14T08:00:00",
            origen: "Almacén A",
            destino: "Sucursal 1",
            responsable: "Juan",
            estado: "Pendiente",
            items: [{ cantidad: 10, descripcion: "Formularios" }],
          },
          {
            id: 2,
            fecha: "2025-08-14T09:30:00",
            origen: "Almacén B",
            destino: "Sucursal 2",
            responsable: "Maria",
            estado: "Enviada",
            items: [{ cantidad: 5, descripcion: "Cartuchos" }],
          },
          {
            id: 3,
            fecha: "2025-08-14T10:15:00",
            origen: "Almacén A",
            destino: "Sucursal 3",
            responsable: "Carlos",
            estado: "Recibida",
            items: [{ cantidad: 3, descripcion: "Documentos" }],
          },
        ];
      } else {
        const res = await api.get("boleta/guias/");
        data = res.data ?? [];
      }
      setGuias(data);
    } catch (err) {
      console.error(err);
      setError("Error cargando guías de salida.");
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (guia) => {
    setGuiaSeleccionada(guia);
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setGuiaSeleccionada(null);
  };

  // Filtrado
  const guiasFiltradas = useMemo(() => {
    return guias.filter((g) => {
      const cumpleResponsable = filtroResponsable
        ? g.responsable?.toLowerCase().includes(filtroResponsable.toLowerCase())
        : true;
      const cumpleEstado = filtroEstado
        ? g.estado?.toLowerCase().includes(filtroEstado.toLowerCase())
        : true;
      const fechaGuia = new Date(g.fecha);
      const cumpleFechaInicio = filtroFechaInicio
        ? fechaGuia >= new Date(filtroFechaInicio)
        : true;
      const cumpleFechaFin = filtroFechaFin
        ? fechaGuia <= new Date(filtroFechaFin)
        : true;
      return cumpleResponsable && cumpleEstado && cumpleFechaInicio && cumpleFechaFin;
    });
  }, [guias, filtroResponsable, filtroEstado, filtroFechaInicio, filtroFechaFin]);

  // KPIs
  const totalGuias = guiasFiltradas.length;
  const estadosConteo = guiasFiltradas.reduce((acc, g) => {
    acc[g.estado] = (acc[g.estado] || 0) + 1;
    return acc;
  }, {});
  const dataPie = Object.entries(estadosConteo).map(([name, value]) => ({
    name,
    value,
  }));
  const dataBar = Object.entries(estadosConteo).map(([name, value]) => ({
    name,
    count: value,
  }));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Truck /> Guías de Salida
      </h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 text-center">
        <div
          className={`${hoverCardStyle} flex flex-col items-center justify-center text-white p-4 rounded-xl`}
          style={{ background: `linear-gradient(135deg, #3b82f6cc, #60a5fa99)` }}
        >
          <ClipboardList className="w-6 h-6 mb-2 opacity-90" />
          <p className="text-sm">Total Guías</p>
          <p className="text-2xl font-bold">
            <CountUp end={totalGuias} duration={1.2} separator="," />
          </p>
        </div>

        {dataPie.map((kpi) => {
          const Icon = KPI_ICONS[kpi.name] || PieChartIcon;
          return (
            <div
              key={kpi.name}
              className={`${hoverCardStyle} flex flex-col items-center justify-center text-white p-4 rounded-xl`}
              style={{
                background: `linear-gradient(135deg, ${KPI_COLORS[kpi.name] || "#6b7280"}cc, ${
                  KPI_COLORS[kpi.name] || "#6b7280"
                }99)`,
              }}
            >
              <Icon className="w-6 h-6 mb-2 opacity-90" />
              <p className="text-sm">{kpi.name}</p>
              <p className="text-2xl font-bold">
                <CountUp end={kpi.value} duration={1.2} separator="," />
              </p>
            </div>
          );
        })}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${cardStyle} ${hoverCardStyle}`}>
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <PieChartIcon size={18} /> Distribución por Estado
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={dataPie}
                dataKey="value"
                nameKey="name"
                outerRadius={80}
                label
                isAnimationActive
              >
                {dataPie.map((entry) => (
                  <Cell key={entry.name} fill={KPI_COLORS[entry.name] || "#6b7280"} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className={`${cardStyle} ${hoverCardStyle}`}>
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <BarChart2 size={18} /> Cantidad por Estado
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dataBar} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {dataBar.map((entry) => (
                <Bar
                  key={entry.name}
                  dataKey="count"
                  data={[entry]}
                  fill={KPI_COLORS[entry.name] || "#6b7280"}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Botón Crear Guía */}
      <div className="flex justify-end">
        <button
          onClick={() => setFormModalOpen(true)}
          className={`${hoverCardStyle} flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-5 py-2 rounded-xl shadow hover:from-indigo-600 hover:to-indigo-700 transition`}
        >
          <PlusCircle size={18} /> Crear Guía
        </button>
      </div>

      {/* Filtros */}
      <div className={`${cardStyle} ${hoverCardStyle} flex flex-wrap gap-4 items-end`}>
        <div className="flex flex-col flex-1 min-w-[180px]">
          <label className="text-gray-600 text-sm mb-1 flex items-center gap-1">
            <User size={16} /> Responsable
          </label>
          <input
            type="text"
            placeholder="Filtrar por responsable"
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
            value={filtroResponsable}
            onChange={(e) => setFiltroResponsable(e.target.value)}
          />
        </div>

        <div className="flex flex-col flex-1 min-w-[180px]">
          <label className="text-gray-600 text-sm mb-1 flex items-center gap-1">
            <FileText size={16} /> Estado
          </label>
          <input
            type="text"
            placeholder="Filtrar por estado"
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-gray-600 text-sm mb-1 flex items-center gap-1">
            <Calendar size={16} /> Fecha Inicio
          </label>
          <input
            type="date"
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
            value={filtroFechaInicio}
            onChange={(e) => setFiltroFechaInicio(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-gray-600 text-sm mb-1 flex items-center gap-1">
            <Calendar size={16} /> Fecha Fin
          </label>
          <input
            type="date"
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
            value={filtroFechaFin}
            onChange={(e) => setFiltroFechaFin(e.target.value)}
          />
        </div>

        <button
          onClick={() => {
            setFiltroResponsable("");
            setFiltroEstado("");
            setFiltroFechaInicio("");
            setFiltroFechaFin("");
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white px-4 py-2 rounded-lg shadow hover:from-gray-500 hover:to-gray-600 transition"
        >
          <Filter size={16} /> Limpiar
        </button>
      </div>

      {/* Error / Loading */}
      {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}
      {loading ? (
        <p>Cargando guías...</p>
      ) : (
        <TablaGuiasSalida guias={guiasFiltradas} abrirDetalle={abrirModal} />
      )}

      {/* Modales */}
      <GuiaDetalleModal guia={guiaSeleccionada} isOpen={modalOpen} onClose={cerrarModal} />
      <GuiaFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSave={(nuevaGuia) => setGuias((prev) => [nuevaGuia, ...prev])}
      />
    </div>
  );
}
