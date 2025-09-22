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
import {
  Plus,
  X,
  Send,
  FileText,
  User,
  Tag,
  DollarSign,
  WalletMinimal,
  Calendar,
  BadgeAlert,
  ClipboardList,
  FilePlus2,
} from "lucide-react";
import api from "@/services/api";
import Table from "@/components/ui/table";
import SubirArchivoModal from "./SubirArchivoModal";

const TIPO_CAMBIO = 3.52; // 1 USD = 3.52 S/
const MAX_FILE_SIZE = 10 * 1024 * 1024; // ✅ 10 MB

const PresentarDocumentacionModal = ({ open, onClose, solicitud }) => {
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSubirArchivoModal, setShowSubirArchivoModal] = useState(false);

  if (!solicitud) return null;

  const { totalSoles, totalDolares } = useMemo(() => {
    const totalS = documentos.reduce(
      (sum, doc) => sum + parseFloat(doc.total || 0),
      0
    );
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
    if (documentos.length === 0)
      return alert("⚠️ Agrega al menos un comprobante.");

    try {
      setLoading(true);

      const token = localStorage.getItem("access_token");
      if (!token) return alert("⚠️ No se encontró token. Debes iniciar sesión.");

      const formData = new FormData();
      formData.append("solicitud_id", solicitud.id);

      // Datos de los documentos (sin archivos)
      const documentosSinArchivo = documentos.map((doc) => ({
        tipo_documento: doc.tipo_documento,
        numero_documento: doc.numero_documento,
        fecha: doc.fecha,
        ruc: doc.ruc,
        razon_social: doc.razon_social,
        total: parseFloat(doc.total),
      }));
      formData.append("documentos", JSON.stringify(documentosSinArchivo));

      // Archivos con validación
      const validTypes = ["image/jpeg", "image/png", "application/pdf"];
      for (let doc of documentos) {
        if (doc.archivo instanceof File) {
          if (doc.archivo.size > MAX_FILE_SIZE) {
            alert(`⚠️ El archivo ${doc.archivo.name} supera el límite de 10MB.`);
            setLoading(false);
            return;
          }
          if (!validTypes.includes(doc.archivo.type)) {
            alert(
              `⚠️ El archivo ${doc.archivo.name} no tiene un formato válido. Usa JPG, PNG o PDF.`
            );
            setLoading(false);
            return;
          }
          formData.append("archivos", doc.archivo);
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
        <DialogContent className="w-[95vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg">
              <FileText className="w-5 h-5 text-gray-700" />
              Presentar Documentación
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            {/* Información de la solicitud */}
            <Card className="overflow-hidden">
              <CardContent className="p-4 space-y-2 text-sm sm:text-base">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {[
                    { icon: <ClipboardList className="w-4 h-4 text-gray-800" />, label: "Solicitud", value: solicitud.numero_solicitud },
                    { icon: <User className="w-4 h-4 text-gray-800" />, label: "Solicitante", value: solicitud.solicitante || "—" },
                    { icon: <Tag className="w-4 h-4 text-gray-800" />, label: "Tipo", value: solicitud.tipo_solicitud || "—" },
                    { icon: <WalletMinimal className="w-4 h-4 text-gray-800" />, label: "Monto Soles (S/.)", value: solicitud.total_soles || solicitud.monto || "—" },
                    { icon: <DollarSign className="w-4 h-4 text-gray-800" />, label: "Monto Dólares ($)", value: solicitud.total_dolares || "—" },
                    { icon: <Calendar className="w-4 h-4 text-gray-800" />, label: "Fecha", value: solicitud.fecha || "—" },
                    { icon: <BadgeAlert className="w-4 h-4 text-gray-800" />, label: "Estado", value: solicitud.estado || "Pendiente", full: true },
                  ].map((item, idx) => (
                    <p
                      key={idx}
                      className={`flex items-center gap-1 ${item.full ? "col-span-full sm:col-span-2 lg:col-span-3" : ""} break-words text-sm sm:text-base`}
                    >
                      {item.icon} <span className="font-semibold">{item.label}:</span> {item.value}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Comprobantes */}
            <Card className="overflow-hidden">
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FilePlus2 className="w-5 h-5 text-gray-700" />
                    Comprobantes OCR
                  </h3>

                  <Button
                    size="sm"
                    onClick={() => setShowSubirArchivoModal(true)}
                    fromColor="#8b5cf6"    // violeta inicial
                    toColor="#a78bfa"       // violeta final
                    hoverFrom="#7c3aed"     // hover inicial
                    hoverTo="#6d28d9"       // hover final
                    className="flex items-center gap-2 w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4" /> Agregar
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <Table
                    headers={[
                      "Nombre del Archivo",
                      "N° Documento",
                      "Tipo de Documento",
                      "Fecha",
                      "RUC",
                      "Razón Social",
                      "Total",
                    ]}
                    data={documentos}
                    emptyMessage="No se han agregado comprobantes todavía."
                    renderRow={(doc) => [
                      <span
                        className="cursor-pointer text-blue-600 hover:underline whitespace-normal break-words text-center"
                        onClick={() => handleAbrirArchivo(doc.archivo)}
                      >
                        {doc.nombre_archivo}
                      </span>,
                      <span className="text-center">{doc.numero_documento}</span>,
                      <span className="text-center whitespace-normal break-words">{doc.tipo_documento}</span>,
                      <span className="text-center">{doc.fecha}</span>,
                      <span className="text-center">{doc.ruc}</span>,
                      <span className="truncate sm:whitespace-normal max-w-[140px] text-center">{doc.razon_social}</span>,
                      <span className="text-center">{doc.total}</span>,
                    ]}
                    onDeleteRow={(doc) => handleEliminarDocumento(doc)}
                  />
                </div>

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
              fromColor="#f87171"      // rojo inicial
              toColor="#ef4444"        // rojo final
              hoverFrom="#ef4444"      // hover inicial
              hoverTo="#dc2626"        // hover final
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <X className="w-4 h-4" /> Cancelar
            </Button>

            <Button
              onClick={handlePresentarLiquidacion}
              disabled={loading || documentos.length === 0}
              fromColor="#60a5fa"      // azul inicial
              toColor="#3b82f6"        // azul final
              hoverFrom="#3b82f6"      // hover inicial
              hoverTo="#2563eb"        // hover final
              className="flex items-center gap-2 w-full sm:w-auto"
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
