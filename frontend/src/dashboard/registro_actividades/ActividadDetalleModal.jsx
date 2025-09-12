// src/dashboard/registro_actividades/ActividadDetalleModal.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

function formatearFecha(fecha) {
  if (!fecha) return "-";
  const d = new Date(fecha);
  return d.toLocaleString();
}

export default function ActividadDetalleModal({ actividad, isOpen, onClose }) {
  if (!actividad) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 relative shadow-lg"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-xl font-semibold mb-4">Detalle de Actividad</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="font-semibold text-gray-700">ID / Número</p>
                <p className="text-gray-800">{actividad.id ?? "-"}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Fecha y Hora</p>
                <p className="text-gray-800">{formatearFecha(actividad.fecha)}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Usuario</p>
                <p className="text-gray-800">{actividad.usuario ?? "-"}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Tipo</p>
                <p className="text-gray-800">{actividad.tipo ?? "-"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="font-semibold text-gray-700">Acción</p>
                <p className="text-gray-800">{actividad.accion ?? "-"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="font-semibold text-gray-700">Descripción</p>
                <p className="text-gray-800">{actividad.descripcion ?? "-"}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Estado</p>
                <p
                  className={`font-medium ${
                    actividad.estado === "pendiente"
                      ? "text-yellow-600"
                      : actividad.estado === "completada"
                      ? "text-green-600"
                      : "text-gray-600"
                  }`}
                >
                  {actividad.estado ?? "-"}
                </p>
              </div>
              {actividad.documentos && actividad.documentos.length > 0 && (
                <div className="md:col-span-2">
                  <p className="font-semibold text-gray-700">Documentos Referenciados</p>
                  <ul className="list-disc list-inside text-gray-800">
                    {actividad.documentos.map((doc, idx) => (
                      <li key={idx}>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {doc.nombre ?? `Documento ${idx + 1}`}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={onClose}
                className="bg-gray-400 text-gray-800 px-4 py-2 rounded hover:bg-gray-500 transition"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
