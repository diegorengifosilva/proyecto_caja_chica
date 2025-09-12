// src/components/routes/PrivateRoute.jsx

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

/**
 * children: componente a renderizar si está autorizado
 * allowedRoles: array de roles permitidos, ej: ["encargado"]
 */
const PrivateRoute = ({ children, allowedRoles }) => {
  const { authUser, loading } = useAuth();

  if (loading) return <p>Cargando...</p>;

  if (!authUser) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(authUser.rol)) {
    return <Navigate to="/dashboard" replace />; // si no tiene rol, lo mandamos al inicio
  }

  return children;
};

export default PrivateRoute;
