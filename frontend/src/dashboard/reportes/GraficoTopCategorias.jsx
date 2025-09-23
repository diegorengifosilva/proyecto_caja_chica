// frontend/src/dashboard/reportes/GraficoTopCategorias.jsx
import React from "react";
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import ChartWrapped from "@/components/ui/ChartWrapped";
import { ChartPie } from "lucide-react";

// Colores predefinidos para las categorías
const CATEGORY_COLORS = {
  Transporte: "#3b82f6",
  Alimentación: "#10b981",
  Servicios: "#f59e0b",
  Educación: "#8b5cf6",
  Salud: "#ef4444",
};

export default function GraficoTopCategorias({ data }) {
  // Transformamos la data a formato Recharts
  const chartData = data.map((item) => ({
    name: item.categoria,
    value: item.monto,
  }));

  const tooltipFormatter = (value, name) => [`S/ ${value}`, name];

  return (
    <ChartWrapped
      title="Top Categorías de Gasto"
      icon={<ChartPie className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />}
      tooltipFormatter={tooltipFormatter}
      className="flex-1 h-56 sm:h-64 md:h-80 xl:h-[28rem] w-full"
    >
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-full items-stretch">
        {/* Gráfico */}
        <div className="flex-1 min-h-[160px] sm:min-h-[200px] md:min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <RePieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius="50%"
                outerRadius="80%"
                paddingAngle={3}
                label
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={CATEGORY_COLORS[entry.name] || "#334155"}
                  />
                ))}
              </Pie>
              <RechartsTooltip formatter={(value, name) => [`S/ ${value}`, name]} />
            </RePieChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda */}
        <div className="w-full lg:w-40 flex-shrink-0 mt-3 lg:mt-0">
          {chartData.map((c) => (
            <div
              key={c.name}
              className="flex items-center gap-2 text-[10px] sm:text-xs md:text-sm text-gray-700 mb-2"
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  background: CATEGORY_COLORS[c.name] || "#334155",
                  display: "inline-block",
                  borderRadius: 3,
                }}
              />
              <span className="font-medium">{c.name}</span>
              <span className="text-gray-500 ml-1">(S/ {c.value})</span>
            </div>
          ))}
        </div>
      </div>
    </ChartWrapped>
  );
}
