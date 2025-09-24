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
  Check
} from "lucide-react";
import api from "@/services/api";
import Table from "@/components/ui/table";
import SubirArchivoModal from "./SubirArchivoModal";

const TIPO_CAMBIO = 3.52; // 1 USD = 3.52 S/
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function PresentarDocumentacionModal({ open, onClose, solicitud }) {
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSubirArchivoModal, setShowSubirArchivoModal] = useState(false);

  // edición controlada
  const [editingCells, setEditingCells] = useState({});
  const [editingValues, setEditingValues] = useState({});
  const [editingRow, setEditingRow] = useState(null);
  const [isMobileEditing, setIsMobileEditing] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { rowIndex, field, value }

  // detectar mobile
  useEffect(() => {
    const check = () =>
      setIsMobileView(typeof window !== "undefined" ? window.innerWidth < 768 : false);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // recalcula totales
  const { totalSoles, totalDolares } = useMemo(() => {
    const totalS = documentos.reduce((sum, doc) => sum + (parseFloat(doc.total) || 0), 0);
    return { totalSoles: totalS, totalDolares: totalS / TIPO_CAMBIO };
  }, [documentos]);

  // agregar doc
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

  // helpers
  const keyFor = (rowIndex, field) => `${rowIndex}_${field}`;

  // abrir edición de fila (mobile)
  const startEditingRow = (rowIndex) => {
    setEditingRow(rowIndex);
    const fields = ["numero_documento", "tipo_documento", "fecha", "ruc", "razon_social", "total"];
    setEditingValues((ev) => {
      const copy = { ...ev };
      fields.forEach((f) => {
        copy[keyFor(rowIndex, f)] = documentos[rowIndex]?.[f] ?? "";
      });
      return copy;
    });
  };

  const cancelEditRow = () => {
    if (editingRow === null) return;
    const row = editingRow;
    setEditingValues((ev) => {
      const copy = { ...ev };
      ["numero_documento", "tipo_documento", "fecha", "ruc", "razon_social", "total"].forEach(
        (f) => {
          delete copy[keyFor(row, f)];
        }
      );
      return copy;
    });
    setEditingRow(null);
  };

  // validaciones
  const validateField = (field, value) => {
    if (field === "total") {
      const parsed = parseFloat(String(value).replace(",", "."));
      if (isNaN(parsed) || parsed < 0)
        return { ok: false, msg: "Total debe ser un número válido mayor o igual a 0." };
      return { ok: true, value: parsed };
    }
    if (field === "fecha") {
      const parsed = Date.parse(value);
      if (isNaN(parsed)) return { ok: false, msg: "Fecha inválida." };
      return { ok: true, value };
    }
    if (field === "ruc") {
      const digits = String(value).replace(/\D/g, "");
      if (digits.length > 0 && digits.length < 8)
        return { ok: false, msg: "RUC muy corto (mínimo 8 dígitos)." };
      return { ok: true, value: digits || value };
    }
    return { ok: true, value };
  };

  // guardar una celda (desktop)
  const handleUpdateField = (rowIndex, field, value) => {
    const validation = validateField(field, value);
    if (!validation.ok) {
      alert("⚠️ " + validation.msg);
      return;
    }
    setDocumentos((prev) => {
      const copy = [...prev];
      const target = { ...(copy[rowIndex] || {}) };
      target[field] = validation.value;
      copy[rowIndex] = target;
      return copy;
    });
  };

  // guardar fila completa (mobile)
  const saveRow = (rowIndex) => {
    const fields = ["numero_documento", "tipo_documento", "fecha", "ruc", "razon_social", "total"];
    for (let field of fields) {
      const raw = editingValues[keyFor(rowIndex, field)];
      const validation = validateField(field, raw);
      if (!validation.ok) {
        alert(`Fila: ${rowIndex + 1} -> ${validation.msg}`);
        return;
      }
    }
    setDocumentos((prev) => {
      const copy = [...prev];
      const target = { ...(copy[rowIndex] || {}) };
      fields.forEach((field) => {
        const raw = editingValues[keyFor(rowIndex, field)];
        const validation = validateField(field, raw);
        target[field] = validation.value;
      });
      copy[rowIndex] = target;
      return copy;
    });
    cancelEditRow();
  };

  // presentar liquidación
  const handlePresentarLiquidacion = async () => {
    if (documentos.length === 0) return alert("⚠️ Agrega al menos un comprobante.");

    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      if (!token) {
        setLoading(false);
        return alert("⚠️ No se encontró token. Debes iniciar sesión.");
      }

      const formData = new FormData();
      formData.append("solicitud_id", solicitud.id);

      const documentosSinArchivo = documentos.map((doc) => ({
        tipo_documento: doc.tipo_documento,
        numero_documento: doc.numero_documento,
        fecha: doc.fecha,
        ruc: doc.ruc,
        razon_social: doc.razon_social,
        total: parseFloat(doc.total) || 0,
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

  if (!solicitud) return null;

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
            {/* Info solicitud */}
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
                    <p key={idx} className={`flex items-center gap-1 ${item.full ? "col-span-full sm:col-span-2 lg:col-span-3" : ""} break-words text-sm sm:text-base`}>
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

                    {/* toggle edición móvil (icono lápiz) */}
                    <button
                      className="sm:hidden p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                      onClick={() => setIsMobileEditing((prev) => !prev)}
                      title={isMobileEditing ? "Salir edición" : "Editar filas"}
                    >
                      <Pencil className="w-5 h-5 text-gray-600" />
                    </button>
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
                      isMobileEditing ? "Acciones" : null,
                    ].filter(Boolean)}
                    data={documentos}
                    emptyMessage="No se han agregado comprobantes todavía."
                    renderRow={(doc, rowIndex) => {
                      // nombre archivo (no editable)
                      const nameCell = (
                        <span
                          className="cursor-pointer text-blue-600 hover:underline whitespace-normal break-words text-center block"
                          onClick={() => handleAbrirArchivo(doc.archivo)}
                        >
                          {doc.nombre_archivo || "—"}
                        </span>
                      );

                      // campos editables en tabla
                      const fields = ["numero_documento", "tipo_documento", "fecha", "ruc", "razon_social", "total"];
                      const fieldCells = fields.map((field) => (
                        <span
                          key={field}
                          className={`text-center block cursor-pointer ${!isMobileView ? "hover:bg-gray-50" : ""}`}
                          onDoubleClick={() => {
                            if (!isMobileView) {
                              // abrir modal pequeño para editar solo esa celda
                              setEditingCell({
                                rowIndex,
                                field,
                                value: doc[field] ?? "",
                              });
                            }
                          }}
                        >
                          {doc[field] ?? "—"}
                        </span>
                      ));

                      // acciones móviles: editar fila completa
                      const actionsCell = isMobileEditing ? (
                        <div className="flex items-center justify-center gap-2">
                          {editingRow === rowIndex ? (
                            <>
                              <Button
                                key="save-row"
                                size="sm"
                                fromColor="#10b981"
                                toColor="#34d399"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveRow(rowIndex);
                                }}
                              >
                                Guardar
                              </Button>
                              <Button
                                key="cancel-row"
                                size="sm"
                                fromColor="#f87171"
                                toColor="#ef4444"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelEditRow();
                                }}
                              >
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <Button
                              key="edit-row"
                              size="sm"
                              fromColor="#60a5fa"
                              toColor="#3b82f6"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingRow(rowIndex);
                              }}
                            >
                              <Pencil className="w-4 h-4 mr-1" /> Editar
                            </Button>
                          )}
                        </div>
                      ) : null;

                      return [nameCell, ...fieldCells, actionsCell];
                    }}
                    onDeleteRow={(doc) => handleEliminarDocumento(doc)}
                  />

                  {/* Modal de edición por celda (desktop) */}
                  {editingCell && !isMobileView && (
                    <Dialog open={!!editingCell} onOpenChange={() => setEditingCell(null)}>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Editar campo</DialogTitle>
                        </DialogHeader>
                        <input
                          type={editingCell.field === "fecha" ? "date" : editingCell.field === "total" ? "number" : "text"}
                          step={editingCell.field === "total" ? "0.01" : undefined}
                          autoFocus
                          defaultValue={editingCell.value}
                          className="border rounded px-2 py-1 text-sm w-full mb-4"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleUpdateField(editingCell.rowIndex, editingCell.field, e.target.value);
                              setEditingCell(null);
                            }
                          }}
                        />
                        <DialogFooter className="flex justify-end gap-2">
                          <Button
                            fromColor="#f87171" // rojo claro
                            toColor="#ef4444"   // rojo medio
                            hoverFrom="#ef4444"
                            hoverTo="#dc2626"
                            size="default"
                            onClick={() => setEditingCell(null)}
                          >
                            <X />
                          </Button>
                          <Button
                            fromColor="#34d399" // verde claro
                            toColor="#10b981"   // verde medio
                            hoverFrom="#059669"
                            hoverTo="#10b981"
                            size="default"
                            onClick={() => {
                              const inputEl = document.querySelector("input[type]");
                              if (inputEl) {
                                handleUpdateField(editingCell.rowIndex, editingCell.field, inputEl.value);
                              }
                              setEditingCell(null);
                            }}
                          >
                            <Check />
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                <div className="mt-4 text-right font-semibold text-gray-800 text-sm sm:text-base">
                  <p>Total: S/ {Number(totalSoles || 0).toFixed(2)}</p>
                  <p>Total: $ {Number(totalDolares || 0).toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer buttons */}
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
}
