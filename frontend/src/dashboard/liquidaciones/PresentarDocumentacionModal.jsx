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
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function PresentarDocumentacionModal({ open, onClose, solicitud }) {
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSubirArchivoModal, setShowSubirArchivoModal] = useState(false);

  // edición controlada
  const [editingCells, setEditingCells] = useState({}); // keys like "2_numero_documento": true
  const [editingValues, setEditingValues] = useState({}); // { "2_numero_documento": "..." }
  const [editingRow, setEditingRow] = useState(null); // index -> edición por fila (móvil)
  const [isMobileEditing, setIsMobileEditing] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  // detectar mobile (para UX)
  useEffect(() => {
    const check = () => setIsMobileView(typeof window !== "undefined" ? window.innerWidth < 768 : false);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // recalcula totales
  const { totalSoles, totalDolares } = useMemo(() => {
    const totalS = documentos.reduce((sum, doc) => sum + (parseFloat(doc.total) || 0), 0);
    return { totalSoles: totalS, totalDolares: totalS / TIPO_CAMBIO };
  }, [documentos]);

  // llamada desde SubirArchivoModal -> agrega doc
  const handleArchivoSubido = (doc) => {
    // doc expected to include: nombre_archivo, tipo_documento, numero_documento, fecha, ruc, razon_social, total, archivo
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

  // helpers para keys
  const keyFor = (rowIndex, field) => `${rowIndex}_${field}`;

  // iniciar edición de una celda (toggle)
  const toggleEditCell = (rowIndex, field) => {
    const key = keyFor(rowIndex, field);
    setEditingCells((prev) => {
      const next = { ...prev };
      if (next[key]) {
        // si ya estaba, cancelar (y quitar valor temporal)
        delete next[key];
        setEditingValues((ev) => {
          const copy = { ...ev };
          delete copy[key];
          return copy;
        });
      } else {
        next[key] = true;
        setEditingValues((ev) => ({ ...ev, [key]: documentos[rowIndex]?.[field] ?? "" }));
      }
      return next;
    });
  };

  // abrir edición para fila (mobile)
  const startEditingRow = (rowIndex) => {
    setEditingRow(rowIndex);
    // precargar todos los campos de esa fila
    const fields = ["numero_documento","tipo_documento","fecha","ruc","razon_social","total"];
    setEditingValues((ev) => {
      const copy = { ...ev };
      fields.forEach((f) => {
        copy[keyFor(rowIndex, f)] = documentos[rowIndex]?.[f] ?? "";
        copy[keyFor(rowIndex, f) + "_rowmode"] = true; // helper flag (no usado ampliamente)
      });
      return copy;
    });
  };

  const cancelEditCell = (rowIndex, field) => {
    const key = keyFor(rowIndex, field);
    setEditingCells((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setEditingValues((ev) => {
      const copy = { ...ev };
      delete copy[key];
      return copy;
    });
  };

  const cancelEditRow = () => {
    if (editingRow === null) return;
    // remove all editingValues keys for that row
    const row = editingRow;
    setEditingValues((ev) => {
      const copy = { ...ev };
      ["numero_documento","tipo_documento","fecha","ruc","razon_social","total"].forEach((f) => {
        delete copy[keyFor(row, f)];
        delete copy[keyFor(row, f) + "_rowmode"];
      });
      return copy;
    });
    setEditingRow(null);
  };

  // validaciones simples
  const validateField = (field, value) => {
    if (field === "total") {
      const parsed = parseFloat(String(value).replace(",", "."));
      if (isNaN(parsed) || parsed < 0) return { ok: false, msg: "Total debe ser un número válido mayor o igual a 0." };
      return { ok: true, value: parsed };
    }
    if (field === "fecha") {
      // permitimos yyyy-mm-dd (input date) o parseables
      const parsed = Date.parse(value);
      if (isNaN(parsed)) return { ok: false, msg: "Fecha inválida." };
      // keep original string
      return { ok: true, value };
    }
    if (field === "ruc") {
      const digits = String(value).replace(/\D/g, "");
      if (digits.length > 0 && digits.length < 8) return { ok: false, msg: "RUC muy corto (mínimo 8 dígitos)." };
      return { ok: true, value: digits || value };
    }
    // otros campos: permitimos vacío
    return { ok: true, value };
  };

  // guardar una celda editada
  const saveCell = (rowIndex, field) => {
    const key = keyFor(rowIndex, field);
    const raw = editingValues[key];
    const validation = validateField(field, raw);
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
    // limpiar
    cancelEditCell(rowIndex, field);
  };

  // guardar fila completa (mobile)
  const saveRow = (rowIndex) => {
    const fields = ["numero_documento","tipo_documento","fecha","ruc","razon_social","total"];
    // validate all
    for (let field of fields) {
      const key = keyFor(rowIndex, field);
      const raw = editingValues[key];
      const validation = validateField(field, raw);
      if (!validation.ok) {
        alert(`Fila: ${rowIndex + 1} -> ${validation.msg}`);
        return;
      }
    }
    // commit
    setDocumentos((prev) => {
      const copy = [...prev];
      const target = { ...(copy[rowIndex] || {}) };
      fields.forEach((field) => {
        const key = keyFor(rowIndex, field);
        const raw = editingValues[key];
        const validation = validateField(field, raw);
        target[field] = validation.value;
      });
      copy[rowIndex] = target;
      return copy;
    });
    // limpiar edición row
    cancelEditRow();
  };

  // manejar cambio de input controlado
  const handleEditingValueChange = (rowIndex, field, value) => {
    const key = keyFor(rowIndex, field);
    setEditingValues((prev) => ({ ...prev, [key]: value }));
  };

  // presentar liquidación (sin cambiar)
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
            alert(`⚠️ El archivo ${doc.archivo.name} no tiene un formato válido. Usa JPG, PNG o PDF.`);
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

  // render
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

                      // fields list
                      const fields = ["numero_documento","tipo_documento","fecha","ruc","razon_social","total"];
                      const fieldCells = fields.map((field) => {
                        const key = keyFor(rowIndex, field);
                        const isEditing = Boolean(editingCells[key]) || editingRow === rowIndex;
                        const currentValue = isEditing ? (editingValues[key] ?? "") : (doc[field] ?? "");

                        // usar input type=date para fecha cuando se está editando
                        if (isEditing) {
                          if (field === "fecha") {
                            return (
                              <input
                                key={field}
                                type="date"
                                value={currentValue || ""}
                                onChange={(e) => handleEditingValueChange(rowIndex, field, e.target.value)}
                                onBlur={() => {
                                  // si no estamos en row edit mode, guardar
                                  if (editingRow !== rowIndex && editingCells[key]) saveCell(rowIndex, field);
                                }}
                                className="border rounded px-2 py-1 text-sm w-full"
                              />
                            );
                          }
                          // total -> number input
                          if (field === "total") {
                            return (
                              <input
                                key={field}
                                type="number"
                                step="0.01"
                                value={currentValue === "" ? "" : currentValue}
                                onChange={(e) => handleEditingValueChange(rowIndex, field, e.target.value)}
                                onBlur={() => { if (editingRow !== rowIndex && editingCells[key]) saveCell(rowIndex, field); }}
                                className="border rounded px-2 py-1 text-sm w-full"
                              />
                            );
                          }

                          // textos
                          return (
                            <input
                              key={field}
                              type="text"
                              value={currentValue}
                              onChange={(e) => handleEditingValueChange(rowIndex, field, e.target.value)}
                              onBlur={() => { if (editingRow !== rowIndex && editingCells[key]) saveCell(rowIndex, field); }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && editingRow !== rowIndex) saveCell(rowIndex, field);
                              }}
                              className="border rounded px-2 py-1 text-sm w-full"
                            />
                          );
                        }

                        // vista no editable -> muestra valor y permite doble-clic en desktop
                        return (
                          <span
                            key={field}
                            className={`text-center block cursor-pointer ${!isMobileView ? "hover:bg-gray-50" : ""}`}
                            onDoubleClick={() => {
                              if (!isMobileView) {
                                // enable editing this cell
                                toggleEditCell(rowIndex, field);
                              }
                            }}
                          >
                            {doc[field] ?? "—"}
                          </span>
                        );
                      });

                      // mobile actions (editar fila)
                      const actionsCell = isMobileEditing ? (
                        <div className="flex items-center justify-center gap-2">
                          {editingRow === rowIndex ? (
                            <>
                              <Button
                                key="save-row"
                                size="sm"
                                fromColor="#10b981"
                                toColor="#34d399"
                                onClick={(e) => { e.stopPropagation(); saveRow(rowIndex); }}
                              >
                                Guardar
                              </Button>
                              <Button
                                key="cancel-row"
                                size="sm"
                                fromColor="#f87171"
                                toColor="#ef4444"
                                onClick={(e) => { e.stopPropagation(); cancelEditRow(); }}
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
                              onClick={(e) => { e.stopPropagation(); startEditingRow(rowIndex); }}
                            >
                              Editar
                            </Button>
                          )}
                        </div>
                      ) : null;

                      // devolver fila (orden de columnas)
                      return [nameCell, ...fieldCells, actionsCell];
                    }}
                    onDeleteRow={(doc) => handleEliminarDocumento(doc)}
                  />
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
