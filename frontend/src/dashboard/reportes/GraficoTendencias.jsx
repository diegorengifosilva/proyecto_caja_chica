// boleta_project/frontend/src/dashboard/reportes/GraficoTendencias.jsx
import React from "react";
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import ChartWrapped from "@/components/ui/ChartWrapped";
import { TrendingUp } from "lucide-react";

export default function GraficoTendencias({ data }) {
  const tooltipFormatter = (value) => `S/ ${value.toLocaleString()}`;

  return (
    <ChartWrapped
      title="Tendencia de Gastos"
      icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />}
      tooltipFormatter={tooltipFormatter}
      className="flex-1 h-56 sm:h-64 md:h-80 xl:h-[28rem] w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ReLineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="mes" stroke="#374151" tick={{ fontSize: 12, fontWeight: "bold" }} />
          <YAxis stroke="#374151" tick={{ fontSize: 12, fontWeight: "bold" }} />
          <RechartsTooltip formatter={tooltipFormatter} />
          <Legend />
          <Line
            type="monotone"
            dataKey="gastos"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </ReLineChart>
      </ResponsiveContainer>
    </ChartWrapped>
  );
}
