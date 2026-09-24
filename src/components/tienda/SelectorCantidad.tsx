'use client';

import React, { useState } from 'react';
import { Minus, Plus } from 'lucide-react';

// − [cantidad] +  · El número también se puede escribir (ej. 24) en vez de tocar + 24 veces.
// Poner 0 quita el producto del carrito.
export default function SelectorCantidad({
  cantidad,
  nombre,
  onCambiar,
}: {
  cantidad: number;
  nombre: string;
  onCambiar: (cantidad: number) => void;
}) {
  // Mientras se escribe, el texto vive acá; se confirma al salir del campo o con Enter
  const [editando, setEditando] = useState<string | null>(null);

  const confirmar = () => {
    const valor = parseInt(editando ?? '', 10);
    if (!Number.isNaN(valor)) onCambiar(valor);
    setEditando(null);
  };

  return (
    <div className="flex items-center gap-1 rounded-2xl bg-[#F1F5FA] p-[3px]">
      <button
        type="button"
        onClick={() => onCambiar(cantidad - 1)}
        aria-label={`Quitar uno de ${nombre}`}
        className="grid size-11 place-items-center rounded-xl bg-white text-brand-dark shadow-xs transition active:scale-95"
      >
        <Minus className="size-[18px]" strokeWidth={2.5} aria-hidden="true" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={`Cantidad de ${nombre}`}
        value={editando ?? String(cantidad)}
        onFocus={(e) => {
          setEditando(String(cantidad));
          e.target.select();
        }}
        onChange={(e) => setEditando(e.target.value.replace(/\D/g, '').slice(0, 4))}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        className="w-10 bg-transparent text-center text-[17px] font-extrabold text-brand-dark outline-none focus:rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-blue/40"
      />
      <button
        type="button"
        onClick={() => onCambiar(cantidad + 1)}
        aria-label={`Agregar uno de ${nombre}`}
        className="grid size-11 place-items-center rounded-xl bg-brand-dark text-white transition active:scale-95"
      >
        <Plus className="size-[18px]" strokeWidth={2.5} aria-hidden="true" />
      </button>
    </div>
  );
}
