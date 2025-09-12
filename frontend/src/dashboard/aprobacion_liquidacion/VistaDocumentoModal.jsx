// src/dashboard/aprobacion_liquidacion/VistaDocumentoModal.jsx
import React, { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function VistaDocumentoModal({ open, onClose, documento }) {
  const imgRef = useRef();

  if (!documento) return null;

  const url = documento.archivo_url || documento.url; // Compatibilidad

  const handleImprimir = () => {
    if (!url) return;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>${documento.nombre || "Documento"}</title>
        </head>
        <body style="margin:0; display:flex; justify-content:center; align-items:center; height:100vh;">
          <img src="${url}" style="max-width:100%; max-height:100vh;" />
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full shadow-xl rounded-xl p-6">
        <DialogHeader>
          <DialogTitle>{documento.nombre || documento.numero_documento || "Documento"}</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center my-4">
          {url ? (
            <img
              ref={imgRef}
              src={url}
              alt={documento.nombre || "Documento"}
              className="max-h-[70vh] w-auto object-contain rounded border"
            />
          ) : (
            <p className="text-center text-gray-500">No hay vista disponible</p>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          {url && <Button onClick={handleImprimir}>Imprimir</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
