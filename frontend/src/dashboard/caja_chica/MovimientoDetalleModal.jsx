// src/dashboard/caja_chica/MovimientoDetalleModal.jsx
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import VistaDocumentoCajaModal from "./VistaDocumentoCajaModal";

const TYPE_COLORS = { Ingreso: "#16a34a", Egreso: "#ef4444" };

export default function MovimientoDetalleModal({ open, onClose, movimiento }) {
  const [documentoModalOpen, setDocumentoModalOpen] = useState(false);

  if (!movimiento) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg shadow-xl rounded-xl p-6">
          <DialogHeader>
            <DialogTitle>Movimiento #{movimiento.numero_operacion || movimiento.id}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2 text-gray-700">
            <p><strong>Fecha:</strong> {movimiento.fecha}</p>
            <p>
              <strong>Tipo:</strong>{" "}
              <Badge style={{ backgroundColor: TYPE_COLORS[movimiento.tipo], color: "#fff", marginLeft: 4 }}>
                {movimiento.tipo}
              </Badge>
            </p>
            <p><strong>Concepto:</strong> {movimiento.concepto}</p>
            <p><strong>Monto:</strong> S/ {movimiento.monto.toFixed(2)}</p>
            <p><strong>Usuario:</strong> {movimiento.usuario}</p>

            {movimiento.documento ? (
              <div className="mt-1">
                <p><strong>Documento:</strong></p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDocumentoModalOpen(true)}
                  className="hover:bg-gray-100 transition"
                >
                  Ver Documento
                </Button>
              </div>
            ) : (
              <p className="text-gray-400">Sin documento</p>
            )}

            {movimiento.observaciones && (
              <p><strong>Observaciones:</strong> {movimiento.observaciones}</p>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={onClose} className="hover:bg-gray-100 transition">Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {documentoModalOpen && movimiento.documento && (
        <VistaDocumentoCajaModal
          open={documentoModalOpen}
          onClose={() => setDocumentoModalOpen(false)}
          documento={movimiento.documento}
        />
      )}
    </>
  );
}
