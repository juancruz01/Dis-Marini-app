'use client';

import React, {  useEffect ,useState } from 'react';
import { useCart } from '../context/CartContext';
import Image from 'next/image';
import ModalCheckout from './ModalCheckout';
import { getPresignedUrl } from '../services/mediaService';

const ImagenCarrito = ({
  imagenKey,
  nombre,
}: {
  imagenKey: string | null;
  nombre: string;
}) => {
  const placeholder = '/productos/placeholder.jpg';

  // 1. Calculamos si el producto tiene una imagen válida de forma síncrona
  const tieneImagenValida = imagenKey && !imagenKey.includes('placeholder');

  // 2. Si no es válida, el estado inicial ya es el placeholder definitivo. 
  // Si es válida, arranca en placeholder temporal hasta que resuelva la URL firmada.
  const [urlFinal, setUrlFinal] = useState(placeholder);

  useEffect(() => {
    // 🚀 LA CLAVE: Si no es válida, salimos al toque. 
    // Ya NO llamamos a setUrlFinal(placeholder) acá adentro, evitando el error del linter.
    if (!tieneImagenValida) {
      return;
    }

    let activo = true;

    getPresignedUrl(imagenKey)
      .then((url) => {
        if (activo && url) setUrlFinal(url);
      })
      .catch((err) => {
        console.error("Error al obtener URL firmada en carrito:", err);
        // Si falla la promesa (asíncrono), el linter SÍ te deja usar el setState
        if (activo) setUrlFinal(placeholder); 
      });

    return () => {
      activo = false;
    };
  }, [imagenKey, tieneImagenValida]); // Agregamos las dependencias correctas

  return (
    <Image
      src={urlFinal}
      alt={nombre}
      fill
      sizes="56px"
      className="object-cover"
      unoptimized
    />
  );
};

interface CarritoSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CarritoSidebar({ isOpen, onClose }: CarritoSidebarProps) {
  const { cart, actualizarCantidad, eliminarDelCarrito, obtenerTotal, cliente } = useCart();
  const [checkoutAbierto, setCheckoutAbierto] = useState(false);

  const estaEnElCliente = typeof window !== 'undefined';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Fondo oscuro con desenfoque */}
      <div 
        className="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          
          {/* TÍTULO DEL CARRITO */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-brand-dark text-white">
            <div>
              <h2 className="text-lg font-black tracking-tight">Tu Pedido</h2>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl p-2 rounded-lg hover:bg-white/10 transition"
            >
              ✕
            </button>
          </div>

          {/* LISTA DE PRODUCTOS SELECCIONADOS */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 gap-2">
                <span className="text-4xl">🛒</span>
                <p className="text-sm font-medium">El carrito está vacío.</p>
                <p className="text-xs max-w-50">Agregá fiambres o lácteos desde el catálogo para empezar.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div 
                  key={item.producto.id}
                  className="bg-white border border-gray-200/60 rounded-xl p-3 flex items-center gap-3 relative shadow-xs"
                >
                  {/* Miniatura de imagen */}
                  <div className="w-16 h-16 bg-white rounded-xl overflow-hidden shrink-0 relative border border-gray-200">
                    <ImagenCarrito
                      imagenKey={item.producto.imagen_url}
                      nombre={item.producto.nombre}
                    />
                  </div>
                  

                  {/* Detalle del producto */}
                  <div className="grow min-w-0">
                    <h4 className="font-bold text-sm text-brand-dark truncate leading-tight">
                      {item.producto.nombre}
                    </h4>
                    <p className="text-[10px] text-brand-blue font-black uppercase tracking-wide">
                      {item.producto.marca}
                    </p>
                    <p className="text-xs font-black text-brand-dark/80 mt-1">
                      ${item.precioAplicado.toLocaleString('es-AR', { minimumFractionDigits: 2 })} 
                      <span className="text-[10px] text-gray-400 font-normal"> x {item.producto.unidad_medida}</span>
                    </p>
                  </div>

                  {/* Controles de cantidad */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button 
                      onClick={() => eliminarDelCarrito(item.producto.id)}
                      className="text-gray-300 hover:text-red-500 text-xs p-1 transition"
                      title="Eliminar producto"
                    >
                      🗑️
                    </button>

                    <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 p-0.5 shadow-inner">
                      <button
                        onClick={() => actualizarCantidad(item.producto.id, item.cantidad - 1)}
                        className="w-6 h-6 flex items-center justify-center font-black text-gray-500 hover:bg-white rounded transition text-xs"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-xs text-brand-dark">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => actualizarCantidad(item.producto.id, item.cantidad + 1)}
                        className="w-6 h-6 flex items-center justify-center font-black text-gray-500 hover:bg-white rounded transition text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* PIE DEL PANEL: TOTALES Y CHECKOUT */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-gray-100 bg-white space-y-4 shadow-top">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Total Estimado</span>
                  <span className="text-[10px] text-amber-600 font-medium">Sujeto al peso final en balanza</span>
                </div>
                <span className="text-2xl font-black text-brand-dark">
                  ${obtenerTotal().toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <button
                onClick={() => setCheckoutAbierto(true)}
                className="w-full bg-brand-blue text-white font-bold py-4 rounded-xl hover:bg-brand-dark active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20 text-sm uppercase tracking-wider"
              >
                Confirmar Pedido ➔
              </button>
            </div>
          )}

        </div>
      </div>

      <ModalCheckout 
        isOpen={checkoutAbierto} 
        onClose={() => {
          setCheckoutAbierto(false);
          onClose();
        }} 
      />
    </div>
  );
}