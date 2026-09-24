'use client';

import React, { useEffect } from 'react';
import { Check } from 'lucide-react';
import { useCart } from '../../context/CartContext';

const DURACION_MS = 2500;

// Confirma acciones rápidas ("Queso Cremoso · 2 hormas") sin interrumpir la compra
export default function AvisoFlotante({
  oculto,
  onVerPedido,
}: {
  oculto: boolean;
  onVerPedido: () => void;
}) {
  const { aviso, descartarAviso } = useCart();

  useEffect(() => {
    if (!aviso) return;
    const timer = setTimeout(descartarAviso, DURACION_MS);
    return () => clearTimeout(timer);
  }, [aviso, descartarAviso]);

  if (!aviso || oculto) return null;

  return (
    <div
      role="status"
      key={aviso.id}
      className="fixed inset-x-4 bottom-[88px] z-40 mx-auto flex max-w-md animate-[aviso-entrada_180ms_ease-out] items-center gap-2.5 rounded-[14px] bg-brand-ink px-3.5 py-3 text-white shadow-[0_12px_28px_rgba(15,27,42,0.3)] md:bottom-6"
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#1E7A4A]" aria-hidden="true">
        <Check className="size-4" strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{aviso.texto}</span>
      <button
        type="button"
        onClick={() => {
          descartarAviso();
          onVerPedido();
        }}
        className="shrink-0 px-1 text-sm font-bold text-[#8CC8FF]"
      >
        Ver pedido
      </button>
    </div>
  );
}
