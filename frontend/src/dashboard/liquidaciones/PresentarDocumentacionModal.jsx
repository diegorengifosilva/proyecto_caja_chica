// src/dashboard/liquidaciones/PresentarDocumentacionModal.jsx
import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, Send, FileText, User, Tag, DollarSign, WalletMinimal, Calendar, BadgeAlert, ClipboardList, FilePlus2 } from "lucide-react";
import api from "@/services/api";
import Table from "@/components/ui/table";
import SubirArchivoModal from "./SubirArchivoModal";

const TIPO_CAMBIO = 3.52; // 1 USD = 3.52 S/

const PresentarDocumentacionModal = ({ open, onClose, solicitud }) => {
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSubirArchivoModal, setShowSubirArchivoModal] = useState(false);

  if (!solicitud) return null;

  const { totalSoles, totalDolares } = useMemo(() => {
    const totalS = documentos.reduce((sum, doc) => sum + parseFloat(doc.total || 0), 0);
    return { totalSoles: totalS, totalDolares: totalS / TIPO_CAMBIO };
  }, [documentos]);

  const handleArchivoSubido = (doc) => {
    setDocumentos((prev) => [...prev, doc]);
    console.log("✅ Documento agregado:", doc);
  };

  const handleEliminarDocumento = (doc) => {
    setDocumentos((prev) => prev.filter((d) => d !== doc));
  };

  const handleAbrirArchivo = (archivo) => {
    if (!archivo) return;
    const url = URL.createObjectURL(archivo);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handlePresentarLiquidacion = async () => {
    if (documentos.length === 0) return alert("⚠️ Agrega al menos un comprobante.");

    try {
      setLoading(true);

      const token = localStorage.getItem("access_token");
      if (!token) return alert("⚠️ No se encontró token. Debes iniciar sesión.");

      const formData = new FormData();

      // 🔹 Cambiado para que el backend reciba lo que espera
      formData.append("solicitud_id", solicitud.id);

      // Datos de los documentos (sin archivos)
      const documentosSinArchivo = documentos.map(doc => ({
        tipo_documento: doc.tipo_documento,
        numero_documento: doc.numero_documento,
        fecha: doc.fecha,
        ruc: doc.ruc,
        razon_social: doc.razon_social,
        total: parseFloat(doc.total),
      }));
      formData.append("documentos", JSON.stringify(documentosSinArchivo));

      // Archivos
      documentos.forEach((doc) => {
        if (doc.archivo) formData.append("archivos", doc.archivo);
      });

      // 🔹 DEBUG
      console.log("📤 Enviando FormData:");
      for (let pair of formData.entries()) {
        if (pair[1] instanceof File) {
          console.log(pair[0], pair[1].name, pair[1].size, pair[1].type);
        } else {
          console.log(pair[0], pair[1]);
        }
      }

      // POST con JWT
      const res = await api.post("/boleta/documentos/guardar/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("✅ Liquidación presentada:", res.data);
      onClose();
      alert("✅ Liquidación presentada correctamente");

    } catch (error) {
      console.error("❌ Error guardando documento:", error.response?.data || error);
      alert("❌ Ocurrió un error al presentar la liquidación. Revisa consola.");
    } finally {
      setLoading(false);
    }
  };

 return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-5xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-700" />
              Presentar Documentación
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            {/* Información de la solicitud */}
            <Card>
              <CardContent className="p-4 space-y-2 text-sm sm:text-base">
                <p className="flex items-center gap-1">
                  <ClipboardList className="w-4 h-4 text-gray-800" />
                  <span className="font-semibold">Solicitud:</span> {solicitud.numero_solicitud}
                </p>
                <p className="flex items-center gap-1">
                  <User className="w-4 h-4 text-gray-800" />
                  <span className="font-semibold">Solicitante:</span> {solicitud.solicitante || "—"}
                </p>
                <p className="flex items-center gap-1">
                  <Tag className="w-4 h-4 text-gray-800" />
                  <span className="font-semibold">Tipo:</span> {solicitud.tipo_solicitud || "—"}
                </p>
                <p className="flex items-center gap-1">
                  <WalletMinimal className="w-4 h-4 text-gray-800" />
                  <span className="font-semibold">Monto Soles (S/.):</span> {solicitud.total_soles || solicitud.monto || "—"}
                </p>
                <p className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-gray-800" />
                  <span className="font-semibold">Monto Dólares ($):</span> {solicitud.total_dolares || "—"}
                </p>
                <p className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-gray-800" />
                  <span className="font-semibold">Fecha:</span> {solicitud.fecha || "—"}
                </p>
                <p className="flex items-center gap-1">
                  <BadgeAlert className="w-4 h-4 text-gray-800" />
                  <span className="font-semibold">Estado actual:</span> {solicitud.estado || "Pendiente"}
                </p>
              </CardContent>
            </Card>

            {/* Comprobantes */}
            <Card>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FilePlus2 className="w-5 h-5 text-gray-700" />
                    Comprobantes OCR
                  </h3>

                  <Button
                    size="sm"
                    onClick={() => setShowSubirArchivoModal(true)}
                    className="bg-gradient-to-r from-violet-400 to-violet-500 hover:from-violet-500 hover:to-violet-600 text-white px-4 py-2 rounded-lg shadow-md flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" /> Agregar
                  </Button>
                </div>

                {/* Tabla OCR usando Table.jsx */}
                <Table
                  headers={[
                    "Nombre del Archivo",
                    "N° Doc",
                    "Tipo",
                    "Fecha",
                    "RUC",
                    "Razón Social",
                    "Total",
                  ]}
                  data={documentos}
                  emptyMessage="No se han agregado comprobantes todavía."
                  renderRow={(doc) => [
                    <span
                      className="cursor-pointer text-blue-600 hover:underline"
                      onClick={() => handleAbrirArchivo(doc.archivo)}
                    >
                      {doc.nombre_archivo}
                    </span>,
                    doc.numero_documento,
                    doc.tipo_documento,
                    doc.fecha,
                    doc.ruc,
                    doc.razon_social,
                    doc.total,
                  ]}
                  onDeleteRow={(doc) => handleEliminarDocumento(doc)}
                />

                {/* Total Documentado */}
                <div className="mt-4 text-right font-semibold text-gray-800 text-sm sm:text-base">
                  <p>Total: S/ {totalSoles.toFixed(2)}</p>
                  <p>Total: $ {totalDolares.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Botones */}
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <Button
              onClick={onClose}
              className="bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2 w-full sm:w-auto"
            >
              <X className="w-4 h-4" /> Cancelar
            </Button>
            <Button
              onClick={handlePresentarLiquidacion}
              disabled={loading || documentos.length === 0}
              className="bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2 w-full sm:w-auto"
            >
              <Send className="w-4 h-4" /> {loading ? "Presentando..." : "Presentar Liquidación"}
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
