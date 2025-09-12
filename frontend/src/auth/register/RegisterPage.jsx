// src/auth/register/RegisterPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import logo from "@/assets/logo.png";
import fondo from "@/assets/Fondo.jpg";
import { useAuth } from "@/context/AuthContext";

const areas = [
  "Gerencia General", "Industria", "Minería", "Mantenimiento",
  "Petroquímica", "Administración", "Contabilidad", "Tecnología de la Información",
  "Logística - Almacén", "Recursos Humanos", "Comercial", "SIG. HSEQ",
  "Seguridad de Maquinaria", "Comité CSSO"
];

const roles = [
  "Administrador",     // Full access, configuración y control
  "Jefe de Proyecto",  // Gestiona proyectos y supervisa solicitudes
  "Colaborador"        // Usuario normal que hace solicitudes
];

const paises = ["Perú", "Argentina", "Colombia", "Chile"];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, login } = useAuth();

  const [form, setForm] = useState({
    nombre: "", apellido: "", email: "", edad: "",
    empresa: "", pais: "", rol: "", area: "",
    password: "", confirmarPassword: ""
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const isEmailValid = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const {
      nombre, apellido, email, edad, empresa,
      pais, rol, area, password, confirmarPassword
    } = form;

    // Validaciones
    if (
      !nombre || !apellido || !email || !edad ||
      !pais || !rol || !area || !password || !confirmarPassword
    ) {
      setErrorMsg("Por favor completa todos los campos obligatorios.");
      setLoading(false);
      return;
    }

    if (!isEmailValid(email)) {
      setErrorMsg("Correo electrónico inválido.");
      setLoading(false);
      return;
    }

    if (Number(edad) <= 0 || isNaN(Number(edad))) {
      setErrorMsg("La edad debe ser un número válido mayor que 0.");
      setLoading(false);
      return;
    }

    if (password !== confirmarPassword) {
      setErrorMsg("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    // Preparar payload conforme al serializer backend
    const payload = {
      nombre,
      apellido,
      email,
      edad: Number(edad),
      empresa,
      pais,
      rol,
      area,
      password,
    };

    try {
      // register retorna { success: boolean, ... } según tu AuthContext
      const res = await register(payload);

      // Si register devolvió objeto con success boolean
      if (!res || res.success === false) {
        // puede venir mensaje en res.message o res.error
        const msg = res?.message || res?.error || "No se pudo registrar el usuario.";
        setErrorMsg(msg);
        setLoading(false);
        return;
      }

      // Intentar login automático
      const loginRes = await login({ email, password });
      if (loginRes && loginRes.success) {
        // Redirigir al dashboard (home)
        navigate("/login");
      } else {
        // Si el login automático falla, redirigir al login y mostrar mensaje
        navigate("/login");
      }
    } catch (err) {
      console.error("Error en el registro:", err);
      // Mostrar info útil si existe
      const detail = err?.response?.data?.detail || err?.message || "Ocurrió un error al registrar.";
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
      {/* Contenedor del formulario */}
      <div className="relative z-10 p-6 sm:p-8 w-full max-w-3xl bg-white/60 backdrop-blur-min rounded-2xl shadow-xl">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="Logo" className="w-32 sm:w-40 h-auto mb-2" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center">
            Registro de Usuario
          </h1>
          {errorMsg && (
            <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 px-3 py-2 rounded-md w-full text-center">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Formulario en 2 columnas (se vuelve 1 en pantallas pequeñas) */}
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Columna izquierda */}
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="nombre" className="text-xs font-medium text-gray-600 sr-only">Nombre</label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                placeholder="Nombre"
                value={form.nombre}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                autoComplete="given-name"
                aria-label="Nombre"
              />
            </div>

            <div>
              <label htmlFor="email" className="text-xs font-medium text-gray-600 sr-only">Correo electrónico</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Correo electrónico"
                value={form.email}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${form.email && !isEmailValid(form.email) ? "border-red-500" : "border-gray-300"}`}
                autoComplete="email"
                aria-label="Correo electrónico"
              />
            </div>

            <div>
              <label htmlFor="empresa" className="text-xs font-medium text-gray-600 sr-only">Empresa</label>
              <input
                id="empresa"
                name="empresa"
                type="text"
                placeholder="Empresa"
                value={form.empresa}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                aria-label="Empresa"
              />
            </div>

            <div>
              <label htmlFor="rol" className="text-xs font-medium text-gray-600 sr-only">Rol</label>
              <select
                id="rol"
                name="rol"
                value={form.rol}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                aria-label="Rol"
              >
                <option value="">Selecciona un rol</option>
                {roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Contraseña */}
            <div className="relative">
              <label htmlFor="password" className="sr-only">Contraseña</label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-2 pr-10 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                autoComplete="new-password"
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
          </div>

          {/* Columna derecha */}
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="apellido" className="text-xs font-medium text-gray-600 sr-only">Apellido</label>
              <input
                id="apellido"
                name="apellido"
                type="text"
                placeholder="Apellido"
                value={form.apellido}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                autoComplete="family-name"
                aria-label="Apellido"
              />
            </div>

            <div>
              <label htmlFor="edad" className="text-xs font-medium text-gray-600 sr-only">Edad</label>
              <input
                id="edad"
                name="edad"
                type="number"
                placeholder="Edad"
                value={form.edad}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                aria-label="Edad"
                min={0}
              />
            </div>

            <div>
              <label htmlFor="pais" className="text-xs font-medium text-gray-600 sr-only">País</label>
              <select
                id="pais"
                name="pais"
                value={form.pais}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                aria-label="País"
              >
                <option value="">Selecciona un país</option>
                {paises.map((pais) => (
                  <option key={pais} value={pais}>{pais}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="area" className="text-xs font-medium text-gray-600 sr-only">Área</label>
              <select
                id="area"
                name="area"
                value={form.area}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                aria-label="Área"
              >
                <option value="">Selecciona un área</option>
                {areas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {/* Confirmar contraseña */}
            <div className="relative">
              <label htmlFor="confirmarPassword" className="sr-only">Confirmar contraseña</label>
              <input
                id="confirmarPassword"
                name="confirmarPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirmar contraseña"
                value={form.confirmarPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 pr-10 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                autoComplete="new-password"
                aria-label="Confirmar contraseña"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Ocultar confirmación" : "Mostrar confirmación"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Botón (ocupa ambas columnas) */}
          <div className="md:col-span-2 mt-4">
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-xl transition ${loading ? "cursor-not-allowed opacity-70" : ""}`}
            >
              {loading ? "Registrando..." : "Registrarse"}
            </button>
          </div>
        </form>

        {/* Link a login */}
        <p className="text-sm text-gray-700 mt-6 text-center">
          ¿Ya tienes una cuenta?{" "}
          <span
            className="text-teal-700 font-semibold hover:underline cursor-pointer"
            onClick={() => navigate("/login")}
          >
            Inicia sesión aquí
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
