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
} from "lucide-react";
import 'tippy.js/dist/tippy.css';
import { motion } from "framer-motion";
import KpiCard from "@/components/ui/KpiCard";

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
  
  const [loading, setLoading] = useState(true);
  
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

  const kpis = [
    { label: "Total Gastos", value: totalGastos, icon: DollarSign, gradient: 'linear-gradient(135deg, #10b981cc, #34d39999)', tooltip: "Suma total de todos los gastos registrados" },
    { label: "Promedio Mensual", value: promedioMensual, icon: TrendingUp, gradient: 'linear-gradient(135deg, #3b82f6cc, #60a5fa99)', tooltip: "Gasto promedio mensual" },
    { label: "Mayor Gasto", value: mayorGasto,  icon: PieIcon, gradient: 'linear-gradient(135deg, #8b5cf6cc, #a78bfa99)', tooltip: "Registro de gasto individual más alto" },
    { label: "Transacciones", value: numTransacciones, icon: FileText, gradient: 'linear-gradient(135deg, #ef4444cc, #f8717199)', tooltip: "Número total de transacciones" },
    { label: "Responsables", value: numResponsables, icon: Users,  gradient: 'linear-gradient(135deg, #facc15cc, #fcd34d99)',  tooltip: "Cantidad de personas responsables"  },
    {  label: "Crecimiento Mensual",  value: crecimientoMensual,  icon: crecimientoMensual >= 0 ? ArrowUp : ArrowDown,   gradient: 'linear-gradient(135deg, #f97316cc, #fb923c99)',  tooltip: `Cambio respecto al mes anterior: ${porcentajeCrecimiento}%`,  positive: crecimientoMensual >= 0   }
  ];

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 font-sans">
      <div className="flex-1 flex flex-col px-4 sm:px-6 md:px-8 py-4 lg:py-6">
        {/* Encabezado */}
        <header className="mb-4 sm:mb-6">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-lg sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"
          >
            <BarChart2 className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
            Estadísticas y Reportes
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mt-1 text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-300 italic"
          >
            Analiza tus <span className="font-semibold text-blue-600">gastos y tendencias</span> con visualizaciones interactivas.
          </motion.p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-3 gap-y-4 sm:gap-x-4 sm:gap-y-5 md:gap-x-6 md:gap-y-6 mb-6 w-full justify-items-stretch">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="flex-1 min-w-0">
              <KpiCard
                label={kpi.label}
                value={loading ? 0 : kpi.value}
                icon={kpi.icon}
                gradient={kpi.gradient}
                tooltip={kpi.tooltip}
                decimals={Number.isInteger(kpi.value) ? 0 : 2}
                className="text-xs sm:text-sm md:text-base w-full p-3 sm:p-4"
              />
            </div>
          ))}
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
    </div>
  )
}
