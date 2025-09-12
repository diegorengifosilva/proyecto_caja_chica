// src/dashboard/caja_chica/CierreCajaModal.jsx
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import api from "@/services/api";

export default function CierreCajaModal({ open, onClose, caja, onCajaCerrada }) {
  const [loading, setLoading] = useState(false);
  const [resumen, setResumen] = useState({
    totalIngresos: 0,
    totalEgresos: 0,
    saldoFinal: 0,
  });

  useEffect(() => {
    if (caja) calcularResumen();
  }, [caja]);

  const calcularResumen = () => {
    const ingresos = caja.movimientos?.filter(m => m.tipo === "Ingreso")
      .reduce((acc, m) => acc + m.monto, 0) || 0;

    const egresos = caja.movimientos?.filter(m => m.tipo === "Egreso")
      .reduce((acc, m) => acc + m.monto, 0) || 0;

    setResumen({
      totalIngresos: ingresos,
      totalEgresos: egresos,
      saldoFinal: caja.monto_inicial + ingresos - egresos,
    });
  };

  const handleCerrarCaja = async () => {
    if (!window.confirm("¿Confirmas cerrar la caja? Esta acción no se puede revertir.")) return;

    try {
      setLoading(true);
      await api.put(`/boleta/caja_diaria/${caja.id}/cerrar/`);
      onCajaCerrada?.();
      onClose?.();
    } catch (error) {
      console.error("Error cerrando caja:", error);
      alert("No se pudo cerrar la caja. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!caja) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6 rounded-xl shadow-xl">
        <DialogHeader>
          <DialogTitle>Cierre de Caja</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2 text-gray-700">
          <p><strong>Fecha de Apertura:</strong> {caja.fecha_apertura}</p>
          <p><strong>Monto Inicial:</strong> S/ {caja.monto_inicial.toFixed(2)}</p>
          <p><strong>Total Ingresos:</strong> S/ {resumen.totalIngresos.toFixed(2)}</p>
          <p><strong>Total Egresos:</strong> S/ {resumen.totalEgresos.toFixed(2)}</p>
          <p><strong>Saldo Final:</strong> S/ {resumen.saldoFinal.toFixed(2)}</p>
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
            onClick={handleCerrarCaja}
            disabled={loading}
            className={`${loading ? "opacity-50 cursor-not-allowed" : "hover:bg-red-700 transition"}`}
          >
            {loading ? "Cerrando..." : "Cerrar Caja"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
