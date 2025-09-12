import React from "react";
import { Download } from "lucide-react";

export default function ExportarReportes() {
  const exportarExcel = () => window.open("/api/reportes/exportar_excel/", "_blank");
  const exportarPDF = () => window.open("/api/reportes/exportar_pdf/", "_blank");

  return (
    <div className="flex gap-3 mb-6">
      <button
        onClick={exportarExcel}
        className="px-4 py-2 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white rounded-lg flex items-center gap-2 shadow-md transition transform hover:scale-[1.05]"
      >
        <Download size={18} /> Exportar Excel
      </button>
      <button
        onClick={exportarPDF}
        className="px-4 py-2 bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 text-white rounded-lg flex items-center gap-2 shadow-md transition transform hover:scale-[1.05]"
      >
        <Download size={18} /> Exportar PDF
      </button>
    </div>
  );
}
