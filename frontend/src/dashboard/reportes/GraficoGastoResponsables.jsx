// frontend/src/dashboard/reportes/GraficoGastoResponsables.jsx
import React from "react";
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import ChartWrapped from "@/components/ui/ChartWrapped";
import { BarChart2 } from "lucide-react";

export default function GraficoGastoResponsables({ data }) {
  const tooltipFormatter = (value) => `S/ ${value.toLocaleString()}`;

  return (
    <ChartWrapped
      title="Gasto por Responsable"
      icon={<BarChart2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />}
      tooltipFormatter={tooltipFormatter}
      className="flex-1 h-56 sm:h-64 md:h-80 xl:h-[28rem] w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ReBarChart
          data={data}
          margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="responsable"
            stroke="#374151"
            tick={{ fontSize: 12, fontWeight: "bold" }}
          />
          <YAxis
            stroke="#374151"
            tick={{ fontSize: 12, fontWeight: "bold" }}
          />
          <RechartsTooltip formatter={tooltipFormatter} />
          <Legend />
          <Bar
            dataKey="monto"
            fill="#3b82f6"
            radius={[6, 6, 0, 0]}
          />
        </ReBarChart>
      </ResponsiveContainer>
    </ChartWrapped>
  );
}
