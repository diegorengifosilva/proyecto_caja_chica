// src/styles/pmTheme.jsx
import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Button as ShadcnButton } from "@/components/ui/button";

// 🎨 Paleta de colores extendida
const defaultColors = {
  primary: "#3b82f6", // Azul
  secondary: "#8b5cf6", // Violeta
  success: "#22c55e", // Verde
  warning: "#f59e0b", // Naranja
  danger: "#ef4444", // Rojo
  neutral: "#64748b", // Gris
};

// 🎨 Función para aplicar gradientes dinámicos
const GradientDefs = ({ colors }) => (
  <defs>
    {Object.entries(colors).map(([key, color]) => (
      <linearGradient
        key={key}
        id={`gradient-${key}`}
        x1="0"
        y1="0"
        x2="0"
        y2="1"
      >
        <stop offset="5%" stopColor={color} stopOpacity={0.9} />
        <stop offset="95%" stopColor={color} stopOpacity={0.15} />
      </linearGradient>
    ))}
  </defs>
);

// 🎨 Tooltip con estilo mejorado
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="rounded-xl shadow-md p-3"
        style={{
          backgroundColor: "#fff",
          border: "1px solid #e5e7eb",
          fontFamily: "Inter, sans-serif",
          fontSize: "0.875rem",
          color: "#374151",
        }}
      >
        <p className="font-semibold">{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// 📊 Wrapper adaptable para gráficos
export const ChartWrapper = ({
  type = "line", // "line" o "bar"
  data,
  colors = defaultColors, // Colores personalizables
  xKey,
  yKeys,
  height = 320,
  showLegend = true,
}) => {
  const ChartComponent = type === "line" ? LineChart : BarChart;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ChartComponent
        data={data}
        margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey={xKey}
          stroke="#6b7280"
          tick={{ fontFamily: "Inter, sans-serif", fontSize: 12 }}
        />
        <YAxis
          stroke="#6b7280"
          tick={{ fontFamily: "Inter, sans-serif", fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && (
          <Legend
            wrapperStyle={{
              fontFamily: "Inter, sans-serif",
              fontSize: "0.85rem",
            }}
          />
        )}

        <GradientDefs colors={colors} />

        {yKeys.map((yKey, index) =>
          type === "line" ? (
            <Line
              key={yKey}
              type="monotone"
              dataKey={yKey}
              stroke={`url(#gradient-${
                Object.keys(colors)[index % Object.keys(colors).length]
              })`}
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ) : (
            <Bar
              key={yKey}
              dataKey={yKey}
              fill={`url(#gradient-${
                Object.keys(colors)[index % Object.keys(colors).length]
              })`}
              radius={[8, 8, 0, 0]}
              barSize={40}
            />
          )
        )}
      </ChartComponent>
    </ResponsiveContainer>
  );
};

// 🎨 Estilos de KPI Cards alineados con la paleta
export const getKpiCardStyle = (color = defaultColors.primary) => ({
  background: `linear-gradient(135deg, ${color}cc, ${color}66)`,
  color: "#fff",
  borderRadius: "1rem",
  padding: "1.25rem",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  fontFamily: "Inter, sans-serif",
});

// 🔘 Botones con variantes según funcionalidad
export const Button = ({ children, variant = "primary", className = "", ...props }) => {
  const baseStyle =
    "rounded-xl shadow-sm transition-all hover:shadow-md font-medium";

  return (
    <ShadcnButton
      {...props}
      className={`${baseStyle} ${className}`}
      style={{
        backgroundColor: defaultColors[variant] || defaultColors.primary,
        color: "#fff",
      }}
    >
      {children}
    </ShadcnButton>
  );
};

// 🎨 Tema central exportable
export const pmTheme = {
  colors: defaultColors,
  getKpiCardStyle,
  ChartWrapper,
  Button,
};

export default pmTheme;
