'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, ShoppingCart, Trash2, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import type { CartItem } from '../context/CartContext';
import { formatearPrecio, tipoVenta } from '../lib/formato';
import ModalCheckout from './ModalCheckout';
import ImagenProducto from './tienda/ImagenProducto';
import SelectorCantidad from './tienda/SelectorCantidad';

interface CarritoSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  // URLs firmadas que ya precargó el catálogo (ver usePrecargaCatalogo)
  urlsImagenes: Record<string, string>;
}

// "$29.575 por horma (aprox.)" · "$9.800 /kg" · "$18.500 c/u"
function detallePrecio(item: CartItem): string {
  const precio = formatearPrecio(item.precioAplicado);
  switch (tipoVenta(item.producto.unidad_medida)) {
    case 'horma': return `${precio} por horma (aprox.)`;
    case 'pieza': return `${precio} por pieza (aprox.)`;
    case 'kilo': return `${precio} /kg`;
    default: return `${precio} c/u`;
  }
}

export default function CarritoSidebar({ isOpen, onClose, urlsImagenes }: CarritoSidebarProps) {
  const { cart, actualizarCantidad, eliminarDelCarrito, obtenerTotal } = useCart();
  const [checkoutAbierto, setCheckoutAbierto] = useState(false);

  // Cerrar con Escape (si no está abierto el checkout encima)
  useEffect(() => {
    if (!isOpen || checkoutAbierto) return;
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [isOpen, checkoutAbierto, onClose]);

  if (!isOpen) return null;

  const hayProductosPorPeso = cart.some((item) => tipoVenta(item.producto.unidad_medida) !== 'unidad');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="titulo-carrito">
      <div className="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-brand-light shadow-2xl">
        <div className="flex items-center justify-between bg-brand-dark px-5 py-4 text-white">
          <div>
            <h2 id="titulo-carrito" className="text-lg font-extrabold">Tu pedido</h2>
            {cart.length > 0 && (
              <p className="text-xs font-semibold text-[#B9C9DA]">
                {cart.length} {cart.length === 1 ? 'producto' : 'productos'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar carrito"
            className="grid size-11 place-items-center rounded-xl text-[#B9C9DA] transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-6" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <ShoppingCart className="size-10 text-[#9AAABB]" strokeWidth={1.5} aria-hidden="true" />
              <p className="font-bold text-brand-ink">Tu carrito está vacío</p>
              <p className="max-w-60 text-sm text-brand-muted">Agregá productos desde el catálogo para armar tu pedido.</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 h-11 rounded-xl bg-brand-dark px-5 text-sm font-bold text-white"
              >
                Ver catálogo
              </button>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {cart.map((item) => (
                <li key={item.producto.id} className="flex flex-col gap-3 rounded-2xl border border-brand-line bg-white p-3">
                  <div className="flex gap-3">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">
                      <ImagenProducto
                        url={urlsImagenes[item.producto.imagen_url]}
                        nombre={item.producto.nombre}
                        sizes="64px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-brand-ink">{item.producto.nombre}</h3>
                      <p className="text-xs font-bold uppercase tracking-wide text-brand-link">{item.producto.marca}</p>
                      <p className="mt-0.5 text-[13px] text-brand-muted">{detallePrecio(item)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => eliminarDelCarrito(item.producto.id)}
                      aria-label={`Quitar ${item.producto.nombre} del carrito`}
                      className="grid size-11 shrink-0 place-items-center rounded-xl text-brand-muted transition hover:bg-[#FDECEA] hover:text-[#B42318]"
                    >
                      <Trash2 className="size-5" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-[#EEF2F7] pt-3">
                    <SelectorCantidad
                      cantidad={item.cantidad}
                      nombre={item.producto.nombre}
                      onCambiar={(cantidad) => actualizarCantidad(item.producto.id, cantidad)}
                    />
                    <span className="text-base font-extrabold text-brand-ink">
                      {formatearPrecio(item.precioAplicado * item.cantidad)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart.length > 0 && (
          <div className="space-y-3 border-t border-brand-line bg-white p-4 safe-bottom">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-brand-muted">Total estimado</p>
                {hayProductosPorPeso && (
                  <p className="text-xs font-semibold text-estimado">Sujeto al peso final en balanza</p>
                )}
              </div>
              <span className="text-2xl font-extrabold text-brand-ink">{formatearPrecio(obtenerTotal())}</span>
            </div>
            <button
              type="button"
              onClick={() => setCheckoutAbierto(true)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-dark text-[15px] font-bold text-white transition hover:bg-brand-ink active:scale-[0.99]"
            >
              Confirmar pedido
              <ArrowRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <ModalCheckout
        isOpen={checkoutAbierto}
        onClose={() => {
          setCheckoutAbierto(false);
          onClose();
        }}
        onVolver={() => setCheckoutAbierto(false)}
      />
    </div>
  );
}
