// src/dashboard/registro_actividades/TablaActividades.jsx
import React from "react";
import { motion } from "framer-motion";
import { FileText, Eye } from "lucide-react";
import { formatearFecha } from "./utils";

// Colores personalizados
const COLORS = {
  tipos: {
    "Aprobación": "bg-green-200 text-green-800 dark:bg-green-700/40 dark:text-green-200",
    "Rechazo": "bg-red-200 text-red-800 dark:bg-red-700/40 dark:text-red-200",
    "Devolución": "bg-orange-200 text-orange-800 dark:bg-orange-700/40 dark:text-orange-200",
    "Pendiente": "bg-yellow-200 text-yellow-800 dark:bg-yellow-700/40 dark:text-yellow-200",
    "Otro": "bg-indigo-200 text-indigo-800 dark:bg-indigo-700/40 dark:text-indigo-200",
  },
  acciones: {
    "Aprobado": "bg-green-200 text-green-800 dark:bg-green-700/40 dark:text-green-200",
    "Rechazado": "bg-red-200 text-red-800 dark:bg-red-700/40 dark:text-red-200",
    "Pendiente": "bg-yellow-200 text-yellow-800 dark:bg-yellow-700/40 dark:text-yellow-200",
    "Devolucion": "bg-orange-200 text-orange-800 dark:bg-orange-700/40 dark:text-orange-200",
    "Otro": "bg-gray-200 text-gray-800 dark:bg-gray-700/40 dark:text-gray-200",
  },
};

export default function TablaActividades({ actividades, abrirModal }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <FileText size={18} />
          Registro de Actividades
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Total: {actividades.length}
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-100 text-center">
            <tr>
              <th className="px-4 py-3">N°</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3 hidden sm:table-cell">Tipo</th>
              <th className="px-4 py-3">Acción</th>
              <th className="px-4 py-3 hidden sm:table-cell">Descripción</th>
              <th className="px-4 py-3 hidden sm:table-cell">Fecha</th>
              <th className="px-4 py-3 text-center">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {actividades.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-gray-500 dark:text-gray-400"
                >
                  No hay actividades registradas por ahora.
                </td>
              </tr>
            )}

            {actividades.map((act, index) => (
              <motion.tr
                key={act.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-gray-100 dark:border-gray-700 hover:shadow-lg hover:translate-y-[-2px] hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-transform duration-200"
              >
                {/* Número secuencial */}
                <td className="px-4 py-3 font-semibold">{index + 1}</td>
                <td className="px-4 py-3">{act.usuario ?? "-"}</td>

                {/* Tipo con colores */}
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      COLORS.tipos[act.tipo] || COLORS.tipos["Otro"]
                    }`}
                  >
                    {act.tipo ?? "-"}
                  </span>
                </td>

                {/* Acción con colores */}
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      COLORS.acciones[act.accion] || COLORS.acciones["Otro"]
                    }`}
                  >
                    {act.accion ?? "-"}
                  </span>
                </td>

                <td className="px-4 py-3 hidden sm:table-cell">
                  {act.descripcion ?? "-"}
                </td>

                <td className="px-4 py-3 hidden sm:table-cell">
                  {formatearFecha(act.fecha) ?? "-"}
                </td>

                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => abrirModal(act)}
                    className="bg-gradient-to-r from-indigo-300 to-indigo-400 hover:from-indigo-400 hover:to-indigo-500 text-white text-sm px-4 py-1.5 rounded-lg shadow-md transition flex items-center gap-2 justify-center"
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
