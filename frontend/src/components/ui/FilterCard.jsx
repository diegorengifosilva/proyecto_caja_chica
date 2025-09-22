import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const FilterCard = ({ children, className = "", title, icon }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        `
          bg-white rounded-2xl border border-gray-200 shadow-sm
          w-full
          p-3 sm:p-4 md:p-6
          flex flex-col
        `,
        className
      )}
    >
      {/* Título opcional */}
      {title && (
        <h3
          className="
            flex items-center gap-2
            text-sm sm:text-base md:text-lg lg:text-xl
            font-semibold text-gray-800 mb-3 sm:mb-4
          "
        >
          {icon && <span className="text-gray-500">{icon}</span>}
          {title}
        </h3>
      )}

      {/* Grid de filtros responsivo */}
      <div
        className="
          grid 
          grid-cols-2            /* en móviles → 2 columnas */
          sm:grid-cols-2         /* tablets → 2 columnas */
          md:grid-cols-3         /* laptops → 3 columnas */
          xl:grid-cols-4         /* pantallas grandes → 4 columnas */
          gap-3 sm:gap-4 md:gap-6
          w-full
        "
      >
        {children}
      </div>
    </motion.div>
  );
};

export default FilterCard;
