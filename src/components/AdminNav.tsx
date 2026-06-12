'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav() {
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const enlaces = [
    { name: '📊 Resumen', href: '/admin' },
    { name: '🧀 Productos', href: '/admin/productos' },
    { name: '👥 Clientes', href: '/admin/clientes' },
  ];

  return (
    <nav className="bg-brand-dark text-white shadow-xl relative z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center max-w-6xl">
        
        {/* LOGO */}
        <div className="flex items-center gap-2">
          <span className="text-lg">⚙️</span>
          <h1 className="font-black text-base tracking-tight whitespace-nowrap">
            Marini <span className="text-brand-blue">Admin</span>
          </h1>
        </div>
        
        {/* boton hamburguesa (Solo visible para celulares) */}
        <button
          onClick={() => setMenuAbierto(!menuAbierto)}
          className="md:hidden p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition focus:outline-none"
          aria-label="Abrir menú de navegación"
        >
          <span className="text-xl block font-mono">
            {menuAbierto ? '✕' : '☰'}
          </span>
        </button>

        {/* menu escritorio (Oculto en celulares) */}
        <div className="hidden md:flex items-center gap-2">
          {enlaces.map((link) => {
            const activo = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                  activo
                    ? 'bg-brand-blue text-white shadow-md'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
          
          <div className="h-4 w-px bg-white/20 mx-2" />
          
          <Link 
            href="/" 
            className="text-xs text-gray-400 hover:text-white font-medium transition border border-gray-700 px-3 py-1.5 rounded-lg"
          >
            Volver a la Web ➔
          </Link>
        </div>
      </div>

      {/* menu desplegable (Solo visible si menuAbierto es true y en pantallas chicas) */}
      {menuAbierto && (
        <div className="md:hidden bg-brand-dark border-t border-white/10 absolute top-full left-0 w-full shadow-2xl animate-in slide-in-from-top duration-200">
          <div className="px-4 py-3 flex flex-col gap-2 bg-brand-dark/95 backdrop-blur-md">
            {enlaces.map((link) => {
              const activo = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuAbierto(false)}
                  className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    activo
                      ? 'bg-brand-blue text-white shadow-md'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            
            <hr className="border-white/10 my-1" />
            
            <Link 
              href="/"
              onClick={() => setMenuAbierto(false)}
              className="px-4 py-3 rounded-xl text-xs font-bold text-center border border-gray-700 text-gray-400 hover:text-white transition bg-white/5"
            >
              Volver a la Web ➔
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}