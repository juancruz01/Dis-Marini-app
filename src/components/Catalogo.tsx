'use client';

import React, { useMemo, useState } from 'react';
import { Check, Clock, Plus, Search, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import type { Producto } from '../context/CartContext';
import { precioSegunLista } from '../lib/precios';
import { etiquetaCantidad, formatearPrecio, normalizarTexto, sufijoPrecio } from '../lib/formato';
import { HORA_CORTE_PEDIDOS } from '../lib/config';
import EncabezadoVista from './tienda/EncabezadoVista';
import ImagenProducto from './tienda/ImagenProducto';
import TarjetaProducto from './tienda/TarjetaProducto';

interface CatalogoProps {
  productos: Producto[];
  urlsImagenes: Record<string, string>;
  cargando: boolean;
  frecuentes: Producto[];
}

// Los datos se cargan en MainLayout (usePrecargaCatalogo) para empezar antes del ingreso
export default function Catalogo({ productos, urlsImagenes, cargando, frecuentes }: CatalogoProps) {
  const { cliente, agregarAlCarrito, cart, actualizarCantidad, mostrarAviso } = useCart();
  const lista = cliente?.lista_asignada ?? 1;

  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todos');

  const categorias = useMemo(
    () => ['Todos', ...Array.from(new Set(productos.map((p) => p.categoria)))],
    [productos]
  );

  const cantidades = useMemo(
    () => new Map(cart.map((item) => [item.producto.id, item.cantidad])),
    [cart]
  );

  const productosFiltrados = useMemo(() => {
    const termino = normalizarTexto(busqueda);
    return productos.filter((producto) => {
      const coincideCategoria =
        categoriaSeleccionada === 'Todos' || producto.categoria === categoriaSeleccionada;
      if (!coincideCategoria) return false;
      if (!termino) return true;
      return normalizarTexto(`${producto.nombre} ${producto.marca} ${producto.categoria}`).includes(termino);
    });
  }, [productos, busqueda, categoriaSeleccionada]);

  const agregar = (producto: Producto) => {
    const nuevaCantidad = (cantidades.get(producto.id) ?? 0) + 1;
    agregarAlCarrito(producto, 1);
    mostrarAviso(`${producto.nombre} · ${etiquetaCantidad(producto.unidad_medida, nuevaCantidad)}`);
  };

  const filtrando = busqueda.trim() !== '' || categoriaSeleccionada !== 'Todos';

  return (
    <>
      <EncabezadoVista
        extra={
          HORA_CORTE_PEDIDOS && (
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-[#B9C9DA]">
              <Clock className="size-3.5" aria-hidden="true" />
              Pedí hasta las {HORA_CORTE_PEDIDOS}
            </span>
          )
        }
      >
        <div>
          <p className="text-[13px] font-medium text-[#B9C9DA]">Hola,</p>
          <h1 className="text-[21px] font-extrabold leading-tight tracking-tight text-white">
            {cliente?.nombre_comercio}
          </h1>
        </div>
        <label className="flex h-12 items-center gap-2.5 rounded-xl bg-white px-3.5 text-brand-muted focus-within:ring-4 focus-within:ring-brand-blue/30">
          <Search className="size-5 shrink-0" aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar producto o marca"
            aria-label="Buscar producto o marca"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-brand-ink outline-none placeholder:text-brand-muted [&::-webkit-search-cancel-button]:hidden"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              aria-label="Borrar búsqueda"
              className="grid size-9 place-items-center rounded-lg text-brand-muted hover:bg-brand-light"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </label>
      </EncabezadoVista>

      {/* Categorías: quedan fijas arriba al hacer scroll */}
      <div className="sticky top-0 z-20 bg-brand-light/95 backdrop-blur md:top-16">
        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3 scrollbar-none md:flex-wrap">
          {categorias.map((categoria) => {
            const activa = categoria === categoriaSeleccionada;
            return (
              <button
                key={categoria}
                type="button"
                onClick={() => setCategoriaSeleccionada(categoria)}
                aria-pressed={activa}
                className={`h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-sm transition ${
                  activa
                    ? 'bg-brand-dark font-bold text-white'
                    : 'border border-[#D5DFEA] bg-white font-semibold text-[#22384F] hover:border-brand-blue'
                }`}
              >
                {categoria}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-5xl pb-28 md:pb-12">
        {/* Lo que siempre pedís */}
        {!filtrando && frecuentes.length > 0 && (
          <section className="flex flex-col gap-2.5 pb-2 pt-1" aria-labelledby="titulo-frecuentes">
            <h2 id="titulo-frecuentes" className="px-4 text-[17px] font-extrabold text-brand-dark">
              Lo que siempre pedís
            </h2>
            <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-none">
              {frecuentes.map((producto) => {
                const enCarrito = cantidades.get(producto.id) ?? 0;
                return (
                  <div
                    key={producto.id}
                    className="flex w-[148px] shrink-0 flex-col overflow-hidden rounded-[14px] border border-brand-line bg-white"
                  >
                    <div className="relative h-[76px]">
                      <ImagenProducto url={urlsImagenes[producto.imagen_url]} nombre={producto.nombre} sizes="148px" />
                    </div>
                    <div className="flex flex-1 flex-col justify-between gap-2 p-2.5">
                      <p className="line-clamp-2 text-[13px] font-bold leading-snug text-brand-ink">{producto.nombre}</p>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-extrabold text-brand-ink">
                          {formatearPrecio(precioSegunLista(producto, lista))}
                          <span className="text-[11px] font-semibold text-brand-muted"> {sufijoPrecio(producto.unidad_medida)}</span>
                        </span>
                        {enCarrito > 0 ? (
                          <span
                            className="flex h-11 min-w-11 items-center justify-center gap-1 rounded-xl bg-brand-soft px-2 text-sm font-extrabold text-brand-dark"
                            aria-label={`${enCarrito} en el carrito`}
                          >
                            <Check className="size-4" strokeWidth={2.5} aria-hidden="true" />
                            {enCarrito}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => agregar(producto)}
                            aria-label={`Agregar ${producto.nombre}`}
                            className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-dark text-white transition active:scale-95"
                          >
                            <Plus className="size-5" strokeWidth={2.5} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Listado */}
        <section className="flex flex-col gap-2.5 px-4 pt-3" aria-labelledby="titulo-listado">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="titulo-listado" className="text-[17px] font-extrabold text-brand-dark">
              {categoriaSeleccionada === 'Todos' ? 'Todos los productos' : categoriaSeleccionada}
            </h2>
            {!cargando && (
              <span className="text-[13px] font-semibold text-brand-muted">
                {productosFiltrados.length} {productosFiltrados.length === 1 ? 'producto' : 'productos'}
              </span>
            )}
          </div>

          {cargando ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-busy="true" aria-label="Cargando productos">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex animate-pulse flex-col gap-3 rounded-2xl border border-brand-line bg-white p-3.5">
                  <div className="flex gap-3">
                    <div className="size-[76px] rounded-xl bg-[#EAF0F6]" />
                    <div className="flex flex-1 flex-col gap-2 pt-1">
                      <div className="h-4 w-3/4 rounded bg-[#EAF0F6]" />
                      <div className="h-3 w-1/3 rounded bg-[#EAF0F6]" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#EEF2F7] pt-3">
                    <div className="h-6 w-24 rounded bg-[#EAF0F6]" />
                    <div className="h-11 w-32 rounded-xl bg-[#EAF0F6]" />
                  </div>
                </div>
              ))}
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="rounded-2xl border border-brand-line bg-white px-6 py-12 text-center">
              <p className="font-bold text-brand-ink">No encontramos productos</p>
              <p className="mt-1 text-sm text-brand-muted">
                {productos.length === 0
                  ? 'No pudimos cargar el catálogo. Revisá tu conexión y volvé a abrir la página.'
                  : 'Probá con otra palabra o elegí otra categoría.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {productosFiltrados.map((producto) => (
                <TarjetaProducto
                  key={producto.id}
                  producto={producto}
                  urlImagen={urlsImagenes[producto.imagen_url]}
                  lista={lista}
                  cantidadEnCarrito={cantidades.get(producto.id) ?? 0}
                  onAgregar={() => agregar(producto)}
                  onCambiarCantidad={(cantidad) => actualizarCantidad(producto.id, cantidad)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
