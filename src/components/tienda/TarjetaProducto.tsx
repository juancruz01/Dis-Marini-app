'use client';

import React from 'react';
import { Plus, Scale } from 'lucide-react';
import type { Producto } from '../../context/CartContext';
import { calcularPrecioAplicado, esVentaPorPeso, pesoParaEstimar, precioSegunLista } from '../../lib/precios';
import { formatearPrecio, sufijoPrecio, textoAgregar, tipoVenta } from '../../lib/formato';
import ImagenProducto from './ImagenProducto';
import SelectorCantidad from './SelectorCantidad';

// Estimado del precio de una horma/pieza (o de una pieza de un producto por kilo)
function textoEstimado(producto: Producto, lista: number): string | null {
  const tipo = tipoVenta(producto.unidad_medida);
  const peso = pesoParaEstimar(producto).toLocaleString('es-AR');

  if (esVentaPorPeso(producto)) {
    const nombreUnidad = tipo === 'horma' ? 'Horma' : 'Pieza';
    return `${nombreUnidad} ≈ ${peso} kg · ${formatearPrecio(calcularPrecioAplicado(producto, lista))}`;
  }
  if (tipo === 'kilo' && producto.peso_estimado) {
    const estimado = precioSegunLista(producto, lista) * producto.peso_estimado;
    return `Pieza ≈ ${peso} kg · ${formatearPrecio(estimado)}`;
  }
  return null;
}

export default function TarjetaProducto({
  producto,
  urlImagen,
  lista,
  cantidadEnCarrito,
  onAgregar,
  onCambiarCantidad,
}: {
  producto: Producto;
  urlImagen: string | undefined;
  lista: number;
  cantidadEnCarrito: number;
  onAgregar: () => void;
  onCambiarCantidad: (cantidad: number) => void;
}) {
  const estimado = textoEstimado(producto, lista);

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-brand-line bg-white p-3.5">
      <div className="flex gap-3">
        <div className="relative size-[76px] shrink-0 overflow-hidden rounded-xl">
          <ImagenProducto url={urlImagen} nombre={producto.nombre} sizes="76px" />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-base font-bold leading-snug text-brand-ink">{producto.nombre}</h3>
          <span className="text-xs font-bold uppercase tracking-wide text-brand-link">{producto.marca}</span>
          {producto.informacion_adicional && (
            <span className="self-start rounded-md bg-[#E8F6EE] px-2 py-0.5 text-xs font-semibold text-[#1E6B3F]">
              {producto.informacion_adicional}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[#EEF2F7] pt-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xl font-extrabold text-brand-ink">
            {formatearPrecio(precioSegunLista(producto, lista))}
            <span className="text-[13px] font-semibold text-brand-muted"> {sufijoPrecio(producto.unidad_medida)}</span>
          </span>
          {estimado && (
            <span className="flex items-center gap-1.5 self-start rounded-md bg-estimado-bg px-2 py-0.5 text-xs font-bold text-estimado">
              <Scale className="size-3.5 shrink-0" aria-hidden="true" />
              {estimado}
            </span>
          )}
        </div>

        {cantidadEnCarrito === 0 ? (
          <button
            type="button"
            onClick={onAgregar}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-brand-dark px-4 text-sm font-bold text-white transition hover:bg-brand-ink active:scale-[0.97]"
          >
            <Plus className="size-[18px]" strokeWidth={2.5} aria-hidden="true" />
            {textoAgregar(producto.unidad_medida)}
          </button>
        ) : (
          <SelectorCantidad
            cantidad={cantidadEnCarrito}
            nombre={producto.nombre}
            onCambiar={onCambiarCantidad}
          />
        )}
      </div>
    </article>
  );
}
