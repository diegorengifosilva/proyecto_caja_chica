// src/dashboard/liquidaciones/PresentarDocumentacionModal.jsx

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, Send, FileText } from "lucide-react";
import axios from "@/services/api";
import Table from "@/components/ui/table";

// Modales
import SubirArchivoModal from "./SubirArchivoModal";

const TIPO_CAMBIO = 3.52; // 1 USD = 3.52 S/

const PresentarDocumentacionModal = ({ open, onClose, solicitud }) => {
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSubirArchivoModal, setShowSubirArchivoModal] = useState(false);

  if (!solicitud) return null;

  // 📌 Calcular total documentado
  const { totalSoles, totalDolares } = useMemo(() => {
    const totalS = documentos.reduce(
      (sum, doc) => sum + parseFloat(doc.total?.toString().replace(",", ".") || 0),
      0
    );
    const totalD = totalS / TIPO_CAMBIO;
    return { totalSoles: totalS, totalDolares: totalD };
  }, [documentos]);

  // 📌 Callback cuando se sube un archivo en SubirArchivoModal
  const handleArchivoSubido = async (
    datosProcesados,
    archivo,
    tipoDocumento,
    idSolicitud,
    tipoSolicitud
  ) => {
    const extraidos = datosProcesados?.datos_detectados || {};

    try {
      const formData = new FormData();
      formData.append("solicitud_id", idSolicitud);
      formData.append("tipo_documento", tipoDocumento || "Boleta");
      formData.append("numero_documento", extraidos.numero_documento || "ND");
      formData.append("fecha", extraidos.fecha || new Date().toISOString().split("T")[0]);
      formData.append("ruc", extraidos.ruc || "00000000000");
      formData.append("razon_social", extraidos.razon_social || "RAZÓN SOCIAL DESCONOCIDA");
      formData.append("concepto_gasto", tipoSolicitud || "Nueva Solicitud de Gasto");
      formData.append("total", extraidos.total || "0.00");

      if (archivo) {
        formData.append("nombre_archivo", archivo.name);
        formData.append("archivo", archivo);
      }

      const { data } = await axios.post(
        "http://localhost:8000/api/boleta/documentos/guardar/",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setDocumentos((prev) => [
        ...prev,
        {
          nombre_archivo: data.documento.nombre_archivo,
          numero_documento: data.documento.numero_documento,
          tipo_documento: data.documento.tipo_documento,
          fecha: data.documento.fecha,
          ruc: data.documento.ruc,
          razon_social: data.documento.razon_social,
          concepto: data.documento.concepto,
          total: data.documento.total,
          archivo_url: data.documento.archivo_url,
        },
      ]);

      console.log("✅ Documento guardado con éxito:", data);
    } catch (error) {
      if (error.response) {
        console.error("❌ Error en respuesta del servidor:", error.response.data);
      } else if (error.request) {
        console.error("❌ No hubo respuesta del servidor:", error.request);
      } else {
        console.error("❌ Error al configurar la petición:", error.message);
      }
    }
  };

  // 📌 Acción principal: presentar liquidación
  const handlePresentarLiquidacion = async () => {
    try {
      setLoading(true);
      await axios.post("/api/liquidaciones/", {
        solicitud_id: solicitud.id,
        documentos: documentos,
        total_documentado_soles: totalSoles,
        total_documentado_dolares: totalDolares,
      });
      alert("✅ Liquidación presentada correctamente.");
      onClose();
    } catch (error) {
      console.error("Error presentando liquidación:", error);
      alert("❌ Error al presentar la liquidación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-5xl h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Presentar Documentación</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            {/* Info Solicitud estilo ficha */}
            <Card>
              <CardContent className="p-4 space-y-2 text-sm sm:text-base">
                <p>
                  <span className="font-semibold">Solicitud:</span>{" "}
                  {solicitud.numero_solicitud}
                </p>
                <p>
                  <span className="font-semibold">Solicitante:</span>{" "}
                  {solicitud.solicitante || "—"}
                </p>
                <p>
                  <span className="font-semibold">Tipo:</span>{" "}
                  {solicitud.tipo || "—"}
                </p>
                <p>
                  <span className="font-semibold">Monto Soles:</span>{" "}
                  {solicitud.monto_soles || solicitud.monto || "—"}
                </p>
                <p>
                  <span className="font-semibold">Monto Dólares:</span>{" "}
                  {solicitud.monto_dolares || "—"}
                </p>
                <p>
                  <span className="font-semibold">Fecha:</span>{" "}
                  {solicitud.fecha || "—"}
                </p>
                <p>
                  <span className="font-semibold">Estado actual:</span>{" "}
                  {solicitud.estado || "Pendiente"}
                </p>
                <p>
                  <span className="font-semibold">Número operación:</span> —
                </p>
              </CardContent>
            </Card>

            {/* Tabla OCR */}
            <Card>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
                  <h3 className="text-lg font-semibold">Comprobantes OCR</h3>
                  <Button
                    size="sm"
                    onClick={() => setShowSubirArchivoModal(true)}
                    className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white px-4 py-2 rounded-lg shadow-md flex items-center gap-2 transition"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="ml-1">Agregar</span>
                  </Button>
                </div>

                {/* Tabla */}
                <div className="overflow-x-auto">
                  <Table
                    headers={[
                      "Nombre del Archivo",
                      "N° Doc",
                      "Tipo",
                      "Fecha",
                      "RUC",
                      "Razón Social",
                      "Concepto",
                      "Total",
                    ]}
                    data={documentos}
                    emptyMessage="No se han agregado comprobantes todavía."
                    renderRow={(doc) => (
                      <>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                          {doc.imagen_url || doc.archivo_url ? (
                            <a
                              href={doc.imagen_url || doc.archivo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline hover:text-blue-800"
                            >
                              {doc.nombre_archivo}
                            </a>
                          ) : (
                            doc.nombre_archivo
                          )}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                          {doc.numero_documento}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                          {doc.tipo_documento}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                          {doc.fecha}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">{doc.ruc}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                          {doc.razon_social}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                          {doc.concepto_gasto}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                          {doc.total}
                        </td>
                      </>
                    )}
                  />
                </div>

                {/* Totales */}
                <div className="mt-4 text-right font-semibold text-gray-800 text-sm sm:text-base">
                  <p>Total Documentado: S/ {totalSoles.toFixed(2)}</p>
                  <p>Total Documentado: $ {totalDolares.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <Button
              onClick={onClose}
              className="bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 text-white text-sm px-4 py-1.5 rounded-lg shadow-md transition flex items-center gap-2 justify-center cursor-pointer w-full sm:w-auto"
            >
              <X className="w-4 h-4" /> Cancelar
            </Button>
            <Button
              onClick={handlePresentarLiquidacion}
              disabled={loading || documentos.length === 0}
              className="bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white text-sm px-4 py-1.5 rounded-lg shadow-md transition flex items-center gap-2 justify-center cursor-pointer w-full sm:w-auto"
            >
              <Send className="w-4 h-4" />
              {loading ? "Presentando..." : "Presentar Liquidación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showSubirArchivoModal && (
        <SubirArchivoModal
          idSolicitud={solicitud.id}
          open={showSubirArchivoModal}
          onClose={() => setShowSubirArchivoModal(false)}
          onProcesado={handleArchivoSubido}
        />
      )}
    </>
  );
};

export default PresentarDocumentacionModal;
