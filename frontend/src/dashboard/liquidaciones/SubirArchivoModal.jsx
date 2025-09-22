// src/dashboard/liquidaciones/SubirArchivoModal.jsx
import React, { useState, useEffect } from "react";
import { procesarDocumentoOCR } from "@/services/documentoService";
import { Camera, FileUp, X, CheckCircle, Paperclip, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function SubirArchivoModal({ idSolicitud, tipoSolicitud, open, onClose, onProcesado }) {
  const [archivo, setArchivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [errorOCR, setErrorOCR] = useState(null);
  const [totalManual, setTotalManual] = useState("");

  // Detectar móvil
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
  }, []);

  const handleArchivoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tamaño máximo 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert("⚠️ El archivo supera el límite de 10 MB. Por favor selecciona uno más liviano.");
      return;
    }

    // Normalizar tipo de archivo
    let mimeType = file.type;
    if (mimeType === "image/heic" || mimeType === "image/heif") mimeType = "image/jpeg";

    const validTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!validTypes.includes(mimeType)) {
      alert("⚠️ Solo se permiten imágenes JPG/PNG o archivos PDF.");
      return;
    }

    setArchivo(file);
    setErrorOCR(null);
    setTotalManual("");

    // Generar preview en móviles
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

      let total = datos.total?.toString().replace(",", ".") || totalManual;
      if (total) {
        total = parseFloat(total);
        if (isNaN(total)) total = null;
      }

      const doc = {
        nombre_archivo: archivo.name,
        tipo_documento: datos.tipo_documento || "Otros",
        numero_documento: datos.numero_documento || "",
        fecha: datos.fecha || "",
        ruc: datos.ruc || "",
        razon_social: datos.razon_social || "",
        total: total || "",
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

  // Botones dependiendo de dispositivo
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
      <DialogContent className="w-[95vw] sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileUp className="w-5 h-5 text-gray-700" />
            Subir Documento - Solicitud # {idSolicitud}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Botones de carga */}
          <div className="flex flex-col sm:flex-row gap-2">
            {botones.map((btn, idx) => {
              let inputRef = React.createRef();

              return (
                <div key={idx} className="flex-1">
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
                    className="flex items-center gap-2 justify-center w-full sm:w-auto"
                    onClick={() => inputRef.current && inputRef.current.click()} // Dispara el input
                  >
                    {btn.icon} {btn.label}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Archivo seleccionado */}
          {archivo && (
            <div className="mt-2 space-y-2 text-center">
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1 break-words">
                <Paperclip className="w-4 h-4" /> {archivo.name}
              </p>
              {preview && <img src={preview} alt="Preview" className="max-h-40 w-auto mx-auto rounded-md border" />}
            </div>
          )}

          {/* Campo total manual */}
          {!errorOCR && archivo && (
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700">
                Total (si OCR no lo detecta)
              </label>
              <input
                type="number"
                step="0.01"
                value={totalManual}
                onChange={(e) => setTotalManual(e.target.value)}
                className="mt-1 p-2 w-full border rounded-md focus:ring focus:ring-blue-200 text-sm"
                placeholder="Ej. 150.75"
              />
            </div>
          )}

          {/* Mensaje de error */}
          {errorOCR && (
            <p className="text-sm text-red-600 bg-red-100 rounded p-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {errorOCR}
            </p>
          )}
        </div>

        {/* Botones */}
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Button
            variant="default"
            fromColor="#f87171"
            toColor="#ef4444"
            hoverFrom="#ef4444"
            hoverTo="#dc2626"
            className="flex items-center gap-2 justify-center w-full sm:w-auto"
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
            className="flex items-center gap-2 justify-center w-full sm:w-auto"
            onClick={handleProcesar}
            disabled={cargando}
          >
            {cargando ? "Procesando..." : <><CheckCircle className="w-4 h-4" /> Procesar</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
