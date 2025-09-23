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
          bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm
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
            font-semibold text-gray-800 dark:text-gray-100
            mb-3 sm:mb-4
          "
        >
          {icon && <span className="text-gray-500 dark:text-gray-400">{icon}</span>}
          {title}
        </h3>
      )}

      {/* Grid de filtros responsivo */}
      <div
        className="
          grid 
          grid-cols-1            /* móviles → 1 filtro por fila para no apretar */
          xs:grid-cols-2         /* móviles grandes → 2 columnas */
          sm:grid-cols-2         /* tablets → 2 columnas */
          md:grid-cols-3         /* laptops → 3 columnas */
          lg:grid-cols-4         /* pantallas grandes → 4 columnas */
          2xl:grid-cols-6        /* ultra anchas → 6 columnas */
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
