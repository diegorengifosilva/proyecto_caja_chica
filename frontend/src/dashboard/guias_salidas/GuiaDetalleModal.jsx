// src/dashboard/guias_salida/GuiaDetalleModal.jsx
import React from "react";

export default function GuiaDetalleModal({ isOpen, onClose, guia }) {
  if (!isOpen || !guia) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
        <h2 className="text-xl font-semibold mb-4">Detalle de Guía #{guia.numero ?? "-"}</h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="font-semibold">Fecha:</p>
            <p>{new Date(guia.fecha).toLocaleString()}</p>
          </div>
          <div>
            <p className="font-semibold">Responsable:</p>
            <p>{guia.responsable}</p>
          </div>
          <div>
            <p className="font-semibold">Origen:</p>
            <p>{guia.origen}</p>
          </div>
          <div>
            <p className="font-semibold">Destino:</p>
            <p>{guia.destino}</p>
          </div>
          <div className="col-span-2">
            <p className="font-semibold">Observaciones:</p>
            <p>{guia.observaciones || "-"}</p>
          </div>
          <div>
            <p className="font-semibold">Estado:</p>
            <span className={`px-2 py-1 rounded font-semibold ${
              guia.estado === "Pendiente" ? "bg-yellow-200 text-yellow-800" :
              guia.estado === "Enviada" ? "bg-blue-200 text-blue-800" :
              guia.estado === "Recibida" ? "bg-green-200 text-green-800" :
              "bg-gray-200 text-gray-800"
            }`}>
              {guia.estado}
            </span>
          </div>
        </div>

        <h3 className="font-semibold mb-2">Ítems de la Guía</h3>
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-3 py-2">Cantidad</th>
                <th className="border border-gray-300 px-3 py-2">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {guia.items?.length > 0 ? guia.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2">{item.cantidad}</td>
                  <td className="border border-gray-300 px-3 py-2">{item.descripcion}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={2} className="text-center py-4">No hay ítems registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-4">
          <button onClick={onClose} className="bg-gray-400 text-gray-800 px-4 py-2 rounded hover:bg-gray-500 transition">Cerrar</button>
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">Imprimir / PDF</button>
        </div>
      </div>
    </div>
  );
}
