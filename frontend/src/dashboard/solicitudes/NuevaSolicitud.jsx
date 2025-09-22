// src/dashboard/solicitudes/NuevaSolicitud.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import Swal from "sweetalert2";
import { v4 as uuidv4 } from "uuid";
import { FilePen, FolderClosed, Landmark, Receipt, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EventBus from "@/components/EventBus";

// -------------------------
// Componentes reutilizables
// -------------------------
function InputField({ label, name, value, onChange, readOnly = false, type = "text" }) {
  return (
    <div className="flex flex-col mb-3 w-full">
      {label && <label className="mb-1 text-xs sm:text-sm font-medium text-gray-700">{label}:</label>}
      <input type={type} name={name} value={value} onChange={onChange} readOnly={readOnly}
        className="border border-gray-300 rounded-lg px-3 py-2 sm:px-4 sm:py-2 bg-gray-50 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm w-full"
      />
    </div>
  );
}

function TextareaField({ label, name, value, onChange }) {
  return (
    <div className="flex flex-col mb-3 w-full">
      {label && <label className="mb-1 text-xs sm:text-sm font-medium text-gray-700">{label}:</label>}
      <textarea name={name} value={value} onChange={onChange}
        className="border border-gray-300 rounded-lg px-3 py-2 sm:px-4 sm:py-2 bg-gray-50 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm resize-none w-full"
      />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options = [] }) {
  return (
    <div className="flex flex-col mb-3 w-full">
      {label && <label className="mb-1 text-xs sm:text-sm font-medium text-gray-700">{label}:</label>}
      <select name={name} value={value || ""} onChange={onChange}
        className="border border-gray-300 rounded-lg px-3 py-2 sm:px-4 sm:py-2 bg-gray-50 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm w-full"
      >
        <option value="">Selecciona...</option>
        {options.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.nombre} {opt.apellido}</option>
        ))}
      </select>
    </div>
  );
}

// -------------------------
// Componente NUEVA SOLICITUD
// -------------------------
export default function NuevaSolicitud({ open, onClose, onCreated }) {
  const { authUser: user } = useAuth();
  const navigate = useNavigate();

  const DESTINATARIOS = [
    { id: 2, nombre: "Cristina", apellido: "Martinez" },
    { id: 3, nombre: "Marisol", apellido: "Rojas" },
    { id: 4, nombre: "Cristina", apellido: "Silva" },
  ];

  const [formulario, setFormulario] = useState({
    numero_solicitud: "",
    fecha: "",
    hora: "",
    codigo: "",
    solicitante: "",
    destinatario_id: null, // <-- importante, inicializar como null
    tipo_solicitud: "",
    area: "",
    tipo_moneda: "",
    tipo_cambio: "3.55",
    monto_soles: "",
    monto_dolares: "",
    fecha_transferencia: "",
    fecha_liquidacion: "",
    banco: "",
    numero_cuenta: "",
    concepto_gasto: "",
    observacion: "",
  });

  // Inicializar formulario al abrir
  useEffect(() => {
    if (!open) return;
    const hoy = new Date();
    setFormulario(prev => ({
      ...prev,
      numero_solicitud: Math.floor(1000 + Math.random() * 9000),
      codigo: uuidv4().split("-")[0].toUpperCase(),
      fecha: format(hoy, "yyyy-MM-dd"),
      hora: format(hoy, "HH:mm:ss"),
      solicitante: user?.id || "",
      area: user?.area || "",
      banco: user?.banco || "",
      numero_cuenta: user?.numero_cuenta || "",
      tipo_cambio: "3.55",
    }));
  }, [open, user]);

  // Convertir monto a dólares
  useEffect(() => {
    if (formulario.monto_soles && formulario.tipo_cambio) {
      setFormulario(prev => ({
        ...prev,
        monto_dolares: (parseFloat(prev.monto_soles) / parseFloat(prev.tipo_cambio)).toFixed(2)
      }));
    }
  }, [formulario.monto_soles, formulario.tipo_cambio]);

  // Manejar cambios
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormulario(prev => ({
      ...prev,
      [name]: name === "destinatario_id" ? (value ? parseInt(value) : null) : value
    }));
  };

  // Guardar solicitud
  const handleGuardar = async () => {
    const payload = {
      numero_solicitud: formulario.numero_solicitud,
      fecha: formulario.fecha,
      hora: formulario.hora,
      codigo: formulario.codigo,
      solicitante: formulario.solicitante,
      destinatario_id: formulario.destinatario_id, // ya es número o null
      tipo_solicitud: formulario.tipo_solicitud,
      area: formulario.area,
      estado: "Pendiente para Atención",
      moneda: "PEN",
      tipo_cambio: formulario.tipo_cambio,
      total_soles: formulario.monto_soles || 0,
      total_dolares: formulario.monto_dolares || 0,
      fecha_transferencia: formulario.fecha_transferencia,
      fecha_liquidacion: formulario.fecha_liquidacion,
      banco: formulario.banco,
      numero_cuenta: formulario.numero_cuenta,
      concepto_gasto: formulario.concepto_gasto,
      observacion: formulario.observacion,
    };

    try {
      await axios.post("boleta/solicitudes/guardar-solicitud/", payload);
      Swal.fire("¡Guardado!", "La solicitud fue registrada correctamente", "success");
      EventBus.emit("solicitudCreada", payload);
      onCreated?.();
      onClose?.();
      navigate("/dashboard/liquidaciones/solicitud");
    } catch (error) {
      const detalle = error?.response?.data || {};
      Swal.fire("Error", `No se pudo guardar la solicitud. Detalles: ${JSON.stringify(detalle)}`, "error");
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl sm:max-w-4xl lg:max-w-5xl w-[95%] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-lg animate-fadeIn p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-gray-800">
            <FilePen className="w-6 h-6 sm:w-7 sm:h-7" /> Nueva Solicitud de Gasto
          </DialogTitle>
        </DialogHeader>

        <p className="text-gray-700 mb-4 text-sm sm:text-base">
          Completa los campos para registrar una nueva solicitud de gasto.
        </p>

        <div className="space-y-4">
          {/* Datos Generales */}
          <h3 className="text-sm sm:text-base font-semibold border-b pb-1 flex items-center gap-2 text-gray-800">
            <FolderClosed className="w-5 h-5 sm:w-6 sm:h-6" /> Datos Generales
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <InputField label="N° Solicitud" value={formulario.numero_solicitud} readOnly />
            <InputField label="Fecha" value={formulario.fecha} readOnly />
            <InputField label="Hora" value={formulario.hora} readOnly />
            <InputField label="Código" value={formulario.codigo} readOnly />
            <InputField label="Solicitante" value={user ? `${user.nombre} ${user.apellido}` : ""} readOnly />
            <SelectField label="Destinatario" name="destinatario_id" value={formulario.destinatario_id} onChange={handleChange} options={DESTINATARIOS} />
            <SelectField
              label="Tipo de Solicitud"
              name="tipo_solicitud"
              value={formulario.tipo_solicitud}
              onChange={handleChange}
              options={[
                { id: "Viáticos", nombre: "Viáticos" },
                { id: "Movilidad", nombre: "Movilidad" },
                { id: "Compras", nombre: "Compras" },
                { id: "Otros Gastos", nombre: "Otros Gastos" },
              ]}
            />
            <InputField label="Área" value={formulario.area} readOnly />
          </div>

          {/* Monto y Fechas */}
          <h3 className="text-sm sm:text-base font-semibold border-b pb-1 flex items-center gap-2 text-gray-800">
            <Receipt className="w-5 h-5 sm:w-6 sm:h-6" /> Monto y Fechas
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <InputField label="Monto en Soles" name="monto_soles" value={formulario.monto_soles} onChange={handleChange} />
            <InputField label="Fecha Transferencia" type="date" name="fecha_transferencia" value={formulario.fecha_transferencia} onChange={handleChange} />
            <InputField label="Fecha Liquidación" type="date" name="fecha_liquidacion" value={formulario.fecha_liquidacion} onChange={handleChange} />
          </div>

          {/* Datos Bancarios */}
          <h3 className="text-sm sm:text-base font-semibold border-b pb-1 flex items-center gap-2 text-gray-800">
            <Landmark className="w-5 h-5 sm:w-6 sm:h-6" /> Datos Bancarios
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SelectField label="Banco" name="banco" value={formulario.banco} onChange={handleChange} options={[
              { id: "BCP", nombre: "BCP" },
              { id: "Interbank", nombre: "Interbank" },
            ]} />
            <InputField label={formulario.banco === "Interbank" ? "CCI" : "Número de Cuenta"} name="numero_cuenta" value={formulario.numero_cuenta} onChange={handleChange} />
          </div>

          {/* Detalles del Gasto */}
          <h3 className="text-sm sm:text-base font-semibold border-b pb-1 flex items-center gap-2 text-gray-800">
            <Pin className="w-5 h-5 sm:w-6 sm:h-6" /> Detalles del Gasto
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <TextareaField label="Concepto de Gasto" name="concepto_gasto" value={formulario.concepto_gasto} onChange={handleChange} />
            <TextareaField label="Observación" name="observacion" value={formulario.observacion} onChange={handleChange} />
          </div>
        </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4">
            <Button
              onClick={onClose}
              fromColor="#f87171" // rojo claro
              toColor="#ef4444"   // rojo medio
              hoverFrom="#ef4444"
              hoverTo="#dc2626"
              size="default"
            >
              Cancelar
            </Button>

            <Button
              onClick={handleGuardar}
              fromColor="#34d399" // verde claro
              toColor="#10b981"   // verde medio
              hoverFrom="#059669"
              hoverTo="#10b981"
              size="default"
            >
              Guardar
            </Button>
          </div>
      </DialogContent>
    </Dialog>
  );
}
