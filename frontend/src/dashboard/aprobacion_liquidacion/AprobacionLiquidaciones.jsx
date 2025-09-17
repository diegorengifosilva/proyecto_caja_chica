// src/dashboard/aprobacion_liquidacion/AprobacionLiquidaciones.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Eye, Check, X, CheckCircle, CircleX, DollarSign, Wallet, FileSearch, RefreshCw } from "lucide-react";
import api from "@/services/api";
import ConfirmacionModal from "./ConfirmacionModal";
import DetalleLiquidacionModal from "./LiquidacionDetalleModal";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, PieChart, Pie } from "recharts";
import "tippy.js/dist/tippy.css";
import EventBus from "@/components/EventBus";
import { STATE_CLASSES, STATE_COLORS, TIPO_SOLICITUD_CLASSES, TYPE_COLORS } from "@/components/ui/colors";
import KpiCard from "@/components/ui/KpiCard";
import Table from "@/components/ui/table";
import ChartWrapped from "@/components/ui/ChartWrapped";

const TASA_CAMBIO = 3.52;

export default function AprobacionLiquidaciones() {
  const { authUser: user, logout } = useAuth();

  // -------------------------------
  // Estados
  // -------------------------------
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

  // -------------------------------
  // FETCH FILTRADO POR USUARIO Y ESTADO
  // -------------------------------
  const fetchLiquidaciones = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const { data } = await api.get("/boleta/liquidaciones_pendientes/", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          destinatario_id: user.id,
          estado: "Liquidación enviada para Aprobación",
        },
      });
      setLiquidaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al obtener liquidaciones:", err);
      if (err?.response?.status === 401) logout();
      setLiquidaciones([]);
    } finally {
      setLoading(false);
    }
  }, [user, logout]);

  // -------------------------------
  // EventBus para refresco automático
  // -------------------------------
  useEffect(() => {
    const actualizar = () => fetchLiquidaciones();

    EventBus.on("liquidacionPresentada", actualizar);
    EventBus.on("liquidacionAprobada", actualizar);
    EventBus.on("liquidacionRechazada", actualizar);

    return () => {
      EventBus.off("liquidacionPresentada", actualizar);
      EventBus.off("liquidacionAprobada", actualizar);
      EventBus.off("liquidacionRechazada", actualizar);
    };
  }, [fetchLiquidaciones]);

  useEffect(() => {
    fetchLiquidaciones();
  }, [fetchLiquidaciones]);

  // -------------------------------
  // FILTROS LOCALES
  // -------------------------------
  const filteredLiquidaciones = useMemo(() => {
    if (!Array.isArray(liquidaciones)) return [];

    return liquidaciones.filter(liq => {
      const solicitante = (liq.solicitante_nombre || liq.solicitante || "").toLowerCase();
      const docs = Array.isArray(liq.documentos) ? liq.documentos : [];

      // Búsqueda global: por ID, nombre del solicitante o documento
      const matchSearch =
        (!search || liq.id?.toString().includes(search)) ||
        solicitante.includes(search.toLowerCase()) ||
        docs.some(d => d.toString().toLowerCase().includes(search.toLowerCase()));

      // Filtros por tipo, fechas y monto
      const matchTipo = filterTipo === "Todas" || liq.tipo === filterTipo;
      const matchFechaDesde = !fechaDesde || new Date(liq.fecha) >= new Date(fechaDesde);
      const matchFechaHasta = !fechaHasta || new Date(liq.fecha) <= new Date(fechaHasta);
      const matchMontoMin = !montoMin || (liq.monto_soles ?? liq.monto) >= parseFloat(montoMin);
      const matchMontoMax = !montoMax || (liq.monto_soles ?? liq.monto) <= parseFloat(montoMax);
      const matchDoc = !docSearch || docs.some(d => d.toString().toLowerCase().includes(docSearch.toLowerCase()));

      return matchSearch && matchTipo && matchFechaDesde && matchFechaHasta && matchMontoMin && matchMontoMax && matchDoc;
    });
  }, [liquidaciones, search, filterTipo, fechaDesde, fechaHasta, montoMin, montoMax, docSearch]);

  // -------------------------------
  // KPIs
  // -------------------------------
  const kpiData = useMemo(() => {
    const counts = { Pendientes: 0, Aprobadas: 0, Rechazadas: 0 };
    let total = liquidaciones.length;
    let totalSoles = liquidaciones.reduce((acc, l) => acc + l.monto, 0);
    liquidaciones.forEach(l => {
      if (l.estado === "Liquidación enviada para Aprobación") counts.Pendientes++;
      if (l.estado === "Aprobado") counts.Aprobadas++;
      if (l.estado === "Rechazado") counts.Rechazadas++;
    });
    const totalDolares = totalSoles / TASA_CAMBIO;
    return { Total: total, Pendientes: counts.Pendientes, Aprobadas: counts.Aprobadas, Rechazadas: counts.Rechazadas, TotalSoles: totalSoles, TotalDolares: totalDolares };
  }, [liquidaciones]);

  // -------------------------------
  // ACCIONES
  // -------------------------------
  const handleAccion = async () => {
    if (!selectedLiquidacion) return;
    try {
      const res = await api.post(`/boleta/liquidaciones/${selectedLiquidacion.id}/accion/`, { accion });
      setLiquidaciones(prev => prev.map(l => (l.id === selectedLiquidacion.id ? res.data : l)));
      setConfirmModalOpen(false);
      setDetalleModalOpen(false);
      setActiveRow(selectedLiquidacion.id);
      setTimeout(() => setActiveRow(null), 1500);
      EventBus.emit(accion === "aprobar" ? "liquidacionAprobada" : "liquidacionRechazada", res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------------
  // DATOS PARA GRÁFICOS
  // -------------------------------
  const pieChartData = useMemo(() =>
    Object.entries(filteredLiquidaciones.reduce((acc, liq) => { acc[liq.estado] = (acc[liq.estado] || 0) + 1; return acc; }, {}))
      .map(([name, value]) => ({ name, value })), [filteredLiquidaciones]);

  const barChartData = useMemo(() =>
    Object.entries(filteredLiquidaciones.reduce((acc, liq) => { acc[liq.tipo] = (acc[liq.tipo] || 0) + 1; return acc; }, {}))
      .map(([name, value]) => ({ name, value })), [filteredLiquidaciones]);

  const formatSoles = (value) => Number(value).toLocaleString("es-PE", { minimumFractionDigits: 2 });
  const formatDolares = (value) => (value / TASA_CAMBIO).toLocaleString("en-US", { minimumFractionDigits: 2 });

  // -------------------------------
  // RENDER
  // -------------------------------
  if (loading) return <p className="text-center py-10 animate-pulse">Cargando...</p>;
  if (!Array.isArray(liquidaciones) || liquidaciones.length === 0) return <p className="text-center py-10">No hay liquidaciones pendientes.</p>;

  return (
    <div className="p-6 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSearch className="w-6 h-6" /> Aprobación de Liquidaciones
        </h1>
        <button onClick={fetchLiquidaciones} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mb-6">
        {[
          { label: "Total", value: kpiData.Total, gradient: "linear-gradient(135deg, #6366f1cc, #818cf899)", icon: Wallet },
          { label: "Pendientes", value: kpiData.Pendientes, gradient: "linear-gradient(135deg, #f97316cc, #fb923c99)", icon: CircleX },
          { label: "Aprobadas", value: kpiData.Aprobadas, gradient: "linear-gradient(135deg, #16a34acc, #22c55e99)", icon: CheckCircle },
          { label: "Rechazadas", value: kpiData.Rechazadas, gradient: "linear-gradient(135deg, #ef4444cc, #f8717199)", icon: CircleX },
          { label: "Total S/", value: kpiData.TotalSoles, gradient: "linear-gradient(135deg, #3b82f6cc, #60a5fa99)", icon: Wallet },
        ].map(kpi => <KpiCard key={kpi.label} {...kpi} decimals={kpi.label.includes("$") ? 2 : 0} />)}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartWrapped title="Distribución por Estado" className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieChartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={5}>
                {pieChartData.map((entry, index) => <Cell key={index} fill={STATE_COLORS[entry.name]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartWrapped>

        <ChartWrapped title="Distribución por Tipo" className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {barChartData.map((entry, index) => <Cell key={index} fill={TYPE_COLORS[entry.name]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapped>
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
              className="px-4 py-1 rounded-full cursor-pointer"
              style={{ backgroundColor: filterTipo === tipo ? TYPE_COLORS[tipo] : "#f3f4f6", color: filterTipo === tipo ? "#fff" : "#000" }}
              onClick={() => setFilterTipo(tipo)}
            >
              {tipo}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Tabla */}
      <CardContent>
        <Table
          headers={["Solicitante","Tipo","Fecha","Monto S/","Monto $","Estado","Documentos","Acciones"]}
          data={filteredLiquidaciones}
          emptyMessage="No hay liquidaciones."
          activeRow={activeRow}
          renderRow={liq => (
            <>
              <td>{liq.solicitante}</td>
              <td><Badge className={`${TIPO_SOLICITUD_CLASSES[liq.tipo] || "bg-gray-200 text-gray-700"} px-3 py-1 rounded-full`}>{liq.tipo}</Badge></td>
              <td>{liq.fecha ? new Date(liq.fecha).toLocaleDateString("es-PE") : "-"}</td>
              <td>S/ {formatSoles(liq.monto)}</td>
              <td>$ {formatDolares(liq.monto)}</td>
              <td><Badge className={`${STATE_CLASSES[liq.estado] || "bg-gray-200 text-gray-700"} px-3 py-1 rounded-full`}>{liq.estado}</Badge></td>
              <td>{liq.documentos?.map((d, i) => <Badge key={i} variant="outline" className="mr-1">{d}</Badge>)}</td>
              <td className="flex gap-1 justify-center">
                <button onClick={() => { setSelectedLiquidacion(liq); setDetalleModalOpen(true); }}><Eye size={16} /></button>
                <button onClick={() => { setSelectedLiquidacion(liq); setAccion("aprobar"); setConfirmModalOpen(true); }}><Check size={16} /></button>
                <button onClick={() => { setSelectedLiquidacion(liq); setAccion("rechazar"); setConfirmModalOpen(true); }}><X size={16} /></button>
              </td>
            </>
          )}
        />
      </CardContent>

      {/* Modales */}
      {detalleModalOpen && selectedLiquidacion && <DetalleLiquidacionModal open={detalleModalOpen} liquidacion={selectedLiquidacion} onClose={() => setDetalleModalOpen(false)} />}
      <ConfirmacionModal open={confirmModalOpen} onClose={() => setConfirmModalOpen(false)} accion={accion} onConfirm={handleAccion} liquidacion={selectedLiquidacion} />
    </div>
  );
}
