// src/dashboard/caja_chica/MovimientoFormModal.jsx
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import api from "@/services/api";

export default function MovimientoFormModal({ open, onClose, cajaId, onMovimientoGuardado }) {
  const [tipo, setTipo] = useState("Ingreso");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [documento, setDocumento] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGuardar = async () => {
    if (!concepto.trim()) {
      alert("Ingresa un concepto válido");
      return;
    }
    if (!monto || isNaN(Number(monto)) || Number(monto) <= 0) {
      alert("Ingresa un monto válido mayor a 0");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("tipo", tipo);
      formData.append("concepto", concepto);
      formData.append("monto", Number(monto));
      if (documento) formData.append("documento", documento);

      await api.post(`/boleta/caja_diaria/${cajaId}/movimientos/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Movimiento registrado correctamente");
      onMovimientoGuardado?.(); // Actualiza lista de movimientos
      onClose?.();

      // Reset formulario
      setTipo("Ingreso");
      setConcepto("");
      setMonto("");
      setDocumento(null);
    } catch (error) {
      console.error("Error registrando movimiento:", error);
      alert("No se pudo registrar el movimiento. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6 rounded-xl shadow-xl">
        <DialogHeader>
          <DialogTitle>Registrar Movimiento</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2 text-gray-700">
          <div>
            <label className="block font-medium mb-1">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full border rounded p-2"
              disabled={loading}
            >
              <option value="Ingreso">Ingreso</option>
              <option value="Egreso">Egreso</option>
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1">Concepto / Descripción</label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full border rounded p-2"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Monto</label>
            <input
              type="number"
              min="0"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full border rounded p-2"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Documento (opcional)</label>
            <input
              type="file"
              onChange={(e) => setDocumento(e.target.files[0])}
              className="w-full"
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="hover:bg-gray-100 transition"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGuardar}
            disabled={loading}
            className={`${loading ? "opacity-50 cursor-not-allowed" : "hover:bg-green-700 transition"}`}
          >
            {loading ? "Guardando..." : "Guardar Movimiento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
