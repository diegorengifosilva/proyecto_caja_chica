// src/auth/login/LoginPage.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import api from "@/services/api"; // ✅ Usa la configuración centralizada
import logo from "@/assets/logo.png";
import fondo from "@/assets/Fondo.jpg";

export default function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    usuario_usu: "",
    password_usu: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!form.usuario_usu || !form.password_usu) {
      setErrorMsg("Ingrese usuario y contraseña.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/login/", form);
      const { access, refresh, user } = response.data;

      if (!access || !refresh) {
        throw new Error("Tokens no recibidos desde el servidor.");
      }

      // Guarda tokens de forma consistente con api.js
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      localStorage.setItem("usuario", JSON.stringify(user));

      navigate("/dashboard");
    } catch (error) {
      console.error("Error en login:", error);
      const detail =
        error.response?.data?.error ??
        "Error interno en el servidor. Inténtalo nuevamente.";
      setErrorMsg(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="w-full min-h-screen bg-cover bg-center bg-fixed flex items-center justify-center px-4 sm:px-6 md:px-10"
      style={{ backgroundImage: `url(${fondo})` }}
    >
      <div className="relative z-10 p-6 sm:p-8 w-full max-w-3xl bg-white/60 backdrop-blur-min rounded-2xl shadow-xl">
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="Logo" className="w-32 sm:w-40 h-auto mb-2" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center">
            Iniciar Sesión
          </h1>
          {errorMsg && (
            <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 px-3 py-2 rounded-md w-full text-center">
              {errorMsg}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <input
              name="usuario_usu"
              type="text"
              placeholder="Usuario"
              value={form.usuario_usu}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-xl text-sm border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              autoComplete="username"
            />
          </div>

          <div className="relative">
            <input
              name="password_usu"
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              value={form.password_usu}
              onChange={handleChange}
              className="w-full px-4 py-2 pr-10 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-xl transition ${
              loading ? "cursor-not-allowed opacity-70" : ""
            }`}
          >
            {loading ? "Ingresando..." : "Iniciar Sesión"}
          </button>
        </form>

        <p className="text-sm text-gray-700 mt-6 text-center">
          ¿No tienes una cuenta?{" "}
          <span
            className="text-teal-700 font-semibold hover:underline cursor-pointer"
            onClick={() => navigate("/register")}
          >
            Regístrate aquí
          </span>
        </p>
      </div>

      <div className="absolute bottom-4 text-center text-sm text-white w-full z-10 px-4">
        © 2025 Producto desarrollado por V&C Corporation SAC
      </div>
    </div>
  );
}
