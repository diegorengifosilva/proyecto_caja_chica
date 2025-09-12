// src/components/ui/layout/Sidebar.jsx

import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  FilePlus,
  FileArrowUp,
  ListChecks,
  UserCog,
  LogOut,
} from "lucide-react";
import logo from "../assets/logo.png";
import "@/styles/Home.css";

export const Sidebar = ({ onLogout }) => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const sectionTitle = (title) => (
    <div className="text-xs font-semibold text-gray-400 uppercase mt-6 mb-2 px-4">{title}</div>
  );

  const SubLink = ({ to, label, icon: Icon }) => (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition ${
        isActive(to) ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-blue-100"
      }`}
    >
      <Icon size={16} />
      {label}
    </Link>
  );

  return (
    <div className="w-64 bg-white h-screen shadow-lg flex flex-col border-r overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b flex flex-col items-center justify-center gap-2">
        <img src={logo} alt="V&C Logo" className="w-14 h-14 object-contain" />
        <span className="text-sm font-bold text-gray-700 text-center">V&C CORPORATION</span>
      </div>

      {/* Navegación */}
      <div className="flex-1 py-4">
        {sectionTitle("Dashboard")}
        <SubLink to="/dashboard" label="Dashboard Principal" icon={LayoutDashboard} />

        {sectionTitle("Liquidaciones")}
        <SidebarLink to="/dashboard/liquidaciones" label="Todas las Solicitudes" icon={FolderKanban} />
        <SubLink to="/dashboard/liquidaciones/solicitud" label="Solicitud de Gasto" icon={FilePlus} />
        <SubLink to="/dashboard/liquidaciones/presentar" label="Presentar Documento" icon={FileArrowUp} />


        {sectionTitle("Registro")}
        <SubLink to="/dashboard/actividades" label="Registro de Actividades" icon={ListChecks} />

        {sectionTitle("Cuenta")}
        <SubLink to="/cuenta" label="Mi Cuenta" icon={UserCog} />
      </div>

      {/* Botón logout */}
      <div className="px-4 py-6 border-t">
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-red-600 hover:text-red-800"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};