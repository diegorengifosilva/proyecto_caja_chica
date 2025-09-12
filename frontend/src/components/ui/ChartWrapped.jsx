// boleta_project/frontend/src/components/ui/ChartWrapped.jsx
import React from "react";
import { Card, CardContent } from "./card"; 
import PropTypes from "prop-types";

/* Tooltip formatter genérico para charts: muestra nombre y cantidad */
export const tooltipFormatter = (value, name, props) => [`${value}`, `${name}`];

/* Tooltip personalizado para radial: mostrar "Nombre: valor" */
export const radialTooltipFormatter = (value, name, payload) => [`${value}`, `${name}`];

/**
 * ChartWrapper
 * Contenedor unificado para gráficos en dashboards.
 *
 * Props:
 *  - title: string -> título principal del gráfico
 *  - icon: JSX -> ícono opcional a mostrar junto al título
 *  - subtitle: string -> subtítulo opcional (ej: "Última actualización")
 *  - children: JSX -> el gráfico o componente a renderizar dentro del card
 *  - className: string -> clases adicionales opcionales para el card
 *  - legend: array -> [{ name, value, color }] opcional, para leyendas debajo del header
 *  - tooltipFormatter: function -> formatter opcional para tooltips
 */
const ChartWrapped = ({ title, icon, subtitle, children, className = "", legend = [], tooltipFormatter: tf }) => {
  return (
    <Card className={`rounded-xl shadow-md hover:shadow-lg transition-shadow ${className}`}>
      <CardContent className="flex flex-col p-4 w-full h-full">
        {/* Header */}
        {(title || subtitle || icon) && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {icon && <span className="text-gray-700">{icon}</span>}
              {title && <h3 className="text-lg font-semibold text-gray-700">{title}</h3>}
            </div>
            {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
          </div>
        )}

        {/* Leyenda */}
        {legend && legend.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {legend.map((l, i) => (
              <div key={i} className="flex items-center gap-1">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: l.color }}
                />
                <span className="text-sm text-gray-700">
                  {l.name} ({l.value})
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Gráfico / Contenido */}
        <div className="flex-1 w-full min-h-[220px]">
          {React.Children.map(children, (child) => {
            // Si el hijo es un Tooltip y se pasó un formatter, clonarlo con la prop
            if (
              tf &&
              child?.type?.displayName === "Tooltip"
            ) {
              return React.cloneElement(child, { formatter: tf });
            }
            return child;
          })}
        </div>
      </CardContent>
    </Card>
  );
};

ChartWrapped.propTypes = {
  title: PropTypes.string,
  icon: PropTypes.element,
  subtitle: PropTypes.string,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  legend: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      color: PropTypes.string.isRequired,
    })
  ),
  tooltipFormatter: PropTypes.func,
};

export default ChartWrapped;
