// frontend/src/auth/AuthLayout.jsx

import React from "react";
import "./Auth.css"; // Mantenemos si usas estilos extra

export default function AuthLayout({ children }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center px-4"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80')`,
      }}
    >
      <div className="bg-white bg-opacity-95 p-8 rounded-2xl shadow-2xl w-full max-w-md backdrop-blur-md">
        <div className="text-center mb-6">
          <h2 className="text-4xl font-extrabold text-teal-700 tracking-tight">
            PMInsight
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Gestión Estratégica Simplificada
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}