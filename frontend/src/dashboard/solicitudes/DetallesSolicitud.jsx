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
      <DialogContent className="max-w-4xl w-[95%] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-lg animate-fadeIn">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-800">
            <FileText className="w-5 h-5" />
            Detalles de la Solicitud {solicitud?.numero_solicitud || "-"}
          </DialogTitle>
          <p className="text-gray-500 text-sm mt-1">
            Usuario: {user?.nombre ? `${user.nombre} ${user.apellido || ""}` : "Usuario"}
          </p>
        </DialogHeader>

        {loading ? (
          <p className="text-gray-500">Cargando solicitud...</p>
        ) : !solicitud ? (
          <p className="text-gray-500">No se encontró la solicitud.</p>
        ) : (
          <>
            <Tabs defaultValue="basicos" className="w-full mt-2">
              <TabsList className="grid grid-cols-3 gap-2 mb-4">
                <TabsTrigger value="basicos" className="flex items-center gap-1">
                  <FolderClosed className="w-4 h-4" /> Básicos
                </TabsTrigger>
                <TabsTrigger value="historial" className="flex items-center gap-1">
                  <History className="w-4 h-4" /> Historial
                </TabsTrigger>
                <TabsTrigger value="adjuntos" className="flex items-center gap-1">
                  <Paperclip className="w-4 h-4" /> Adjuntos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basicos" className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

              <TabsContent value="historial">
                {historial.length === 0 ? (
                  <p className="text-gray-500">No hay historial disponible.</p>
                ) : (
                  <ul className="space-y-4">
                    {historial.map(h => (
                      <li key={h.id} className="border-l-4 border-blue-500 pl-4 bg-gray-50 p-3 rounded-md shadow-sm">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">{h.estado_anterior}</span> → <span className="font-semibold">{h.estado_nuevo}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(h.fecha_cambio).toLocaleString()} | Usuario: {h.usuario || "N/A"}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="adjuntos">
                <p className="text-gray-500">Aquí se mostrarán los documentos adjuntos.</p>
              </TabsContent>
            </Tabs>

            {/* Botones de acción según rol y estado */}
            <div className="flex justify-end mt-6 gap-3 flex-wrap">
              {canEnviar() && (
                <div className="flex justify-end mt-6">
                  <Button
                    onClick={() => { setAccion("enviar"); setConfirmOpen(true); }}
                    disabled={updating}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-5 py-2 rounded-lg shadow-lg font-semibold transition-all duration-200"
                  >
                    {updating && accion === "enviar" ? "Procesando..." : "Enviar Solicitud"}
                  </Button>
                </div>
              )}
            </div>

            {/* Modal de confirmación */}
            {confirmOpen && accion === "enviar" && (
              <Dialog open={confirmOpen} onOpenChange={() => setConfirmOpen(false)}>
                <DialogContent className="max-w-md w-[90%] p-6 bg-white rounded-xl shadow-2xl animate-fadeInDown">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-gray-800">Confirmar envío</DialogTitle>
                  </DialogHeader>
                  <p className="mt-2 text-gray-600">
                    ¿Deseas enviar esta solicitud? Una vez enviada, pasará a <b>Pendiente para Atención</b>.
                  </p>
                  <div className="mt-5 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
                    <Button
                      onClick={async () => {
                        setUpdating(true);
                        try {
                          // PATCH al endpoint de cambio de estado
                          const { data } = await axios.patch(
                            `/boleta/mis_solicitudes/${solicitud.id}/estado/`,
                            { estado: "Pendiente para Atención" }
                          );

                          // Actualizar el estado local
                          setSolicitud(prev => ({
                            ...prev,
                            estado: data.solicitud?.estado || "Pendiente para Atención"
                          }));

                          // Emitir evento para que dashboard se refresque
                          EventBus.emit("solicitudEnviada", {
                            numero_solicitud: data.solicitud?.numero_solicitud || solicitud.numero_solicitud
                          });

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
                      className="bg-blue-600 hover:bg-blue-700 text-white"
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
