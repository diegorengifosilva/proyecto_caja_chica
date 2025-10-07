// src/dashboard/solicitudes/DetallesSolicitud.jsx
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, 
  FolderClosed, 
  History, 
  Paperclip, 
  ClipboardList,
  User,
  Tag,
  Calendar,
  WalletMinimal,
  DollarSign,
  BadgeAlert,
  NotebookPen,
  Clock,
  MessageSquare,
  Banknote,
  CreditCard,
  CalendarDays,
  Pin,
  Landmark,
  ChartColumnStacked,
  FileImage,
  FileSpreadsheet,
  Presentation,
  FileArchive,
  FileCode,
  File,
  MessageCircleWarning,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import axios from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { STATE_COLORS } from "@/components/ui/colors";
import { Button } from "@/components/ui/button";
import EventBus from "@/components/EventBus";
import { useAuth } from "@/context/AuthContext";
import Table from "@/components/ui/table";

export default function DetallesSolicitud({ open, onClose, solicitudId, solicitudInit }) {
  const { authUser: user } = useAuth();
  const [solicitud, setSolicitud] = useState(solicitudInit || null);
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [adjuntos, setAdjuntos] = useState([]);
  const [loading, setLoading] = useState(!solicitud);
  const [updating, setUpdating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [accion, setAccion] = useState(null);

  const canEnviar = () => user?.rol === "Colaborador" && solicitud?.estado === "Pendiente de Envío";

  useEffect(() => {
    if (!solicitudId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Solicitud
        const { data } = await axios.get(`/boleta/mis_solicitudes/${solicitudId}/`);
        setSolicitud(data);

        // Documentos de la solicitud filtrando por solicitud_id
        const { data: docs } = await axios.get(`/boleta/listar_documentos/${solicitudId}/`);
        const docsNormalizados = Array.isArray(docs)
          ? docs.map(d => ({
              ...d,
              archivo_url: d.archivo_url || null,
              nombre_archivo: d.nombre_archivo || "ND",
            }))
          : [];

        // Todos los documentos van a liquidaciones
        setLiquidaciones(docsNormalizados);

        // Adjuntos también incluyen todos los archivos para visualización
        setAdjuntos(docsNormalizados);

      } catch (err) {
        console.error("❌ Error cargando datos:", err);
        setLiquidaciones([]);
        setAdjuntos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [solicitudId]);

  const cambiarEstado = async (nuevoEstado) => {
    if (!solicitud) return;
    try {
      setUpdating(true);
      const { data } = await axios.patch(`/boleta/mis_solicitudes/${solicitud.id}/estado/`, { estado: nuevoEstado });
      setSolicitud(prev => ({ ...prev, estado: data.solicitud?.estado || nuevoEstado }));
      EventBus.emit("solicitudActualizada", {
        numero_solicitud: data.solicitud?.numero_solicitud || solicitud.numero_solicitud,
        estado: nuevoEstado
      });
      setConfirmOpen(false);
      setAccion(null);
    } catch (error) {
      console.error("❌ Error al actualizar estado:", error);
      alert(error.response?.data?.error || "No se pudo actualizar el estado.");
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirm = () => {
    if (!accion) return;
    switch (accion) {
      case "enviar": cambiarEstado("Pendiente para Atención"); break;
      case "atender": cambiarEstado("Atendido, Pendiente de Liquidación"); break;
      case "aprobar": cambiarEstado("Liquidación Aprobada"); break;
      case "rechazar": cambiarEstado("Rechazado"); break;
      default: break;
    }
  };

  const InfoItem = ({ icon, label, value }) => (
    <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 min-h-[50px] rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
      {icon}
      <div className="flex flex-col">
        <span className="font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm md:text-base">
          {label}:
        </span>
        <span className="text-gray-800 dark:text-gray-100 leading-snug text-xs sm:text-sm md:text-base break-words">
          {value}
        </span>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl sm:max-w-4xl w-[95%] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-lg animate-fadeIn p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-gray-800">
            <FileText className="w-6 h-6 sm:w-7 sm:h-7" />
            Detalles de la Solicitud {solicitud?.numero_solicitud || "-"}
          </DialogTitle>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Usuario: {user?.nombre ? `${user.nombre} ${user.apellido || ""}` : "Usuario"}
          </p>
        </DialogHeader>

        {loading ? (
          <p className="text-gray-500 text-center py-4">Cargando solicitud...</p>
        ) : !solicitud ? (
          <p className="text-gray-500 text-center py-4">No se encontró la solicitud.</p>
        ) : (
          <>
            <Tabs defaultValue="basicos" className="w-full mt-3">
              <TabsList className="grid grid-cols-3 gap-2 mb-4">
                <TabsTrigger value="basicos" className="flex items-center gap-2 justify-center text-sm sm:text-base">
                  <FolderClosed className="w-5 h-5 sm:w-6 sm:h-6" /> Básicos
                </TabsTrigger>
                <TabsTrigger value="liquidaciones" className="flex items-center gap-2 justify-center text-sm sm:text-base">
                  <History className="w-5 h-5 sm:w-6 sm:h-6" /> Liquidaciones
                </TabsTrigger>
                <TabsTrigger value="adjuntos" className="flex items-center gap-2 justify-center text-sm sm:text-base">
                  <Paperclip className="w-5 h-5 sm:w-6 sm:h-6" /> Adjuntos
                </TabsTrigger>
              </TabsList>

              {/* BASICOS */}
              <TabsContent value="basicos" className="space-y-6">
                <Card className="overflow-hidden rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <CardContent className="p-2 md:p-4 space-y-6">

                    {/* DATOS DE LA SOLICITUD */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <Pin className="w-4 h-4" /> Datos de la Solicitud
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {[
                          { icon: <ClipboardList className="w-5 h-5 text-blue-600" />, label: "N° Solicitud", value: solicitud.numero_solicitud },
                          { icon: <Calendar className="w-5 h-5 text-yellow-500" />, label: "Fecha", value: solicitud.fecha || "—" },
                          { icon: <Clock className="w-5 h-5 text-purple-500" />, label: "Hora", value: solicitud.hora || "—" },
                          { icon: <Tag className="w-5 h-5 text-indigo-600" />, label: "Tipo Solicitud", value: solicitud.tipo_solicitud || "—" },
                          { icon: <NotebookPen className="w-5 h-5 text-cyan-500" />, label: "Concepto", value: solicitud.concepto_gasto || "—" },

                        ].map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800"
                          >
                            {item.icon}
                            <div>
                              <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm">{item.label}:</span>
                              <p className="text-gray-800 dark:text-gray-100 text-sm break-words">{item.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* DATOS FINANCIEROS */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <Landmark className="w-4 h-4" /> Información Financiera
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {[
                          { icon: <WalletMinimal className="w-5 h-5 text-emerald-500" />, label: "Monto Soles", value: solicitud.total_soles || "—" },
                          { icon: <DollarSign className="w-5 h-5 text-green-500" />, label: "Monto Dólares", value: solicitud.total_dolares || "—" },
                          { icon: <Banknote className="w-5 h-5 text-blue-500" />, label: "Banco", value: solicitud.banco || "—" },
                          { icon: <CreditCard className="w-5 h-5 text-teal-500" />, label: "N° Cuenta", value: solicitud.numero_cuenta || "—" },
                          { icon: <CalendarDays className="w-5 h-5 text-pink-500" />, label: "Fecha Transferencia", value: solicitud.fecha_transferencia || "—" },
                          { icon: <CalendarDays className="w-5 h-5 text-violet-800" />, label: "Fecha Liquidación", value: solicitud.fecha_liquidacion || "—" },
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                            {item.icon}
                            <div>
                              <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm">{item.label}:</span>
                              <p className="text-gray-800 dark:text-gray-100 text-sm break-words">{item.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SEGUIMIENTO */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <ChartColumnStacked className="w-4 h-4" /> Seguimiento
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {[
                          {
                            icon: <BadgeAlert className="w-5 h-5 text-red-500" />,
                            label: "Estado",
                            value: (
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                STATE_COLORS[solicitud.estado] || "bg-gray-200 text-gray-700"
                              }`}>
                                {solicitud.estado}
                              </span>
                            ),
                          },
                          { icon: <User className="w-5 h-5 text-orange-600" />, label: "Destinatario", value: solicitud.destinatario_nombre || "—" },
                          { icon: <MessageSquare className="w-5 h-5 text-pink-600" />, label: "Observación", value: solicitud.observacion || "—" },
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                            {item.icon}
                            <div>
                              <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm">{item.label}:</span>
                              <p className="text-gray-800 dark:text-gray-100 text-sm break-words">{item.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* COMENTARIO DEL REVISOR */}
                    {solicitud.comentario && (
                      <div className="mt-4">
                        <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2">
                          <MessageCircleWarning className="w-4 h-4 text-red-500" /> Comentario del Revisor
                        </h3>
                        <div className="p-3 rounded-xl border border-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-red-900/30 shadow-sm">
                          <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-line">
                            {solicitud.comentario}
                          </p>
                        </div>
                      </div>
                    )}

                  </CardContent>
                </Card>
              </TabsContent>

              {/* LIQUIDACIONES */}
              <TabsContent value="liquidaciones" className="space-y-3">
                {liquidaciones.length === 0 ? (
                  <p className="text-gray-500 text-center text-sm">No hay liquidaciones cargadas.</p>
                ) : (
                  <div className="max-h-[70vh] w-full">
                    <Table
                      headers={[
                        "#",
                        "RUC",
                        "Razón Social",
                        "Tipo Doc.",
                        "N° Documento",
                        "Fecha",
                        "Total (S/)",
                      ]}
                      data={liquidaciones}
                      emptyMessage="No hay liquidaciones registradas."
                      renderRow={(doc, i) => [
                        <span className="text-center text-xs sm:text-sm md:text-base break-words">{i + 1}</span>,
                        <span className="text-xs sm:text-sm md:text-base break-words">{doc.ruc || "—"}</span>,
                        <span
                          className="whitespace-normal break-words max-w-[120px] sm:max-w-[180px] md:max-w-[250px] text-xs sm:text-sm md:text-base leading-snug"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                          title={doc.razon_social || ""}
                        >
                          {doc.razon_social || "—"}
                        </span>,
                        <span className="text-xs sm:text-sm md:text-base break-words">{doc.tipo_documento || "—"}</span>,
                        <span className="text-xs sm:text-sm md:text-base break-words">{doc.numero_documento || "—"}</span>,
                        <span className="text-xs sm:text-sm md:text-base break-words">{doc.fecha || "—"}</span>,
                        <span className="text-right font-medium text-xs sm:text-sm md:text-base break-words">
                          {doc.total ? `S/ ${Number(doc.total).toFixed(2)}` : "—"}
                        </span>,
                      ]}
                      onRowClick={() => {/* si quieres acción al click */}}
                    />

                    {/* 📌 Footer resumen */}
                    <div className="mt-2 border-t pt-2 text-xs sm:text-sm md:text-base">
                      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-6 text-center sm:text-right">
                        <div className="font-semibold text-gray-700 dark:text-gray-200">
                          Total Documentado:{" "}
                          <span>
                            S/{" "}
                            {liquidaciones
                              .reduce((sum, doc) => sum + (parseFloat(doc.total) || 0), 0)
                              .toFixed(2)}
                          </span>
                        </div>

                        <div className="font-semibold text-gray-700 dark:text-gray-200">
                          Diferencia:{" "}
                          <span
                            className={
                              ((parseFloat(solicitud?.total_soles) || 0) -
                                liquidaciones.reduce((sum, doc) => sum + (parseFloat(doc.total) || 0), 0)) >=
                              0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            S/{" "}
                            {(
                              (parseFloat(solicitud?.total_soles) || 0) -
                              liquidaciones.reduce((sum, doc) => sum + (parseFloat(doc.total) || 0), 0)
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ADJUNTOS */}
              <TabsContent value="adjuntos" className="space-y-4">
                {adjuntos.length === 0 ? (
                  <p className="text-gray-500 text-center">No hay documentos adjuntos.</p>
                ) : (
                  adjuntos.map((doc) => {
                    // 📌 Nombre original
                    const rawName = doc?.nombre_archivo?.trim() || "";
                    const lowerName = rawName.toLowerCase();

                    // 📌 Detectamos extensión real antes del sufijo (_p1, -p2, etc.)
                    const matchExt = lowerName.match(/\.([a-z0-9]+)(?:[_-]p\d+)?$/i);
                    const ext = matchExt ? matchExt[1] : "default";

                    // 📌 Limpiamos el nombre mostrado (sin sufijo de OCR tipo _p1)
                    const cleanDisplayName = rawName.replace(/([._-]p\d+)$/i, "");

                    // 🎨 Mapeo de íconos + colores
                    const ICONS = {
                      pdf: {
                        icon: <FileText className="w-5 h-5 text-red-500" />,
                        badge: "PDF",
                        badgeColor: "bg-red-100 text-red-700 dark:bg-red-800/30 dark:text-red-300",
                      },
                      jpg: {
                        icon: <FileImage className="w-5 h-5 text-blue-500" />,
                        badge: "Imagen",
                        badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-800/30 dark:text-blue-300",
                      },
                      jpeg: {
                        icon: <FileImage className="w-5 h-5 text-blue-500" />,
                        badge: "Imagen",
                        badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-800/30 dark:text-blue-300",
                      },
                      png: {
                        icon: <FileImage className="w-5 h-5 text-blue-500" />,
                        badge: "Imagen",
                        badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-800/30 dark:text-blue-300",
                      },
                      gif: {
                        icon: <FileImage className="w-5 h-5 text-blue-500" />,
                        badge: "Imagen",
                        badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-800/30 dark:text-blue-300",
                      },
                      bmp: {
                        icon: <FileImage className="w-5 h-5 text-blue-500" />,
                        badge: "Imagen",
                        badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-800/30 dark:text-blue-300",
                      },
                      webp: {
                        icon: <FileImage className="w-5 h-5 text-blue-500" />,
                        badge: "Imagen",
                        badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-800/30 dark:text-blue-300",
                      },
                      xls: {
                        icon: <FileSpreadsheet className="w-5 h-5 text-green-600" />,
                        badge: "Excel",
                        badgeColor: "bg-green-100 text-green-700 dark:bg-green-800/30 dark:text-green-300",
                      },
                      xlsx: {
                        icon: <FileSpreadsheet className="w-5 h-5 text-green-600" />,
                        badge: "Excel",
                        badgeColor: "bg-green-100 text-green-700 dark:bg-green-800/30 dark:text-green-300",
                      },
                      csv: {
                        icon: <FileSpreadsheet className="w-5 h-5 text-green-600" />,
                        badge: "CSV",
                        badgeColor: "bg-green-100 text-green-700 dark:bg-green-800/30 dark:text-green-300",
                      },
                      doc: {
                        icon: <FileText className="w-5 h-5 text-indigo-600" />,
                        badge: "Word",
                        badgeColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-800/30 dark:text-indigo-300",
                      },
                      docx: {
                        icon: <FileText className="w-5 h-5 text-indigo-600" />,
                        badge: "Word",
                        badgeColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-800/30 dark:text-indigo-300",
                      },
                      ppt: {
                        icon: <Presentation className="w-5 h-5 text-orange-500" />,
                        badge: "PowerPoint",
                        badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-800/30 dark:text-orange-300",
                      },
                      pptx: {
                        icon: <Presentation className="w-5 h-5 text-orange-500" />,
                        badge: "PowerPoint",
                        badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-800/30 dark:text-orange-300",
                      },
                      zip: {
                        icon: <FileArchive className="w-5 h-5 text-yellow-600" />,
                        badge: "ZIP",
                        badgeColor: "bg-yellow-100 text-yellow-700 dark:bg-yellow-800/30 dark:text-yellow-300",
                      },
                      rar: {
                        icon: <FileArchive className="w-5 h-5 text-yellow-600" />,
                        badge: "RAR",
                        badgeColor: "bg-yellow-100 text-yellow-700 dark:bg-yellow-800/30 dark:text-yellow-300",
                      },
                      txt: {
                        icon: <FileText className="w-5 h-5 text-gray-600" />,
                        badge: "Texto",
                        badgeColor: "bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-300",
                      },
                      js: {
                        icon: <FileCode className="w-5 h-5 text-purple-600" />,
                        badge: "Código",
                        badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-800/30 dark:text-purple-300",
                      },
                      jsx: {
                        icon: <FileCode className="w-5 h-5 text-purple-600" />,
                        badge: "Código",
                        badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-800/30 dark:text-purple-300",
                      },
                      ts: {
                        icon: <FileCode className="w-5 h-5 text-purple-600" />,
                        badge: "Código",
                        badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-800/30 dark:text-purple-300",
                      },
                      tsx: {
                        icon: <FileCode className="w-5 h-5 text-purple-600" />,
                        badge: "Código",
                        badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-800/30 dark:text-purple-300",
                      },
                      default: {
                        icon: <File className="w-5 h-5 text-gray-500" />,
                        badge: "Archivo",
                        badgeColor: "bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-300",
                      },
                    };

                    const fileInfo = ICONS[ext] || ICONS.default;

                    // 📅 Fecha formateada
                    const fechaSubida = doc.creado
                      ? format(new Date(doc.creado), "dd 'de' MMMM yyyy, HH:mm", { locale: es })
                      : null;

                    return (
                      <Card
                        key={doc.id}
                        className="overflow-hidden rounded-2xl shadow-md border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700"
                      >
                        {/* Header */}
                        <CardHeader className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {fileInfo.icon}
                              <CardTitle className="text-base font-semibold text-gray-800 dark:text-gray-100">
                                {cleanDisplayName || "Archivo sin nombre"}
                              </CardTitle>
                            </div>
                            <span
                              className={`px-3 py-1 text-xs rounded-full font-semibold ${fileInfo.badgeColor}`}
                            >
                              {fileInfo.badge}
                            </span>
                          </div>
                          {fechaSubida && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Subido el {fechaSubida}
                            </p>
                          )}
                        </CardHeader>

                        {/* Content */}
                        <CardContent className="flex flex-col md:flex-row gap-4 p-4">
                          {/* Info */}
                          <div className="flex-1 space-y-2 text-sm">
                            <p className="text-gray-500 dark:text-gray-400">Archivo</p>
                            {doc.archivo_url ? (
                              <a
                                href={doc.archivo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                              >
                                Ver archivo
                              </a>
                            ) : (
                              <span className="text-gray-400 italic">Sin archivo</span>
                            )}
                          </div>

                          {/* Preview solo si es imagen */}
                          {doc.archivo_url && fileInfo.badge === "Imagen" && (
                            <div className="w-full md:w-40 h-40 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                              <img
                                src={doc.archivo_url}
                                alt={doc.nombre_archivo}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>
            </Tabs>

            {/* Botones de acción */}
            <div className="flex justify-end mt-4 sm:mt-6 gap-3 flex-wrap">
              {canEnviar() && (
                <Button
                  onClick={() => { setAccion("enviar"); setConfirmOpen(true); }}
                  disabled={updating}
                  fromColor="#3b82f6"
                  toColor="#60a5fa"
                  hoverFrom="#2563eb"
                  hoverTo="#3b82f6"
                  size="default"
                  className="flex items-center gap-2 justify-center"
                >
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                  {updating && accion === "enviar" ? "Procesando..." : "Enviar Solicitud"}
                </Button>
              )}
            </div>

            {/* Modal confirmación envío */}
            {confirmOpen && accion === "enviar" && (
              <Dialog open={confirmOpen} onOpenChange={() => setConfirmOpen(false)}>
                <DialogContent className="max-w-md sm:max-w-lg w-[90%] p-5 bg-white rounded-xl shadow-2xl animate-fadeInDown">
                  <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl font-bold text-gray-800">
                      Confirmar envío
                    </DialogTitle>
                  </DialogHeader>
                  <p className="mt-2 text-gray-600">
                    ¿Deseas enviar esta solicitud? Una vez enviada, pasará a <b>Pendiente para Atención</b>.
                  </p>
                  <div className="mt-5 flex justify-end gap-3 flex-wrap">
                    <Button
                      className="w-full sm:w-auto flex items-center justify-center gap-2"
                      onClick={() => setConfirmOpen(false)}
                      fromColor="#ef4444"
                      toColor="#dc2626"
                      hoverFrom="#b91c1c"
                      hoverTo="#991b1b"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleConfirm}
                      disabled={updating}
                      fromColor="#3b82f6"
                      toColor="#2563eb"
                      hoverFrom="#1d4ed8"
                      hoverTo="#1e40af"
                      size="default"
                      className="w-full sm:w-auto flex items-center justify-center gap-2"
                    >
                      {updating ? "Procesando..." : "Sí, enviar"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 sm:p-4 shadow-sm">
      <p className="text-xs sm:text-sm text-gray-500">{label}</p>
      <p className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800 break-words">
        {value || "-"}
      </p>
    </div>
  );
}
