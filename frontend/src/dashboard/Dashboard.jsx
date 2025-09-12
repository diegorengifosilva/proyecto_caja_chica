// frontend/src/pages/Dashboard.jsx

import React from "react";
import { Link } from "react-router-dom";
import "../styles/dashboard.css";

export default function Dashboard({ onLogout }) {
  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    onLogout();
  };

  return (
    <div className="dashboard">
      <nav className="sidebar">
        <h3>PMInsight</h3>
        <ul>
          <li><Link to="/dashboard">Dashboard Principal</Link></li>
          <li><Link to="#">Mis Proyectos</Link></li>
          <li><Link to="#">Evaluaciones Estratégicas</Link></li>
          <li><Link to="#">Gestión de Riesgos</Link></li>
          <li><Link to="#">Reportes Ejecutivos</Link></li>
          <li><Link to="#">Mi Cuenta</Link></li>
          <li>
            <button className="logout" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </li>
        </ul>
      </nav>
      <main className="content">
        <h2>Bienvenido a tu panel de control</h2>
        {/* Aquí irán los componentes del dashboard */}
      </main>
    </div>
  );
}