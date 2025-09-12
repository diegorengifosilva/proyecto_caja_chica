// src/dashboard/Layout/DashboardLayout.jsx
import React, { useState, useMemo } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  UserCog,
  LogOut,
  ClipboardList,
  FilePlus,
  FileSearch,
  Settings,
  FolderKanban,
  Wallet,
  BarChart2,
  ListChecks,
  Menu,
  X,
} from "lucide-react";
import logo from "@/assets/logo.png";
import "@/styles/Home.css";
import { useAuth } from "@/context/AuthContext";

// Secciones del sidebar
const SIDEBAR_ITEMS = [
  {
    section: "Dashboard Principal",
    items: [
      { to: "/dashboard", label: "Pantalla Principal", icon: LayoutDashboard, roles: ["Administrador","Jefe de Proyecto","Colaborador"] },
    ],
  },
  {
    section: "Gestión de Gastos y Liquidaciones",
    items: [
      { to: "/dashboard/liquidaciones/solicitud", label: "Solicitud de Gasto", icon: FilePlus, roles: ["Administrador","Jefe de Proyecto","Colaborador"] },
      { to: "/dashboard/atencion-solicitudes", label: "Atención de Solicitudes", icon: ListChecks, roles: ["Administrador","Jefe de Proyecto"] },
      { to: "/dashboard/liquidaciones/presentar", label: "Liquidaciones", icon: FolderKanban, roles: ["Administrador","Jefe de Proyecto","Colaborador"] },
      { to: "/dashboard/gastos/aprobacion-liquidacion", label: "Aprobación de Liquidación", icon: FileSearch, roles: ["Administrador"] },
    ],
  },
  {
    section: "Registros y Movimientos",
    items: [
      { to: "/dashboard/movimientos/arqueo", label: "Caja Chica", icon: Wallet, roles: ["Administrador"] },
      { to: "/dashboard/registros/actividades", label: "Registro de Actividades", icon: ClipboardList, roles: ["Administrador","Jefe de Proyecto","Colaborador"] },
      { to: "/dashboard/registros/guias-salida", label: "Guías de Salida", icon: FileText, roles: ["Administrador"] },
    ],
  },
  {
    section: "Reportes y Análisis",
    items: [
      { to: "/dashboard/reportes", label: "Estadísticas y Reportes", icon: BarChart2, roles: ["Administrador","Jefe de Proyecto","Colaborador"] },
    ],
  },
  {
    section: "Mi Cuenta",
    items: [
      { to: "/dashboard/editar-perfil", label: "Editar Perfil", icon: UserCog, roles: ["Administrador","Jefe de Proyecto","Colaborador"] },
      { to: "/dashboard/cambiar-clave", label: "Cambiar Contraseña", icon: Settings, roles: ["Administrador","Jefe de Proyecto","Colaborador"] },
    ],
  },
];

const NavSectionTitle = ({ title }) => (
  <div className="text-xs uppercase text-gray-400 font-semibold px-4 pt-6 pb-1">{title}</div>
);

const SidebarLink = ({ to, label, icon: Icon }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-2 rounded-md text-sm transition-colors duration-200 ${
        isActive ? "bg-indigo-100 text-indigo-700 font-semibold" : "text-gray-700 hover:bg-gray-200"
      }`
    }
  >
    <Icon className="w-4 h-4" />
    {label}
  </NavLink>
);

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { authUser: user } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/login");
  };

  // Filtrar items según rol
  const filteredSidebar = useMemo(() => {
    if (!user?.rol) return [];
    return SIDEBAR_ITEMS.map(section => ({
      ...section,
      items: section.items.filter(item => item.roles.includes(user.rol)),
    })).filter(section => section.items.length > 0); // remover secciones vacías
  }, [user]);

  return (
    <div className="flex min-h-screen bg-[#f3f4f6]">
      {/* Sidebar */}
      <aside
        className={`fixed md:static z-40 top-0 left-0 h-screen bg-white shadow-md border-r flex flex-col transform transition-transform duration-300 
        ${sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"} md:translate-x-0`}
      >
        <div className="flex flex-col items-center justify-center py-6 border-b">
          <img src={logo} alt="V&C Corporation" className="h-16" />
          <span className="text-sm font-bold text-gray-700 mt-2">
            {user?.nombre ? `${user.nombre} ${user.apellido || ""}` : "Usuario"}
          </span>
        </div>

        {/* Menú lateral */}
        <nav className="flex-1 overflow-y-auto pb-6">
          {filteredSidebar.map(section => (
            <div key={section.section}>
              <NavSectionTitle title={section.section} />
              {section.items.map(item => (
                <SidebarLink key={item.to} {...item} />
              ))}
            </div>
          ))}
        </nav>

        <div className="px-4 py-4 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-600 hover:text-red-800 text-sm"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header móvil */}
        <div className="md:hidden flex items-center justify-between bg-white shadow px-4 py-2">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-6 h-6 text-gray-700" /> : <Menu className="w-6 h-6 text-gray-700" />}
          </button>
          <span className="font-bold text-gray-800">Dashboard</span>
        </div>

        {/* Contenido con scroll */}
        <main className="flex-1 flex flex-col p-4 md:p-6 bg-white overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
