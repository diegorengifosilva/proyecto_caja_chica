// boleta_project/frontend/src/components/ui/Table.jsx

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

const Table = ({
  headers,
  data,
  renderRow,
  emptyMessage = "No hay datos disponibles.",
  activeRow = null,
  rowsPerPage = 10,
  onDeleteRow, // 🔥 nueva prop opcional
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = data.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <Card className="rounded-2xl shadow-md border border-gray-200">
      <CardContent className="p-0">
        <div className="overflow-x-auto rounded-2xl relative">
          <table className="min-w-full table-auto text-sm text-center border-collapse relative">
            {/* Cabecera */}
            <thead className="bg-gray-100 text-gray-700 font-medium">
              <tr>
                {headers.map((header, idx) => (
                  <th
                    key={idx}
                    className="px-3 sm:px-4 py-3 border border-gray-200"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Cuerpo */}
            <tbody className="bg-gray-50">
              <AnimatePresence>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={headers.length}
                      className="px-4 py-10 text-center text-gray-500 italic border border-gray-200"
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item, index) => (
                    <motion.tr
                      key={item.id || index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className={`group relative transition-all duration-200 ${
                        activeRow === (item.id || index)
                          ? "bg-blue-50 border-l-4 border-blue-500 shadow-sm"
                          : "hover:bg-gray-50 hover:shadow-md hover:ring-1 hover:ring-gray-200 cursor-pointer"
                      }`}
                    >
                      {/* Render normal de las celdas */}
                      {Array.isArray(renderRow(item))
                        ? renderRow(item).map((cell, i) => (
                            <td
                              key={i}
                              className="px-3 sm:px-4 py-3 border border-gray-200"
                            >
                              {cell}
                            </td>
                          ))
                        : renderRow(item)}

                      {/* Botón flotante de eliminar */}
                      {onDeleteRow && (
                        <div className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteRow(item);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>

            {/* Números */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(page)}
                    className={`w-8 h-8 rounded-full ${
                      page === currentPage
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {page}
                  </Button>
                )
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => goToPage(currentPage + 1)}
              className="flex items-center gap-1"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Table;
