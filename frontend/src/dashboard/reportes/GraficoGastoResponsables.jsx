// frontend/src/dashboard/reportes/GraficoGastoResponsables.jsx
import React from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
import { BarChart2 } from "lucide-react";
import { motion } from "framer-motion";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function GraficoGastoResponsables({ data }) {
  const chartData = {
    labels: data.map(d => d.responsable),
    datasets: [
      {
        label: "Gasto por Responsable",
        data: data.map(d => d.monto),
        backgroundColor: "#3b82f6",
        borderColor: "#3b82f6",
        borderWidth: 1,
        hoverBackgroundColor: "#2563eb",
        hoverBorderColor: "#2563eb",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", labels: { color: "#374151", font: { weight: "bold" } } },
      tooltip: { callbacks: { label: (context) => `S/ ${context.raw.toLocaleString()}` } },
    },
    scales: {
      x: { ticks: { color: "#374151", font: { weight: "bold" } }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { color: "#374151", font: { weight: "bold" } }, grid: { color: "rgba(229,231,235,0.5)" } },
    },
    animation: { duration: 1000, easing: "easeOutQuart" },
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-4 transition h-[350px]"
    >
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-200">
        <BarChart2 size={18} /> Gasto por Responsable
      </h2>
      <div className="w-full h-[90%]">
        <Bar data={chartData} options={chartOptions} />
      </div>
    </motion.div>
  );
}
