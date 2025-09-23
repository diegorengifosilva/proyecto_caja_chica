// boleta_project/frontend/src/dashboard/reportes/GraficoGastosCategoria.jsx
import React from "react";
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import ChartWrapped from "@/components/ui/ChartWrapped";
import { ChartPie } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

export default function GraficoGastosCategoria({ data }) {
  // Ajuste dinámico para labels si hay muchas categorías
  const labelFontSize = data.length > 5 ? 10 : 12;

  const tooltipFormatter = (value, name) => [`S/ ${value.toLocaleString()}`, name];

  return (
    <ChartWrapped
      title="Gastos por Categoría"
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
                data={data}
                dataKey="monto"
                nameKey="categoria"
                cx="50%"
                cy="50%"
                outerRadius="80%"
                paddingAngle={3}
                label={({ name, value }) => `${name} (${value})`}
                labelStyle={{ fontSize: labelFontSize }}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <RechartsTooltip formatter={(value) => `S/ ${value.toLocaleString()}`} />
            </RePieChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda personalizada */}
        <div className="w-full lg:w-40 flex-shrink-0 mt-3 lg:mt-0">
          {data.map((item, i) => (
            <div
              key={item.categoria}
              className="flex items-center gap-2 text-[10px] sm:text-xs md:text-sm text-gray-700 mb-2"
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  background: COLORS[i % COLORS.length],
                  display: "inline-block",
                  borderRadius: 3,
                }}
              />
              <span className="font-medium">{item.categoria}</span>
              <span className="text-gray-500 ml-1">(S/ {item.monto})</span>
            </div>
          ))}
        </div>
      </div>
    </ChartWrapped>
  );
}
