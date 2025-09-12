// boleta_project/frontend/src/dashboard/reportes/GraficoComparativoMensual.jsx
import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { BarChart2 } from "lucide-react";
import { motion } from "framer-motion";

export default function GraficoComparativoMensual({ data }) {
  // Rotación dinámica según cantidad de meses
  const angle = data.length > 8 ? -30 : 0;
  const fontSize = data.length > 12 ? 10 : 12;

  const barSize = data.length > 12 ? Math.max(8, 60 - data.length * 2) : 50;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-4 transition h-[350px]"
    >
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-200">
        <BarChart2 size={18} /> Comparativa Mensual
      </h2>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <XAxis 
            dataKey="mes" 
            stroke="#374151" 
            tick={{ fontSize, fontWeight: "bold", angle, textAnchor: angle !== 0 ? "end" : "middle" }} 
          />
          <YAxis stroke="#374151" tick={{ fontWeight: "bold" }} />
          <Tooltip formatter={(value) => `S/ ${value.toLocaleString()}`} />
          <Legend />
          <Bar dataKey="gastos" fill="#3b82f6" barSize={barSize} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
