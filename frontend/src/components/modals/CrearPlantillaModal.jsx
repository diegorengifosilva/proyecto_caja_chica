// src\components\modals\CrearPlantillaModal.jsx

import React, { useRef, useState } from "react";

export default function CrearPlantillaModal({ imagen, onClose }) {
  const imgRef = useRef(null);
  const [zonas, setZonas] = useState([]);
  const [dibujando, setDibujando] = useState(false);
  const [inicio, setInicio] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    const rect = imgRef.current.getBoundingClientRect();
    setInicio({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDibujando(true);
  };

  const handleMouseUp = (e) => {
    if (!dibujando) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x2 = e.clientX - rect.left;
    const y2 = e.clientY - rect.top;

    const nuevaZona = {
      x: Math.min(inicio.x, x2),
      y: Math.min(inicio.y, y2),
      width: Math.abs(x2 - inicio.x),
      height: Math.abs(y2 - inicio.y),
      campo: prompt("Nombre del campo:")
    };

    setZonas([...zonas, nuevaZona]);
    setDibujando(false);
  };

  const handleGuardar = async () => {
    const nombre = prompt("Nombre de la plantilla:");
    const ruc = prompt("RUC asociado:");

    const res = await fetch("/api/guardar_plantilla/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, ruc, campos: zonas }),
    });

    const data = await res.json();
    alert(data.mensaje || data.error);
  };

  return (
    <div className="p-4 bg-white rounded shadow-lg">
      <h2 className="text-lg font-bold mb-2">Crear Plantilla OCR</h2>
      <div
        style={{ position: "relative", display: "inline-block" }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <img ref={imgRef} src={imagen} alt="Documento" />
        {zonas.map((z, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: z.x,
              top: z.y,
              width: z.width,
              height: z.height,
              border: "2px solid red",
              pointerEvents: "none"
            }}
          />
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button className="bg-green-500 text-white px-3 py-1 rounded" onClick={handleGuardar}>
          Guardar Plantilla
        </button>
        <button className="bg-gray-500 text-white px-3 py-1 rounded" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}