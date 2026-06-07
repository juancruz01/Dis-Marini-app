'use client';

import React, { useState, } from 'react';
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
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

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
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
              
              {/* LADO IZQUIERDO: LOGO (Siempre visible) */}
              <div className="flex items-center gap-2">
                <span className="text-brand-blue text-xl">■</span>
                <div>
                  <h1 className="font-black text-base md:text-xl tracking-tight leading-none">
                    Distribuidora Marini
                  </h1>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                    Catálogo Mayorista
                  </p>
                </div>
              </div>
              
              {/* LADO DERECHO: ESCRITORIO (Visible en md+) */}
              <div className="hidden md:flex items-center gap-4">
                <div className="text-right border-r border-white/10 pr-4">
                  <p className="text-xs text-white font-bold">{cliente.nombre_comercio}</p>
                  <p className="text-[10px] text-gray-400">Cliente N° {cliente.numero_cliente}</p>
                </div>
                
                <span className="bg-brand-blue text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-sm uppercase tracking-wider">
                  Lista {cliente.lista_asignada}
                </span>
                
                <button
                  onClick={() => setCarritoAbierto(true)}
                  className="bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 border border-white/10 transition relative"
                >
                  🛒 Carrito
                  {cantidadItems > 0 && (
                    <span className="bg-brand-blue text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black">
                      {cantidadItems}
                    </span>
                  )}
                </button>

                <button 
                  onClick={cerrarSesion} 
                  className="text-xs text-gray-400 hover:text-red-400 font-bold transition"
                >
                  Salir
                </button>
              </div>

              {/* LADO DERECHO: MÓVIL (Botón Hamburguesa) */}
              <div className="md:hidden flex items-center gap-3">
                {/* Acceso directo al carrito siempre visible (opcional, pero recomendado para ventas) */}
                {cantidadItems > 0 && (
                  <button 
                    onClick={() => setCarritoAbierto(true)}
                    className="relative p-2 text-brand-blue"
                  >
                    🛒
                    <span className="absolute top-0 right-0 bg-white text-brand-dark w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black border border-brand-dark">
                      {cantidadItems}
                    </span>
                  </button>
                )}

                <button
                  onClick={() => setMenuMovilAbierto(!menuMovilAbierto)}
                  className="p-2 text-gray-300 text-2xl"
                >
                  {menuMovilAbierto ? '✕' : '☰'}
                </button>
              </div>
            </div>

            {/* MENÚ DESPLEGABLE MÓVIL */}
            {menuMovilAbierto && (
              <div className="md:hidden bg-brand-dark border-t border-white/10 animate-in slide-in-from-top duration-200">
                <div className="p-5 space-y-4 bg-brand-dark/95 backdrop-blur-md">
                  {/* Info del Cliente */}
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Comercio Activo</p>
                    <p className="text-sm font-black text-white">{cliente.nombre_comercio}</p>
                    <p className="text-xs text-gray-400">Número de cliente: {cliente.numero_cliente}</p>
                    
                    <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                      <span className="text-xs text-gray-300">Tarifa asignada:</span>
                      <span className="bg-brand-blue text-white text-[10px] font-black px-2 py-1 rounded-md uppercase">
                        Lista {cliente.lista_asignada}
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => {
                        setCarritoAbierto(true);
                        setMenuMovilAbierto(false);
                      }}
                      className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition"
                    >
                      🛒 Ver mi Carrito ({cantidadItems})
                    </button>
                    
                    <button 
                      onClick={cerrarSesion}
                      className="w-full py-4 text-xs font-bold text-red-400 bg-red-400/5 rounded-xl border border-red-400/10"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              </div>
            )}
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