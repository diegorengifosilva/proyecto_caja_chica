// src/dashboard/solicitudes/MisSolicitudes.jsx
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Eye, ArrowDown, ArrowUp } from "lucide-react";
import axios from "@/services/api";
import DetallesSolicitud from "./DetallesSolicitud";
import { STATE_CLASSES, TIPO_SOLICITUD_CLASSES } from "@/components/ui/colors";
import Table from "@/components/ui/table";
import EventBus from "@/components/EventBus";

const MisSolicitudes = ({ open, onClose }) => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [filtro, setFiltro] = useState("Todos");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [ordenDesc, setOrdenDesc] = useState(true);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);

  useEffect(() => {
    if (open) fetchSolicitudes();

    // ⚡ Escuchar eventos de EventBus
    const handleSolicitudCreada = (nuevaSolicitud) => {
      setSolicitudes((prev) => [nuevaSolicitud, ...prev]);
    };
    const handleSolicitudEnviada = (solEnviada) => {
      setSolicitudes((prev) =>
        prev.map((s) =>
          s.numero_solicitud === solEnviada.numero_solicitud
            ? { ...s, estado: "Enviada" }
            : s
        )
      );
    };

    const unsubCreada = EventBus.on("solicitudCreada", handleSolicitudCreada);
    const unsubEnviada = EventBus.on("solicitudEnviada", handleSolicitudEnviada);

    return () => {
      unsubCreada();
      unsubEnviada();
    };
  }, [open]);

  const fetchSolicitudes = async () => {
    try {
      const res = await axios.get("/boleta/mis_solicitudes/");
      setSolicitudes(res.data);
    } catch (err) {
      console.error("Error cargando solicitudes:", err);
    }
  };

  const solicitudesFiltradas = solicitudes
    .filter((s) => {
      const pasaEstado = filtro === "Todos" || s.estado === filtro;
      const pasaFecha =
        (!fechaInicio || new Date(s.fecha) >= new Date(fechaInicio)) &&
        (!fechaFin || new Date(s.fecha) <= new Date(fechaFin));
      return pasaEstado && pasaFecha;
    })
    .sort((a, b) => {
      const fechaA = new Date(a.fecha);
      const fechaB = new Date(b.fecha);
      return ordenDesc ? fechaB - fechaA : fechaA - fechaB;
    });

  const handleAccion = (solicitud) => {
    setSolicitudSeleccionada(solicitud);
    setDetalleOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full max-h-[90vh] bg-white rounded-xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-gray-800">
            <FileText className="w-6 h-6" />
            Mis Solicitudes
          </DialogTitle>
        </DialogHeader>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4 text-sm">
          <div className="flex items-center gap-1 sm:gap-2">
            <label className="font-medium">Estado:</label>
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="border rounded-md px-1 sm:px-2 py-1 text-xs sm:text-sm"
            >
              <option value="Todos">Todos</option>
              {Object.keys(STATE_CLASSES).map((estado, idx) => (
                <option key={idx} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <label className="font-medium">Desde:</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="border rounded-md px-1 sm:px-2 py-1 text-xs sm:text-sm"
            />
            <label className="font-medium">Hasta:</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="border rounded-md px-1 sm:px-2 py-1 text-xs sm:text-sm"
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="max-h-[70vh] overflow-y-auto w-full">
          <Table
            headers={[
              "N° Solicitud",
              "Tipo",
              "Monto S/.",
              "Monto $",
              "Fecha",
              "Concepto",
              "Estado",
              <span key="accion" className="hidden md:table-cell">Acción</span>,
            ]}
            data={solicitudesFiltradas}
            emptyMessage="No hay solicitudes en este estado o rango de fechas."
            renderRow={(s) => [
              <span className="break-words max-w-[120px]">{s.numero_solicitud}</span>,
              <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${TIPO_SOLICITUD_CLASSES[s.tipo_solicitud] || "bg-gray-200 text-gray-700"} break-words max-w-[120px]`}>
                {s.tipo_solicitud}
              </span>,
              <span className="break-words max-w-[100px]">{s.total_soles ?? "-"}</span>,
              <span className="break-words max-w-[100px]">{s.total_dolares ?? "-"}</span>,
              <span className="break-words max-w-[120px]">{s.fecha}</span>,
              <span className="break-words max-w-[200px]">{s.concepto_gasto ?? "-"}</span>,
              <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${STATE_CLASSES[s.estado] || "bg-gray-200 text-gray-700"} break-words max-w-[120px]`}>
                {s.estado}
              </span>,
              <div className="hidden md:flex justify-center">
                <Button
                  variant="default"
                  size="sm"
                  fromColor="#a8d8d8"
                  toColor="#81c7c7"
                  hoverFrom="#81c7c7"
                  hoverTo="#5eb0b0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAccion(s);
                  }}
                  className="flex items-center gap-1 px-2 py-1"
                >
                  <Eye className="w-4 h-4" /> Detalle
                </Button>
              </div>,
            ]}
            onRowClick={(s) => {
              if (window.innerWidth < 768) {
                handleAccion(s); // 👈 abre modal en móvil
              }
            }}
          />
        </div>

        {/* Modal DetalleSolicitud */}
        {detalleOpen && solicitudSeleccionada && (
          <DetallesSolicitud
            open={detalleOpen}
            onClose={() => setDetalleOpen(false)}
            solicitudId={solicitudSeleccionada?.id}
            solicitudInit={solicitudSeleccionada}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MisSolicitudes;
