// src/dashboard/registro_actividades/FiltroActividades.jsx
import React from "react";
import { Brush, Calendar, User, SlidersHorizontal, Hash, FileText } from "lucide-react";

export default function FiltroActividades({
  filtroId,
  setFiltroId,
  filtroUsuario,
  setFiltroUsuario,
  filtroTipo,
  setFiltroTipo,
  filtroDescripcion,
  setFiltroDescripcion,
  filtroFechaInicio,
  setFiltroFechaInicio,
  filtroFechaFin,
  setFiltroFechaFin,
  onLimpiarFiltros,
}) {
  return (
    <div className="bg-white rounded-xl shadow p-4 border border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        
        {/* ID */}
        <div className="flex flex-col">
          <label className="text-gray-700 text-sm font-medium flex items-center gap-1">
            <Hash size={16}/> ID
          </label>
          <input
            type="text"
            placeholder="Filtrar por ID"
            className="border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            value={filtroId}
            onChange={(e) => setFiltroId(e.target.value)}
          />
        </div>

        {/* Usuario */}
        <div className="flex flex-col">
          <label className="text-gray-700 text-sm font-medium flex items-center gap-1">
            <User size={16}/> Usuario
          </label>
          <input
            type="text"
            placeholder="Filtrar por usuario"
            className="border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            value={filtroUsuario}
            onChange={(e) => setFiltroUsuario(e.target.value)}
          />
        </div>

        {/* Tipo */}
        <div className="flex flex-col">
          <label className="text-gray-700 text-sm font-medium flex items-center gap-1">
            <SlidersHorizontal size={16}/> Tipo de Acción
          </label>
          <input
            type="text"
            placeholder="Filtrar por tipo de acción"
            className="border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          />
        </div>

        {/* Descripción */}
        <div className="flex flex-col">
          <label className="text-gray-700 text-sm font-medium flex items-center gap-1">
            <FileText size={16}/> Descripción
          </label>
          <input
            type="text"
            placeholder="Filtrar por descripción"
            className="border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            value={filtroDescripcion}
            onChange={(e) => setFiltroDescripcion(e.target.value)}
          />
        </div>

        {/* Fecha Inicio */}
        <div className="flex flex-col">
          <label className="text-gray-700 text-sm font-medium flex items-center gap-1">
            <Calendar size={16}/> Fecha Inicio
          </label>
          <input
            type="date"
            className="border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            value={filtroFechaInicio}
            onChange={(e) => setFiltroFechaInicio(e.target.value)}
          />
        </div>

        {/* Fecha Fin */}
        <div className="flex flex-col">
          <label className="text-gray-700 text-sm font-medium flex items-center gap-1">
            <Calendar size={16}/> Fecha Fin
          </label>
          <input
            type="date"
            className="border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            value={filtroFechaFin}
            onChange={(e) => setFiltroFechaFin(e.target.value)}
          />
        </div>
      </div>

      {/* Botón de limpiar */}
      <div className="flex justify-end mt-4">
        <button
          onClick={onLimpiarFiltros}
          className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 
                     text-white font-medium px-5 py-2 rounded-lg shadow-md transition flex items-center gap-2"
        >
          <Brush size={16}/> Limpiar filtros
        </button>
      </div>
    </div>
  );
}

