'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useCart } from '../context/CartContext';
import Catalogo from './Catalogo';
import MisPedidos from './MisPedidos';
import MiCuenta from './MiCuenta';
import AvisoFlotante from './tienda/AvisoFlotante';
import { BarraInferior, BarraSuperior, type Vista } from './tienda/Navegacion';
import { usePrecargaCatalogo } from '../hooks/usePrecargaCatalogo';
import { useProductosFrecuentes } from '../hooks/useProductosFrecuentes';

const ModalIngresoSinSSR = dynamic(() => import('./ModalIngreso'), {
  ssr: false,
});

const CarritoSidebar = dynamic(() => import('./CarritoSidebar'), {
  ssr: false,
});

const ESPERA_MAXIMA_MS = 5000;

function PantallaCarga({
  cargadas,
  totales,
  duracionMs,
}: {
  cargadas: number;
  totales: number;
  duracionMs: number;
}) {
  const [transcurridoMs, setTranscurridoMs] = useState(0);

  // Avanza con el tiempo para que la barra nunca se quede quieta: llega al 100%
  // justo cuando se agota la espera máxima y se muestra el catálogo igual.
  useEffect(() => {
    const inicio = Date.now();
    const intervalo = setInterval(() => setTranscurridoMs(Date.now() - inicio), 100);
    return () => clearInterval(intervalo);
  }, []);

  const porcentajeImagenes = totales > 0 ? (cargadas / totales) * 100 : 0;
  const porcentajeTiempo = (transcurridoMs / duracionMs) * 100;
  // Se muestra el que vaya más adelantado: si las fotos llegan rápido, la barra también
  const porcentaje = Math.min(100, Math.round(Math.max(porcentajeImagenes, porcentajeTiempo)));
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-brand-light p-6">
      <Image src="/marini-logo-azul.png" alt="Distribuidora Marini" width={200} height={43} priority />
      <div className="w-56 space-y-2.5 text-center">
        <p className="text-sm font-bold text-brand-dark">Preparando tu catálogo...</p>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-brand-line"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={porcentaje}
          aria-label="Cargando catálogo"
        >
          <div
            className="h-full rounded-full bg-brand-blue transition-all duration-300"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function MainLayout() {
  const { cliente, cart } = useCart();
  const [vista, setVista] = useState<Vista>('catalogo');
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [esperaAgotada, setEsperaAgotada] = useState(false);

  // Empieza a cargar productos y fotos ya, mientras el cliente escribe su DNI
  const catalogo = usePrecargaCatalogo();
  const frecuentes = useProductosFrecuentes(cliente?.numero_cliente ?? null, catalogo.productos);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true); // Solo en el cliente, después de la hidratación
  }, []);

  // Si al entrar las fotos todavía no terminaron, esperamos como máximo
  // ESPERA_MAXIMA_MS: con conexión lenta el catálogo se muestra igual.
  const hayCliente = Boolean(cliente);
  useEffect(() => {
    if (!hayCliente || catalogo.imagenesListas) return;
    const timer = setTimeout(() => setEsperaAgotada(true), ESPERA_MAXIMA_MS);
    return () => clearTimeout(timer);
  }, [hayCliente, catalogo.imagenesListas]);

  // Al cerrar sesión, el próximo ingreso arranca en el catálogo
  const [clienteAnterior, setClienteAnterior] = useState(cliente);
  if (cliente !== clienteAnterior) {
    setClienteAnterior(cliente);
    if (!cliente) {
      setVista('catalogo');
      setCarritoAbierto(false);
    }
  }

  const cantidadItems = cart.reduce((acc, item) => acc + item.cantidad, 0);

  const cambiarVista = (nueva: Vista) => {
    setVista(nueva);
    window.scrollTo({ top: 0 });
  };

  // Mientras no se haya montado en el cliente, no renderizamos nada que dependa
  // de estado del cliente (cliente, cart). Esto evita el mismatch de hidratación.
  if (!mounted) {
    return null;
  }

  if (cliente && !catalogo.imagenesListas && !esperaAgotada) {
    return (
      <PantallaCarga
        cargadas={catalogo.imagenesCargadas}
        totales={catalogo.imagenesTotales}
        duracionMs={ESPERA_MAXIMA_MS}
      />
    );
  }

  const navegacion = {
    vista,
    onCambiarVista: cambiarVista,
    cantidadCarrito: cantidadItems,
    onAbrirCarrito: () => setCarritoAbierto(true),
  };

  return (
    <>
      {/* Ingreso con DNI (se muestra mientras no haya cliente) */}
      <ModalIngresoSinSSR />

      {cliente && (
        <div className="min-h-screen bg-brand-light">
          <BarraSuperior {...navegacion} />

          <main>
            {/* El catálogo queda montado para conservar búsqueda y scroll al volver */}
            <div hidden={vista !== 'catalogo'}>
              <Catalogo
                productos={catalogo.productos}
                urlsImagenes={catalogo.urlsImagenes}
                cargando={catalogo.cargandoProductos}
                frecuentes={frecuentes}
              />
            </div>
            {vista === 'pedidos' && (
              <MisPedidos productos={catalogo.productos} onAbrirCarrito={() => setCarritoAbierto(true)} />
            )}
            {vista === 'cuenta' && <MiCuenta />}
          </main>

          <BarraInferior {...navegacion} />

          <AvisoFlotante oculto={carritoAbierto} onVerPedido={() => setCarritoAbierto(true)} />

          <CarritoSidebar
            isOpen={carritoAbierto}
            onClose={() => setCarritoAbierto(false)}
            urlsImagenes={catalogo.urlsImagenes}
          />
        </div>
      )}
    </>
  );
}
