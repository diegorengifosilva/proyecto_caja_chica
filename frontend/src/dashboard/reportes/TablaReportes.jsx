// src/dashboard/reportes/TablaReportes.jsx
import React from "react";
import { motion } from "framer-motion";
import { FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import Table from "@/components/ui/table";

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
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <FileText size={18} /> Detalle de Reportes
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Total: {data.length}
        </div>
      </div>

      {/* Tabla unificada */}
      <div className="overflow-x-auto max-h-[70vh] w-full">
        <Table
          headers={[
            "#",
            "Fecha",
            "Categoría",
            <span key="descripcion" className="hidden sm:table-cell">
              Descripción
            </span>,
            "Monto",
            <span key="accion" className="hidden md:table-cell">
              Acción
            </span>,
          ]}
          data={data}
          emptyMessage="No hay registros disponibles."
          renderRow={(item, index) => [
            // Número
            <span className="text-center font-semibold">{index + 1}</span>,

            // Fecha
            <span className="text-center">{item.fecha ?? "-"}</span>,

            // Categoría
            <span
              className={`px-2 py-0.5 rounded-full text-xs sm:text-sm ${
                COLORS.categorias[item.categoria] ?? COLORS.categorias["Otros"]
              } text-center`}
            >
              {item.categoria ?? "-"}
            </span>,

            // Descripción
            <span className="hidden sm:table-cell truncate sm:whitespace-normal max-w-[180px] text-center">
              {item.descripcion ?? "-"}
            </span>,

            // Monto
            <span className="text-center font-semibold">
              S/ {item.monto?.toFixed(2) ?? "0.00"}
            </span>,

            // Acción
            <div className="hidden md:flex justify-center">
              <Button
                variant="default"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  abrirModal?.(item);
                }}
                className="flex items-center gap-1 px-2 py-1"
              >
                <Eye className="w-4 h-4" /> Detalle
              </Button>
            </div>,
          ]}
          onRowClick={(item) => {
            if (window.innerWidth < 768) {
              abrirModal?.(item);
            }
          }}
        />
      </div>
    </motion.div>
  );
}
