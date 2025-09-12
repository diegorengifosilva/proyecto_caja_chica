// boleta_project/frontend/src/components/ui/KpiCard.jsx

import React from "react";
import CountUp from "react-countup";
import Tippy from "@tippyjs/react";
import { Info } from "lucide-react";

const KpiCard = ({ label, value, gradient, icon: Icon, tooltip, decimals = 0 }) => {
  return (
    <div
      className="
        rounded-xl p-4 shadow-md text-white relative
        flex flex-col items-center justify-center text-center
        transition-all duration-300 transform
        hover:scale-105 hover:shadow-lg cursor-pointer
        min-h-[90px] sm:min-h-[100px]
      "
      style={{ background: gradient }}
    >
      {/* Tooltip en esquina */}
      {tooltip && (
        <div className="absolute top-2 right-2">
          <Tippy content={tooltip}>
            <Info size={14} className="text-white opacity-80 cursor-pointer" />
          </Tippy>
        </div>
      )}

      {/* Ícono */}
      {Icon && <Icon className="w-6 h-6 mb-2 opacity-90" />}

      {/* Label */}
      <p className="text-xs sm:text-sm opacity-90">{label}</p>

      {/* Valor animado */}
      <p className="text-xl sm:text-2xl font-bold">
        <CountUp
          end={Number(value) || 0}
          duration={1.2}
          separator=","
          decimals={decimals}
        />
      </p>
    </div>
  );
};

export default KpiCard;
