// src/dashboard/Movimientos/AperturaCajaModal.jsx
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import api from "@/services/api";

const AperturaCajaModal = ({ open, onClose, onSuccess }) => {
  const [montoInicial, setMontoInicial] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApertura = async () => {
    if (!montoInicial || isNaN(montoInicial)) {
      alert("Por favor ingresa un monto inicial válido.");
      return;
    }

    try {
      setLoading(true);
      await api.post("/boleta/caja_diaria/", {
        monto_base: Number(montoInicial), // ✅ coincide con el backend
        observaciones: observaciones || "", // opcional (si lo agregas al modelo)
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al abrir caja diaria:", error);
      alert("Hubo un error al abrir la caja. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apertura de Caja</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Monto Inicial</Label>
            <Input
              type="number"
              placeholder="Ingrese el monto inicial"
              value={montoInicial}
              onChange={(e) => setMontoInicial(e.target.value)}
            />
          </div>
          <div>
            <Label>Observaciones (opcional)</Label>
            <Textarea
              placeholder="Escribe aquí las observaciones..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleApertura} disabled={loading}>
              {loading ? "Abriendo..." : "Abrir Caja"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AperturaCajaModal;
