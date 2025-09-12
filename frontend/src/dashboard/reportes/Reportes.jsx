// frontend/src/dashboard/reportes/Reportes.jsx
import React, { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  PieChart as PieIcon,
  FileText,
  Users,
  BarChart2,
  ArrowUp,
  ArrowDown,
  Info
} from "lucide-react";
import CountUp from "react-countup";
import Tippy from "@tippyjs/react";
import 'tippy.js/dist/tippy.css';

import FiltrosReportes from "./FiltrosReportes";
import GraficoGastosCategoria from "./GraficoGastosCategoria";
import GraficoComparativoMensual from "./GraficoComparativoMensual";
import GraficoTendencias from "./GraficoTendencias";
import GraficoTopCategorias from "./GraficoTopCategorias";
import GraficoGastoResponsables from "./GraficoGastoResponsables";
import TablaReportes from "./TablaReportes";
import ExportarReportes from "./ExportarReportes";

import axios from "axios";
import { DEV_FAKE_DATA } from "../../config/dev";

export default function Reportes() {
  const [filtros, setFiltros] = useState({
    fechaInicio: "",
    fechaFin: "",
    categoria: "todas",
    rango: "mensual",
  });

  const [datos, setDatos] = useState({
    gastosPorCategoria: [],
    comparativoMensual: [],
    tendencias: [],
    tabla: [],
  });

  const cargarDatos = async () => {
    try {
      if (DEV_FAKE_DATA) {
        setDatos({
          gastosPorCategoria: [
            { categoria: "Transporte", monto: 1200 },
            { categoria: "Alimentación", monto: 2000 },
            { categoria: "Oficina", monto: 800 },
          ],
          comparativoMensual: [
            { mes: "Enero", gastos: 1200 },
            { mes: "Febrero", gastos: 1600 },
            { mes: "Marzo", gastos: 1400 },
          ],
          tendencias: [
            { mes: "Enero", gastos: 200 },
            { mes: "Febrero", gastos: 350 },
            { mes: "Marzo", gastos: 400 },
          ],
          tabla: [
            { id: 1, fecha: "2025-01-10", categoria: "Transporte", descripcion: "Taxi", monto: 300, responsable: "Juan" },
            { id: 2, fecha: "2025-02-12", categoria: "Alimentación", descripcion: "Comida", monto: 500, responsable: "Ana" },
            { id: 3, fecha: "2025-03-15", categoria: "Oficina", descripcion: "Papelería", monto: 800, responsable: "Luis" },
          ],
        });
      } else {
        const response = await axios.get("/api/reportes/", { params: filtros });
        setDatos(response.data);
      }
    } catch (error) {
      console.error("Error cargando datos de reportes:", error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  // ===== KPIs =====
  const totalGastos = datos.tabla.reduce((sum, t) => sum + t.monto, 0);
  const promedioMensual = datos.tabla.length ? (totalGastos / 3).toFixed(2) : 0;
  const mayorGasto = datos.tabla.length ? Math.max(...datos.tabla.map(t => t.monto)) : 0;
  const numTransacciones = datos.tabla.length;
  const numResponsables = new Set(datos.tabla.map(t => t.responsable)).size;

  const gastoMesAnterior = 1500; // ejemplo
  const crecimientoMensual = totalGastos - gastoMesAnterior;
  const porcentajeCrecimiento = ((crecimientoMensual / gastoMesAnterior) * 100).toFixed(1);

  // Clase hover uniforme y fluida
  const hoverCardStyle = "rounded-xl p-4 shadow-md transform transition-transform hover:scale-[1.02] text-center";

  return (
    <div className="p-4 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">

      {/* TITULO */}
      <div className="flex items-center gap-3 mb-6">
        <BarChart2 size={25} className="text-gray-800" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Estadísticas y Reportes
        </h1>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6 mb-6">
        {[
          { 
            label: "Total Gastos", 
            value: totalGastos, 
            icon: DollarSign, 
            gradient: 'linear-gradient(135deg, #10b981cc, #34d39999)', 
            tooltip: "Suma total de todos los gastos registrados" 
          },
          { 
            label: "Promedio Mensual", 
            value: promedioMensual, 
            icon: TrendingUp, 
            gradient: 'linear-gradient(135deg, #3b82f6cc, #60a5fa99)', 
            tooltip: "Gasto promedio mensual" 
          },
          { 
            label: "Mayor Gasto", 
            value: mayorGasto, 
            icon: PieIcon, 
            gradient: 'linear-gradient(135deg, #8b5cf6cc, #a78bfa99)', 
            tooltip: "Registro de gasto individual más alto" 
          },
          { 
            label: "Transacciones", 
            value: numTransacciones, 
            icon: FileText, 
            gradient: 'linear-gradient(135deg, #ef4444cc, #f8717199)', 
            tooltip: "Número total de transacciones" 
          },
          { 
            label: "Responsables", 
            value: numResponsables, 
            icon: Users, 
            gradient: 'linear-gradient(135deg, #facc15cc, #fcd34d99)', 
            tooltip: "Cantidad de personas responsables" 
          },
          { 
            label: "Crecimiento Mensual", 
            value: crecimientoMensual, 
            icon: crecimientoMensual >= 0 ? ArrowUp : ArrowDown, 
            gradient: 'linear-gradient(135deg, #f97316cc, #fb923c99)', 
            tooltip: `Cambio respecto al mes anterior: ${porcentajeCrecimiento}%`, 
            positive: crecimientoMensual >= 0 
          }
        ].map((kpi) => {
          const Icon = kpi.icon;
          const isPositive = kpi.positive ?? true;
          return (
            <div key={kpi.label} className={hoverCardStyle} style={{ background: kpi.gradient }}>
              <Icon size={28} className="text-white mb-2" />
              <p className="text-sm text-white opacity-90 flex items-center justify-center gap-1">
                {kpi.label}
                <Tippy content={kpi.tooltip}>
                  <Info size={16} className="text-white opacity-70" />
                </Tippy>
              </p>
              <p className={`text-2xl font-bold text-white ${kpi.label === "Crecimiento Mensual" ? (isPositive ? 'text-green-400' : 'text-red-400') : ''}`}>
                <CountUp end={kpi.value} duration={1.5} separator="," decimals={2} decimal="." />
              </p>
            </div>
          )
        })}
      </div>

      {/* GRÁFICOS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
        <div className={hoverCardStyle}><GraficoGastosCategoria data={datos.gastosPorCategoria} /></div>
        <div className={hoverCardStyle}><GraficoComparativoMensual data={datos.comparativoMensual} /></div>
      </div>

      {/* GRÁFICOS SECUNDARIOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
        <div className={hoverCardStyle}><GraficoTopCategorias data={datos.gastosPorCategoria} /></div>
        <div className={hoverCardStyle}><GraficoGastoResponsables data={datos.tabla} /></div>
      </div>

      {/* TENDENCIAS */}
      <div className={`${hoverCardStyle} mb-6`}><GraficoTendencias data={datos.tendencias} /></div>

      {/* FILTROS */}
      <div className={`${hoverCardStyle} mb-6 bg-gray-100 dark:bg-gray-700/50`}>
        <FiltrosReportes filtros={filtros} setFiltros={setFiltros} data={datos.tabla} />
      </div>

      {/* TABLA */}
      <div className={`${hoverCardStyle} mb-6`}><TablaReportes data={datos.tabla} /></div>

      {/* EXPORTAR */}
      <div className={`${hoverCardStyle} mb-6`}><ExportarReportes /></div>

    </div>
  )
}
