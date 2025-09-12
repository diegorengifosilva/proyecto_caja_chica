// src/dashboard/reportes/FiltrosReportes.jsx
import React, { useState, useEffect } from "react";
import { Calendar, Tag, Users, Filter } from "lucide-react";

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
    const unique = [...new Set(data.map(item => item.responsable))];
    setResponsables(unique);
  }, [data]);

  const aplicarFiltros = () => {
    setFiltros(localFiltros);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">

      {/* Fecha Inicio */}
      <div className="flex flex-col">
        <label className="flex items-center text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
          <Calendar className="mr-2" size={16} /> Fecha Inicio
        </label>
        <input
          type="date"
          value={localFiltros.fechaInicio}
          onChange={(e) => setLocalFiltros({ ...localFiltros, fechaInicio: e.target.value })}
          className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        />
      </div>

      {/* Fecha Fin */}
      <div className="flex flex-col">
        <label className="flex items-center text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
          <Calendar className="mr-2" size={16} /> Fecha Fin
        </label>
        <input
          type="date"
          value={localFiltros.fechaFin}
          onChange={(e) => setLocalFiltros({ ...localFiltros, fechaFin: e.target.value })}
          className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        />
      </div>

      {/* Categoría */}
      <div className="flex flex-col">
        <label className="flex items-center text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
          <Tag className="mr-2" size={16} /> Categoría
        </label>
        <select
          value={localFiltros.categoria}
          onChange={(e) => setLocalFiltros({ ...localFiltros, categoria: e.target.value })}
          className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        >
          <option value="">Todas</option>
          <option value="Transporte">Transporte</option>
          <option value="Alimentación">Alimentación</option>
          <option value="Oficina">Oficina</option>
          <option value="Hospedaje">Hospedaje</option>
          <option value="Otros">Otros</option>
        </select>
      </div>

      {/* Responsable */}
      <div className="flex flex-col">
        <label className="flex items-center text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
          <Users className="mr-2" size={16} /> Responsable
        </label>
        <select
          value={localFiltros.responsable}
          onChange={(e) => setLocalFiltros({ ...localFiltros, responsable: e.target.value })}
          className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        >
          <option value="">Todos</option>
          {responsables.map((r, idx) => (
            <option key={idx} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Botón Aplicar */}
      <div className="flex items-center justify-start">
        <button
          onClick={aplicarFiltros}
          className="flex items-center gap-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white px-4 py-2 rounded-lg shadow hover:from-gray-500 hover:to-gray-600 transition"
        >
          <Filter size={16} /> Filtrar
        </button>
      </div>

    </div>
  );
}
