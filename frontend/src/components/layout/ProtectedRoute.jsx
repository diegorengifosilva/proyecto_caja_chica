// src/components/layout/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { authUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-500 text-lg">Validando sesión...</p>
      </div>
    );
  }

  if (!authUser) return <Navigate to="/login" replace />;

  return children ?? <Outlet />;
};

export default ProtectedRoute;
