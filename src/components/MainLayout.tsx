'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useCart } from '../context/CartContext';
import Catalogo from '../components/Catalogo';
import CarritoSidebar from '../components/CarritoSidebar';

// Acá adentro Next.js permite el ssr: false perfectamente porque ya es un componente hijo del cliente
const ModalIngresoSinSSR = dynamic(() => import('../components/ModalIngreso'), {
  ssr: false,
});

export default function MainLayout() {
  const { cliente, cerrarSesion, cart } = useCart();
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  const cantidadItems = cart.reduce((acc, item) => acc + item.cantidad, 0);
  
  return (
    <>
      {/* 1. Modal de entrada (Cargado dinámicamente solo en el cliente) */}
      <ModalIngresoSinSSR />

      {/* 2. Contenido de la Web (Solo visible si el cliente ya ingresó) */}
      {cliente && (
        <>
          {/* Navbar Corporativa */}
          <nav className="bg-brand-dark text-white sticky top-0 z-40 shadow-xl border-b border-white/10">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
              <div>
                <h1 className="font-black text-xl tracking-tight text-white flex items-center gap-2">
                  <span className="text-brand-blue">■</span> Distribuidora Marini
                </h1>
                <p className="text-xs text-gray-300 mt-0.5 font-medium">
                  Comercio: <span className="text-white font-bold">{cliente.nombre_comercio}</span> 
                  <span className="mx-1.5 text-gray-500">|</span> N° {cliente.numero_cliente}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="bg-brand-blue text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-sm uppercase tracking-wider">
                  Tarifa: Lista {cliente.lista_asignada}
                </span>

                {/* Botón de Carrito integrado en la Navbar para Escritorio */}
                <button
                  onClick={() => setCarritoAbierto(true)}
                  className="bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 border border-white/10 transition relative"
                >
                  🛒 Carrito
                  {cantidadItems > 0 && (
                    <span className="bg-brand-blue text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border border-brand-dark animate-pulse">
                      {cantidadItems}
                    </span>
                  )}
                </button>
                
                <button 
                  onClick={cerrarSesion} 
                  className="text-xs text-gray-400 hover:text-red-400 font-bold transition px-2 py-1.5 rounded-lg hover:bg-white/5"
                >
                  Salir
                </button>
              </div>
            </div>
          </nav>

          {/* Cuerpo principal con el Catálogo Mayorista */}
          <main className="container mx-auto p-4 max-w-5xl mt-4 pb-24">
            <Catalogo />
          </main>
          
          {/* BOTÓN FLOTANTE DE CARRITO PARA MÓVILES (Abajo a la derecha) */}
          {cantidadItems > 0 && (
            <button
              onClick={() => setCarritoAbierto(true)}
              className="md:hidden fixed bottom-6 right-6 z-40 bg-brand-blue text-white p-4 rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all border border-white/20 animate-bounce"
            >
              <span className="text-xl">🛒</span>
              <span className="absolute -top-1 -right-1 bg-brand-dark text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border-2 border-white shadow-md">
                {cantidadItems}
              </span>
            </button>
          )}

          {/* PANEL LATERAL DEL CARRITO */}
          <CarritoSidebar 
            isOpen={carritoAbierto} 
            onClose={() => setCarritoAbierto(false)} 
          />


        </>
      )}
    </>
  );
}