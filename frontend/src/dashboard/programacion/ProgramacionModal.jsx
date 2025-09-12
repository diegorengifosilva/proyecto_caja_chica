// boleta_project/frontend/src/dashboard/programacion/ProgramacionModal.jsx

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

const ProgramacionModal = ({ open, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    codigo: "",
    referencia: "",
    descripcion: "", // Se mantiene como un campo clave
    monto_programado: "", // Renombrado para mayor claridad
    fecha: new Date(),
    proyecto: "", // Nuevo campo
    area: "",     // Nuevo campo
    empresa: "",  // Nuevo campo
  });

  // Cargar datos iniciales si estamos editando
  useEffect(() => {
    if (initialData) {
      setFormData({
        codigo: initialData.codigo || "",
        referencia: initialData.referencia || "",
        descripcion: initialData.descripcion || "",
        monto_programado: initialData.monto_programado || "",
        fecha: initialData.fecha ? new Date(initialData.fecha) : new Date(),
        proyecto: initialData.proyecto || "",
        area: initialData.area || "",
        empresa: initialData.empresa || "",
      });
    }
  }, [initialData]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    // Aquí puedes agregar validaciones antes de guardar
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Editar Programación" : "Nueva Programación"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Campos del formulario adaptados a la estructura de la empresa */}
          <div>
            <Label htmlFor="referencia">Referencia</Label>
            <Input
              id="referencia"
              value={formData.referencia}
              onChange={(e) => handleChange("referencia", e.target.value)}
              placeholder="Ej: PRG-2025-001"
            />
          </div>

          <div>
            <Label htmlFor="descripcion">Descripción</Label>
            <Input
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => handleChange("descripcion", e.target.value)}
              placeholder="Ej: Compra de equipos de oficina"
            />
          </div>

          <div>
            <Label htmlFor="monto_programado">Monto Programado (S/)</Label>
            <Input
              id="monto_programado"
              type="number"
              value={formData.monto_programado}
              onChange={(e) => handleChange("monto_programado", e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="proyecto">Proyecto</Label>
            <Input
              id="proyecto"
              value={formData.proyecto}
              onChange={(e) => handleChange("proyecto", e.target.value)}
              placeholder="Ej: Proyecto Alfa"
            />
          </div>

          <div>
            <Label htmlFor="area">Área</Label>
            <Input
              id="area"
              value={formData.area}
              onChange={(e) => handleChange("area", e.target.value)}
              placeholder="Ej: Contabilidad"
            />
          </div>

          <div>
            <Label htmlFor="empresa">Empresa</Label>
            <Input
              id="empresa"
              value={formData.empresa}
              onChange={(e) => handleChange("empresa", e.target.value)}
              placeholder="Ej: V&C Corporation"
            />
          </div>

          <div>
            <Label>Fecha de Ejecución</Label>
            <Calendar
              mode="single"
              selected={formData.fecha}
              onSelect={(date) => handleChange("fecha", date)}
            />
            <p className="text-sm text-gray-500 mt-1">
              Fecha seleccionada: {format(formData.fecha, "dd/MM/yyyy")}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {initialData ? "Actualizar" : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProgramacionModal;
