// frontend/src/pages/movimientos/Movimientos.jsx

import React, { useState } from 'react';
import Liquidaciones from './Liquidaciones';
import RegistroSol from '../registro_actividades/RegistroActividades';

const Movimientos = () => {
  const [vistaActiva, setVistaActiva] = useState('liquidaciones');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Movimientos</h1>
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setVistaActiva('liquidaciones')}
          className={`px-4 py-2 rounded-lg font-medium ${
            vistaActiva === 'liquidaciones' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          Liquidaciones
        </button>
        <button
          onClick={() => setVistaActiva('registro')}
          className={`px-4 py-2 rounded-lg font-medium ${
            vistaActiva === 'registro' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          Registro de Actividades
        </button>
      </div>

      {vistaActiva === 'liquidaciones' ? <Liquidaciones /> : <RegistroActividades />}
    </div>
  );
};

export default Movimientos;