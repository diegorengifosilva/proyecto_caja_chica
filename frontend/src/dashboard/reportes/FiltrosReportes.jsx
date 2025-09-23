// src/dashboard/reportes/FiltrosReportes.jsx
import React, { useState, useEffect } from "react";
import { Calendar, Tag, Users, Filter } from "lucide-react";
import FilterCard from "@/components/ui/FilterCard"; // asumimos que ya existe este componente

export default function FiltrosReportes({ filtros = {}, setFiltros, data = [] }) {
  const [localFiltros, setLocalFiltros] = useState({
    fechaInicio: filtros.fechaInicio || "",
    fechaFin: filtros.fechaFin || "",
    categoria: filtros.categoria || "",
    responsable: filtros.responsable || "",
  });

  const [responsables, setResponsables] = useState([]);

  // Extraer responsables únicos de los datos
  useEffect(() => {
    const unique = [...new Set(data.map((item) => item.responsable))];
    setResponsables(unique);
  }, [data]);

  const aplicarFiltros = () => {
    setFiltros(localFiltros);
  };

  return (
    <FilterCard title="Filtros" icon={<Filter size={16} />} className="mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-5 w-full">
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
            className="border rounded-lg px-2 py-2 text-xs sm:text-sm md:text-base w-full focus:ring-2 focus:ring-blue-400 focus:outline-none"
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
            className="border rounded-lg px-2 py-2 text-xs sm:text-sm md:text-base w-full focus:ring-2 focus:ring-green-400 focus:outline-none"
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
        <div className="flex flex-col w-full sm:col-span-2 md:col-span-1">
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
              className="border rounded-lg px-2 py-2 text-xs sm:text-sm md:text-base w-full sm:w-1/2 focus:ring-2 focus:ring-purple-400 focus:outline-none"
            />
            <input
              type="date"
              value={localFiltros.fechaFin}
              onChange={(e) =>
                setLocalFiltros({ ...localFiltros, fechaFin: e.target.value })
              }
              className="border rounded-lg px-2 py-2 text-xs sm:text-sm md:text-base w-full sm:w-1/2 focus:ring-2 focus:ring-purple-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Botón aplicar */}
      <div className="flex justify-end mt-4">
        <button
          onClick={aplicarFiltros}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:from-indigo-600 hover:to-indigo-700 transition text-xs sm:text-sm md:text-base"
        >
          <Filter size={16} /> Aplicar
        </button>
      </div>
    </FilterCard>
  );
}
