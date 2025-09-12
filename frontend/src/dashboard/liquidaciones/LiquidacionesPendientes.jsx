// src/dashboard/liquidaciones/LiquidacionesPendientes.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { FileText, FolderKanban, DollarSign, Clock, ChartBarDecreasing, ChartColumnIncreasing } from "lucide-react";
import PresentarDocumentacionModal from "./PresentarDocumentacionModal";
import axios from "@/services/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TYPE_COLORS, TIPO_SOLICITUD_CLASSES, STATE_CLASSES } from "@/components/ui/colors";
import KpiCard from "@/components/ui/KpiCard";
import Table from "@/components/ui/table";
import ChartWrapped, { tooltipFormatter, radialTooltipFormatter } from "@/components/ui/ChartWrapped";

const DEV_FAKE_DATA = true;

const cardStyle =
  "rounded-xl p-4 shadow-md transform transition-transform hover:scale-[1.02] text-center";

// Datos de prueba
const fakeData = [
  {
    id: 1,
    numero_solicitud: 9705,
    fecha: "2025-08-14",
    total_soles: 150,
    total_dolares: 43,
    estado: "Atendido, Pendiente de Liquidación",
    solicitante: "Juan Pérez",
    tipo: "Viáticos",
    concepto_gasto: "Viaje Lima",
  },
  {
    id: 2,
    numero_solicitud: 6664,
    fecha: "2025-08-12",
    total_soles: 300,
    total_dolares: 86,
    estado: "Atendido, Pendiente de Liquidación",
    solicitante: "María López",
    tipo: "Compras",
    concepto_gasto: "Material oficina",
  },
  {
    id: 3,
    numero_solicitud: 3103,
    fecha: "2025-08-10",
    total_soles: 200,
    total_dolares: 57.34,
    estado: "Atendido, Pendiente de Liquidación",
    solicitante: "Carlos Díaz",
    tipo: "Movilidad",
    concepto_gasto: "Taxi",
  },
  {
    id: 4,
    numero_solicitud: 9857,
    fecha: "2025-08-08",
    total_soles: 250,
    total_dolares: 71.67,
    estado: "Atendido, Pendiente de Liquidación",
    solicitante: "Ana Torres",
    tipo: "Otros gastos",
    concepto_gasto: "Almuerzo",
  },
];

export default function LiquidacionesPendientes() {
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroSolicitante, setFiltroSolicitante] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  const [showPresentarModal, setShowPresentarModal] = useState(false);
  const [showDocumentoModal, setShowDocumentoModal] = useState(false);
  const [ocrData, setOcrData] = useState(null);

  useEffect(() => {
    fetchLiquidaciones();
  }, []);

  const fetchLiquidaciones = async () => {
    try {
      setLoading(true);
      if (DEV_FAKE_DATA) {
        setTimeout(() => {
          setLiquidaciones(fakeData);
          setLoading(false);
        }, 800);
      } else {
        const res = await axios.get("/api/liquidaciones-pendientes/");
        setLiquidaciones(res.data);
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // === Lista de solicitantes únicos ===
  const solicitantes = useMemo(() => {
    const unique = new Set(liquidaciones.map((s) => s.solicitante));
    return Array.from(unique);
  }, [liquidaciones]);

  // === Filtro principal para la tabla ===
  const solicitudesFiltradas = useMemo(() => {
    return liquidaciones.filter((s) => {
      const matchSearch =
        s.solicitante.toLowerCase().includes(search.toLowerCase()) ||
        s.numero_solicitud.toString().includes(search);

      const matchSolicitante =
        filtroSolicitante === "" || s.solicitante === filtroSolicitante;

      const matchTipo = filtroTipo === "" || s.tipo === filtroTipo;

      const matchFecha =
        (!fechaInicio || new Date(s.fecha) >= new Date(fechaInicio)) &&
        (!fechaFin || new Date(s.fecha) <= new Date(fechaFin));

      return matchSearch && matchSolicitante && matchTipo && matchFecha;
    });
  }, [liquidaciones, search, filtroSolicitante, filtroTipo, fechaInicio, fechaFin]);

  // === KPIs ===
  const stats = useMemo(() => {
    const total = solicitudesFiltradas.length;
    const totalSoles = solicitudesFiltradas.reduce(
      (sum, l) => sum + (l.total_soles || 0),
      0
    );
    const totalDolares = solicitudesFiltradas.reduce(
      (sum, l) => sum + (l.total_dolares || 0),
      0
    );
    const promedio = total ? (totalSoles / total).toFixed(2) : 0;
    return { total, totalSoles, totalDolares, promedio };
  }, [solicitudesFiltradas]);

  // === Datos para gráficos ===
  const dataTipo = useMemo(() => {
    return Object.entries(
      solicitudesFiltradas.reduce((acc, l) => {
        acc[l.tipo] = (acc[l.tipo] || 0) + 1;
        return acc;
      }, {})
    ).map(([tipo, value]) => ({ name: tipo, value }));
  }, [solicitudesFiltradas]);

  const dataMontoPorTipo = useMemo(() => {
    return Object.entries(
      solicitudesFiltradas.reduce((acc, l) => {
        acc[l.tipo] = (acc[l.tipo] || 0) + (l.total_soles || 0);
        return acc;
      }, {})
    ).map(([tipo, value]) => ({
      name: tipo,
      value: Number(value.toFixed(2)),
    }));
  }, [solicitudesFiltradas]);

  const handleAccion = (id, accion, solicitud) => {
    setSelectedSolicitud(solicitud);
    if (accion === "Ver Detalle") {
      setShowDocumentoModal(true);
      setOcrData(solicitud);
    } else {
      setShowPresentarModal(true);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* Header */}
      <div className="flex justify-center md:justify-start items-center mb-4">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-black">
          <FolderKanban className="w-5 sm:w-6 h-5 sm:h-6" /> Liquidaciones Pendientes
        </h2>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 text-center">
        {[
          { label: "Total Pendientes", value: stats.total, gradient: "linear-gradient(135deg, #f97316cc, #fb923c99)", icon: Clock, tooltip: "Número total de solicitudes pendientes." },
          { label: "Monto Total (S/)", value: stats.totalSoles, gradient: "linear-gradient(135deg, #3b82f6cc, #60a5fa99)", icon: DollarSign, tooltip: "Monto acumulado en soles.", decimals: 2 },
          { label: "Monto Total ($)", value: stats.totalDolares, gradient: "linear-gradient(135deg, #10b981cc, #34d39999)", icon: DollarSign, tooltip: "Monto acumulado en dólares.", decimals: 2 },
          { label: "Promedio por Solicitud (S/)", value: stats.promedio, gradient: "linear-gradient(135deg, #f59e0bcc, #fcd34d99)", icon: DollarSign, tooltip: "Promedio por solicitud.", decimals: 2 },
        ].map((kpi, idx) => (
          <KpiCard key={idx} {...kpi} />
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Montos por Tipo de Solicitud */}
        <ChartWrapped
          title="Montos por Tipo de Solicitud (S/.)"
          icon={<ChartBarDecreasing className="w-4 h-4" />}
          className="h-72"
          tooltipFormatter={(val) => `S/ ${val.toLocaleString()}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataMontoPorTipo} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip formatter={(val) => `S/ ${val.toLocaleString()}`} />
              <Bar dataKey="value" barSize={35}>
                {dataMontoPorTipo.map((entry, i) => (
                  <Cell key={i} fill={TYPE_COLORS[entry.name] || "#9CA3AF"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapped>

        {/* Distribución por Tipo */}
        <ChartWrapped
          title="Distribución por Tipo"
          icon={<ChartColumnIncreasing className="w-4 h-4" />}
          className="h-72"
          tooltipFormatter={tooltipFormatter} // Genérico
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataTipo}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={tooltipFormatter} />
              <Bar dataKey="value" barSize={35}>
                {dataTipo.map((entry, i) => (
                  <Cell key={i} fill={TYPE_COLORS[entry.name] || "#9CA3AF"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapped>
      </div>


      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          {/* Solicitante */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span> Solicitante
            </label>
            <select
              value={filtroSolicitante}
              onChange={(e) => setFiltroSolicitante(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              <option value="">Todos</option>
              {solicitantes.map((sol) => (
                <option key={sol} value={sol}>{sol}</option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span> Tipo
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
            >
              <option value="">Todos</option>
              {Object.keys(TYPE_COLORS).map((tipo) => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>

          {/* Fechas */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span> Rango de Fechas
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none w-full sm:w-auto"
              />
              <span className="text-gray-400 text-xs hidden sm:inline">→</span>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none w-full sm:w-auto"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <Table
        headers={[
          "N° Solicitud",
          "Tipo",
          "Monto (S/.)",
          "Monto ($)",
          "Fecha",
          "Concepto",
          "Estado",
          "Acción",
        ]}
        data={solicitudesFiltradas}
        emptyMessage="No hay solicitudes en este estado o rango de fechas."
        renderRow={(s) => (
          <>
            <td className="px-2 sm:px-4 py-2 sm:py-3 font-semibold text-center">
              {s.numero_solicitud}
            </td>
            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  TIPO_SOLICITUD_CLASSES[s.tipo] ||
                  "bg-gray-200 text-gray-700"
                }`}
              >
                {s.tipo}
              </span>
            </td>
            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
              {s.total_soles ? `S/. ${s.total_soles}` : "-"}
            </td>
            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
              {s.total_dolares ? `$ ${s.total_dolares}` : "-"}
            </td>
            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
              {s.fecha}
            </td>
            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
              {s.concepto_gasto ?? "-"}
            </td>
            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  STATE_CLASSES[s.estado] ||
                  "bg-gray-200 text-gray-700"
                }`}
              >
                {s.estado}
              </span>
            </td>
            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleAccion(s.id, "Presentar Documentación", s)
                }
                className="flex items-center gap-1"
              >
                <FileText className="w-4 h-4" /> Presentar
              </Button>
            </td>
          </>
        )}
      />

      {/* Modals */}
      {showPresentarModal && (
        <PresentarDocumentacionModal
          open={showPresentarModal}
          onClose={() => setShowPresentarModal(false)}
          solicitud={selectedSolicitud}
        />
      )}

    </div>
  );

}
