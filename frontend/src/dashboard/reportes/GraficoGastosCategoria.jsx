// boleta_project/frontend/src/dashboard/reportes/GraficoGastosCategoria.jsx
import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartPie } from "lucide-react";
import { motion } from "framer-motion";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

export default function GraficoGastosCategoria({ data }) {
  // Si hay muchas categorías, reducir tamaño de label y separar fuera
  const labelFontSize = data.length > 5 ? 10 : 12;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-4 transition h-[350px]"
    >
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-200">
        <ChartPie size={18} /> Gastos por Categoría
      </h2>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={data}
            dataKey="monto"
            nameKey="categoria"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={{ fontSize: labelFontSize }}
          >
            {data.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={value => `S/ ${value}`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
