// src/dashboard/aprobacion_liquidacion/ConfirmacionModal.jsx
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, RotateCw, CornerUpLeft } from "lucide-react";

export default function ConfirmacionModal({ open, onClose, accion, onConfirm, liquidacion }) {
  if (!accion) return null;

  const accionMap = {
    aprobar: { text: "aprobar", color: "from-green-400 to-green-600", icon: <CheckCircle2 className="w-5 h-5"/> },
    ajuste: { text: "ajustar", color: "from-orange-400 to-orange-600", icon: <CornerUpLeft className="w-5 h-5"/> },
    rechazar: { text: "rechazar", color: "from-red-400 to-red-600", icon: <XCircle className="w-5 h-5"/> },
    devolucion: { text: "devolver", color: "from-yellow-400 to-yellow-600", icon: <RotateCw className="w-5 h-5"/> }
  };

  const { text, color, icon } = accionMap[accion] || accionMap["aprobar"];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0">
        {/* ¡Este div envuelve todo! */}
        <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
          <DialogHeader className="p-4 border-b border-gray-100">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                {icon}
              </motion.div>
              Confirmar acción
            </DialogTitle>
          </DialogHeader>

          <motion.div
            className="p-4 text-gray-700"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <p className="text-sm">
              ¿Estás seguro de que deseas <strong>{text}</strong>
              {liquidacion ? ` la liquidación #${liquidacion.id}` : " esta liquidación"}?
            </p>
          </motion.div>

          <DialogFooter className="p-4 flex justify-end gap-2 border-t border-gray-100">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
              <Button
                className={`bg-gradient-to-r ${color} text-white hover:brightness-110 transition-all flex items-center gap-1`}
                onClick={onConfirm}
              >
                <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}>
                  {text.charAt(0).toUpperCase() + text.slice(1)}
                </motion.span>
              </Button>
            </motion.div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
