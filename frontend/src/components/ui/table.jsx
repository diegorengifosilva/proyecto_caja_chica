// src/components/ui/Table.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";

const Table = ({
  headers,
  data,
  renderRow,
  emptyMessage = "No hay datos disponibles.",
  activeRow = null,
  rowsPerPage = 10,
  onDeleteRow,
  onRowClick,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = data.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <Card className="rounded-2xl shadow-md border border-gray-200 flex-1 flex flex-col">
      <CardContent className="p-0 flex-1 flex flex-col">
        {/* Tabla para pantallas grandes */}
        <div className="hidden md:block w-full flex-1 overflow-x-auto">
          <table className="w-full table-auto border-collapse text-sm">
            <thead className="bg-gray-100 text-gray-700 font-medium">
              <tr>
                {headers.map((header, idx) => (
                  <th
                    key={idx}
                    className="px-3 py-2 border border-gray-200 text-center align-middle text-[10px] sm:text-xs md:text-sm whitespace-normal"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-gray-50">
              <AnimatePresence>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={headers.length}
                      className="px-4 py-6 text-center text-gray-500 italic border border-gray-200"
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
                      className={`group relative transition-all duration-200 rounded-lg ${
                        activeRow === (item.id || index)
                          ? "bg-blue-50 shadow-md border-l-4 border-blue-500"
                          : "hover:bg-gray-100 hover:shadow-sm cursor-pointer"
                      }`}
                      onClick={() => {
                        if (onRowClick) onRowClick(item);
                      }}
                    >
                      {Array.isArray(renderRow(item))
                        ? renderRow(item).map((cell, i) => (
                            <td
                              key={i}
                              className="px-2 sm:px-3 py-2 border border-gray-200 text-center align-middle break-words whitespace-normal max-w-[150px] sm:max-w-[200px] md:max-w-[300px]"
                            >
                              {typeof cell === "string" || typeof cell === "number" ? (
                                <Tippy content={cell}>
                                  <span className="block">{cell}</span>
                                </Tippy>
                              ) : (
                                cell
                              )}
                            </td>
                          ))
                        : renderRow(item)}

                      {onDeleteRow && (
                        <td className="relative px-1 sm:px-2 py-1 sm:py-2 w-[40px]">
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
                        </td>
                      )}
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Móvil: tarjetas verticales */}
        <div className="flex flex-col gap-3 md:hidden">
          {paginatedData.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500 italic bg-gray-50 rounded-lg border border-gray-200">
              {emptyMessage}
            </div>
          ) : (
            paginatedData.map((item, index) => (
              <motion.div
                key={item.id || index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className={`group relative bg-white rounded-2xl shadow-sm border border-gray-200 p-3 flex flex-col gap-1 cursor-pointer hover:shadow-md`}
                onClick={() => {
                  if (onRowClick) onRowClick(item);
                }}
              >
                {headers.map((header, i) => {
                  const cell = Array.isArray(renderRow(item)) ? renderRow(item)[i] : renderRow(item);
                  return (
                    <div key={i} className="flex justify-between gap-2">
                      <span className="font-semibold text-gray-600 text-xs sm:text-sm">{header}</span>
                      <span className="text-gray-900 text-xs sm:text-sm break-words whitespace-normal">
                        {typeof cell === "string" || typeof cell === "number" ? cell : cell}
                      </span>
                    </div>
                  );
                })}
              </motion.div>
            ))
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>

            <div className="flex flex-wrap items-center gap-1 justify-center">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(page)}
                  className={`w-8 h-8 rounded-full ${
                    page === currentPage ? "bg-blue-500 text-white hover:bg-blue-600" : "hover:bg-gray-100"
                  }`}
                >
                  {page}
                </Button>
              ))}
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
