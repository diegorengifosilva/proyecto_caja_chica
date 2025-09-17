// src/dashboard/aprobacion_liquidacion/LiquidacionDetalleModal.jsx
import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import VistaDocumentoModal from "./VistaDocumentoModal";
import { STATE_CLASSES } from "@/components/ui/colors";

const TASA_CAMBIO = 3.52;

export default function DetalleLiquidacionModal({ open, onClose, liquidacion }) {
  const [vistaDocOpen, setVistaDocOpen] = useState(false);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);

  if (!liquidacion) return null;

  const formatSoles = (value) =>
    Number(value).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatDolares = (value) => (value / TASA_CAMBIO).toFixed(2);

  const totalDocumentadoSoles = useMemo(() => liquidacion.total_documentado || liquidacion.monto, [liquidacion]);
  const totalDocumentadoDolares = totalDocumentadoSoles / TASA_CAMBIO;
  const diferenciaSoles = liquidacion.monto - totalDocumentadoSoles;
  const diferenciaDolares = diferenciaSoles / TASA_CAMBIO;

  const handleAbrirDocumento = (doc) => {
    setDocumentoSeleccionado(doc);
    setVistaDocOpen(true);
  };

  const renderNombreDocumento = (doc) => typeof doc === "string" ? doc : doc.numero_documento || doc.nombre_archivo || "Documento";
  const getDocumentoUrl = (doc) => doc?.archivo_url || null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg shadow-xl rounded-xl p-6" aria-describedby={`detalle-liquidacion-${liquidacion.id}`}>
          <DialogHeader>
            <DialogTitle>Liquidación #{liquidacion.id}</DialogTitle>
            <DialogDescription id={`detalle-liquidacion-${liquidacion.id}`}>Detalles</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <p><strong>Operación:</strong> {liquidacion.numero_operacion || "N/A"}</p>
            <p><strong>Fecha:</strong> {liquidacion.fecha}</p>
            <p><strong>Solicitante:</strong> {liquidacion.solicitante}</p>

            <div className="grid grid-cols-3 gap-4 items-center">
              <span className="font-semibold">Monto Solicitado:</span>
              <span>S/ {formatSoles(liquidacion.monto)}</span>
              <span>$ {formatDolares(liquidacion.monto)}</span>

              <span className="font-semibold">Total Documentado:</span>
              <span>S/ {formatSoles(totalDocumentadoSoles)}</span>
              <span>$ {formatDolares(totalDocumentadoDolares)}</span>

              <span className="font-semibold">Diferencia:</span>
              <span>S/ {formatSoles(diferenciaSoles)}</span>
              <span>$ {formatDolares(diferenciaDolares)}</span>
            </div>

            <div className="flex items-center gap-2">
              <strong>Estado:</strong>
              <Badge style={{ STATE_CLASSES }}>{liquidacion.estado}</Badge>
            </div>

            <p><strong>Observaciones:</strong> {liquidacion.observaciones || "Sin observaciones"}</p>

            {liquidacion.documentos?.length > 0 && (
              <div>
                <p><strong>Documentos:</strong></p>
                <div className="flex flex-wrap gap-2">
                  {liquidacion.documentos.map((doc, i) => {
                    const nombre = renderNombreDocumento(doc);
                    const url = getDocumentoUrl(doc);
                    return (
                      <Badge
                        key={i}
                        variant="outline"
                        className="cursor-pointer hover:bg-blue-100 transition"
                        onClick={() => url ? window.open(url, "_blank") : handleAbrirDocumento(doc)}
                      >
                        {nombre}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {vistaDocOpen && documentoSeleccionado && (
        <VistaDocumentoModal
          open={vistaDocOpen}
          documento={documentoSeleccionado}
          onClose={() => setVistaDocOpen(false)}
        />
      )}
    </>
  );
}
