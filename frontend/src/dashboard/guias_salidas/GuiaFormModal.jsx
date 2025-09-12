// src/dashboard/guias_salida/GuiaFormModal.jsx
import React, { useState } from "react";

export default function GuiaFormModal({ isOpen, onClose, onGuardar }) {
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [responsable, setResponsable] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [items, setItems] = useState([{ cantidad: 1, descripcion: "" }]);

  const agregarItem = () => setItems([...items, { cantidad: 1, descripcion: "" }]);
  const eliminarItem = (index) => setItems(items.filter((_, i) => i !== index));
  const actualizarItem = (index, key, value) => {
    const nuevosItems = [...items];
    nuevosItems[index][key] = key === "cantidad" ? Number(value) : value;
    setItems(nuevosItems);
  };

  const handleGuardar = () => {
    if (!origen || !destino || !responsable) {
      alert("Por favor, completa los campos obligatorios.");
      return;
    }
    const nuevaGuia = { origen, destino, responsable, observaciones, items, estado: "Pendiente", fecha: new Date().toISOString() };
    onGuardar(nuevaGuia);
    onClose();
    // Limpiar campos
    setOrigen("");
    setDestino("");
    setResponsable("");
    setObservaciones("");
    setItems([{ cantidad: 1, descripcion: "" }]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
        <h2 className="text-xl font-semibold mb-4">📦 Crear Nueva Guía</h2>

        <div className="flex flex-col gap-3 mb-4">
          <input type="text" placeholder="Origen *" className="border rounded p-2" value={origen} onChange={(e) => setOrigen(e.target.value)} />
          <input type="text" placeholder="Destino *" className="border rounded p-2" value={destino} onChange={(e) => setDestino(e.target.value)} />
          <input type="text" placeholder="Responsable *" className="border rounded p-2" value={responsable} onChange={(e) => setResponsable(e.target.value)} />
          <textarea placeholder="Observaciones (opcional)" className="border rounded p-2" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </div>

        <h3 className="font-semibold mb-2">Ítems de la Guía</h3>
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-3 py-2">Cantidad</th>
                <th className="border border-gray-300 px-3 py-2">Descripción</th>
                <th className="border border-gray-300 px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2">
                    <input type="number" min={1} className="border rounded p-1 w-full" value={item.cantidad} onChange={(e) => actualizarItem(idx, "cantidad", e.target.value)} />
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    <input type="text" className="border rounded p-1 w-full" value={item.descripcion} onChange={(e) => actualizarItem(idx, "descripcion", e.target.value)} />
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    <button onClick={() => eliminarItem(idx)} className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={agregarItem} className="mb-4 bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition">+ Agregar Ítem</button>

        <div className="flex justify-end gap-4">
          <button onClick={onClose} className="bg-gray-400 text-gray-800 px-4 py-2 rounded hover:bg-gray-500 transition">Cancelar</button>
          <button onClick={handleGuardar} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">Guardar Guía</button>
        </div>
      </div>
    </div>
  );
}
