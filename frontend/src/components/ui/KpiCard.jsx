// boleta_project/frontend/src/components/ui/KpiCard.jsx

import React from "react";
import CountUp from "react-countup";
import Tippy from "@tippyjs/react";
import { Info } from "lucide-react";

const KpiCard = ({ label, value, gradient, icon: Icon, tooltip, decimals = 0 }) => {
  return (
    <div
      className="
        w-full max-w-full rounded-xl p-3 sm:p-4 md:p-5
        shadow-md text-white relative
        flex flex-col items-center justify-center text-center
        transition-all duration-300 transform
        hover:scale-105 hover:shadow-lg cursor-pointer
        min-h-[90px] sm:min-h-[100px] md:min-h-[110px]
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
      {Icon && <Icon className="w-5 sm:w-6 md:w-7 h-5 sm:h-6 md:h-7 mb-2 opacity-90" />}

      {/* Label */}
      <p className="text-xs sm:text-sm md:text-base opacity-90">{label}</p>

      {/* Valor animado */}
      <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold break-words">
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
