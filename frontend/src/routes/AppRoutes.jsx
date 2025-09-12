// src/routes/AppRoutes.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import DashboardLayout from "@/dashboard/Layout/DashboardLayout";
import PrivateRoute from "@/components/routes/PrivateRoute";

// Páginas
import DashboardHome from "@/dashboard/DashboardHome";
import SolicitudesPage from "@/dashboard/solicitudes/SolicitudesPage";
import PresentarDocumentoPage from "@/dashboard/liquidaciones/PresentarDocumentoPage";
import AtencionSolicitudes from "@/dashboard/atencion-solicitudes/AtencionSolicitudesPage";
import AprobacionLiquidacion from "@/dashboard/gastos/AprobacionLiquidacionPage";
import Movimientos from "@/dashboard/movimientos/MovimientosPage";
import GuiasSalida from "@/dashboard/registros/GuiasSalidaPage";
import Estadisticas from "@/dashboard/reportes/EstadisticasPage";

// Definimos los roles que pueden ver cada ruta
const DASHBOARD_ROLES = {
  Administrador: [
    "dashboard",
    "solicitudes",
    "presentar-documento",
    "atencion-solicitudes",
    "aprobacion-liquidacion",
    "movimientos",
    "guias-salida",
    "estadisticas"
  ],
  "Jefe de Proyecto": [
    "dashboard",
    "solicitudes",
    "presentar-documento",
    "atencion-solicitudes",
    "estadisticas"
  ],
  Colaborador: [
    "dashboard",
    "solicitudes",
    "presentar-documento",
    "estadisticas"
  ]
};

export const dashboardRoutes = () => (
  <Routes>
    <Route path="/dashboard" element={<DashboardLayout />}>
      {/* Dashboard principal */}
      <Route
        index
        element={
          <PrivateRoute allowedRoles={["Administrador", "Jefe de Proyecto", "Colaborador"]}>
            <DashboardHome />
          </PrivateRoute>
        }
      />

      {/* Solicitud de Gasto */}
      <Route
        path="solicitudes"
        element={
          <PrivateRoute allowedRoles={["Administrador", "Jefe de Proyecto", "Colaborador"]}>
            <SolicitudesPage />
          </PrivateRoute>
        }
      />

      {/* Presentar Documento / Liquidaciones */}
      <Route
        path="presentar-documento"
        element={
          <PrivateRoute allowedRoles={["Administrador", "Jefe de Proyecto", "Colaborador"]}>
            <PresentarDocumentoPage />
          </PrivateRoute>
        }
      />

      {/* Atención de Solicitudes */}
      <Route
        path="atencion-solicitudes"
        element={
          <PrivateRoute allowedRoles={["Administrador", "Jefe de Proyecto"]}>
            <AtencionSolicitudes />
          </PrivateRoute>
        }
      />

      {/* Aprobación de Liquidación */}
      <Route
        path="aprobacion-liquidacion"
        element={
          <PrivateRoute allowedRoles={["Administrador"]}>
            <AprobacionLiquidacion />
          </PrivateRoute>
        }
      />

      {/* Caja Chica / Movimientos */}
      <Route
        path="movimientos"
        element={
          <PrivateRoute allowedRoles={["Administrador"]}>
            <Movimientos />
          </PrivateRoute>
        }
      />

      {/* Guías de Salida */}
      <Route
        path="guias-salida"
        element={
          <PrivateRoute allowedRoles={["Administrador"]}>
            <GuiasSalida />
          </PrivateRoute>
        }
      />

      {/* Estadísticas y Reportes */}
      <Route
        path="estadisticas"
        element={
          <PrivateRoute allowedRoles={["Administrador", "Jefe de Proyecto", "Colaborador"]}>
            <Estadisticas />
          </PrivateRoute>
        }
      />
    </Route>
  </Routes>
);
