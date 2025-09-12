// boleta_project/frontend/src/dashboard/reportes/GraficoTendencias.jsx
import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function GraficoTendencias({ data }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-4 transition h-[350px]"
    >
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-200">
        <TrendingUp size={18} /> Tendencia de Gastos
      </h2>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data}>
          <XAxis dataKey="mes" stroke="#374151" tick={{ fontWeight: "bold" }} />
          <YAxis stroke="#374151" tick={{ fontWeight: "bold" }} />
          <Tooltip formatter={(value) => `S/ ${value.toLocaleString()}`} />
          <Legend />
          <Line type="monotone" dataKey="gastos" stroke="#10b981" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
