// boleta_project/frontend/src/dashboard/gastos/programacion/Programacion.jsx

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Filter, FileText, Calendar, User, Briefcase, MapPin, Building } from "lucide-react"; 
import ProgramacionTable from "./ProgramacionTable";
import ProgramacionModal from "./ProgramacionModal";
import { getProgramaciones } from "./api";

export default function Programacion() {
  const [data, setData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    year: "2025",
    proyecto: "",
    area: "",
    empresa: "",
    encargado: ""
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await getProgramaciones(filters); 
      setData(response);
    } catch (error) {
      console.error("Error al cargar programaciones:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]); 

  const handleApplyFilters = () => {
    fetchData();
  };

  const handleExportReport = () => {
    // TODO: Implementar la lógica para exportar el reporte
    console.log("Generando reporte...");
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          Programación de Gastos
        </h1>
        <Button onClick={() => setModalOpen(true)} className="flex items-center gap-2">
          <Plus size={18} /> Nueva Programación
        </Button>
      </div>

      {/* Sección de Filtros y Acciones mejorada */}
      <Card className="p-4 bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Filtro de Año */}
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-gray-500" />
            <select
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              className="flex-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          {/* Filtro de Proyecto */}
          <div className="flex items-center gap-2">
            <Briefcase size={20} className="text-gray-500" />
            <select
              value={filters.proyecto}
              onChange={(e) => setFilters({ ...filters, proyecto: e.target.value })}
              className="flex-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">Todos</option>
              {/* Opciones dinámicas */}
            </select>
          </div>

          {/* Filtro de Área */}
          <div className="flex items-center gap-2">
            <MapPin size={20} className="text-gray-500" />
            <select
              value={filters.area}
              onChange={(e) => setFilters({ ...filters, area: e.target.value })}
              className="flex-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">Todos</option>
              {/* Opciones dinámicas */}
            </select>
          </div>
        </div>
        
        {/* Botones de acción */}
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={handleApplyFilters} className="flex items-center gap-2">
            <Filter size={18} /> Procesar
          </Button>
          <Button onClick={handleExportReport} className="flex items-center gap-2">
            <FileText size={18} /> Reporte
          </Button>
        </div>
      </Card>
      
      {/* Contenido */}
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <p>Cargando datos...</p>
          ) : (
            <ProgramacionTable data={data} />
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {modalOpen && (
        <ProgramacionModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={() => {
            setModalOpen(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}