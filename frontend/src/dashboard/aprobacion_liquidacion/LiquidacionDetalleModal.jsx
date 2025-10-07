// src/dashboard/aprobacion_liquidacion/LiquidacionDetalleModal.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import VistaDocumentoModal from "./VistaDocumentoModal";
import api from "@/services/api";
import { toast } from "react-toastify";
import EventBus from "@/components/EventBus";
import {
  User,
  Calendar,
  WalletMinimal,
  Banknote,
  NotebookPen,
  Repeat,
  BadgeAlert,
  FileText,
} from "lucide-react";

const TASA_CAMBIO = 3.52;

export default function LiquidacionDetalleModal({ open, onClose, liquidacion, onDecided }) {
  const [vistaDocOpen, setVistaDocOpen] = useState(false);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [estado, setEstado] = useState(liquidacion?.estado || "Liquidación enviada para Aprobación");
  const [loading, setLoading] = useState(false);
  const [comentario, setComentario] = useState(""); // opcional, si quieres añadir notas

  // 🔹 Cargar documentos
  useEffect(() => {
    if (!open || !liquidacion?.id) return;
    setEstado(liquidacion?.estado || "Liquidación enviada para Aprobación"); 

    const fetchDocumentos = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const { data: docs } = await api.get(
          `/boleta/listar_documentos/${liquidacion.id}/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const docsNormalizados = Array.isArray(docs)
          ? docs.map((d) => ({
              ...d,
              archivo_url: d.archivo_url || null,
              nombre_archivo: d.nombre_archivo || "ND",
              total: parseFloat(d.total) || 0,
            }))
          : [];
        setDocumentos(docsNormalizados);
      } catch (error) {
        console.error("❌ Error cargando documentos:", error.response?.data || error);
        setDocumentos([]);
      }
    };
    fetchDocumentos();
  }, [open, liquidacion?.id]);

  // ==========================
  // 🔹 Totales calculados
  // ==========================
  const montoSolicitado = parseFloat(liquidacion?.monto || liquidacion?.total_soles || 0);
  const montoSolicitadoDolares = montoSolicitado / TASA_CAMBIO;

  const totalDocumentadoSoles = useMemo(
    () => documentos.reduce((sum, doc) => sum + (parseFloat(doc.total) || 0), 0),
    [documentos]
  );
  const totalDocumentadoDolares = totalDocumentadoSoles / TASA_CAMBIO;

  const diferenciaSoles = montoSolicitado - totalDocumentadoSoles;
  const diferenciaDolares = diferenciaSoles / TASA_CAMBIO;

  // ==========================
  // 🔹 Helpers
  // ==========================
  const formatSoles = (value) =>
    Number(value).toLocaleString("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
    });
  const formatDolares = (value) =>
    Number(value).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });

  const getDiferenciaColor = (valor) => {
    if (valor > 0) return "text-green-600 dark:text-green-400 font-semibold";
    if (valor < 0) return "text-red-600 dark:text-red-400 font-semibold";
    return "text-gray-700 dark:text-gray-300";
  };

  // ==========================
  // 🔹 Aprobar / Rechazar
  // ==========================
  const handleDecision = async (decision) => {
    if (!liquidacion?.id) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");

      // El backend espera "Aprobar" o "Rechazado" en decision
      const payloadDecision = decision === "aprobar" ? "Aprobar" : "Rechazado";

      // 🔹 Llamada a API
      await api.post(
        `/boleta/solicitudes/${liquidacion.id}/decision/`,
        { decision: payloadDecision, comentario },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 🔹 Estado local (lo que se muestra en el modal)
      const nuevoEstado =
        decision === "aprobar" ? "Liquidación Aprobada" : "Rechazado";
      setEstado(nuevoEstado);

      // 🔹 Emitimos evento global (para refrescar dashboard)
      EventBus.emit(
        decision === "aprobar" ? "liquidacionAprobada" : "liquidacionRechazada",
        { id: liquidacion.id }
      );

      // 🔹 Toast feedback
      toast.success(
        decision === "aprobar"
          ? "✅ Liquidación aprobada correctamente."
          : "❌ Liquidación rechazada."
      );

      // 🔹 Callback al padre
      if (onDecided)
        onDecided(
          decision === "aprobar"
            ? "Liquidación aprobada correctamente."
            : "Liquidación rechazada correctamente."
        );

      // 🔹 Cerramos modal
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("❌ Error al registrar la acción.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // 🔹 Items Info
  // ==========================
  const items = [
    {
      icon: <User className="w-4 h-4 text-orange-600" />,
      label: "Solicitante",
      value: liquidacion.solicitante_nombre || liquidacion.solicitante_id || "—",
    },
    {
      icon: <WalletMinimal className="w-4 h-4 text-blue-500" />,
      label: "Monto Solicitado",
      value: `${formatSoles(montoSolicitado)} / ${formatDolares(montoSolicitadoDolares)}`,
    },
    {
      icon: <Calendar className="w-4 h-4 text-yellow-500" />,
      label: "Fecha Envío",
      value: liquidacion.fecha
        ? new Date(liquidacion.fecha).toLocaleDateString("es-PE")
        : "—",
    },
    {
      icon: <Banknote className="w-4 h-4 text-pink-600" />,
      label: "Total Documentado",
      value: `${formatSoles(totalDocumentadoSoles)} / ${formatDolares(totalDocumentadoDolares)}`,
    },
    {
      icon: <NotebookPen className="w-4 h-4 text-cyan-500" />,
      label: "Concepto",
      value: liquidacion.concepto_gasto || "—",
    },
    {
      icon: <Repeat className="w-4 h-4 text-purple-600" />,
      label: "Diferencia",
      value: (
        <span className={getDiferenciaColor(diferenciaSoles)}>
          {`${formatSoles(diferenciaSoles)} / ${formatDolares(diferenciaDolares)}`}
        </span>
      ),
    },
    {
      icon: <BadgeAlert className="w-4 h-4 text-indigo-600" />,
      label: "Estado",
      value: estado,
    },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl sm:max-w-4xl lg:max-w-5xl w-[95%] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-lg animate-fadeIn p-4 sm:p-6 ">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl font-bold">
              Detalle de la Solicitud #{liquidacion.numero_solicitud}
            </DialogTitle>
          </DialogHeader>

          {/* Info solicitud */}
          <Card className="overflow-hidden rounded-xl shadow-md border border-gray-200/70 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 mb-4">
            <CardContent className="p-2 md:p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col justify-between p-2 rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 min-h-[60px]"
                  >
                    <div className="flex items-center gap-1.5">
                      {item.icon}
                      <span className="font-semibold text-gray-600 dark:text-gray-300 text-[11px] sm:text-xs">
                        {item.label}:
                      </span>
                    </div>
                    <span className="text-gray-800 dark:text-gray-100 text-xs sm:text-sm break-words mt-0.5">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Documentos */}
          {documentos.length > 0 && (
            <Card className="rounded-xl shadow-md border border-gray-200/70 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <CardContent className="p-3">
                <p className="font-semibold mb-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <FileText className="w-4 h-4 text-blue-600" /> Documentos
                </p>
                <div className="flex flex-wrap gap-2">
                  {documentos.map((doc, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-700 transition text-xs sm:text-sm"
                      onClick={() =>
                        doc.archivo_url
                          ? window.open(doc.archivo_url, "_blank")
                          : setVistaDocOpen(true) || setDocumentoSeleccionado(doc)
                      }
                    >
                      {doc.numero_documento || doc.nombre_archivo || "Documento"}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Footer con botones */}
          <DialogFooter className="mt-4">
            <div className="flex flex-col sm:flex-row justify-end gap-3 w-full">
              <Button
                disabled={loading || estado === "Liquidación Aprobada" || estado === "Rechazado"}
                onClick={() => handleDecision("rechazar")}
                fromColor="#f87171"
                toColor="#ef4444"
                hoverFrom="#ef4444"
                hoverTo="#dc2626"
                size="default"
              >
                {loading ? "Procesando..." : "Rechazar"}
              </Button>

              <Button
                disabled={loading || estado === "Liquidación Aprobada" || estado === "Rechazado"}
                onClick={() => handleDecision("aprobar")}
                fromColor="#34d399"
                toColor="#10b981"
                hoverFrom="#059669"
                hoverTo="#10b981"
                size="default"
              >
                {loading ? "Procesando..." : "Aprobar"}
              </Button>
            </div>
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
