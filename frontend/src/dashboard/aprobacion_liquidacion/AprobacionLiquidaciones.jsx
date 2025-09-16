// src/dashboard/aprobacion_liquidacion/AprobacionLiquidaciones.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Eye, Check, X, CircleX, CheckCircle, DollarSign, Wallet, FileSearch, Info, BarChart as BarChartIcon } from "lucide-react";
import axios from "@/services/api";
import ConfirmacionModal from "./ConfirmacionModal";
import DetalleLiquidacionModal from "./LiquidacionDetalleModal";
import {  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, PieChart, Pie } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip as ReactTooltip } from "react-tooltip";
import "tippy.js/dist/tippy.css";
import { STATE_CLASSES, STATE_COLORS, TIPO_SOLICITUD_CLASSES, TYPE_COLORS } from "@/components/ui/colors";
import KpiCard from "@/components/ui/KpiCard";
import Table from "@/components/ui/table";
import ChartWrapped from "@/components/ui/ChartWrapped";

// ======= CONFIG =======
const DEV_FAKE_DATA = true;
const TASA_CAMBIO = 3.52;

const KPI_COLORS = {
  Pendiente: "#facc15",
  Aprobado: "#16a34a",
  "Aprobado con ajuste": "#f59e0b",
  Rechazado: "#ef4444",
  TotalSoles: "#3b82f6",
  TotalDolares: "#0ea5e9",
};

// ======= FAKE DATA =======
const fakeData = [
  {
    id: 1,
    numero_operacion: "OP-1001",
    fecha: "2025-08-14",
    monto_soles: 150,
    monto_dolares: 42.96,
    tipo: "Viáticos",
    estado: "Pendiente de Envío",
    solicitante: "Juan Pérez",
    observaciones: "Documento completo",
    documentos: ["F001-123", "F002-456"]
  },
  {
    id: 2,
    numero_operacion: "OP-1002",
    fecha: "2025-08-12",
    monto_soles: 300,
    monto_dolares: 86.09,
    tipo: "Movilidad",
    estado: "Pendiente para Atención",
    solicitante: "María López",
    observaciones: "Falta recibo",
    documentos: ["F003-789"]
  },
  {
    id: 3,
    numero_operacion: "OP-1003",
    fecha: "2025-08-10",
    monto: 200,
    tipo: "Compras",
    estado: "Atendido, Pendiente de Liquidación",
    solicitante: "Carlos Díaz",
    observaciones: "Revisar gastos",
    documentos: ["F004-101"]
  },
  {
    id: 4,
    numero_operacion: "OP-1004",
    fecha: "2025-08-11",
    monto: 500,
    tipo: "Otros gastos",
    estado: "Liquidación enviada para Aprobación",
    solicitante: "Ana Torres",
    observaciones: "Completo",
    documentos: ["F005-202", "F006-303"]
  },
  {
    id: 5,
    numero_operacion: "OP-1005",
    fecha: "2025-08-09",
    monto: 250,
    tipo: "Viáticos",
    estado: "Liquidación Aprobada",
    solicitante: "Luis Ramírez",
    observaciones: "",
    documentos: ["F007-404"]
  },
  {
    id: 6,
    numero_operacion: "OP-1006",
    fecha: "2025-08-08",
    monto: 180,
    tipo: "Compras",
    estado: "Rechazado",
    solicitante: "Sofía Martínez",
    observaciones: "Error en factura",
    documentos: ["F008-505"]
  },
];

// ======= COMPONENTE PRINCIPAL =======
export default function AprobacionLiquidaciones() {
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("Todas");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [montoMin, setMontoMin] = useState("");
  const [montoMax, setMontoMax] = useState("");
  const [docSearch, setDocSearch] = useState("");
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [selectedLiquidacion, setSelectedLiquidacion] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [accion, setAccion] = useState("");
  const [activeRow, setActiveRow] = useState(null);

  // ======= FETCH =======
  const fetchLiquidaciones = async () => {
    try {
      setLoading(true);
      if (DEV_FAKE_DATA) {
        setTimeout(() => { setLiquidaciones(fakeData); setLoading(false); }, 800);
      } else {
        const res = await axios.get("/api/liquidaciones-pendientes/");
        setLiquidaciones(res.data);
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => { fetchLiquidaciones(); }, []);

  // ======= FILTROS =======
  const filteredLiquidaciones = useMemo(() => {
    return liquidaciones.filter(liq => {
      const matchSearch =
        liq.solicitante.toLowerCase().includes(search.toLowerCase()) ||
        liq.id.toString().includes(search);

      const matchTipo =
        filterTipo === "Todas" || liq.tipo === filterTipo;

      const matchFechaDesde =
        fechaDesde === "" || new Date(liq.fecha) >= new Date(fechaDesde);

      const matchFechaHasta =
        fechaHasta === "" || new Date(liq.fecha) <= new Date(fechaHasta);

      const matchMontoMin =
        montoMin === "" || liq.monto >= parseFloat(montoMin);

      const matchMontoMax =
        montoMax === "" || liq.monto <= parseFloat(montoMax);

      const matchDoc =
        docSearch === "" ||
        liq.documentos.some(d =>
          d.toLowerCase().includes(docSearch.toLowerCase())
        );

      return matchSearch && matchTipo && matchFechaDesde && matchFechaHasta && matchMontoMin && matchMontoMax && matchDoc;
    });
  }, [liquidaciones, search, filterTipo, fechaDesde, fechaHasta, montoMin, montoMax, docSearch]);


  // ======= KPIs =======
  const kpiData = useMemo(() => {
    const counts = { Aprobado: 0, Rechazado: 0 };
    let total = 0;
    let totalSoles = 0;

    liquidaciones.forEach(l => {
      total++;
      totalSoles += l.monto;
      if (counts[l.estado] !== undefined) counts[l.estado]++;
    });

    const totalDolares = totalSoles / TASA_CAMBIO;

    return { Total: total, Aprobadas: counts.Aprobado, Rechazadas: counts.Rechazado, TotalSoles: totalSoles, TotalDolares: totalDolares };
  }, [liquidaciones]);

  // ======= ACCIONES =======
  const handleAccion = async () => {
    if (!selectedLiquidacion) return;
    try {
      const nuevoEstado = ACTION_STATE_MAP[accion];
      if (DEV_FAKE_DATA) {
        setLiquidaciones(prev => prev.map(l =>
          l.id === selectedLiquidacion.id ? { ...l, estado: nuevoEstado } : l
        ));
      } else {
        const res = await axios.post(`/api/liquidaciones/${selectedLiquidacion.id}/accion/`, { accion });
        setLiquidaciones(prev => prev.map(l => (l.id === selectedLiquidacion.id ? res.data : l)));
      }
      setConfirmModalOpen(false);
      setDetalleModalOpen(false);
      setActiveRow(selectedLiquidacion.id);
      setTimeout(() => setActiveRow(null), 1500);
    } catch (err) { console.error(err); }
  };

  // ======= Datos para gráficos =======
  const pieChartData = useMemo(() => {
    return Object.entries(
      filteredLiquidaciones.reduce((acc, liq) => {
        acc[liq.estado] = (acc[liq.estado] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }));
  }, [filteredLiquidaciones]);

  const barChartData = useMemo(() => {
    return Object.entries(
      filteredLiquidaciones.reduce((acc, liq) => {
        acc[liq.tipo] = (acc[liq.tipo] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }));
  }, [filteredLiquidaciones]);

  const formatSoles = (value) => Number(value).toLocaleString("es-PE", { minimumFractionDigits: 2 });
  const formatDolares = (value) => (value / TASA_CAMBIO).toLocaleString("en-US", { minimumFractionDigits: 2 });

  // ======= RENDER =======
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSearch className="w-6 h-6" /> Aprobación de Liquidaciones
        </h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mb-6">
        {[
          {
            label: "Total",
            value: kpiData.Total,
            gradient: "linear-gradient(135deg, #6366f1cc, #818cf899)",
            icon: Wallet,
            tooltip: "Cantidad total de liquidaciones.",
          },
          {
            label: "Aprobadas",
            value: kpiData.Aprobadas,
            gradient: "linear-gradient(135deg, #16a34acc, #22c55e99)",
            icon: CheckCircle,
            tooltip: "Liquidaciones aprobadas.",
          },
          {
            label: "Rechazadas",
            value: kpiData.Rechazadas,
            gradient: "linear-gradient(135deg, #ef4444cc, #f8717199)",
            icon: CircleX,
            tooltip: "Liquidaciones rechazadas.",
          },
          {
            label: "Total S/",
            value: kpiData.TotalSoles,
            gradient: "linear-gradient(135deg, #3b82f6cc, #60a5fa99)",
            icon: Wallet,
            tooltip: "Monto total en soles.",
          },
          {
            label: "Total $",
            value: kpiData.TotalDolares,
            gradient: "linear-gradient(135deg, #10b981cc, #34d39999)",
            icon: DollarSign,
            tooltip: "Monto total en dólares.",
          },
        ].map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            gradient={kpi.gradient}
            tooltip={kpi.tooltip}
            decimals={
              typeof kpi.value === "number"
                ? 0
                : 2
            }
          />
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Donut por Estado */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <ChartWrapped
            title="Distribución por Estado"
            className="h-64"
            tooltipFormatter={(value, name) => [`${value}`, `${name}`]}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={index} fill={STATE_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            {/* Indicador central */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-sm text-gray-500">Total</div>
              <div className="text-xl font-bold">{liquidaciones.length}</div>
            </div>
          </ChartWrapped>
        </motion.div>

        {/* Barras por Tipo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <ChartWrapped
            title="Distribución por Tipo"
            className="h-64"
            tooltipFormatter={(value, name) => [`${value}`, `${name}`]}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#6b7280", fontWeight: 500 }}
                  axisLine={{ stroke: "#d1d5db" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#6b7280", fontWeight: 500 }}
                  axisLine={{ stroke: "#d1d5db" }}
                  tickLine={false}
                />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {barChartData.map((entry, index) => (
                    <Cell key={index} fill={TYPE_COLORS[entry.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapped>
        </motion.div>
      </div>

      {/* Filtros */}
      <Card className="rounded-xl p-4 shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} placeholder="Desde" />
          <Input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} placeholder="Hasta" />
          <Input type="number" value={montoMin} onChange={e => setMontoMin(e.target.value)} placeholder="Monto mínimo" />
          <Input type="number" value={montoMax} onChange={e => setMontoMax(e.target.value)} placeholder="Monto máximo" />
        </div>

        <Input placeholder="Documento..." value={docSearch} onChange={e => setDocSearch(e.target.value)} className="mb-4" />

        <div className="flex gap-2 flex-wrap">
          {["Todas", "Viáticos", "Movilidad", "Compras", "Otros gastos"].map(tipo => (
            <Badge
              key={tipo}
              className="px-4 py-1 rounded-full cursor-pointer transition-transform hover:scale-105"
              style={{
                backgroundColor: filterTipo === tipo ? TYPE_COLORS[tipo] : "#f3f4f6",
                color: filterTipo === tipo ? "#fff" : "#000",
              }}
              onClick={() => setFilterTipo(tipo)}
            >
              {tipo}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Tabla */}
      <CardContent>
        {loading ? (
          <p className="text-center py-10 animate-pulse">Cargando...</p>
        ) : (
          <Table
            headers={[
              "Solicitante",
              "Tipo",
              "Fecha",
              "Monto S/",
              "Monto $",
              "Estado",
              "Documentos",
              "Acciones",
            ]}
            data={filteredLiquidaciones}
            emptyMessage="No hay liquidaciones."
            activeRow={activeRow}
            renderRow={(liq) => (
              <>
                <td
                  className="px-2 sm:px-4 py-2 sm:py-3 text-center"
                  title={liq.observaciones}
                >
                  {liq.solicitante}
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                  <Badge
                    className={`${
                      TIPO_SOLICITUD_CLASSES[liq.tipo] || "bg-gray-200 text-gray-700"
                    } px-3 py-1 rounded-full`}
                  >
                    {liq.tipo}
                  </Badge>
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                  {liq.fecha}
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                  S/ {formatSoles(liq.monto)}
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                  $ {formatDolares(liq.monto / TASA_CAMBIO)}
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                  <Badge
                    className={`${
                      STATE_CLASSES[liq.estado] || "bg-gray-200 text-gray-700"
                    } px-3 py-1 rounded-full`}
                  >
                    {liq.estado}
                  </Badge>
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                  {liq.documentos.map((d, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className={`mr-1 ${
                        docSearch &&
                        d.toLowerCase().includes(docSearch.toLowerCase())
                          ? "bg-yellow-300 font-medium shadow-md"
                          : ""
                      }`}
                    >
                      {d}
                    </Badge>
                  ))}
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 flex gap-1 justify-center">
                  {/* Ver detalle */}
                  <button
                    data-tooltip-id="tooltip"
                    data-tooltip-content="Ver Detalle"
                    className="bg-indigo-500 hover:bg-indigo-600 text-white p-2 rounded-lg shadow-md"
                    onClick={() => {
                      setSelectedLiquidacion(liq);
                      setDetalleModalOpen(true);
                    }}
                  >
                    <Eye size={16} />
                  </button>

                  {/* Aprobar */}
                  <button
                    data-tooltip-id="tooltip"
                    data-tooltip-content="Aprobar"
                    className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg shadow-md"
                    onClick={() => {
                      setSelectedLiquidacion(liq);
                      setAccion("aprobar");
                      setConfirmModalOpen(true);
                    }}
                  >
                    <Check size={16} />
                  </button>

                  {/* Rechazar */}
                  <button
                    data-tooltip-id="tooltip"
                    data-tooltip-content="Rechazar"
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg shadow-md"
                    onClick={() => {
                      setSelectedLiquidacion(liq);
                      setAccion("rechazar");
                      setConfirmModalOpen(true);
                    }}
                  >
                    <X size={16} />
                  </button>
                </td>
              </>
            )}
          />
        )}
      </CardContent>

      {/* Modales */}
      {detalleModalOpen && selectedLiquidacion && <DetalleLiquidacionModal open={detalleModalOpen} liquidacion={selectedLiquidacion} onClose={() => setDetalleModalOpen(false)} />}
      <ConfirmacionModal open={confirmModalOpen} onClose={() => setConfirmModalOpen(false)} accion={accion} onConfirm={handleAccion} liquidacion={selectedLiquidacion} />
      <ReactTooltip id="tooltip" place="top" effect="solid" />
    </div>
  );
}
