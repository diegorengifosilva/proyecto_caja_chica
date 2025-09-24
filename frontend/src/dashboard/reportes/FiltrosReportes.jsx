// src/dashboard/reportes/FiltrosReportes.jsx
import React, { useState, useEffect } from "react";
import { Filter } from "lucide-react";
import FilterCard from "@/components/ui/FilterCard";

export default function FiltrosReportes({ filtros = {}, setFiltros, data = [] }) {
  const [localFiltros, setLocalFiltros] = useState({
    fechaInicio: filtros.fechaInicio || "",
    fechaFin: filtros.fechaFin || "",
    categoria: filtros.categoria || "",
    responsable: filtros.responsable || "",
  });

  const [responsables, setResponsables] = useState([]);

  // Extraer responsables únicos
  useEffect(() => {
    const unique = [...new Set(data.map((item) => item.responsable).filter(Boolean))];
    setResponsables(unique);
  }, [data]);

  // Aplicar en tiempo real sin botón
  useEffect(() => {
    setFiltros(localFiltros);
  }, [localFiltros]);

  return (
    <FilterCard title="Filtros" icon={<Filter size={16} />} className="mb-6">
      {/* Responsable */}
      <div className="flex flex-col w-full">
        <label className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span> Responsable
        </label>
        <select
          value={localFiltros.responsable}
          onChange={(e) =>
            setLocalFiltros({ ...localFiltros, responsable: e.target.value })
          }
          className="border rounded-lg px-3 py-2 text-xs sm:text-sm md:text-base w-full 
                    bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200
                    focus:ring-2 focus:ring-blue-400 focus:outline-none"
        >
          <option value="">Todos</option>
          {responsables.map((r, idx) => (
            <option key={idx} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Categoría */}
      <div className="flex flex-col w-full">
        <label className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span> Categoría
        </label>
        <select
          value={localFiltros.categoria}
          onChange={(e) =>
            setLocalFiltros({ ...localFiltros, categoria: e.target.value })
          }
          className="border rounded-lg px-3 py-2 text-xs sm:text-sm md:text-base w-full 
                    bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200
                    focus:ring-2 focus:ring-green-400 focus:outline-none"
        >
          <option value="">Todas</option>
          <option value="Transporte">Transporte</option>
          <option value="Alimentación">Alimentación</option>
          <option value="Oficina">Oficina</option>
          <option value="Hospedaje">Hospedaje</option>
          <option value="Otros">Otros</option>
        </select>
      </div>

      {/* Rango de Fechas */}
      <div className="flex flex-col w-full">
        <label className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
          <span className="w-2 h-2 bg-purple-500 rounded-full"></span> Rango de Fechas
        </label>
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <input
            type="date"
            value={localFiltros.fechaInicio}
            onChange={(e) =>
              setLocalFiltros({ ...localFiltros, fechaInicio: e.target.value })
            }
            className="border rounded-lg px-3 py-2 text-xs sm:text-sm md:text-base w-full 
                      bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200
                      focus:ring-2 focus:ring-purple-400 focus:outline-none"
          />
          <input
            type="date"
            value={localFiltros.fechaFin}
            onChange={(e) =>
              setLocalFiltros({ ...localFiltros, fechaFin: e.target.value })
            }
            className="border rounded-lg px-3 py-2 text-xs sm:text-sm md:text-base w-full 
                      bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200
                      focus:ring-2 focus:ring-purple-400 focus:outline-none"
          />
        </div>
      </div>
    </FilterCard>
  );
}
