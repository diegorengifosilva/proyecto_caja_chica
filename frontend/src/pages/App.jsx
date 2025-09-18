// boleta_project/frontend/src/pages/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "@/styles/Home.css";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import 'react-confirm-alert/src/react-confirm-alert.css';

import { AuthProvider } from "@/context/AuthContext.jsx";
import ProtectedRoute from "@/components/layout/ProtectedRoute.jsx";

// AUTH
import LoginPage from "../auth/login/LoginPage.jsx";
import RegisterPage from "../auth/register/RegisterPage.jsx";


// LAYOUT PRINCIPAL
import DashboardLayout from "../dashboard/layout/DashboardLayout.jsx";


// DASHBOARD PRINCIPAL
import LiquidacionesHome from "../dashboard/caja_chica/CajaChica.jsx";

/* PANTALLA PRINCIPAL */
import DashboardHome from "../dashboard/principal/DashboardHome.jsx";

/* PROGRAMACIÓN */
import Programacion from "../dashboard/programacion/index.js";

/* SOLICITUD DE GASTO */
import SolicitudDashboard from "@/dashboard/solicitudes/SolicitudDashboard.jsx";
import NuevaSolicitud from "@/dashboard/solicitudes/NuevaSolicitud.jsx";
import MisSolicitudes from "@/dashboard/solicitudes/MisSolicitudes.jsx";
import DetallesSolicitud from "@/dashboard/solicitudes/DetallesSolicitud.jsx";

/* ATENCIÓN DE SOLICITUDES */
import AtencionSolicitudes from "@/dashboard/atencion_solicitudes/AtencionSolicitudes.jsx";

/* LIQUIDACIONES */
import LiquidacionesPendientes from "@/dashboard/liquidaciones/LiquidacionesPendientes.jsx";
import PresentarDocumentacionModal from "@/dashboard/liquidaciones/PresentarDocumentacionModal.jsx";
import SubirArchivoModal from "@/dashboard/liquidaciones/SubirArchivoModal.jsx";

/* APROBACIÓN DE LIQUIDACIONES */
import AprobacionLiquidaciones from "@/dashboard/aprobacion_liquidacion/AprobacionLiquidaciones.jsx";

/* CAJA CHICA */
import CajaChica from "@/dashboard/caja_chica/CajaChica.jsx";

/* REGISTRO DE ACTIVIDADES */
import RegistroActividades from "@/dashboard/registro_actividades/RegistroActividades.jsx";

/* GUIAS DE SALIDAS */
import GuiasSalida from "@/dashboard/guias_salidas/GuiasSalida.jsx";

/* ESTADÍSTICAS Y REPORTES */
import Reportes from '@/dashboard/reportes/Reportes.jsx';

/* EDITAR PERFIL */

/* CAMBIAR CONTRASEÑA */



export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastContainer position="top-right" autoClose={3000} />

        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected */}
          <Route path="/dashboard/*" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            {/* Pantalla Principal */}
            <Route index element={<DashboardHome />} />
            {/* Programación */}
            <Route path="gastos/programacion" element={<Programacion />} />
            {/*  */}
            <Route path="liquidaciones" element={<LiquidacionesHome />} />
            {/* Solicitud de Gasto */}
            <Route path="liquidaciones/solicitud" element={<SolicitudDashboard />} />
            <Route path="liquidaciones/solicitud/nueva" element={<NuevaSolicitud />} />
            <Route path="liquidaciones/solicitud/mis-solicitudes" element={<MisSolicitudes />} />
            <Route path="solicitudes/:nro_solicitud" element={<DetallesSolicitud />} />
            {/* Atención de Solicitudes */}
            <Route path="atencion-solicitudes"element={<AtencionSolicitudes/>}/>
            {/* Liquidaciones */}
            <Route path="liquidaciones/presentar" element={<LiquidacionesPendientes />} />
            <Route path="liquidaciones/presentar/:id" element={<PresentarDocumentacionModal />} />
            <Route path="liquidaciones/solicitud/:id/documento" element={<SubirArchivoModal />} />
            {/* Aprobación de Liquidaciones */}
            <Route path="gastos/aprobacion-liquidacion" element={<AprobacionLiquidaciones />} />
            {/* Caja Chica */}
            <Route path="movimientos/arqueo" element={<CajaChica />} />
            {/* Registro de Actividades */}
            <Route path="registros/actividades" element={<RegistroActividades />} />
            {/* Guias de Salida */}
            <Route path="registros/guias-salida" element={<GuiasSalida />} />
            {/* Estadísticas y Reportes */}
            <Route path="reportes" element={<Reportes />} />
          </Route>

          {/* Global redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
