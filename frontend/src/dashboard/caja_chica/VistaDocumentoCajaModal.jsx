// src/dashboard/caja_chica/VistaDocumentoCajaModal.jsx
import React, { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function VistaDocumentoCajaModal({ open, onClose, documento }) {
  const imgRef = useRef();

  const handleImprimir = () => {
    if (!documento.url) return;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>${documento.nombre || "Documento"}</title>
        </head>
        <body style="margin:0; display:flex; justify-content:center; align-items:center; height:100vh;">
          <img src="${documento.url}" style="max-width:100%; max-height:100vh;" />
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  if (!documento) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full shadow-xl rounded-xl p-6">
        <DialogHeader>
          <DialogTitle>{documento.nombre || "Documento"}</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center my-4">
          {documento.url ? (
            <img
              ref={imgRef}
              src={documento.url}
              alt={documento.nombre || "Documento"}
              className="max-h-[70vh] w-auto object-contain rounded border"
            />
          ) : (
            <p className="text-center text-gray-500">No hay vista disponible</p>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose} className="hover:bg-gray-100 transition">Cerrar</Button>
          {documento.url && (
            <Button onClick={handleImprimir} className="hover:bg-gray-100 transition">
              Imprimir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
