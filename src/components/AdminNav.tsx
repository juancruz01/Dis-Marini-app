'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function AdminNav() {
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const enlaces = [
    { name: '📊 Resumen', href: '/admin' },
    { name: '🧀 Productos', href: '/admin/productos' },
    { name: '👥 Clientes', href: '/admin/clientes' },
    { name: '📋 Historial', href: '/admin/historial' },
    { name: '💲 Precios', href: '/admin/precios' },
  ];

  return (
    <>
      {/* barra superior (solo celulares) */}
      <nav className="md:hidden bg-brand-dark text-white shadow-xl relative z-50 h-19">
        <div className="px-4 h-full flex justify-between items-center">
          <div className="flex items-center">
            <Image src="/Marini-BLANCO.png" alt="Logo Marini" height={36} width={150} className="object-contain" />
          </div>

          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition focus:outline-none"
            aria-label="Abrir menú de navegación"
          >
            <span className="text-xl block font-mono">
              {menuAbierto ? '✕' : '☰'}
            </span>
          </button>
        </div>

        {/* menu desplegable (solo visible si menuAbierto es true y en pantallas chicas) */}
        {menuAbierto && (
          <div className="bg-brand-dark border-t border-white/10 absolute top-full left-0 w-full shadow-2xl animate-in slide-in-from-top duration-200">
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

      {/* sidebar izquierda (escritorio) */}
      <aside className="hidden md:flex md:flex-col md:fixed md:top-0 md:left-0 md:h-screen md:w-56 bg-brand-dark text-white shadow-xl z-50">
        <div className="flex items-center justify-center py-6 border-b border-white/10">
          <Image src="/Marini-BLANCO.png" alt="Logo Marini" height={40} width={160} className="object-contain" />
        </div>

        <div className="flex-1 flex flex-col gap-1.5 px-3 py-6 overflow-y-auto">
          {enlaces.map((link) => {
            const activo = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                  activo
                    ? 'bg-brand-blue text-white shadow-md'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>

        <div className="px-3 py-6 border-t border-white/10">
          <Link
            href="/"
            className="block text-center text-xs text-gray-400 hover:text-white font-medium transition border border-gray-700 px-3 py-2 rounded-lg"
          >
            Volver a la Web ➔
          </Link>
        </div>
      </aside>
    </>
  );
}
