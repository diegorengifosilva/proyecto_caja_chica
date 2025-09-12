// src/components/Tables/TablaSolicitudes.jsx

import React from "react";
import { FaPlus } from "react-icons/fa";

export default function TablaSolicitudes({ solicitudes, onAbrirModal }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 rounded-xl shadow">
        <thead className="bg-gray-100 text-gray-600 text-sm uppercase">
          <tr>
            <th className="py-2 px-4 text-left">#</th>
            <th className="py-2 px-4 text-left">Fecha</th>
            <th className="py-2 px-4 text-left">Solicitante</th>
            <th className="py-2 px-4 text-left">Monto (S/)</th>
            <th className="py-2 px-4 text-left">Doc.</th>
            <th className="py-2 px-4 text-left">Acción</th>
          </tr>
        </thead>
        <tbody className="text-sm text-gray-700">
          {solicitudes.map((sol) => (
            <tr key={sol.id} className="border-t">
              <td className="py-2 px-4">{sol.nro_solicitud}</td>
              <td className="py-2 px-4">{sol.fecha}</td>
              <td className="py-2 px-4">{sol.solicitante}</td>
              <td className="py-2 px-4">{sol.monto_soles}</td>
              <td className="py-2 px-4 text-center">
                {/* Simulamos documento subido (luego puedes reemplazar por lógica real) */}
                {sol.documento_subido ? "📎" : "🚫"}
              </td>
              <td className="py-2 px-4 text-center">
                <button
                  onClick={() => onAbrirModal(sol.id)}
                  className="text-blue-500 hover:text-blue-600"
                  title="Subir Documento"
                >
                  <FaPlus />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}