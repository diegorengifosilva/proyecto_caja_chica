// boleta_project/frontend/src/components/ui/colors.js

/* ================== ESTADOS ================== */
// Para componentes UI (badges, etiquetas, etc.)
export const STATE_CLASSES = {
  "Pendiente de Envío": "bg-orange-200 text-orange-800", // naranaja
  "Pendiente para Atención": "bg-yellow-200 text-yellow-800", // amarillo
  "Atendido, Pendiente de Liquidación": "bg-sky-200 text-sky-800", // celeste
  "Liquidación enviada para Aprobación": "bg-green-200 text-green-800", // verde
  "Liquidación Aprobada": "bg-gray-800 text-white", // negro
  "Rechazado": "bg-red-200 text-red-800", // rojo
};

// Para gráficos / KPIs (hexadecimal fijo)
export const STATE_COLORS = {
  "Pendiente de Envío": "#f97316", // naranja
  "Pendiente para Atención": "#ffef00", // amarillo
  "Atendido, Pendiente de Liquidación": "#0ea5e9", // celeste
  "Liquidación enviada para Aprobación": "#22c55e", // verde
  "Liquidación Aprobada": "#0f172a", // negro
  "Rechazado": "#ef4444", // rojo
};

/* ================== TIPOS DE SOLICITUD ================== */
// Para componentes UI
export const TIPO_SOLICITUD_CLASSES = {
  "Viáticos": "bg-blue-500 text-white",       // azul oscuro
  "Movilidad": "bg-emerald-500 text-white",   // esmeralda
  "Compras": "bg-purple-500 text-white",      // morado
  "Otros gastos": "bg-yellow-100 text-yellow-800", // beige / arena
};

// Para gráficos / KPIs
export const TYPE_COLORS = {
  "Viáticos": "#0218db",    // azul
  "Movilidad": "#059669",   // esmeralda
  "Compras": "#7c3aed",     // morado
  "Otros gastos": "#eab308" // amarillo/beige
};
