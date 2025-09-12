// src/dashboard/guias_salida/TablaGuiasSalida.jsx
import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Package, Eye } from "lucide-react";

// Colores personalizados para los estados
const ESTADO_COLORS = {
  Pendiente: "bg-yellow-200 text-yellow-800 dark:bg-yellow-700/40 dark:text-yellow-200",
  Enviada: "bg-blue-200 text-blue-800 dark:bg-blue-700/40 dark:text-blue-200",
  Recibida: "bg-green-200 text-green-800 dark:bg-green-700/40 dark:text-green-200",
  Otro: "bg-gray-200 text-gray-800 dark:bg-gray-700/40 dark:text-gray-200",
};

// Estilos de hover reutilizables
const hoverRowStyle =
  "transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:bg-gray-50 dark:hover:bg-gray-700/40";

export default function TablaGuiasSalida({ guias, abrirDetalle }) {
  const [filtroResponsable, setFiltroResponsable] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [sortKey, setSortKey] = useState("fecha");
  const [sortOrder, setSortOrder] = useState("desc");

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const guiasFiltradas = useMemo(() => {
    return guias
      .filter((g) => {
        const cumpleResponsable = filtroResponsable
          ? g.responsable.toLowerCase().includes(filtroResponsable.toLowerCase())
          : true;
        const cumpleEstado = filtroEstado
          ? g.estado.toLowerCase().includes(filtroEstado.toLowerCase())
          : true;
        return cumpleResponsable && cumpleEstado;
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
  }, [guias, filtroResponsable, filtroEstado, sortKey, sortOrder]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <Package size={18} />
          Guías de Salida
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Total: {guias.length}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <input
          type="text"
          placeholder="Filtrar por responsable"
          className="border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          value={filtroResponsable}
          onChange={(e) => setFiltroResponsable(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filtrar por estado"
          className="border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
        />
        <button
          onClick={() => {
            setFiltroResponsable("");
            setFiltroEstado("");
          }}
          className="bg-gradient-to-r from-indigo-400 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white text-sm px-4 py-1.5 rounded-lg shadow-md transition"
        >
          Limpiar filtros
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-100 text-left">
            <tr>
              <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort("numero")}>
                N°
              </th>
              <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort("fecha")}>
                Fecha
              </th>
              <th className="px-4 py-3">Origen → Destino</th>
              <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort("responsable")}>
                Responsable
              </th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-center">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {guiasFiltradas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                  No hay guías registradas por ahora.
                </td>
              </tr>
            )}

            {guiasFiltradas.map((g) => (
              <motion.tr
                key={g.numero}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`border-t border-gray-100 dark:border-gray-700 ${hoverRowStyle}`}
              >
                <td className="px-4 py-3 font-semibold">{g.numero ?? "-"}</td>
                <td className="px-4 py-3">{new Date(g.fecha).toLocaleString()}</td>
                <td className="px-4 py-3">{g.origen} → {g.destino}</td>
                <td className="px-4 py-3">{g.responsable}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      ESTADO_COLORS[g.estado] || ESTADO_COLORS["Otro"]
                    }`}
                  >
                    {g.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => abrirDetalle(g)}
                    className="bg-gradient-to-r from-indigo-400 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white text-sm px-4 py-1.5 rounded-lg shadow-md transition flex items-center gap-2 justify-center transform hover:scale-[1.05]"
                  >
                    <Eye size={16} />
                    Ver detalle
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
