// src/components/ui/Table.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";

const Table = ({
  headers,
  data,
  renderRow,
  emptyMessage = "No hay datos disponibles.",
  activeRow = null,
  rowsPerPage = 10,
  onRowClick,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(data.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = data.slice(startIndex, endIndex);
  const goToPage = (page) => page >= 1 && page <= totalPages && setCurrentPage(page);

  return (
    <Card className="rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 flex-1 flex flex-col overflow-hidden">
      <CardContent className="p-0 flex-1 flex flex-col">
        {/* 📌 Tabla para pantallas grandes */}
        <div className="hidden md:block w-full flex-1">
          <table className="w-full table-auto border-collapse text-sm">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-800 dark:text-gray-200 font-semibold sticky top-0 z-10 shadow-sm">
              <tr>
                {headers.map((header, idx) => (
                  <th
                    key={idx}
                    className={`px-4 py-3 border-b border-gray-200 dark:border-gray-600 text-center align-middle text-xs sm:text-sm uppercase tracking-wide
                               ${idx === 0 ? "rounded-tl-2xl" : ""} 
                               ${idx === headers.length - 1 ? "rounded-tr-2xl" : ""}`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
              <AnimatePresence>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 italic">
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item, rowIndex) => (
                    <motion.tr
                      key={item.id || rowIndex}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className={`group relative transition-all duration-300 ${
                        activeRow === (item.id || rowIndex)
                          ? "bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 shadow-sm"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800"
                      } cursor-pointer`}
                      onClick={() => onRowClick && onRowClick(item)}
                    >
                      {Array.isArray(renderRow(item))
                        ? renderRow(item).map((cell, i) => {
                            const isLastRow = rowIndex === paginatedData.length - 1;
                            return (
                              <td
                                key={i}
                                className={`px-3 py-3 text-center align-middle text-xs sm:text-sm md:text-base text-gray-800 dark:text-gray-200
                                           break-words max-w-[180px] 
                                           ${isLastRow && i === 0 ? "rounded-bl-2xl" : ""} 
                                           ${isLastRow && i === headers.length - 1 ? "rounded-br-2xl" : ""}`}
                              >
                                {typeof cell === "string" || typeof cell === "number" ? (
                                  <Tippy content={cell}>
                                    <span className="block overflow-hidden" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                                      {cell}
                                    </span>
                                  </Tippy>
                                ) : (
                                  cell
                                )}
                              </td>
                            );
                          })
                        : renderRow(item)}
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* 📌 Vista móvil: tarjetas */}
        <div className="flex flex-col gap-3 md:hidden p-2">
          {paginatedData.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500 italic bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
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
                className="group relative bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-3 cursor-pointer hover:shadow-lg transition"
                onClick={() => onRowClick && onRowClick(item)}
              >
                {headers.map((header, i) => {
                  const cell = Array.isArray(renderRow(item)) ? renderRow(item)[i] : renderRow(item);
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 w-full">
                      <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] sm:text-xs font-medium flex-shrink-0">
                        {header}
                      </span>
                      <span className="text-gray-900 dark:text-gray-100 text-xs sm:text-sm md:text-base lg:text-lg text-right leading-snug break-words whitespace-normal max-w-[65%]">
                        {typeof cell === "string" || typeof cell === "number" ? cell : cell}
                      </span>
                    </div>
                  );
                })}
              </motion.div>
            ))
          )}
        </div>

        {/* 📌 Paginación */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <Button
              variant="default"
              size="sm"
              fromColor="#a8d8d8"
              toColor="#81c7c7"
              hoverFrom="#81c7c7"
              hoverTo="#5eb0b0"
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
              className="flex items-center gap-1 rounded-full"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>

            <div className="flex flex-wrap items-center gap-1 justify-center">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant="default"
                  size="sm"
                  fromColor="#a8d8d8"
                  toColor="#81c7c7"
                  hoverFrom="#81c7c7"
                  hoverTo="#5eb0b0"
                  onClick={() => goToPage(page)}
                  className={`w-8 h-8 rounded-full text-xs ${
                    page === currentPage ? "bg-blue-500 text-white hover:bg-blue-600" : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {page}
                </Button>
              ))}
            </div>

            <Button
              variant="default"
              size="sm"
              fromColor="#a8d8d8"
              toColor="#81c7c7"
              hoverFrom="#81c7c7"
              hoverTo="#5eb0b0"
              disabled={currentPage === totalPages}
              onClick={() => goToPage(currentPage + 1)}
              className="flex items-center gap-1 rounded-full"
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
