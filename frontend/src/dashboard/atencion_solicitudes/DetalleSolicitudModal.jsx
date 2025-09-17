// src/dashboard/atencion_solicitudes/DetalleSolicitudModal.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { toast } from "react-toastify";
import EventBus from "@/components/EventBus";
import { User, Tag, DollarSign, WalletMinimal, Calendar, BadgeAlert, Landmark, Hash, MessageCircleWarning } from "lucide-react";

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
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-3xl shadow-xl relative border border-gray-100 dark:border-gray-700 overflow-y-auto max-h-[90vh]">
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
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100 text-center md:text-left">
              Solicitud {solicitud?.numero_solicitud}
            </h2>

            {/* Datos principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 text-sm sm:text-base">
              <div className="space-y-2">
                <p className="flex items-center gap-1">
                  <User className="w-4 h-4 text-gray-800" />
                  <span className="font-semibold">Solicitante:</span> {solicitud?.solicitante_nombre || solicitud?.solicitante || "—"}
                </p>
                <p className="flex items-center gap-1">
                  <Tag className="w-4 h-4 text-gray-800" />
                  <span className="font-semibold">Tipo:</span> {solicitud?.tipo_solicitud || "—"}
                </p>
                <p className="flex items-center gap-1">
                  <WalletMinimal className="w-4 h-4 text-gray-800" />
                  <span className="font-semibold">Monto S/:</span> {(Number(solicitud?.total_soles ?? 0)).toFixed(2)}
                </p>
                <p className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-gray-800" />
                  <span className="font-semibold">Monto $:</span> {(Number(solicitud?.total_dolares ?? 0)).toFixed(2)}
                </p>
              </div>

              <div className="space-y-2">
                <p className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-gray-800" />
                  <span className="font-semibold">Fecha:</span> {solicitud?.fecha ? new Date(solicitud.fecha).toLocaleDateString("es-PE") : "—"}
                </p>
                <p className="flex items-center gap-1">
                  <BadgeAlert className="w-4 h-4 text-gray-800" />
                  <span className="font-semibold">Estado actual:</span> {solicitud?.estado || "—"}
                </p>
                {solicitud?.banco && (
                  <p className="flex items-center gap-1">
                    <Landmark className="w-4 h-4 text-gray-800" />
                    <span className="font-semibold">Banco:</span> {solicitud.banco}
                  </p>
                )}
                {solicitud?.numero_cuenta && (
                  <p className="flex items-center gap-1">
                    <Hash className="w-4 h-4 text-gray-800" />
                    <span className="font-semibold">N° Cuenta:</span> {solicitud.numero_cuenta}
                  </p>
                )}
              </div>
            </div>

            {/* Comentarios */}
            <div className="mb-4">
              <label className="mb-2 font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <MessageCircleWarning className="w-4 h-4 text-gray-700" />
                Comentario del revisor (opcional)
              </label>
              <textarea
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                rows={4}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Agregar comentario opcional..."
              />
            </div>

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
