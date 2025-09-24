// src/dashboard/liquidaciones/PresentarDocumentacionModal.jsx
import React, { useState, useMemo, useEffect } from "react";
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
  Pencil,
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

  // --- edición ---
  const [editingCell, setEditingCell] = useState(null); // { rowIndex, field }
  const [editingRow, setEditingRow] = useState(null); // rowIndex o null
  const [editingValues, setEditingValues] = useState({});
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const check = () =>
      setIsMobileView(typeof window !== "undefined" ? window.innerWidth < 768 : false);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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
  };

  const handleEliminarDocumento = (doc) => {
    setDocumentos((prev) => prev.filter((d) => d !== doc));
  };

  const handleAbrirArchivo = (archivo) => {
    if (!archivo) return;
    const url = URL.createObjectURL(archivo);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // --- edición helpers ---
  const startEditingCell = (rowIndex, field) => {
    setEditingRow(null);
    setEditingCell({ rowIndex, field });
    setEditingValues({ ...(documentos[rowIndex] || {}) });
  };

  const startEditingRow = (rowIndex) => {
    setEditingCell(null);
    setEditingRow(rowIndex);
    setEditingValues({ ...(documentos[rowIndex] || {}) });
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditingRow(null);
    setEditingValues({});
  };

  const commitEditField = (rowIndex, field) => {
    setDocumentos((prev) => {
      const copy = [...prev];
      const current = { ...(copy[rowIndex] || {}) };
      let val = editingValues[field] ?? current[field] ?? "";

      if (field === "total") {
        const parsed = parseFloat(String(val).replace(",", "."));
        current[field] = isNaN(parsed) ? "" : parsed;
      } else if (field === "ruc") {
        current[field] = String(val).replace(/\D/g, "").slice(0, 11);
      } else {
        current[field] = val;
      }

      copy[rowIndex] = current;
      return copy;
    });

    setEditingCell(null);
  };

  const commitEditRow = (rowIndex) => {
    setDocumentos((prev) => {
      const copy = [...prev];
      const current = { ...(copy[rowIndex] || {}) };

      ["numero_documento", "tipo_documento", "fecha", "ruc", "razon_social", "total"].forEach(
        (field) => {
          let val = editingValues[field] ?? current[field] ?? "";
          if (field === "total") {
            const parsed = parseFloat(String(val).replace(",", "."));
            current[field] = isNaN(parsed) ? "" : parsed;
          } else if (field === "ruc") {
            current[field] = String(val).replace(/\D/g, "").slice(0, 11);
          } else {
            current[field] = val;
          }
        }
      );

      copy[rowIndex] = current;
      return copy;
    });

    setEditingRow(null);
    setEditingValues({});
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

      const documentosSinArchivo = documentos.map((doc) => ({
        tipo_documento: doc.tipo_documento,
        numero_documento: doc.numero_documento,
        fecha: doc.fecha,
        ruc: doc.ruc,
        razon_social: doc.razon_social,
        total: parseFloat(doc.total),
      }));
      formData.append("documentos", JSON.stringify(documentosSinArchivo));

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
                  {[ /* ... campos de solicitud ... */ ].map((item, idx) => (
                    <p
                      key={idx}
                      className={`flex items-center gap-1 ${
                        item.full ? "col-span-full sm:col-span-2 lg:col-span-3" : ""
                      } break-words text-sm sm:text-base`}
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

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setShowSubirArchivoModal(true)}
                      fromColor="#8b5cf6"
                      toColor="#a78bfa"
                      hoverFrom="#7c3aed"
                      hoverTo="#6d28d9"
                      className="flex items-center gap-2 w-full sm:w-auto"
                    >
                      <Plus className="h-4 w-4" /> Agregar
                    </Button>

                    {isMobileView && (
                      <button
                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                        onClick={() => cancelEditing()}
                      >
                        <Pencil className="w-5 h-5 text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Tabla OCR */}
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
                      isMobileView && "Acciones",
                    ].filter(Boolean)}
                    data={documentos}
                    emptyMessage="No se han agregado comprobantes todavía."
                    renderRow={(doc, rowIndex) => {
                      const fields = ["numero_documento", "tipo_documento", "fecha", "ruc", "razon_social", "total"];

                      const nameCell = (
                        <span
                          className="cursor-pointer text-blue-600 hover:underline whitespace-normal break-words text-center block"
                          onClick={() => handleAbrirArchivo(doc.archivo)}
                        >
                          {doc.nombre_archivo || "—"}
                        </span>
                      );

                      const editableCells = fields.map((field) => {
                        const isCellEditing =
                          editingCell && editingCell.rowIndex === rowIndex && editingCell.field === field;
                        const isRowEditing = editingRow === rowIndex;
                        const value = editingValues[field] ?? doc[field] ?? "";

                        if (isCellEditing || isRowEditing) {
                          return (
                            <input
                              key={field}
                              type={field === "fecha" ? "date" : "text"}
                              value={value}
                              onChange={(e) =>
                                setEditingValues((prev) => ({ ...prev, [field]: e.target.value }))
                              }
                              onBlur={() => {
                                if (!isRowEditing) commitEditField(rowIndex, field);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  isRowEditing
                                    ? commitEditRow(rowIndex)
                                    : commitEditField(rowIndex, field);
                                }
                              }}
                              className="border rounded px-2 py-1 text-sm w-full"
                              autoFocus={isCellEditing}
                            />
                          );
                        }

                        return (
                          <span
                            key={field}
                            className={`text-center block cursor-pointer ${!isMobileView ? "hover:bg-gray-50" : ""}`}
                            onDoubleClick={() => {
                              if (!isMobileView) startEditingCell(rowIndex, field);
                            }}
                          >
                            {doc[field] ?? "—"}
                          </span>
                        );
                      });

                      const actionsCell = isMobileView ? (
                        <div className="flex items-center justify-center gap-2">
                          {editingRow === rowIndex ? (
                            <>
                              <Button
                                size="sm"
                                fromColor="#10b981"
                                toColor="#34d399"
                                onClick={() => commitEditRow(rowIndex)}
                              >
                                Guardar
                              </Button>
                              <Button
                                size="sm"
                                fromColor="#f87171"
                                toColor="#ef4444"
                                onClick={() => cancelEditing()}
                              >
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              fromColor="#60a5fa"
                              toColor="#3b82f6"
                              onClick={() => startEditingRow(rowIndex)}
                            >
                              Editar
                            </Button>
                          )}
                        </div>
                      ) : null;

                      return [nameCell, ...editableCells, actionsCell];
                    }}
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
              fromColor="#f87171"
              toColor="#ef4444"
              hoverFrom="#ef4444"
              hoverTo="#dc2626"
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <X className="w-4 h-4" /> Cancelar
            </Button>

            <Button
              onClick={handlePresentarLiquidacion}
              disabled={loading || documentos.length === 0}
              fromColor="#60a5fa"
              toColor="#3b82f6"
              hoverFrom="#3b82f6"
              hoverTo="#2563eb"
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <Send className="w-4 h-4" />{" "}
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
