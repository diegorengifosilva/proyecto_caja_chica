// src/dashboard/solicitudes/DetallesSolicitud.jsx
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, FolderClosed, History, Paperclip } from "lucide-react";
import axios from "@/services/api";
import { STATE_COLORS } from "@/components/ui/colors";
import { Button } from "@/components/ui/button";
import EventBus from "@/components/EventBus";
import { useAuth } from "@/context/AuthContext";

export default function DetallesSolicitud({ open, onClose, solicitudId, solicitudInit }) {
  const { authUser: user } = useAuth();
  const [solicitud, setSolicitud] = useState(solicitudInit || null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(!solicitud);
  const [updating, setUpdating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [accion, setAccion] = useState(null); // "enviar", "atender", "aprobar", "rechazar"

  // --- Permisos por rol y estado ---
  const canEnviar = () => user?.rol === "Colaborador" && solicitud?.estado === "Pendiente de Envío";
  const puedeAtender = () => user?.rol === "Jefe de Proyecto" && solicitud?.estado === "Pendiente para Atención";
  const puedeAprobarLiquidacion = () =>
    (user?.rol === "Jefe de Proyecto" || user?.rol === "Administrador") &&
    solicitud?.estado === "Liquidación enviada para Aprobación";

  // --- Cargar solicitud e historial ---
  useEffect(() => {
    if (!solicitudId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`/boleta/mis_solicitudes/${solicitudId}/`);
        setSolicitud(data);

        try {
          const { data: hist } = await axios.get(`/boleta/mis_solicitudes/${solicitudId}/historial/`);
          setHistorial(hist);
        } catch {
          setHistorial([]);
        }

      } catch (error) {
        console.error("❌ Error al cargar solicitud:", error);
        alert("No se pudo cargar la solicitud.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [solicitudId]);

  // --- Función para cambiar estado ---
  const cambiarEstado = async (nuevoEstado) => {
    if (!solicitud) return;

    try {
      setUpdating(true);
      const { data } = await axios.patch(`/boleta/mis_solicitudes/${solicitud.id}/estado/`, { estado: nuevoEstado });
      
      setSolicitud(prev => ({
        ...prev,
        estado: data.solicitud?.estado || nuevoEstado
      }));

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

  // --- Determinar el próximo estado según acción ---
  const handleConfirm = () => {
    if (!accion) return;

    switch (accion) {
      case "enviar":
        cambiarEstado("Pendiente para Atención");
        break;
      case "atender":
        cambiarEstado("Atendido, Pendiente de Liquidación");
        break;
      case "aprobar":
        cambiarEstado("Liquidación Aprobada");
        break;
      case "rechazar":
        cambiarEstado("Rechazado");
        break;
      default:
        break;
    }
  };

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
                <TabsTrigger value="historial" className="flex items-center gap-2 justify-center text-sm sm:text-base">
                  <History className="w-5 h-5 sm:w-6 sm:h-6" /> Historial
                </TabsTrigger>
                <TabsTrigger value="adjuntos" className="flex items-center gap-2 justify-center text-sm sm:text-base">
                  <Paperclip className="w-5 h-5 sm:w-6 sm:h-6" /> Adjuntos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basicos" className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <InfoCard label="N° Solicitud" value={solicitud.numero_solicitud} />
                  <InfoCard label="Fecha" value={solicitud.fecha} />
                  <InfoCard label="Destinatario" value={solicitud.destinatario_nombre || "-"} />

                  <InfoCard label="Tipo de Solicitud" value={solicitud.tipo_solicitud} />
                  <InfoCard label="Concepto" value={solicitud.concepto_gasto} />
                  <InfoCard
                    label="Estado"
                    value={
                      <span
                        className={`px-2 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                          STATE_COLORS[solicitud.estado] || "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {solicitud.estado}
                      </span>
                    }
                  />
                  <InfoCard label="Observación" value={solicitud.observacion} />
                  <InfoCard label="Total (S/.)" value={solicitud.total_soles} />
                  <InfoCard label="Total (USD)" value={solicitud.total_dolares} />
                  <InfoCard label="Fecha Transferencia" value={solicitud.fecha_transferencia} />
                  <InfoCard label="Fecha Liquidación" value={solicitud.fecha_liquidacion} />
                  <InfoCard label="Banco" value={solicitud.banco} />
                  <InfoCard label="N° Cuenta" value={solicitud.numero_cuenta} />
                </div>
              </TabsContent>

              <TabsContent value="adjuntos" className="text-gray-500">
                <p>Aquí se mostrarán los documentos adjuntos.</p>
              </TabsContent>
            </Tabs>

            {/* Botones de acción según rol y estado */}
            <div className="flex justify-end mt-4 sm:mt-6 gap-3 flex-wrap">
              {canEnviar() && (
                <Button
                  onClick={() => { setAccion("enviar"); setConfirmOpen(true); }}
                  disabled={updating}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 sm:px-5 py-2 sm:py-3 rounded-xl shadow-md font-semibold transition-all duration-200 w-full sm:w-auto"
                >
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" /> {updating && accion === "enviar" ? "Procesando..." : "Enviar Solicitud"}
                </Button>
              )}
            </div>

            {/* Modal de confirmación */}
            {confirmOpen && accion === "enviar" && (
              <Dialog open={confirmOpen} onOpenChange={() => setConfirmOpen(false)}>
                <DialogContent className="max-w-md sm:max-w-lg w-[90%] p-5 bg-white rounded-xl shadow-2xl animate-fadeInDown">
                  <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl font-bold text-gray-800">Confirmar envío</DialogTitle>
                  </DialogHeader>
                  <p className="mt-2 text-gray-600">
                    ¿Deseas enviar esta solicitud? Una vez enviada, pasará a <b>Pendiente para Atención</b>.
                  </p>
                  <div className="mt-5 flex justify-end gap-3 flex-wrap">
                    <Button variant="outline" onClick={() => setConfirmOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
                    <Button
                      onClick={async () => {
                        setUpdating(true);
                        try {
                          const { data } = await axios.patch(
                            `/boleta/mis_solicitudes/${solicitud.id}/estado/`,
                            { estado: "Pendiente para Atención" }
                          );
                          setSolicitud(prev => ({
                            ...prev,
                            estado: data.solicitud?.estado || "Pendiente para Atención"
                          }));
                          EventBus.emit("solicitudEnviada", { numero_solicitud: data.solicitud?.numero_solicitud || solicitud.numero_solicitud });
                          setConfirmOpen(false);
                          setAccion(null);
                        } catch (error) {
                          console.error("❌ Error al enviar solicitud:", error);
                          alert(error.response?.data?.error || "No se pudo enviar la solicitud.");
                        } finally {
                          setUpdating(false);
                        }
                      }}
                      disabled={updating}
                      className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                    >
                      Sí, enviar
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

// Componente InfoCard reutilizable
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
