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
  Check,
  NotebookPen,
  Trash,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
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

   const [mobileMenu, setMobileMenu] = useState(null);

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

  // Estado para manejar el documento a eliminar
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

  // 🔍 Monitorear cambios en documentos
  useEffect(() => {
    console.log("✅ Documentos actualizado:", documentos);
  }, [documentos]);

  // guardar una celda (desktop)
  const handleUpdateField = (rowIndex, field, value) => {
    const validation = validateField(field, value);
    if (!validation.ok) {
      alert("⚠️ " + validation.msg);
      return;
    }

    setDocumentos((prev) => {
      const copy = [...prev];
      if (!copy[rowIndex]) return prev;

      // 👇 crear copia del objeto y actualizar solo el campo
      copy[rowIndex] = {
        ...copy[rowIndex],
        [field]: validation.value,
      };

      console.log("✏️ Editado:", field, "=", validation.value);
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
        total_documentado: totalSoles,
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
        <DialogContent className="w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg">
              <FileText className="w-5 h-5 text-gray-700" />
              Presentar Documentación
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            {/* Info solicitud estilo dashboard corporativo adaptativo */}
            <Card className="overflow-hidden rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <CardContent className="p-2 md:p-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {/* Columna izquierda */}
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { icon: <ClipboardList className="w-5 h-5 text-blue-600" />, label: "Solicitud", value: solicitud.numero_solicitud },
                      { icon: <User className="w-5 h-5 text-orange-600" />, label: "Solicitante", value: solicitud.solicitante || "—" },
                      { icon: <Tag className="w-5 h-5 text-purple-600" />, label: "Tipo", value: solicitud.tipo_solicitud || "—" },
                      { icon: <Calendar className="w-5 h-5 text-yellow-500" />, label: "Fecha", value: solicitud.fecha || "—" },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 md:gap-3 p-2 md:p-2 min-h-[50px] md:min-h-[60px] rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                        {item.icon}
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm md:text-base">{item.label}:</span>
                          <span className="text-gray-800 dark:text-gray-100 leading-snug text-xs sm:text-sm md:text-base break-words">{item.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Columna derecha */}
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { icon: <WalletMinimal className="w-5 h-5 text-blue-400" />, label: "Monto Soles", value: solicitud.total_soles || solicitud.monto || "—" },
                      { icon: <DollarSign className="w-5 h-5 text-green-500" />, label: "Monto Dólares", value: solicitud.total_dolares || "—" },
                      { icon: <BadgeAlert className="w-5 h-5 text-red-500" />, label: "Estado", value: solicitud.estado || "Pendiente" },
                      { icon: <NotebookPen className="w-5 h-5 text-cyan-500" />, label: "Concepto", value: solicitud.concepto_gasto || "—" },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 md:gap-2 p-2 md:p-4 min-h-[50px] md:min-h-[60px] rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                        {item.icon}
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm md:text-base">{item.label}:</span>
                          <span className="text-gray-800 dark:text-gray-100 leading-snug text-xs sm:text-sm md:text-base break-words">{item.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
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

                    <button
                      className="sm:hidden p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                      onClick={() => setIsMobileEditing((prev) => !prev)}
                      title={isMobileEditing ? "Salir edición" : "Editar filas"}
                    >
                      <Pencil className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Tabla OCR adaptativa */}
                <div className="w-full overflow-x-hidden">
                  <Table
                    headers={[
                      "Nombre Archivo",
                      "N° Documento",
                      "Tipo Documento",
                      "Fecha",
                      "RUC",
                      "Razón Social",
                      "Total",
                      <span key="accion" className="hidden md:table-cell">Acción</span>,
                    ]}
                    data={documentos}
                    emptyMessage="No se han agregado comprobantes todavía."
                    renderRow={(doc, rowIndex) => [
                      // Nombre archivo
                      <span
                        className="break-words max-w-[180px] sm:max-w-[220px] md:max-w-[260px] lg:max-w-[300px] cursor-pointer text-blue-600 hover:underline text-center text-xs sm:text-sm md:text-sm lg:text-base leading-snug whitespace-normal px-2 py-1"
                        onClick={() => {
                          if (window.innerWidth < 768) {
                            setMobileMenu({ open: true, rowIndex, doc });
                          } else {
                            handleAbrirArchivo(doc.archivo);
                          }
                        }}
                        title={doc.nombre_archivo}
                      >
                        {doc.nombre_archivo ?? "-"}
                      </span>,

                      ...["numero_documento", "tipo_documento", "fecha", "ruc", "razon_social", "total"].map((field) => {
                        const isEditing = editingCell && editingCell.rowIndex === rowIndex && editingCell.field === field;
                        return (
                          <span
                            key={field}
                            className={`break-words max-w-[100px] sm:max-w-[120px] md:max-w-[140px] lg:max-w-[160px] text-center px-1 py-1 text-[9px] sm:text-[10px] md:text-xs lg:text-sm hover:bg-gray-50 leading-snug whitespace-normal cursor-pointer`}
                            title={doc[field] ?? "-"}
                            onDoubleClick={() => window.innerWidth >= 768 && setEditingCell({ rowIndex, field, value: doc[field] ?? "" })}
                          >
                            {isEditing ? editingCell.value ?? "" : doc[field] ?? "-"}
                          </span>
                        );
                      }),

                      // Botón eliminar desktop
                      <div className="hidden md:flex justify-center">
                        <button
                          className="p-1 rounded-full bg-red-500 text-white hover:bg-red-700"
                          onClick={() => handleEliminarDocumento(doc)}
                          title="Eliminar documento"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>,
                    ]}
                    onRowClick={() => {}}
                  />
                </div>

                {/* Modal móvil: menú de opciones por fila */}
                {mobileMenu?.open && (
                  <Dialog open={mobileMenu.open} onOpenChange={() => setMobileMenu(null)}>
                    <DialogContent className="w-[90vw] max-w-sm rounded-xl p-4 shadow-lg">
                      <DialogHeader>
                        <DialogTitle>Opciones para {mobileMenu.doc.nombre_archivo}</DialogTitle>
                      </DialogHeader>

                      <DialogFooter className="flex flex-col gap-2">
                        {/* Editar: abre modal de edición */}
                        <Button
                          fromColor="#34d399"
                          toColor="#10b981"
                          onClick={() => {
                            setEditingCell({
                              rowIndex: mobileMenu.rowIndex,
                              field: "numero_documento", // Por defecto abrimos edición del primer campo, o puedes permitir elegir
                              value: mobileMenu.doc.numero_documento ?? "",
                            });
                            setMobileMenu(null);
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-1" /> Editar
                        </Button>

                        {/* Eliminar */}
                        <Button
                          fromColor="#f87171"
                          toColor="#ef4444"
                          onClick={() => {
                            handleEliminarDocumento(mobileMenu.doc);
                            setMobileMenu(null);
                          }}
                        >
                          <Trash className="w-4 h-4 mr-1" /> Eliminar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                
                {/* Modal edición por celda */}
                {editingCell && (
                  <Dialog open={!!editingCell} onOpenChange={() => setEditingCell(null)}>
                    <DialogContent className="w-[90vw] sm:w-[80vw] md:w-[60vw] lg:w-[50vw] max-h-[80vh] overflow-y-auto p-4 rounded-xl shadow-lg">
                      <DialogHeader>
                        <DialogTitle>Editar campo</DialogTitle>
                      </DialogHeader>

                      <input
                        key={`${editingCell.rowIndex}-${editingCell.field}`}
                        type={editingCell.field === "fecha" ? "date" : editingCell.field === "total" ? "number" : "text"}
                        step={editingCell.field === "total" ? "0.01" : undefined}
                        autoFocus
                        value={editingCell.value ?? ""}
                        onChange={(e) => setEditingCell((prev) => prev && { ...prev, value: e.target.value })}
                        className="border rounded px-2 py-1 text-sm w-full mb-4"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleUpdateField(editingCell.rowIndex, editingCell.field, editingCell.value);
                            setEditingCell(null);
                          }
                        }}
                      />

                      <DialogFooter className="flex justify-end gap-2 flex-wrap">
                        <Button fromColor="#f87171" toColor="#ef4444" size="default" onClick={() => setEditingCell(null)}>
                          <X />
                        </Button>
                        <Button
                          fromColor="#34d399"
                          toColor="#10b981"
                          size="default"
                          onClick={() => {
                            handleUpdateField(editingCell.rowIndex, editingCell.field, editingCell.value);
                            setEditingCell(null);
                          }}
                        >
                          <Check />
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Total Acumulado */}
                <div className="mt-4 text-right font-semibold text-gray-800 text-sm sm:text-base">
                  <p>Total: S/ {Number(totalSoles || 0).toFixed(2)}</p>
                  <p>Total: $ {Number(totalDolares || 0).toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer buttons */}
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-4">
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
