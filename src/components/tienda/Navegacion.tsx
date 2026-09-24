'use client';

import React from 'react';
import Image from 'next/image';
import { ClipboardList, LayoutGrid, ShoppingCart, User } from 'lucide-react';

export type Vista = 'catalogo' | 'pedidos' | 'cuenta';

const PESTANAS: { vista: Vista; label: string; icono: typeof LayoutGrid }[] = [
  { vista: 'catalogo', label: 'Catálogo', icono: LayoutGrid },
  { vista: 'pedidos', label: 'Mis pedidos', icono: ClipboardList },
  { vista: 'cuenta', label: 'Mi cuenta', icono: User },
];

interface NavegacionProps {
  vista: Vista;
  onCambiarVista: (vista: Vista) => void;
  cantidadCarrito: number;
  onAbrirCarrito: () => void;
}

function Contador({ cantidad }: { cantidad: number }) {
  if (cantidad === 0) return null;
  return (
    <span className="absolute -right-2.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-brand-alert px-1 text-[11px] font-extrabold text-white">
      {cantidad > 99 ? '99+' : cantidad}
    </span>
  );
}

// Celular: barra fija abajo, al alcance del pulgar. El carrito queda en el centro.
export function BarraInferior({ vista, onCambiarVista, cantidadCarrito, onAbrirCarrito }: NavegacionProps) {
  const [catalogo, pedidos, cuenta] = PESTANAS;

  const pestana = ({ vista: destino, label, icono: Icono }: (typeof PESTANAS)[number]) => {
    const activa = vista === destino;
    return (
      <button
        key={destino}
        type="button"
        onClick={() => onCambiarVista(destino)}
        aria-current={activa ? 'page' : undefined}
        className={`relative flex flex-col items-center justify-center gap-1 text-xs ${
          activa ? 'font-extrabold text-brand-dark' : 'font-semibold text-brand-muted'
        }`}
      >
        {activa && <span className="absolute -top-1.5 h-[3px] w-8 rounded-b-[3px] bg-brand-blue" aria-hidden="true" />}
        <Icono className="size-6" aria-hidden="true" />
        {label}
      </button>
    );
  };

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-line bg-white safe-bottom md:hidden"
    >
      <div className="grid h-[68px] grid-cols-4 px-2 pt-1.5">
        {pestana(catalogo)}
        {pestana(pedidos)}
        <button
          type="button"
          onClick={onAbrirCarrito}
          aria-label={`Carrito, ${cantidadCarrito} ${cantidadCarrito === 1 ? 'producto' : 'productos'}`}
          className="flex flex-col items-center justify-center gap-1 text-xs font-semibold text-brand-muted"
        >
          <span className="relative flex">
            <ShoppingCart className="size-6" aria-hidden="true" />
            <Contador cantidad={cantidadCarrito} />
          </span>
          Carrito
        </button>
        {pestana(cuenta)}
      </div>
    </nav>
  );
}

// Escritorio: barra fija arriba con las mismas secciones
export function BarraSuperior({ vista, onCambiarVista, cantidadCarrito, onAbrirCarrito }: NavegacionProps) {
  return (
    <nav
      aria-label="Navegación principal"
      className="sticky top-0 z-40 hidden h-16 border-b border-white/10 bg-brand-dark md:block"
    >
      <div className="mx-auto flex h-full max-w-5xl items-center gap-6 px-4">
        <Image src="/marini-logo-blanco.png" alt="Distribuidora Marini" width={140} height={30} priority />
        <div className="flex flex-1 gap-1">
          {PESTANAS.map(({ vista: destino, label, icono: Icono }) => {
            const activa = vista === destino;
            return (
              <button
                key={destino}
                type="button"
                onClick={() => onCambiarVista(destino)}
                aria-current={activa ? 'page' : undefined}
                className={`flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-bold transition ${
                  activa ? 'bg-white/15 text-white' : 'text-[#B9C9DA] hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icono className="size-[18px]" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onAbrirCarrito}
          className="flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-brand-dark transition hover:bg-brand-soft"
        >
          <span className="relative flex">
            <ShoppingCart className="size-[18px]" aria-hidden="true" />
            <Contador cantidad={cantidadCarrito} />
          </span>
          <span className="ml-1">Carrito</span>
        </button>
      </div>
    </nav>
  );
}
