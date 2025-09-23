// boleta_project/frontend/src/dashboard/reportes/GraficoComparativoMensual.jsx
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import ChartWrapped from "@/components/ui/ChartWrapped";
import { BarChart2 } from "lucide-react";

export default function GraficoComparativoMensual({ data }) {
  // Rotación dinámica según cantidad de meses
  const angle = data.length > 8 ? -30 : 0;
  const fontSize = data.length > 12 ? 10 : 12;
  const barSize = data.length > 12 ? Math.max(8, 60 - data.length * 2) : 40;

  const tooltipFormatter = (value) => [`S/ ${value.toLocaleString()}`, "Gastos"];

  return (
    <ChartWrapped
      title="Comparativa Mensual"
      icon={<BarChart2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />}
      tooltipFormatter={tooltipFormatter}
      className="flex-1 h-56 sm:h-64 md:h-80 xl:h-[28rem] w-full"
    >
      <div className="flex-1 min-h-[160px] sm:min-h-[200px] md:min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
          >
            <XAxis
              dataKey="mes"
              stroke="#374151"
              tick={{
                fontSize,
                fontWeight: "bold",
                angle,
                textAnchor: angle !== 0 ? "end" : "middle",
              }}
            />
            <YAxis stroke="#374151" tick={{ fontWeight: "bold" }} />
            <RechartsTooltip formatter={(value) => `S/ ${value.toLocaleString()}`} />
            <Legend />
            <Bar dataKey="gastos" fill="#3b82f6" barSize={barSize} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapped>
  );
}
