'use client';

import React, { useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import * as XLSX from 'xlsx';
import AdminNav from '../../../components/AdminNav';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Producto {
  id: number;
  nombre: string;
  marca: string;
  categoria: string;
  unidad_medida: string;
  precio_lista_1: number;
  precio_lista_2: number;
  precio_lista_3: number;
  stock_disponible: boolean;
}

interface ResultadoActualizacion {
  id: number;
  nombre: string;
  ok: boolean;
  error?: string;
}

export default function PreciosPage() {
  const [paso, setPaso] = useState<'idle' | 'descargando' | 'subiendo' | 'previsualizando' | 'aplicando' | 'resultado'>('idle');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [previsualizacion, setPrevisualizacion] = useState<Producto[]>([]);
  const [resultados, setResultados] = useState<ResultadoActualizacion[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ─── 1. Descargar Excel base ───────────────────────────────────────────────
  const descargarExcelBase = useCallback(async () => {
    setPaso('descargando');
    setError(null);

    try {
      const { data, error: sbError } = await supabase
        .from('productos')
        .select('id, nombre, marca, categoria, unidad_medida, precio_lista_1, precio_lista_2, precio_lista_3, stock_disponible')
        .order('categoria')
        .order('nombre');

      if (sbError) throw sbError;
      if (!data || data.length === 0) throw new Error('No hay productos en la base de datos.');

      // Armar filas del Excel
      const filas = data.map((p) => ({
        'ID (no modificar)': p.id,
        'Nombre': p.nombre,
        'Marca': p.marca,
        'Categoría': p.categoria,
        'Unidad': p.unidad_medida,
        'Lista 1 (mayorista)': p.precio_lista_1,
        'Lista 2 (intermedia)': p.precio_lista_2,
        'Lista 3 (minorista)': p.precio_lista_3,
        'Stock': p.stock_disponible ? 'SI' : 'NO',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(filas);

      // Anchos de columna
      ws['!cols'] = [
        { wch: 16 }, // ID
        { wch: 35 }, // Nombre
        { wch: 18 }, // Marca
        { wch: 18 }, // Categoría
        { wch: 10 }, // Unidad
        { wch: 18 }, // Lista 1
        { wch: 18 }, // Lista 2
        { wch: 18 }, // Lista 3
        { wch: 8  }, // Stock
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Precios');

      // Nombre del archivo con fecha de hoy
      const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      XLSX.writeFile(wb, `precios_marini_${hoy}.xlsx`);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al descargar');
    } finally {
      setPaso('idle');
    }
  }, []);

  // ─── 2. Leer Excel subido y previsualizar ─────────────────────────────────
  const leerArchivo = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivoSeleccionado(file);
    setPaso('subiendo');
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        if (filas.length === 0) throw new Error('El archivo está vacío.');

        // Validar que tenga las columnas requeridas
        const primeraFila = filas[0];
        const columnasRequeridas = ['ID (no modificar)', 'Lista 1 (mayorista)', 'Lista 2 (intermedia)', 'Lista 3 (minorista)'];
        for (const col of columnasRequeridas) {
          if (!(col in primeraFila)) {
            throw new Error(`Falta la columna "${col}". Usá el archivo base descargado desde esta página.`);
          }
        }

        // Mapear a productos
        const productos: Producto[] = filas.map((fila) => ({
          id: Number(fila['ID (no modificar)']),
          nombre: String(fila['Nombre'] ?? ''),
          marca: String(fila['Marca'] ?? ''),
          categoria: String(fila['Categoría'] ?? ''),
          unidad_medida: String(fila['Unidad'] ?? ''),
          precio_lista_1: Number(fila['Lista 1 (mayorista)']),
          precio_lista_2: Number(fila['Lista 2 (intermedia)']),
          precio_lista_3: Number(fila['Lista 3 (minorista)']),
          stock_disponible: String(fila['Stock']).toUpperCase() === 'SI',
        }));

        // Validar que no haya IDs vacíos o precios inválidos
        const invalidos = productos.filter(
          (p) => !p.id || isNaN(p.precio_lista_1) || isNaN(p.precio_lista_2) || isNaN(p.precio_lista_3)
        );
        if (invalidos.length > 0) {
          throw new Error(`${invalidos.length} fila(s) tienen ID o precios inválidos. Revisá el archivo.`);
        }

        setPrevisualizacion(productos);
        setPaso('previsualizando');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al leer el archivo');
        setPaso('idle');
        setArchivoSeleccionado(null);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // ─── 3. Aplicar precios a Supabase ────────────────────────────────────────
  const aplicarPrecios = useCallback(async () => {
    setPaso('aplicando');
    setError(null);

    const resultadosTemp: ResultadoActualizacion[] = [];

    for (const producto of previsualizacion) {
      const { error: sbError } = await supabase
        .from('productos')
        .update({
          precio_lista_1: producto.precio_lista_1,
          precio_lista_2: producto.precio_lista_2,
          precio_lista_3: producto.precio_lista_3,
        })
        .eq('id', producto.id);

      resultadosTemp.push({
        id: producto.id,
        nombre: producto.nombre,
        ok: !sbError,
        error: sbError?.message,
      });
    }

    setResultados(resultadosTemp);
    setPaso('resultado');
  }, [previsualizacion]);

  // ─── Reset ─────────────────────────────────────────────────────────────────
  const reiniciar = () => {
    setPaso('idle');
    setArchivoSeleccionado(null);
    setPrevisualizacion([]);
    setResultados([]);
    setError(null);
  };

  const exitosos = resultados.filter((r) => r.ok).length;
  const fallidos = resultados.filter((r) => !r.ok);

  return (
    <div className="min-h-screen bg-brand-light md:pl-56">
      <AdminNav />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-black tracking-tight text-brand-dark">Actualización de Precios</h1>
          <p className="text-sm text-brand-dark/50 mt-0.5">
            Descargá la lista base, modificá los precios en Excel y volvé a subir el archivo.
          </p>
        </div>

        {/* Error global */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* ── PASO 1: Descargar base ─────────────────────────────────────── */}
        <div className="bg-white border border-brand-dark/10 rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <span className="bg-brand-blue text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0">1</span>
            <div>
              <p className="font-black text-brand-dark text-sm">Descargar lista base</p>
              <p className="text-xs text-brand-dark/50">
                Excel con todos los productos y precios actuales.
              </p>
            </div>
          </div>
          <button
            onClick={descargarExcelBase}
            disabled={paso === 'descargando'}
            className="flex items-center gap-2 bg-brand-dark text-white text-xs font-bold px-5 py-3 rounded-xl hover:bg-brand-blue transition disabled:opacity-50"
          >
            {paso === 'descargando'
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generando...</>
              : <>📥 Descargar Excel base</>
            }
          </button>
        </div>

        {/* ── PASO 2: Subir archivo modificado ──────────────────────────── */}
        {(paso === 'idle' || paso === 'subiendo') && (
          <div className="bg-white border border-brand-dark/10 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <span className="bg-brand-dark/20 text-brand-dark w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0">2</span>
              <div>
                <p className="font-black text-brand-dark text-sm">Subir Excel con precios actualizados</p>
              </div>
            </div>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-brand-dark/20 rounded-xl p-8 cursor-pointer hover:border-brand-blue hover:bg-brand-blue/5 transition text-center">
              <span className="text-3xl mb-2">📤</span>
              <span className="text-sm font-bold text-brand-dark">
                {archivoSeleccionado ? archivoSeleccionado.name : 'Hacé clic para seleccionar el archivo'}
              </span>
              <span className="text-xs text-brand-dark/40 mt-1">Solo archivos .xlsx</span>
              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={leerArchivo}
              />
            </label>
          </div>
        )}

        {/* ── PASO 3: Previsualización ───────────────────────────────────── */}
        {paso === 'previsualizando' && (
          <div className="bg-white border border-brand-dark/10 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <span className="bg-brand-blue text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0">3</span>
              <div>
                <p className="font-black text-brand-dark text-sm">Previsualización — {previsualizacion.length} productos</p>
                <p className="text-xs text-brand-dark/50">
                  Revisá los precios antes de confirmar. Esta acción actualizará la base de datos.
                </p>
              </div>
            </div>

            {/* Tabla previsualización */}
            <div className="overflow-x-auto rounded-xl border border-brand-dark/10">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-brand-light text-brand-dark/40 uppercase tracking-wider">
                    <th className="text-left px-4 py-2 font-bold">ID</th>
                    <th className="text-left px-4 py-2 font-bold">Nombre</th>
                    <th className="text-right px-4 py-2 font-bold">Lista 1</th>
                    <th className="text-right px-4 py-2 font-bold">Lista 2</th>
                    <th className="text-right px-4 py-2 font-bold">Lista 3</th>
                  </tr>
                </thead>
                <tbody>
                  {previsualizacion.map((p, i) => (
                    <tr key={p.id} className={`border-t border-brand-dark/5 ${i % 2 === 0 ? 'bg-white' : 'bg-brand-light/30'}`}>
                      <td className="px-4 py-2 text-brand-dark/40">{p.id}</td>
                      <td className="px-4 py-2 font-bold text-brand-dark">{p.nombre}</td>
                      <td className="px-4 py-2 text-right text-brand-dark">${p.precio_lista_1.toLocaleString('es-AR')}</td>
                      <td className="px-4 py-2 text-right text-brand-dark">${p.precio_lista_2.toLocaleString('es-AR')}</td>
                      <td className="px-4 py-2 text-right text-brand-dark">${p.precio_lista_3.toLocaleString('es-AR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={aplicarPrecios}
                className="bg-brand-blue text-white text-xs font-bold px-6 py-3 rounded-xl hover:bg-brand-dark transition flex items-center gap-2"
              >
                ✅ Confirmar y actualizar {previsualizacion.length} productos
              </button>
              <button
                onClick={reiniciar}
                className="bg-white border border-brand-dark/15 text-brand-dark/60 text-xs font-bold px-5 py-3 rounded-xl hover:bg-brand-light transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ── Aplicando ─────────────────────────────────────────────────── */}
        {paso === 'aplicando' && (
          <div className="bg-white border border-brand-dark/10 rounded-2xl p-10 shadow-sm flex flex-col items-center gap-3">
            <span className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
            <p className="font-bold text-brand-dark text-sm">Actualizando precios en la base de datos...</p>
            <p className="text-xs text-brand-dark/40">No cerrés esta ventana.</p>
          </div>
        )}

        {/* ── RESULTADO ─────────────────────────────────────────────────── */}
        {paso === 'resultado' && (
          <div className="bg-white border border-brand-dark/10 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{fallidos.length === 0 ? '✅' : '⚠️'}</span>
              <div>
                <p className="font-black text-brand-dark text-sm">
                  {fallidos.length === 0
                    ? `¡Listo! ${exitosos} productos actualizados correctamente.`
                    : `${exitosos} actualizados, ${fallidos.length} con error.`
                  }
                </p>
                <p className="text-xs text-brand-dark/50">
                  Los nuevos precios ya están disponibles para los clientes.
                </p>
              </div>
            </div>

            {fallidos.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-1">
                <p className="text-xs font-bold text-red-600 mb-2">Productos que no se pudieron actualizar:</p>
                {fallidos.map((r) => (
                  <p key={r.id} className="text-xs text-red-500">
                    • ID {r.id} — {r.nombre}: {r.error}
                  </p>
                ))}
              </div>
            )}

            <button
              onClick={reiniciar}
              className="bg-brand-dark text-white text-xs font-bold px-5 py-3 rounded-xl hover:bg-brand-blue transition"
            >
              Hacer otra actualización
            </button>
          </div>
        )}

        {/* Instrucciones */}
        {paso === 'idle' && (
          <div className="bg-brand-dark/5 border border-brand-dark/10 rounded-2xl p-5 space-y-2">
            <p className="text-xs font-black text-brand-dark uppercase tracking-wider">📋 Instrucciones</p>
            <ul className="text-xs text-brand-dark/60 space-y-1.5 list-none">
              <li>→ Descargá el Excel base con el botón de arriba</li>
              <li>→ Abrilo en Excel o Google Sheets</li>
              <li>→ Modificá solo las columnas <strong>Lista 1</strong>, <strong>Lista 2</strong> y <strong>Lista 3</strong></li>
              <li>→ No cambies la columna <strong>ID</strong> ni los nombres de las columnas</li>
              <li>→ Guardá el archivo como <strong>.xlsx</strong> y subilo acá</li>
              <li>→ Revisá la previsualización antes de confirmar</li>
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}