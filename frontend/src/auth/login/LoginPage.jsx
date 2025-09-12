// src/auth/login/LoginPage.jsx

import React, { useState } from "react";
import logo from "@/assets/logo.png";
import fondo from "@/assets/Fondo.jpg";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!validateEmail(form.email)) {
      setErrorMsg("Ingrese un correo válido.");
      return;
    }

    setLoading(true);
    try {
      await login(form);
      navigate("/dashboard");
    } catch (error) {
      const detail =
        error.response?.data?.detail ??
        "Credenciales inválidas. Inténtalo nuevamente.";
      setErrorMsg(Array.isArray(detail) ? detail[0] : detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="w-full min-h-screen bg-cover bg-center bg-fixed flex items-center justify-center px-4 sm:px-6 md:px-10"
      style={{ backgroundImage: `url(${fondo})` }}
    >
      {/* Contenedor del formulario */}
      <div className="relative z-10 p-6 sm:p-8 w-full max-w-3xl bg-white/60 backdrop-blur-min rounded-2xl shadow-xl">
        {/* Logo + Título */}
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

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email"
              className="text-xs font-medium text-gray-600 sr-only"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Correo electrónico"
              value={form.email}
              onChange={handleChange}
              className={`w-full px-4 py-2 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                form.email && !validateEmail(form.email)
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
              autoComplete="email"
              aria-label="Correo electrónico"
            />
          </div>

          <div className="relative">
            <label
              htmlFor="password"
              className="text-xs font-medium text-gray-600 sr-only"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-2 pr-10 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              autoComplete="current-password"
              aria-label="Contraseña"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Botón */}
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

        {/* Link a registro */}
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

      {/* Footer */}
      <div className="absolute bottom-4 text-center text-sm text-white w-full z-10 px-4">
        © 2025 Producto desarrollado por V&C Corporation SAC
      </div>
    </div>
  );
}
