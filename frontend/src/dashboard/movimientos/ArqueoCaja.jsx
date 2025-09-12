// src/dashboard/Movimientos/ArqueoCaja.jsx

import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Select from "react-select";
import { useDropzone } from "react-dropzone";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/buttons/button";
import { Input } from "@/components/ui/inputs/Input";
import { Label } from "@/components/ui/inputs/label";
import { Card, CardContent } from "@/components/ui/card";

import { Plus, Loader2, Search, Download, XCircle } from "lucide-react";

const API_URL = "/api/boleta/arqueos/";
const API_CAJA_ESTADO = "/api/estado_caja/";
const API_CAJA_ABRIR = "/api/arqueocaja/abrir-caja/";
const API_CAJA_CERRAR = "/api/arqueocaja/cerrar-caja/";
const API_SOLICITUDES = "/api/solicitudes/pendientes";

const schema = yup.object({
  fecha: yup.date().required("Fecha es obligatoria"),
  hora: yup.string().required("Hora es obligatoria"),
  saldoInicial: yup.number().min(0, "No puede ser negativo").required("Saldo inicial obligatorio"),
  entradas: yup.number().min(0, "No puede ser negativo").nullable(),
  salidas: yup.number().min(0, "No puede ser negativo").nullable(),
  numeroOperacion: yup.string().required("Número de operación obligatorio"),
  observaciones: yup.string(),
  solicitudes: yup.array().min(1, "Seleccione al menos una solicitud"),
}).required();

export default function ArqueoCaja() {
  const [estadoCaja, setEstadoCaja] = useState(null);
  const [cajaLoading, setCajaLoading] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const [totalCount, setTotalCount] = useState(0);

  const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      fecha: new Date().toISOString().slice(0, 10),
      hora: new Date().toLocaleTimeString([], { hour12: false }),
      saldoInicial: "",
      entradas: "",
      salidas: "",
      numeroOperacion: "",
      observaciones: "",
      solicitudes: [],
    },
  });

  // Saldo final calculado en tiempo real
  const entradasVal = watch("entradas") || 0;
  const salidasVal = watch("salidas") || 0;
  const saldoInicialVal = watch("saldoInicial") || 0;
  const saldoFinal = useMemo(() => Number(saldoInicialVal) + Number(entradasVal) - Number(salidasVal), [
    saldoInicialVal,
    entradasVal,
    salidasVal,
  ]);

  // Dropzone para múltiples comprobantes
  const { getRootProps, getInputProps } = useDropzone({
    accept: { "image/*": [], "application/pdf": [] },
    onDrop: acceptedFiles => setArchivos(prev => [...prev, ...acceptedFiles]),
  });

  // Fetch estado de caja
  const fetchEstadoCaja = async () => {
    setCajaLoading(true);
    try {
      const res = await fetch(API_CAJA_ESTADO);
      if (!res.ok) throw new Error("Error obteniendo estado de caja");
      const data = await res.json();
      setEstadoCaja(data.estado);
    } catch {
      setEstadoCaja("cerrada");
    } finally {
      setCajaLoading(false);
    }
  };

  // Fetch historial arqueos con paginación y búsqueda
  const fetchArqueos = async (pageNum = 1, searchTerm = "") => {
    setLoading(true);
    try {
      const url = new URL(API_URL, window.location.origin);
      url.searchParams.append("page", pageNum);
      if (searchTerm) url.searchParams.append("search", searchTerm);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Error obteniendo arqueos");
      const data = await res.json();
      setHistorial(data.results);
      setTotalCount(data.count);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch solicitudes pendientes o en proceso
  const fetchSolicitudesPendientes = async () => {
    try {
      const res = await fetch(API_SOLICITUDES);
      if (!res.ok) throw new Error("Error obteniendo solicitudes");
      const data = await res.json();
      setSolicitudesPendientes(data.filter(s => ["pendiente", "en proceso"].includes(s.estado.toLowerCase())));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEstadoCaja();
    fetchSolicitudesPendientes();
  }, []);

  useEffect(() => {
    fetchArqueos(page, search);
  }, [page, search]);

  // Abrir caja
  const abrirCaja = async () => {
    setCajaLoading(true);
    try {
      const res = await fetch(API_CAJA_ABRIR, { method: "POST" });
      if (!res.ok) throw new Error("Error al abrir caja");
      await fetchEstadoCaja();
      alert("Caja abierta correctamente");
    } catch (err) {
      alert(err.message);
    } finally {
      setCajaLoading(false);
    }
  };

  // Cerrar caja
  const cerrarCaja = async () => {
    setCajaLoading(true);
    try {
      const res = await fetch(API_CAJA_CERRAR, { method: "POST" });
      if (!res.ok) throw new Error("Error al cerrar caja");
      await fetchEstadoCaja();
      alert("Caja cerrada correctamente");
    } catch (err) {
      alert(err.message);
    } finally {
      setCajaLoading(false);
    }
  };

  // Submit arqueo
  const onSubmit = async (data) => {
    if (estadoCaja !== "abierta") {
      alert("No puede crear arqueos porque la caja está cerrada.");
      return;
    }
    const fd = new FormData();
    fd.append("fecha", data.fecha);
    fd.append("hora", data.hora);
    fd.append("saldoInicial", data.saldoInicial);
    fd.append("entradas", data.entradas || 0);
    fd.append("salidas", data.salidas || 0);
    fd.append("numeroOperacion", data.numeroOperacion);
    fd.append("observaciones", data.observaciones || "");
    data.solicitudes.forEach((sol, i) => fd.append(`solicitudes[${i}]`, sol.id));
    archivos.forEach((file, i) => fd.append(`comprobantes[${i}]`, file));
    try {
      const res = await fetch(API_URL, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
      const nuevo = await res.json();
      // Refrescar la página 1 para ver el nuevo arqueo
      fetchArqueos(1, search);
      setShowModal(false);
      reset();
      setArchivos([]);
      setPage(1);
      alert("Arqueo guardado con éxito");
    } catch (err) {
      alert("Error guardando arqueo: " + err.message);
    }
  };

  // Columnas tabla movimientos
  const columns = useMemo(() => [
    { accessorKey: "fecha", header: "Fecha" },
    { accessorKey: "numeroOperacion", header: "N° Operación" },
    {
      accessorKey: "tipoMovimiento",
      header: "Tipo",
      cell: info => (info.getValue() === "entrada" ? "Entrada" : "Salida"),
    },
    {
      accessorKey: "origen",
      header: "Origen",
      cell: info => (info.getValue() === "solicitud" ? "Automático" : "Manual"),
    },
    {
      accessorKey: "monto",
      header: "Monto",
      cell: info => formatCurrency(info.getValue()),
    },
    { accessorKey: "observaciones", header: "Observaciones" },
  ], []);

  // Formateo moneda
  function formatCurrency(value) {
    if (value == null) return "-";
    return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Exportar Excel - exporta SOLO la página actual (para todo se requeriría endpoint extra)
  const exportarExcel = () => {
    const hoja = XLSX.utils.json_to_sheet(historial);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Arqueos");
    XLSX.writeFile(libro, "arqueos_pagina_" + page + ".xlsx");
  };

  // Exportar PDF - exporta SOLO la página actual
  const exportarPDF = () => {
    const jsPDFDoc = new jsPDF();
    const headers = columns.map(c => c.header);
    const data = historial.map(row =>
      columns.map(col => {
        const val = row[col.accessorKey];
        return typeof val === "number" ? formatCurrency(val) : val ?? "";
      })
    );
    autoTable(jsPDFDoc, {
      head: [headers],
      body: data,
      styles: { fontSize: 8 },
      margin: { top: 20 },
    });
    jsPDFDoc.save("arqueos_pagina_" + page + ".pdf");
  };

  // Disable editing monto si viene de solicitud (en selector múltiple)
  const isSolicitud = (sol) => sol?.origen === "solicitud";

  return (
    <div className="min-h-screen w-full p-6 bg-white">
      {/* Header con estado y acciones */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">📦 Arqueo de Caja</h2>

        <div className="flex items-center gap-4">
          <span>
            Estado de la caja:{" "}
            <strong className={estadoCaja === "abierta" ? "text-green-600" : "text-red-600"}>
              {estadoCaja?.toUpperCase() ?? "Cargando..."}
            </strong>
          </span>

          {cajaLoading ? (
            <Button disabled><Loader2 className="animate-spin" size={16} /></Button>
          ) : estadoCaja === "abierta" ? (
            <Button variant="destructive" onClick={cerrarCaja}>Cerrar Caja</Button>
          ) : (
            <Button variant="primary" onClick={abrirCaja}>Abrir Caja</Button>
          )}

          <Button
            variant="destructive"
            onClick={() => {
              if (estadoCaja !== "abierta") {
                alert("Debe abrir la caja para crear arqueos");
                return;
              }
              setShowModal(true);
              reset({
                fecha: new Date().toISOString().slice(0, 10),
                hora: new Date().toLocaleTimeString([], { hour12: false }),
                saldoInicial: "",
                entradas: "",
                salidas: "",
                numeroOperacion: "",
                observaciones: "",
                solicitudes: [],
              });
              setArchivos([]);
            }}
          >
            <Plus size={16} /> Nuevo arqueo
          </Button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Saldo Inicial</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(historial.reduce((a, b) => a + (Number(b.saldoInicial) || 0), 0))}
              </p>
            </div>
            <div className="text-2xl opacity-60">💵</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex justify-between items-center">
            <div>
              <p className="text-sm text-green-600">Entradas</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(historial.reduce((a, b) => a + (Number(b.entradas) || 0), 0))}
              </p>
            </div>
            <div className="text-2xl opacity-60">⬆️</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex justify-between items-center">
            <div>
              <p className="text-sm text-red-600">Salidas</p>
              <p className="text-lg font-bold text-red-600">
                {formatCurrency(historial.reduce((a, b) => a + (Number(b.salidas) || 0), 0))}
              </p>
            </div>
            <div className="text-2xl opacity-60">⬇️</div>
          </CardContent>
        </Card>
      </div>

      {/* Buscador y exportación */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Input
            placeholder="Buscar por número operación o fecha"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full md:w-80"
          />
          <Button variant="ghost" onClick={() => { setSearch(""); setPage(1); }}>
            <XCircle size={16} /> Limpiar
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={exportarExcel}><Download size={16} /> Excel</Button>
          <Button variant="outline" onClick={exportarPDF}><Download size={16} /> PDF</Button>
        </div>
      </div>

      {/* Tabla movimientos */}
      <div className="overflow-auto rounded border border-gray-300">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-100">
            <tr>
              {columns.map(col => (
                <th key={col.accessorKey} className="p-2 text-left">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="text-center p-4"><Loader2 className="animate-spin mx-auto" size={24} /></td></tr>
            ) : historial.length === 0 ? (
              <tr><td colSpan={columns.length} className="text-center p-4">No hay registros</td></tr>
            ) : (
              historial.map((row, idx) => (
                <tr
                  key={idx}
                  className={row.tipoMovimiento === "entrada" ? "bg-green-50" : "bg-red-50"}
                >
                  {columns.map(col => (
                    <td key={col.accessorKey} className="p-2">
                      {col.cell ? col.cell({ getValue: () => row[col.accessorKey] }) : row[col.accessorKey]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex justify-between items-center mt-4">
        <Button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}>
          Anterior
        </Button>
        <span>Página {page} de {Math.ceil(totalCount / itemsPerPage)}</span>
        <Button
          onClick={() => setPage(p => Math.min(p + 1, Math.ceil(totalCount / itemsPerPage)))}
          disabled={page === Math.ceil(totalCount / itemsPerPage)}
        >
          Siguiente
        </Button>
      </div>

      {/* Modal nuevo arqueo */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded p-6 max-w-xl w-full max-h-[90vh] overflow-auto">
            <h3 className="text-xl font-bold mb-4">Nuevo Arqueo de Caja</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="fecha">Fecha</Label>
                <Input type="date" {...register("fecha")} id="fecha" disabled={cajaLoading} />
                {errors.fecha && <p className="text-red-600">{errors.fecha.message}</p>}
              </div>

              <div>
                <Label htmlFor="hora">Hora</Label>
                <Input type="time" {...register("hora")} id="hora" disabled={cajaLoading} />
                {errors.hora && <p className="text-red-600">{errors.hora.message}</p>}
              </div>

              <div>
                <Label htmlFor="saldoInicial">Saldo Inicial</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register("saldoInicial")}
                  id="saldoInicial"
                  disabled={cajaLoading}
                />
                {errors.saldoInicial && <p className="text-red-600">{errors.saldoInicial.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="entradas">Entradas</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register("entradas")}
                    id="entradas"
                    disabled={cajaLoading}
                  />
                  {errors.entradas && <p className="text-red-600">{errors.entradas.message}</p>}
                </div>

                <div>
                  <Label htmlFor="salidas">Salidas</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register("salidas")}
                    id="salidas"
                    disabled={cajaLoading}
                  />
                  {errors.salidas && <p className="text-red-600">{errors.salidas.message}</p>}
                </div>
              </div>

              <div>
                <Label>Saldo Final</Label>
                <Input type="text" value={saldoFinal.toFixed(2)} disabled readOnly />
              </div>

              <div>
                <Label htmlFor="numeroOperacion">Número de Operación</Label>
                <Input
                  {...register("numeroOperacion")}
                  id="numeroOperacion"
                  disabled={cajaLoading}
                />
                {errors.numeroOperacion && <p className="text-red-600">{errors.numeroOperacion.message}</p>}
              </div>

              <div>
                <Label htmlFor="observaciones">Observaciones</Label>
                <textarea
                  {...register("observaciones")}
                  id="observaciones"
                  className="w-full border rounded p-2"
                  rows={3}
                  disabled={cajaLoading}
                />
              </div>

              <div>
                <Label>Solicitudes pendientes</Label>
                <Controller
                  control={control}
                  name="solicitudes"
                  render={({ field }) => (
                    <Select
                      {...field}
                      options={solicitudesPendientes}
                      getOptionLabel={e => `#${e.id} - ${e.descripcion}`}
                      getOptionValue={e => e.id}
                      isMulti
                      isDisabled={cajaLoading}
                      className="basic-multi-select"
                      classNamePrefix="select"
                      placeholder="Seleccione solicitudes"
                    />
                  )}
                />
                {errors.solicitudes && <p className="text-red-600">{errors.solicitudes.message}</p>}
              </div>

              <div>
                <Label>Comprobantes (imágenes o PDFs)</Label>
                <div
                  {...getRootProps()}
                  className="border border-dashed border-gray-400 p-4 rounded cursor-pointer text-center"
                >
                  <input {...getInputProps()} />
                  <p>Arrastre o seleccione archivos aquí</p>
                </div>
                <ul className="mt-2">
                  {archivos.map((file, idx) => (
                    <li key={idx} className="flex justify-between items-center">
                      {file.name}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setArchivos(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <XCircle size={16} />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={() => setShowModal(false)} disabled={isSubmitting}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
