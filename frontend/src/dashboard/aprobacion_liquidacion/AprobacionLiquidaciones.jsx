// src/dashboard/aprobacion_liquidacion/AprobacionLiquidaciones.jsx
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { DollarSign, CheckCircle2, FileText, XCircle, PieChart, BarChart, Eye } from "lucide-react";
import { ResponsiveContainer, PieChart as RePieChart, Pie, Cell, BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip } from "recharts";
import KpiCard from "@/components/ui/KpiCard";
import { STATE_COLORS, TYPE_COLORS } from "@/components/ui/colors";
import DetalleLiquidacionModal from "./LiquidacionDetalleModal";
import ConfirmacionModal from "./ConfirmacionModal";

const TASA_CAMBIO = 3.52;

export default function AprobacionLiquidaciones() {
  const { authUser: user, logout } = useAuth();
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedLiquidacion, setSelectedLiquidacion] = useState(null);
  const [accion, setAccion] = useState("");

  // -------------------------------
  // FETCH LIQUIDACIONES PENDIENTES
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
      console.error(err);
      if (err?.response?.status === 401) logout();
      setLiquidaciones([]);
    } finally {
      setLoading(false);
    }
  }, [user, logout]);

  useEffect(() => { fetchLiquidaciones(); }, [fetchLiquidaciones]);

  // -------------------------------
  // KPIs
  // -------------------------------
  const total = liquidaciones.length;
  const aprobadas = liquidaciones.filter(l => l.estado === "Aprobado").length;
  const rechazadas = liquidaciones.filter(l => l.estado === "Rechazado").length;
  const totalSoles = liquidaciones.reduce((acc, l) => acc + (l.monto_soles ?? 0), 0);
  const totalDolares = totalSoles / TASA_CAMBIO;

  const kpis = [
    { label: "Total Pendientes", value: total, icon: FileText, gradient: "linear-gradient(135deg,#0ea5e9cc,#38bdf899)" },
    { label: "Aprobadas", value: aprobadas, icon: CheckCircle2, gradient: "linear-gradient(135deg,#16a34acc,#4ade8099)" },
    { label: "Rechazadas", value: rechazadas, icon: XCircle, gradient: "linear-gradient(135deg,#ef4444cc,#f8717199)" },
    { label: "Total S/.", value: totalSoles, icon: DollarSign, gradient: "linear-gradient(135deg,#f59e0bcc,#fbbf2499)" },
    { label: "Total $", value: totalDolares, icon: DollarSign, gradient: "linear-gradient(135deg,#6366f1cc,#818cf899)" },
  ];

  // -------------------------------
  // GRÁFICOS
  // -------------------------------
  const datosTipos = Object.entries(liquidaciones.reduce((acc, l) => { acc[l.tipo] = (acc[l.tipo] || 0) + 1; return acc; }, {}))
    .map(([name, value]) => ({ name, value }));

  const datosEstados = Object.entries(liquidaciones.reduce((acc, l) => { acc[l.estado] = (acc[l.estado] || 0) + 1; return acc; }, {}))
    .map(([name, value]) => ({ name, value }));

  // -------------------------------
  // ACCIONES DE APROBACIÓN / RECHAZO
  // -------------------------------
  const handleAccion = async () => {
    if (!selectedLiquidacion) return;
    try {
      const res = await api.post(`/boleta/liquidaciones/${selectedLiquidacion.id}/accion/`, { accion });
      setLiquidaciones(prev => prev.map(l => (l.id === selectedLiquidacion.id ? res.data : l)));
      setConfirmModalOpen(false);
      setDetalleModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------------
  // RENDER
  // -------------------------------
  if (loading) return <p className="text-center py-10 animate-pulse">Cargando...</p>;
  if (!Array.isArray(liquidaciones) || liquidaciones.length === 0) return <p className="text-center py-10">No hay liquidaciones pendientes.</p>;

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 font-sans px-4 sm:px-6 md:px-8 py-4 lg:py-6 space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {kpis.map(k => <KpiCard key={k.label} {...k} decimals={2} />)}
      </div>

      {/* Gráficos */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Tipos */}
        <div className="flex-1 h-56 sm:h-64 md:h-80 bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Liquidaciones por Tipo</h3>
          <ResponsiveContainer width="100%" height="100%">
            <RePieChart>
              <Pie data={datosTipos} dataKey="value" nameKey="name" innerRadius="40%" outerRadius="80%" label>
                {datosTipos.map((entry, index) => <Cell key={index} fill={TYPE_COLORS[entry.name] || "#334155"} />)}
              </Pie>
              <RechartsTooltip />
            </RePieChart>
          </ResponsiveContainer>
        </div>

        {/* Estados */}
        <div className="flex-1 h-56 sm:h-64 md:h-80 bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Liquidaciones por Estado</h3>
          <ResponsiveContainer width="100%" height="100%">
            <ReBarChart data={datosEstados}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#6366f1">
                {datosEstados.map((entry, index) => <Cell key={index} fill={STATE_COLORS[entry.name] || "#334155"} />)}
              </Bar>
            </ReBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tarjetas de liquidaciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {liquidaciones.map(liq => (
          <motion.div
            key={liq.id}
            className="bg-white rounded-xl shadow p-4 flex flex-col justify-between"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-gray-800">#{liq.id} - {liq.solicitante_nombre}</h4>
              <span className="text-sm font-medium px-2 py-1 rounded" style={{ background: STATE_COLORS[liq.estado] || "#ddd", color: "#fff" }}>{liq.estado}</span>
            </div>
            <p className="text-gray-600 mb-2">{liq.tipo}</p>
            <p className="text-gray-800 font-semibold mb-2">S/. {liq.monto_soles.toLocaleString()}</p>
            <div className="flex gap-2 mt-auto">
              <button className="btn btn-sm" onClick={() => { setSelectedLiquidacion(liq); setDetalleModalOpen(true); }}><Eye className="w-4 h-4" /></button>
              <button className="btn btn-success btn-sm" onClick={() => { setSelectedLiquidacion(liq); setAccion("aprobar"); setConfirmModalOpen(true); }}><CheckCircle2 className="w-4 h-4" /></button>
              <button className="btn btn-danger btn-sm" onClick={() => { setSelectedLiquidacion(liq); setAccion("rechazar"); setConfirmModalOpen(true); }}><XCircle className="w-4 h-4" /></button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modales */}
      {detalleModalOpen && selectedLiquidacion && (
        <DetalleLiquidacionModal open={detalleModalOpen} liquidacion={selectedLiquidacion} onClose={() => setDetalleModalOpen(false)} />
      )}
      {confirmModalOpen && selectedLiquidacion && (
        <ConfirmacionModal open={confirmModalOpen} accion={accion} onConfirm={handleAccion} onClose={() => setConfirmModalOpen(false)} />
      )}
    </div>
  );
}
