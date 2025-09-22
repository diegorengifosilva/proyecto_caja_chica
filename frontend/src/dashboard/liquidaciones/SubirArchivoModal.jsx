// src/dashboard/liquidaciones/SubirArchivoModal.jsx
import React, { useState, useEffect, useRef } from "react";
import { procesarDocumentoOCR } from "@/services/documentoService";
import { Camera, FileUp, X, CheckCircle, Paperclip, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function SubirArchivoModal({ idSolicitud, tipoSolicitud, open, onClose, onProcesado }) {
  const [archivo, setArchivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [errorOCR, setErrorOCR] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const fileInputRef = useRef(null);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (open) setIsVisible(true);
    else {
      const timeout = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  const handleArchivoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("⚠️ El archivo supera el límite de 10 MB. Por favor selecciona uno más liviano.");
      return;
    }

    let mimeType = file.type;
    if (mimeType === "image/heic" || mimeType === "image/heif") mimeType = "image/jpeg";

    const validTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!validTypes.includes(mimeType)) {
      alert("⚠️ Solo se permiten imágenes JPG/PNG o archivos PDF.");
      return;
    }

    setArchivo(file);
    setErrorOCR(null);

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleProcesar = async () => {
    if (!archivo) {
      alert("⚠️ Selecciona un archivo antes de procesar.");
      return;
    }

    const formData = new FormData();
    formData.append("archivo", archivo, archivo.name);
    formData.append("id_solicitud", idSolicitud);

    try {
      setCargando(true);
      setErrorOCR(null);

      const ocrResponse = await procesarDocumentoOCR(formData);
      const datos = Array.isArray(ocrResponse) && ocrResponse.length ? ocrResponse[0] : {};

      const doc = {
        nombre_archivo: archivo.name,
        tipo_documento: datos.tipo_documento || "Otros",
        numero_documento: datos.numero_documento || "",
        fecha: datos.fecha || "",
        ruc: datos.ruc || "",
        razon_social: datos.razon_social || "",
        total: datos.total || "",
        archivo,
      };

      if (!doc.total) {
        alert("⚠️ Ingresa un total válido.");
        setCargando(false);
        return;
      }

      onProcesado(doc);
      onClose();
    } catch (error) {
      console.error("❌ Error procesando OCR:", error);
      setErrorOCR("No se pudo procesar el documento. Intenta nuevamente.");
    } finally {
      setCargando(false);
    }
  };

  const botones = isMobile
    ? [
        { label: "Cámara", icon: <Camera className="w-4 h-4" />, accept: "image/*", capture: "environment", fromColor: "#60a5fa", toColor: "#3b82f6", hoverFrom: "#3b82f6", hoverTo: "#2563eb" },
        { label: "Archivo", icon: <FileUp className="w-4 h-4" />, accept: "image/*,application/pdf", fromColor: "#fcd34d", toColor: "#fbbf24", hoverFrom: "#fbbf24", hoverTo: "#f59e0b" },
      ]
    : [
        { label: "Imagen", icon: <Camera className="w-4 h-4" />, accept: "image/*", fromColor: "#60a5fa", toColor: "#3b82f6", hoverFrom: "#3b82f6", hoverTo: "#2563eb" },
        { label: "Archivo", icon: <FileUp className="w-4 h-4" />, accept: "image/*,application/pdf", fromColor: "#fcd34d", toColor: "#fbbf24", hoverFrom: "#fbbf24", hoverTo: "#f59e0b" },
      ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* Backdrop con fade-in */}
      {isVisible && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />
      )}

      {isVisible && (
        <DialogContent
          className={`fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-full sm:max-w-md md:max-w-lg lg:max-w-xl 2xl:max-w-[1024px] max-h-[90vh] overflow-y-auto p-4 sm:p-6 mx-auto bg-white rounded-xl shadow-xl transition-all duration-300 ease-in-out
          ${open ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
              <FileUp className="w-5 h-5 text-gray-700" />
              Subir Documento - Solicitud # {idSolicitud}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Área Drag & Drop */}
            <div
              className="border-2 border-dashed border-gray-300 rounded-md p-4 sm:p-6 text-center cursor-pointer hover:border-blue-400 transition duration-200 relative flex flex-col items-center justify-center bg-gray-50 shadow-sm hover:shadow-md"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0])
                  handleArchivoChange({ target: { files: e.dataTransfer.files } });
              }}
            >
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={handleArchivoChange} />
              {archivo ? (
                <div className="flex flex-col items-center gap-2">
                  {preview ? (
                    <img src={preview} alt="Preview" className="max-h-44 w-auto rounded-md border shadow-sm object-contain transition-all duration-300" />
                  ) : (
                    <Paperclip className="w-8 h-8 text-gray-500" />
                  )}
                  <p className="text-sm text-gray-600 truncate">{archivo.name}</p>
                </div>
              ) : (
                <>
                  <FileUp className="w-10 h-10 mx-auto text-gray-400 transition-transform duration-200 hover:scale-110" />
                  <p className="text-sm sm:text-base text-gray-500 mt-2">Arrastra un archivo aquí o haz clic para seleccionar</p>
                </>
              )}
            </div>

            {/* Botones de carga */}
            {botones.length > 0 && (
              <div className="w-full flex justify-center mt-3">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 w-full max-w-5xl">
                  {botones.map((btn, idx) => {
                    const inputRef = React.createRef();
                    return (
                      <div key={idx} className="flex justify-center">
                        <input
                          ref={inputRef}
                          type="file"
                          accept={btn.accept}
                          capture={btn.capture}
                          onChange={handleArchivoChange}
                          style={{ display: "none" }}
                        />
                        <Button
                          fromColor={btn.fromColor}
                          toColor={btn.toColor}
                          hoverFrom={btn.hoverFrom}
                          hoverTo={btn.hoverTo}
                          className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 w-full sm:w-full min-w-[150px] max-w-[320px] px-6 py-3 text-sm sm:text-base truncate transition-all duration-300 ease-in-out hover:scale-[1.03] shadow-sm hover:shadow-md"
                          onClick={() => inputRef.current && inputRef.current.click()}
                        >
                          {btn.icon} <span className="truncate">{btn.label}</span>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Barra de progreso */}
            {cargando && (
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mt-2">
                <div className="bg-blue-500 h-2 rounded-full animate-progress transition-all duration-300" style={{ width: "70%" }} />
              </div>
            )}

            {/* Mensaje de error */}
            {errorOCR && (
              <p className="text-sm text-red-600 bg-red-100 rounded p-2 flex items-center gap-2 shadow-sm">
                <AlertCircle className="w-4 h-4" /> {errorOCR}
              </p>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-4">
            <Button
              variant="default"
              fromColor="#f87171"
              toColor="#ef4444"
              hoverFrom="#ef4444"
              hoverTo="#dc2626"
              className="flex items-center gap-2 justify-center w-full sm:w-auto shadow-sm hover:shadow-md transition-all duration-200"
              onClick={onClose}
            >
              <X className="w-4 h-4" /> Cerrar
            </Button>

            <Button
              variant="default"
              fromColor="#34d399"
              toColor="#10b981"
              hoverFrom="#10b981"
              hoverTo="#059669"
              className="flex items-center gap-2 justify-center w-full sm:w-auto shadow-sm hover:shadow-md transition-all duration-200"
              onClick={handleProcesar}
              disabled={cargando}
            >
              {cargando ? "Procesando..." : <><CheckCircle className="w-4 h-4" /> Procesar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
