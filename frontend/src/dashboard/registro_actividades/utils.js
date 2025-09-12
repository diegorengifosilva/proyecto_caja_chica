// utils.js
export function formatearFecha(fecha) {
  if (!fecha) return "-";
  const d = new Date(fecha);
  return d.toLocaleString(); // o ajusta el formato que quieras
}
