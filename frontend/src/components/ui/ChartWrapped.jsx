// boleta_project/frontend/src/components/ui/ChartWrapped.jsx
import React from "react";
import { Card, CardContent } from "./card"; 
import PropTypes from "prop-types";

/* Tooltip formatter genérico para charts */
export const tooltipFormatter = (value, name, props) => [`${value}`, `${name}`];
export const radialTooltipFormatter = (value, name, payload) => [`${value}`, `${name}`];

const ChartWrapped = ({ title, icon, subtitle, children, className = "", legend = [], tooltipFormatter: tf }) => {
  return (
    <Card className={`w-full max-w-full rounded-xl shadow-md hover:shadow-lg transition-shadow ${className}`}>
      <CardContent className="flex flex-col p-4 w-full h-full">

        {/* Header */}
        {(title || subtitle || icon) && (
          <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {icon && <span className="text-gray-700">{icon}</span>}
              {title && <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-700">{title}</h3>}
            </div>
            {subtitle && <div className="text-sm sm:text-base text-gray-500">{subtitle}</div>}
          </div>
        )}

        {/* Leyenda */}
        {legend && legend.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {legend.map((l, i) => (
              <div key={i} className="flex items-center gap-1 flex-wrap">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                <span className="text-sm sm:text-base text-gray-700">
                  {l.name} ({l.value})
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Gráfico / Contenido */}
        <div className="flex-1 w-full min-h-[220px] sm:min-h-[280px] md:min-h-[320px] lg:min-h-[360px]">
          {React.Children.map(children, (child) => {
            // Clonar tooltip si se pasó un formatter
            if (tf && child?.type?.displayName === "Tooltip") {
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
