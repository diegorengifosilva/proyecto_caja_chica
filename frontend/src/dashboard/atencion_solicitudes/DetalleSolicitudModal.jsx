// src/dashboard/atencion_solicitudes/DetalleSolicitudModal.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { toast } from "react-toastify";
import EventBus from "@/components/EventBus";
import { User, 
  Tag, 
  DollarSign, 
  WalletMinimal, 
  Calendar, 
  BadgeAlert, 
  Landmark, 
  Hash, 
  MessageCircleWarning, 
  NotebookPen, 
  Clock,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"

export default function DetalleSolicitudModal({ solicitudId, onClose, onDecided }) {
  const { authUser: user, logout } = useAuth();
  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comentario, setComentario] = useState("");
  const [accion, setAccion] = useState(null);
  const [error, setError] = useState(null);

  // -------------------------------
  // Cargar detalle de solicitud
  // -------------------------------
  useEffect(() => {
    const fetchSolicitud = async () => {
      if (!user || !solicitudId) return;
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("access_token");
        const { data } = await api.get(`/boleta/solicitudes/${solicitudId}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSolicitud(data);
      } catch (e) {
        console.error(e);
        setError("No se pudo cargar la información de la solicitud.");
        if (e?.response?.status === 401) logout();
      } finally {
        setLoading(false);
      }
    };
    fetchSolicitud();
  }, [user, solicitudId, logout]);

  // -------------------------------
  // Manejar acción "Atender" o "Rechazar"
  // -------------------------------
  const handleDecision = async (decision) => {
    if (!solicitudId) return;
    setAccion(decision);
    try {
      const token = localStorage.getItem("access_token");
      await api.post(
        `/boleta/solicitudes/${solicitudId}/decision/`,
        { decision, comentario },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Emitir evento global para actualizar dashboard
      EventBus.emit(
        decision === "Atendido" ? "solicitudAtendida" : "solicitudRechazada",
        { id: solicitudId }
      );

      // Mostrar toast y cerrar modal
      toast.success(decision === "Atendido" ? "Solicitud atendida." : "Solicitud rechazada.");
      if (onDecided) onDecided(decision === "Atendido" ? "Solicitud atendida correctamente." : "Solicitud rechazada correctamente.");
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Error al registrar la acción.");
      if (e?.response?.status === 401) logout();
    } finally {
      setAccion(null);
    }
  };

  if (!solicitudId) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-4xl shadow-xl relative border border-gray-100 dark:border-gray-700 overflow-y-auto max-h-[90vh]">
        {/* Botón cerrar */}
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ✖
        </button>

        {loading ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">Cargando solicitud...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-red-500 font-semibold">{error}</p>
          </div>
        ) : (
          <>
            {/* Título */}
            <h2 className="text-2xl font-bold mb-5 text-gray-800 dark:text-gray-100 text-center md:text-left">
              Solicitud {solicitud?.numero_solicitud}
            </h2>

            {/* Info solicitud estilo dashboard corporativo en 3 columnas compactas */}
            <Card className="overflow-hidden rounded-xl shadow-md border border-gray-200/70 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 mb-4">
              <CardContent className="p-2 md:p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {[
                    { icon: <ClipboardList className="w-4 h-4 text-blue-600" />, label: "Solicitud", value: solicitud.numero_solicitud },
                    { icon: <User className="w-4 h-4 text-orange-600" />, label: "Solicitante", value: solicitud.solicitante_nombre || solicitud.solicitante || "—" },
                    { icon: <Tag className="w-4 h-4 text-purple-600" />, label: "Tipo", value: solicitud.tipo_solicitud || "—" },
                    { icon: <Calendar className="w-4 h-4 text-yellow-500" />, label: "Fecha", value: solicitud.fecha ? new Date(solicitud.fecha).toLocaleDateString("es-PE") : "—" },
                    { icon: <Clock className="w-4 h-4 text-pink-500" />, label: "Hora", value: solicitud.hora || "—" },
                    { icon: <WalletMinimal className="w-4 h-4 text-blue-400" />, label: "Monto Soles", value: (Number(solicitud?.total_soles ?? 0)).toFixed(2) },
                    { icon: <DollarSign className="w-4 h-4 text-green-500" />, label: "Monto Dólares", value: (Number(solicitud?.total_dolares ?? 0)).toFixed(2) },
                    solicitud?.banco
                      ? { icon: <Landmark className="w-4 h-4 text-indigo-500" />, label: "Banco", value: solicitud.banco }
                      : null,
                    solicitud?.numero_cuenta
                      ? { icon: <Hash className="w-4 h-4 text-gray-500" />, label: "N° Cuenta", value: solicitud.numero_cuenta }
                      : null,
                    { icon: <BadgeAlert className="w-4 h-4 text-red-500" />, label: "Estado", value: solicitud.estado || "Pendiente" },
                    { icon: <NotebookPen className="w-4 h-4 text-cyan-500" />, label: "Concepto", value: solicitud.concepto_gasto || "—" },
                  ]
                    .filter(Boolean)
                    .map((item, idx) => (
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

            {/* Comentarios - estilo profesional */}
            <Card className="overflow-hidden rounded-xl shadow-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 mb-4">
              <CardContent className="p-3 sm:p-4">
                <label className="flex items-center gap-2 mb-2">
                  <MessageCircleWarning className="w-5 h-5 text-indigo-500" />
                  <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm sm:text-base">
                    Comentario del revisor <span className="font-normal text-gray-500 dark:text-gray-400">(opcional)</span>
                  </span>
                </label>
                <textarea
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg p-2 sm:p-3 bg-white dark:bg-gray-800 
                            text-gray-800 dark:text-gray-100 text-sm sm:text-base resize-none 
                            focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
                            placeholder-gray-400 dark:placeholder-gray-500"
                  rows={3}
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Escribe aquí tu comentario..."
                />
              </CardContent>
            </Card>

            {/* Botones de acción */}
            <div className="flex flex-wrap justify-end gap-3 mt-4">
              <button
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg shadow-md transition"
                onClick={() => handleDecision("Rechazado")}
                disabled={accion === "Rechazado"}
              >
                Rechazar
              </button>

              <button
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition"
                onClick={() => handleDecision("Atendido")}
                disabled={accion === "Atendido"}
              >
                Atender
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
