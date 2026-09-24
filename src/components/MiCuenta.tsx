'use client';

import React, { useState } from 'react';
import { ChevronRight, Clock, LogOut, MessageCircle, Smartphone, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { DIAS_REPARTO, HORA_CORTE_PEDIDOS, WHATSAPP_PEDIDOS } from '../lib/config';
import { useInstalarApp } from '../hooks/useInstalarApp';
import EncabezadoVista from './tienda/EncabezadoVista';

function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0]?.toUpperCase())
    .join('');
}

const TEXTO_INSTALAR: Record<'ios' | 'manual', string> = {
  ios: 'En Safari, tocá el botón Compartir y después "Agregar a inicio".',
  manual: 'Abrí el menú del navegador (⋮) y elegí "Instalar app" o "Agregar a la pantalla principal".',
};

export default function MiCuenta() {
  const { cliente, cerrarSesion } = useCart();
  const { modo, instalar } = useInstalarApp();
  const [mostrarAyudaInstalar, setMostrarAyudaInstalar] = useState(false);

  if (!cliente) return null;

  const entregas = [
    DIAS_REPARTO && { icono: Truck, titulo: 'Días de reparto', valor: DIAS_REPARTO },
    HORA_CORTE_PEDIDOS && { icono: Clock, titulo: 'Cierre de pedidos', valor: `Hasta las ${HORA_CORTE_PEDIDOS}` },
  ].filter(Boolean) as { icono: typeof Truck; titulo: string; valor: string }[];

  const tocarInstalar = () => {
    if (modo === 'boton') instalar();
    else setMostrarAyudaInstalar((v) => !v);
  };

  return (
    <>
      <EncabezadoVista>
        <div className="flex items-center gap-3.5">
          <span
            className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-link text-xl font-extrabold text-white"
            aria-hidden="true"
          >
            {iniciales(cliente.nombre_comercio)}
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold text-white">{cliente.nombre_comercio}</h1>
            <p className="text-[13px] font-semibold text-[#B9C9DA]">Cuenta {cliente.numero_cliente}</p>
          </div>
        </div>
      </EncabezadoVista>

      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 pb-28 pt-4 md:pb-12">
        {entregas.length > 0 && (
          <section className="flex flex-col gap-2" aria-labelledby="titulo-entregas">
            <h2 id="titulo-entregas" className="mx-1 text-[13px] font-bold uppercase tracking-wider text-brand-muted">
              Entregas
            </h2>
            <div className="divide-y divide-[#EEF2F7] overflow-hidden rounded-2xl border border-brand-line bg-white">
              {entregas.map(({ icono: Icono, titulo, valor }) => (
                <div key={titulo} className="flex items-center gap-3 p-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-dark">
                    <Icono className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-brand-muted">{titulo}</p>
                    <p className="text-[15px] font-bold text-brand-ink">{valor}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-2" aria-labelledby="titulo-ayuda">
          <h2 id="titulo-ayuda" className="mx-1 text-[13px] font-bold uppercase tracking-wider text-brand-muted">
            ¿Necesitás ayuda?
          </h2>
          <a
            href={`https://wa.me/${WHATSAPP_PEDIDOS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-[#15803D] text-[15px] font-bold text-white transition hover:bg-[#166534]"
          >
            <MessageCircle className="size-5" aria-hidden="true" />
            Escribinos por WhatsApp
          </a>
        </section>

        <section className="flex flex-col gap-2" aria-labelledby="titulo-app">
          <h2 id="titulo-app" className="mx-1 text-[13px] font-bold uppercase tracking-wider text-brand-muted">
            App
          </h2>
          <div className="divide-y divide-[#EEF2F7] overflow-hidden rounded-2xl border border-brand-line bg-white">
            {modo !== 'instalada' && (
              <div>
                <button
                  type="button"
                  onClick={tocarInstalar}
                  aria-expanded={modo === 'boton' ? undefined : mostrarAyudaInstalar}
                  className="flex w-full items-center gap-3 p-3.5 text-left transition hover:bg-brand-light"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-dark">
                    <Smartphone className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold text-brand-ink">Instalar en el celular</span>
                    <span className="block text-[13px] text-brand-muted">Entrá con un toque desde tu pantalla de inicio</span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-brand-muted" aria-hidden="true" />
                </button>
                {mostrarAyudaInstalar && modo !== 'boton' && (
                  <p className="mx-3.5 mb-3.5 rounded-xl bg-brand-light p-3 text-sm text-[#22384F]">
                    {TEXTO_INSTALAR[modo]}
                  </p>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={cerrarSesion}
              className="flex w-full items-center gap-3 p-3.5 text-left text-[#B42318] transition hover:bg-[#FDECEA]/50"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#FDECEA]">
                <LogOut className="size-5" aria-hidden="true" />
              </span>
              <span className="text-[15px] font-bold">Cerrar sesión</span>
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
