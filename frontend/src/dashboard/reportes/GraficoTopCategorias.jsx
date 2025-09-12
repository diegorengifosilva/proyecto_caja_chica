// frontend/src/dashboard/reportes/GraficoTopCategorias.jsx
import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { ChartPie } from "lucide-react";
import { motion } from "framer-motion";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function GraficoTopCategorias({ data }) {
  const chartData = {
    labels: data.map((item) => item.categoria),
    datasets: [
      {
        label: "Gastos por Categoría",
        data: data.map((item) => item.monto),
        backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"],
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { color: "#374151" } },
      tooltip: { callbacks: { label: (context) => `S/ ${context.raw}` } },
    },
    animation: { animateScale: true, animateRotate: true },
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-4 transition h-[350px]"
    >
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-200">
        <ChartPie size={18} /> Top Categorías de Gasto
      </h2>
      <div className="w-full h-[90%]">
        <Pie data={chartData} options={chartOptions} />
      </div>
    </motion.div>
  );
}
