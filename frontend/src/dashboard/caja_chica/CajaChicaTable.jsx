// src/dashboard/caja_chica/CajaChicaTable.jsx
import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MovimientoDetalleModal from "./MovimientoDetalleModal";
import VistaDocumentoCajaModal from "./VistaDocumentoCajaModal";

const STATE_COLORS = {
  Ingreso: "#16a34a",
  Egreso: "#ef4444",
};

export default function CajaChicaTable({ movimientos }) {
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("Todos");
  const [activeRow, setActiveRow] = useState(null);
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [selectedMovimiento, setSelectedMovimiento] = useState(null);
  const [documentoModalOpen, setDocumentoModalOpen] = useState(false);

  const filteredMovimientos = useMemo(() => {
    return movimientos.filter((m) => {
      const matchSearch =
        m.numero_operacion?.toString().includes(search) ||
        m.concepto?.toLowerCase().includes(search.toLowerCase());
      const matchTipo = tipoFilter === "Todos" || m.tipo === tipoFilter;
      return matchSearch && matchTipo;
    });
  }, [movimientos, search, tipoFilter]);

  const totalIngresos = useMemo(
    () =>
      filteredMovimientos
        .filter((m) => m.tipo === "Ingreso")
        .reduce((acc, m) => acc + (m.monto || 0), 0),
    [filteredMovimientos]
  );

  const totalEgresos = useMemo(
    () =>
      filteredMovimientos
        .filter((m) => m.tipo === "Egreso")
        .reduce((acc, m) => acc + (m.monto || 0), 0),
    [filteredMovimientos]
  );

  const saldoActual = totalIngresos - totalEgresos;

  const handleAbrirDetalle = (movimiento) => {
    setSelectedMovimiento(movimiento);
    setDetalleModalOpen(true);
    setActiveRow(movimiento.id);
  };

  const handleAbrirDocumento = (movimiento) => {
    if (!movimiento.documento) return;
    setSelectedMovimiento(movimiento);
    setDocumentoModalOpen(true);
    setActiveRow(movimiento.id);
  };

  return (
    <div className="space-y-4">
      {/* Filtros y búsqueda */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
        <input
          type="text"
          placeholder="Buscar por N° operación o concepto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs border rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="flex gap-2">
          {["Todos", "Ingreso", "Egreso"].map((tipo) => (
            <Button
              key={tipo}
              variant={tipoFilter === tipo ? "secondary" : "outline"}
              onClick={() => setTipoFilter(tipo)}
            >
              {tipo}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto shadow-md rounded-xl border border-gray-200">
        <table className="min-w-full text-center">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-3">N° Operación</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Concepto</th>
              <th className="px-4 py-3">Monto</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredMovimientos.length > 0 ? (
                filteredMovimientos.map((m) => (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`border-t border-gray-100 hover:shadow-lg hover:translate-y-[-2px] hover:bg-gray-50 transition-transform duration-200 ${
                      activeRow === m.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => setActiveRow(m.id)}
                  >
                    <td className="px-4 py-3 font-semibold">{m.numero_operacion || "-"}</td>
                    <td className="px-4 py-3">{m.fecha || "-"}</td>
                    <td className="px-4 py-3">
                      <Badge
                        style={{
                          backgroundColor: STATE_COLORS[m.tipo] || "#6b7280",
                          color: "#fff",
                        }}
                      >
                        {m.tipo || "-"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{m.concepto || "-"}</td>
                    <td className="px-4 py-3">S/ {(m.monto || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">{m.usuario || "-"}</td>
                    <td className="px-4 py-3">
                      {m.documento ? (
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-blue-300 to-blue-400 hover:from-blue-400 hover:to-blue-500 text-white p-2 rounded-lg shadow-md transition"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAbrirDocumento(m);
                          }}
                        >
                          {m.documento.nombre}
                        </Button>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button className="bg-gradient-to-r from-indigo-400 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white p-2 rounded-lg shadow-md transition"
                        onClick={()=>{ setSelectedMovimiento(mov); setDetalleMovimientoOpen(true); }}>
                        <Eye size={16}/>
                      </button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-gray-500">
                    No hay movimientos registrados.
                  </td>
                </tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* KPIs */}
      <div className="flex justify-end gap-6 mt-2 font-medium text-sm">
        <p>Total Ingresos: S/ {totalIngresos.toFixed(2)}</p>
        <p>Total Egresos: S/ {totalEgresos.toFixed(2)}</p>
        <p>Saldo Actual: S/ {saldoActual.toFixed(2)}</p>
      </div>

      {/* Modal de detalle */}
      {detalleModalOpen && selectedMovimiento && (
        <MovimientoDetalleModal
          open={detalleModalOpen}
          onClose={() => setDetalleModalOpen(false)}
          movimiento={selectedMovimiento}
        />
      )}

      {/* Modal de documento */}
      {documentoModalOpen && selectedMovimiento?.documento && (
        <VistaDocumentoCajaModal
          open={documentoModalOpen}
          onClose={() => setDocumentoModalOpen(false)}
          documento={selectedMovimiento.documento}
        />
      )}
    </div>
  );
}
