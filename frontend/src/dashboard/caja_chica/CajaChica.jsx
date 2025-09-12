// src/dashboard/caja_chica/CajaChica.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, 
  DollarSign,
  BanknoteArrowUp, 
  BanknoteArrowDown,
  CirclePlus,
  BookmarkPlus,
  CircleX
} from "lucide-react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from "recharts";
import CountUp from "react-countup";
import AperturaCajaModal from "./AperturaCajaModal";
import CierreCajaModal from "./CierreCajaModal";
import MovimientoFormModal from "./MovimientoFormModal";
import MovimientoDetalleModal from "./MovimientoDetalleModal";
import VistaDocumentoCajaModal from "./VistaDocumentoCajaModal";
import CajaChicaTable from "./CajaChicaTable";
import api from "@/services/api";

const DEV_FAKE_DATA = true;

const fakeCaja = {
  id: 1,
  fecha_apertura: "2025-08-14",
  monto_inicial: 1000,
  cerrada: false,
};

const fakeMovimientos = [
  { id: 1, fecha: "2025-08-14", tipo: "Ingreso", concepto: "Rollover", monto: 200, usuario: "Admin", documento: null },
  { id: 2, fecha: "2025-08-14", tipo: "Egreso", concepto: "Compra de papelería", monto: 50, usuario: "Admin", documento: { nombre: "Ticket Papelería", url: "/fake-doc1.jpg" } },
  { id: 3, fecha: "2025-08-14", tipo: "Egreso", concepto: "Yape a proveedor", monto: 150, usuario: "Admin", documento: { nombre: "Yape", url: "/fake-doc2.jpg" } },
];

const TYPE_COLORS = { Ingreso: "#16a34a", Egreso: "#ef4444" };
const KPI_COLORS = { saldo: "#3b82f6", ingresos: "#16a34a", egresos: "#ef4444" };
const hoverCardStyle = "rounded-xl p-4 shadow-md transform transition-transform hover:scale-[1.02] text-center";

export default function CajaChica() {
  const [caja, setCaja] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [aperturaModalOpen, setAperturaModalOpen] = useState(false);
  const [cierreModalOpen, setCierreModalOpen] = useState(false);
  const [movimientoFormOpen, setMovimientoFormOpen] = useState(false);

  const [selectedMovimiento, setSelectedMovimiento] = useState(null);
  const [selectedDocumento, setSelectedDocumento] = useState(null);
  const [detalleMovimientoOpen, setDetalleMovimientoOpen] = useState(false);
  const [vistaDocumentoOpen, setVistaDocumentoOpen] = useState(false);

  // Fetch movimientos (puedes reemplazar con API real)
  const fetchMovimientos = async () => {
    if (DEV_FAKE_DATA) {
      setLoading(true);
      setTimeout(() => {
        setMovimientos(fakeMovimientos);
        setCaja(fakeCaja);
        setLoading(false);
      }, 800);
    } else {
      try {
        setLoading(true);
        const res = await api.get(`/boleta/caja_diaria/${caja?.id}/movimientos/`);
        setMovimientos(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => { fetchMovimientos(); }, []);

  const totales = useMemo(() => {
    const ingresos = movimientos.filter(m => m.tipo === "Ingreso").reduce((a, b) => a + b.monto, 0);
    const egresos = movimientos.filter(m => m.tipo === "Egreso").reduce((a, b) => a + b.monto, 0);
    const saldo = (caja?.monto_inicial || 0) + ingresos - egresos;
    return { ingresos, egresos, saldo };
  }, [movimientos, caja]);

  const pieData = useMemo(() => [
    { name: "Ingresos", value: totales.ingresos, fill: TYPE_COLORS["Ingreso"] },
    { name: "Egresos", value: totales.egresos, fill: TYPE_COLORS["Egreso"] },
  ], [totales]);

  const getBarWidth = (amount) => {
    const max = Math.max(totales.saldo, totales.ingresos, totales.egresos, 1);
    return `${(amount / max) * 100}%`;
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-4">
        <Wallet className="w-6 h-6" /> Caja Chica
      </h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        {[
          { label: "Saldo Actual", value: totales.saldo, color: KPI_COLORS.saldo },
          { label: "Total Ingresos", value: totales.ingresos, color: KPI_COLORS.ingresos },
          { label: "Total Egresos", value: totales.egresos, color: KPI_COLORS.egresos },
        ].map((kpi, idx) => (
          <div key={idx} className={`${hoverCardStyle} flex flex-col items-center justify-center text-white p-5 rounded-xl`} 
            style={{ background: `linear-gradient(135deg, ${kpi.color}cc, ${kpi.color}99)` }}>
            <p className="text-sm font-medium">{kpi.label}</p>
            <p className="text-2xl font-bold mt-1">
              <CountUp end={kpi.value} duration={1.2} separator="," decimals={2}/>
            </p>
            {kpi.label !== "Saldo Actual" && (
              <div className="w-full h-2 bg-white bg-opacity-30 rounded-full mt-2">
                <div
                  className="h-2 rounded-full"
                  style={{ width: getBarWidth(kpi.value), backgroundColor: kpi.color }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pie Chart */}
      <Card className="shadow-lg rounded-xl mt-5">
        <CardContent>
          <div className="flex items-center justify-center gap-2 mb-2">
            <PieChart className="w-5 h-5 text-gray-800" />
            <h3 className="text-center font-medium">Distribución Ingresos/Egresos</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie 
                data={pieData} 
                dataKey="value" 
                nameKey="name" 
                innerRadius={55} 
                outerRadius={85} 
                label={({ name, percent }) => `${name} ${(percent*100).toFixed(1)}%`}
              >
                {pieData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
              </Pie>
              <Tooltip formatter={(value) => `${value.toFixed(2)} S/`} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <div className="flex flex-wrap gap-4 mt-4">
        {!caja?.cerrada ? (
          <>
            <button
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg shadow-md flex items-center gap-2 transition"
              onClick={() => setAperturaModalOpen(true)}
            >
              <CirclePlus size={16} /> Abrir Caja
            </button>

            <button
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg shadow-md flex items-center gap-2 transition"
              onClick={() => setMovimientoFormOpen(true)}
              disabled={!caja}
            >
              <BookmarkPlus size={16} /> Nuevo Movimiento
            </button>

            <button
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-red-500 hover:to-red-600 text-white px-4 py-2 rounded-lg shadow-md flex items-center gap-2 transition"
              onClick={() => setCierreModalOpen(true)}
              disabled={!caja}
            >
              <CircleX size={16} /> Cerrar Caja
            </button>
          </>
        ) : (
          <Badge variant="outline" className="text-gray-600">Caja cerrada</Badge>
        )}
      </div>

      {/* Tabla integrada */}
      <CajaChicaTable
        movimientos={movimientos}
        onMovimientoSeleccionado={(mov) => { setSelectedMovimiento(mov); setDetalleMovimientoOpen(true); }}
        onMovimientoGuardado={fetchMovimientos}
      />

      {/* Modales */}
      {aperturaModalOpen && <AperturaCajaModal open={aperturaModalOpen} onClose={()=>setAperturaModalOpen(false)}/>}
      {cierreModalOpen && <CierreCajaModal open={cierreModalOpen} onClose={()=>setCierreModalOpen(false)} caja={caja} totales={totales}/>}
      {movimientoFormOpen && (
        <MovimientoFormModal
          open={movimientoFormOpen}
          onClose={()=>setMovimientoFormOpen(false)}
          cajaId={caja?.id}
          onMovimientoGuardado={fetchMovimientos}
        />
      )}
      {detalleMovimientoOpen && selectedMovimiento && (
        <MovimientoDetalleModal
          open={detalleMovimientoOpen}
          onClose={()=>setDetalleMovimientoOpen(false)}
          movimiento={selectedMovimiento}
        />
      )}
      {vistaDocumentoOpen && selectedDocumento && (
        <VistaDocumentoCajaModal
          open={vistaDocumentoOpen}
          onClose={()=>setVistaDocumentoOpen(false)}
          documento={selectedDocumento}
        />
      )}
    </div>
  );
}
