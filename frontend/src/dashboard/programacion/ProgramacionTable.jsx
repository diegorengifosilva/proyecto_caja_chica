// boleta_project/frontend/src/dashboard/programacion/ProgramacionTable.jsx

import React from "react";

export default function ProgramacionTable({ data }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">Código</th>
            <th className="px-4 py-2 text-left">Referencia</th>
            <th className="px-4 py-2 text-left">Empresa</th>
            <th className="px-4 py-2 text-left">Área</th>
            <th className="px-4 py-2 text-left">Monto Programado</th>
            <th className="px-4 py-2 text-left">Monto Ejecutado</th>
            <th className="px-4 py-2 text-left">Saldo</th>
            <th className="px-4 py-2 text-left">Estado</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="8" className="text-center py-4 text-gray-500">
                No se encontraron programaciones registradas.
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr key={index} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-gray-600">{item.codigo}</td>
                <td className="px-4 py-2">{item.referencia}</td>
                <td className="px-4 py-2">{item.empresa}</td>
                <td className="px-4 py-2">{item.area}</td>
                <td className="px-4 py-2 font-semibold">
                  {item.monto_programado.toLocaleString("es-PE", { style: "currency", currency: "PEN" })}
                </td>
                <td className="px-4 py-2 text-green-700">
                  {item.monto_ejecutado ? item.monto_ejecutado.toLocaleString("es-PE", { style: "currency", currency: "PEN" }) : "-"}
                </td>
                <td className="px-4 py-2 font-semibold">
                  {item.saldo ? item.saldo.toLocaleString("es-PE", { style: "currency", currency: "PEN" }) : "-"}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-bold ${
                      item.estado === "Pendiente"
                        ? "bg-yellow-100 text-yellow-800"
                        : item.estado === "Ejecutado"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {item.estado}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}