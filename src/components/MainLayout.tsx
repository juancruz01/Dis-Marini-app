'use client';

import dynamic from 'next/dynamic';
import { useCart } from '../context/CartContext';
import Catalogo from '../components/Catalogo';

// Acá adentro Next.js permite el ssr: false perfectamente porque ya es un componente hijo del cliente
const ModalIngresoSinSSR = dynamic(() => import('../components/ModalIngreso'), {
  ssr: false,
});

export default function MainLayout() {
  const { cliente, cerrarSesion } = useCart();

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
        </>
      )}
    </>
  );
}