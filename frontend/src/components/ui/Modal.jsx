import { X } from "lucide-react";

export default function Modal({ open, onClose, children, title }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6 relative animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        {/* Título */}
        {title && <h2 className="text-lg font-semibold mb-4">{title}</h2>}

        {/* Contenido */}
        <div>{children}</div>
      </div>
    </div>
  );
}
