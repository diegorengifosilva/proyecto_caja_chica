// src/dashboard/liquidaciones/SubirArchivoModal.jsx
import React, { useState, useEffect } from "react";
import { procesarDocumentoOCR } from "@/services/documentoService";
import { Camera, FileUp, X, CheckCircle, Paperclip, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function SubirArchivoModal({
  idSolicitud,
  tipoSolicitud,
  open,
  onClose,
  onProcesado,
}) {
  const [tipoDocumento, setTipoDocumento] = useState("Boleta");
  const [archivo, setArchivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [errorOCR, setErrorOCR] = useState(null);
  const [totalManual, setTotalManual] = useState("");

  // Detectar si es móvil o tablet
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    setIsMobile(checkMobile);
  }, []);

  const handleArchivoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tamaño máximo de 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert("⚠️ El archivo supera el límite de 10 MB. Por favor selecciona uno más liviano.");
        return;
      }

      // Normalizar tipo de archivo (iOS usa HEIC/HEIF)
      let mimeType = file.type;
      if (mimeType === "image/heic" || mimeType === "image/heif") {
        mimeType = "image/jpeg";
      }

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
    }
  };

  const handleProcesar = async () => {
    if (!archivo) {
      alert("⚠️ Selecciona un archivo antes de procesar.");
      return;
    }

    const formData = new FormData();
    formData.append("archivo", archivo, archivo.name);
    formData.append("tipo_documento", tipoDocumento);
    formData.append("id_solicitud", idSolicitud);

    try {
      setCargando(true);
      setErrorOCR(null);

      const ocrResponse = await procesarDocumentoOCR(formData);
      console.log("📦 OCR recibido:", ocrResponse);

      // Ahora el objeto ya está directamente en ocrResponse[0]
      const datos = Array.isArray(ocrResponse) && ocrResponse.length ? ocrResponse[0] : {};

      let total = datos.total?.toString().replace(",", ".") || totalManual;
      if (total) {
        total = parseFloat(total);
        if (isNaN(total)) total = null;
      }

      const doc = {
        nombre_archivo: archivo.name,
        tipo_documento: tipoDocumento,
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
          {/* Tipo de documento */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tipo de Documento
            </label>
            <select
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value)}
              className="mt-1 p-2 w-full border rounded-md focus:ring focus:ring-blue-200 text-sm"
            >
              <option value="">--Seleccionar--</option>
              <option value="Boleta">Boleta</option>
              <option value="Factura">Factura</option>
              <option value="Honorarios">Honorarios</option>
              <option value="Otros">Otros</option>
            </select>
          </div>

          {/* Botones de carga */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Botón Cámara */}
            <label className="flex-1 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleArchivoChange}
                style={{ display: "none" }}
              />
              <span className="bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white text-sm px-4 py-2 rounded-lg shadow-md flex items-center gap-2 justify-center w-full sm:w-auto">
                <Camera className="w-4 h-4" /> Cámara
              </span>
            </label>

            {/* Botón Archivo */}
            <label className="flex-1 cursor-pointer">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleArchivoChange}
                style={{ display: "none" }}
              />
              <span className="bg-gradient-to-r from-amber-200 to-amber-300 hover:from-amber-300 hover:to-amber-400 text-white text-sm px-4 py-2 rounded-lg shadow-md flex items-center gap-2 justify-center w-full sm:w-auto">
                <FileUp className="w-4 h-4" /> Archivo
              </span>
            </label>
          </div>

          {/* Archivo seleccionado */}
          {archivo && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-gray-600 flex items-center gap-1 truncate">
                <Paperclip className="w-4 h-4" /> {archivo.name}
              </p>
              {preview && (
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-40 rounded-md border mx-auto"
                />
              )}
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

          {errorOCR && (
            <p className="text-sm text-red-600 bg-red-100 rounded p-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {errorOCR}
            </p>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2 justify-center w-full sm:w-auto"
          >
            <X className="w-4 h-4" /> Cerrar
          </Button>
          <Button
            onClick={handleProcesar}
            disabled={cargando}
            className="bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2 justify-center w-full sm:w-auto"
          >
            {cargando ? (
              "Procesando..."
            ) : (
              <>
                <CheckCircle className="w-4 h-4" /> Procesar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
