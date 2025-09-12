// src/dashboard/reportes/TablaReportes.jsx
import React from "react";
import { motion } from "framer-motion";
import { FileText, Eye } from "lucide-react";

const COLORS = {
  categorias: {
    Transporte: "bg-blue-200 text-blue-800 dark:bg-blue-700/40 dark:text-blue-200",
    Alimentación: "bg-green-200 text-green-800 dark:bg-green-700/40 dark:text-green-200",
    Oficina: "bg-indigo-200 text-indigo-800 dark:bg-indigo-700/40 dark:text-indigo-200",
    Hospedaje: "bg-purple-200 text-purple-800 dark:bg-purple-700/40 dark:text-purple-200",
    Otros: "bg-gray-200 text-gray-800 dark:bg-gray-700/40 dark:text-gray-200",
  },
};

export default function TablaReportes({ data = [], abrirModal }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 overflow-x-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <FileText size={18} />
          Detalle de Reportes
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Total: {data.length}
        </div>
      </div>

      {/* Tabla */}
      <table className="min-w-full table-auto rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-100 text-center">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Categoría</th>
            <th className="px-4 py-3 hidden sm:table-cell">Descripción</th>
            <th className="px-4 py-3">Monto</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                No hay registros disponibles.
              </td>
            </tr>
          )}

          {data.map((item, index) => (
            <motion.tr
              key={item.id ?? index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-gray-100 dark:border-gray-700 hover:shadow-lg hover:translate-y-[-2px] hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-transform duration-200"
            >
              {/* Número secuencial */}
              <td className="px-4 py-3 font-semibold">{index + 1}</td>

              {/* Fecha */}
              <td className="px-4 py-3">{item.fecha ?? "-"}</td>

              {/* Categoría con colores */}
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-1 rounded-full ${COLORS.categorias[item.categoria] ?? COLORS.categorias["Otros"]}`}>
                  {item.categoria ?? "-"}
                </span>
              </td>

              {/* Descripción */}
              <td className="px-4 py-3 hidden sm:table-cell">{item.descripcion ?? "-"}</td>

              {/* Monto */}
              <td className="px-4 py-3 font-semibold">
                S/ {item.monto?.toFixed(2) ?? "0.00"}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
