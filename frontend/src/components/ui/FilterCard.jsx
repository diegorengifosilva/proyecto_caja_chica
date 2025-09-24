// src/components/ui/FilterCard.jsx
import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const FilterCard = ({ children, className = "", title, icon }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        `
          bg-white dark:bg-gray-800
          rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm
          w-full
          p-4 sm:p-5 md:p-6 lg:p-8
          flex flex-col
        `,
        className
      )}
    >
      {/* Encabezado opcional */}
      {title && (
        <h3
          className="
            flex items-center gap-2
            text-sm sm:text-base md:text-lg lg:text-xl
            font-semibold text-gray-800 dark:text-gray-100
            mb-4 sm:mb-5 md:mb-6
          "
        >
          {icon && <span className="text-gray-500 dark:text-gray-400">{icon}</span>}
          {title}
        </h3>
      )}

      {/* Contenedor de filtros → grid responsivo */}
      <div
        className="
          grid
          grid-cols-1         /* móviles → 1 columna */
          xs:grid-cols-2      /* móviles grandes → 2 columnas */
          sm:grid-cols-2      /* tablets → 2 columnas */
          md:grid-cols-3      /* laptops → 3 columnas */
          lg:grid-cols-4      /* pantallas grandes → 4 columnas */
          xl:grid-cols-5      /* pantallas muy grandes → 5 columnas */
          2xl:grid-cols-6     /* pantallas ultra anchas → 6 columnas */
          gap-3 xs:gap-4 sm:gap-5 md:gap-6 lg:gap-7
          w-full
        "
      >
        {children}
      </div>
    </motion.div>
  );
};

export default FilterCard;
