'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav() {
  const pathname = usePathname();

  const enlaces = [
    { name: '📊 Resumen', href: '/admin' },
    { name: '🧀 Productos', href: '/admin/productos' },
    { name: '👥 Clientes', href: '/admin/clientes' },
  ];

  return (
    <nav className="bg-brand-dark text-white shadow-xl">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center max-w-6xl">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚙️</span>
          <h1 className="font-black text-lg tracking-tight">
            Marini <span className="text-brand-blue">Admin</span>
          </h1>
        </div>
        
        <div className="flex gap-2">
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
        </div>

        <div>
          <Link 
            href="/" 
            className="text-xs text-gray-400 hover:text-white font-medium transition border border-gray-700 px-3 py-1.5 rounded-lg"
          >
            Volver a la Web ➔
          </Link>
        </div>
      </div>
    </nav>
  );
}