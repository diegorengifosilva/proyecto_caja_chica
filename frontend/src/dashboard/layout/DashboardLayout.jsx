// src/dashboard/Layout/DashboardLayout.jsx
import React, { useState, useMemo } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, UserCog, LogOut, ClipboardList, FilePlus, FileSearch, Settings, FolderKanban, Wallet, BarChart2, ListChecks, Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import logo from "@/assets/logo.png";
import "@/styles/Home.css";
import { useAuth } from "@/context/AuthContext";

const SIDEBAR_ITEMS = [
  {
    section: "Dashboard Principal",
    items: [
      { to: "/dashboard", label: "Pantalla Principal", icon: LayoutDashboard, roles: ["Administrador", "Jefe de Proyecto", "Colaborador"] },
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
  <div className="text-xs uppercase text-gray-400 font-semibold px-4 pt-6 pb-1">
    {title}
  </div>
);

// ... arriba se mantiene igual

const SidebarLink = ({ to, label, icon: Icon, collapsed, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <NavLink
      to={to}
      onClick={onClick} // 👉 importante
      className={`relative group flex items-center gap-3 px-4 py-2 rounded-md text-sm transition-all duration-200 
        ${isActive ? "bg-indigo-100 text-indigo-700 font-semibold" : "text-gray-700 hover:bg-indigo-50 hover:shadow-sm"}`}
    >
      <Icon className="w-5 h-5" />
      {!collapsed && <span className="transition-opacity duration-300">{label}</span>}

      {collapsed && (
        <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
          {label}
        </span>
      )}
    </NavLink>
  );
};

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { authUser: user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const filteredSidebar = useMemo(() => {
    if (!user?.rol) return [];
    return SIDEBAR_ITEMS.map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(user.rol)),
    })).filter((section) => section.items.length > 0);
  }, [user]);

  return (
    <div className="flex min-h-screen bg-[#f3f4f6] relative">
      {/* Overlay móvil con animación */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm animate-fadeIn z-30 md:hidden"
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static z-40 top-0 left-0 h-screen bg-white shadow-md border-r flex flex-col transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"}
        ${sidebarOpen ? "md:w-64" : "md:w-20"} md:translate-x-0`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Logo + usuario */}
          <div className="flex flex-col items-center justify-center py-6 border-b relative group">
            <img
              src={logo}
              alt="V&C Corporation"
              className={`transition-all duration-300 ${sidebarOpen ? "h-16" : "h-12"} group-hover:scale-105`}
            />
            {sidebarOpen && (
              <span className="mt-2 text-sm font-bold text-gray-700 text-center transition-opacity duration-500 ease-in-out">
                {user?.nombre ? `${user.nombre} ${user.apellido || ""}` : "Usuario"}
              </span>
            )}

            {/* Botón de colapsar */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`hidden md:flex absolute right-2 top-2 text-gray-500 hover:text-gray-700 transition-opacity duration-200 
              ${hovered ? "opacity-100" : "opacity-0"}`}
            >
              {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>

          {/* Menú */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {filteredSidebar.map((section) => (
              <div key={section.section}>
                {sidebarOpen && <NavSectionTitle title={section.section} />}
                {section.items.map((item) => (
                  <SidebarLink
                    key={item.to}
                    {...item}
                    collapsed={!sidebarOpen}
                    onClick={() => setMobileOpen(false)} // 👉 cerrar menú en móviles
                  />
                ))}
              </div>
            ))}
          </nav>

          {/* Logout */}
          <div className="px-4 py-4 border-t">
            <button
              onClick={() => {
                setMobileOpen(false); // 👉 cerrar también al desloguearse
                handleLogout();
              }}
              className="flex items-center gap-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md px-2 py-2 text-sm w-full transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {sidebarOpen && <span className="transition-opacity duration-300">Cerrar sesión</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header móvil */}
        <div className="md:hidden flex items-center justify-between bg-white shadow px-4 py-2">
          <button onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-6 h-6 text-gray-700" /> : <Menu className="w-6 h-6 text-gray-700" />}
          </button>
          <span className="font-bold text-gray-800">Dashboard</span>
        </div>

        {/* Contenido */}
        <main className="flex-1 flex flex-col p-4 md:p-6 bg-white overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
