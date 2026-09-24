'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Producto } from '../context/CartContext';

const PEDIDOS_A_ANALIZAR = 30;
const MAXIMO_FRECUENTES = 10;

// "Lo que siempre pedís": los productos que aparecen en más pedidos del cliente
// (últimos PEDIDOS_A_ANALIZAR, sin cancelados), filtrados a los que hoy tienen stock.
export function useProductosFrecuentes(documentoCliente: string | null, productos: Producto[]): Producto[] {
  // Guardamos de qué cliente es el conteo para no mostrar el de una sesión anterior
  const [conteo, setConteo] = useState<{ documento: string; veces: Map<number, number> } | null>(null);

  useEffect(() => {
    if (!documentoCliente) return;
    let activo = true;

    supabase
      .from('pedidos')
      .select('items_pedido ( producto_id )')
      .eq('cliente_id', documentoCliente)
      .neq('estado', 'cancelado')
      .order('created_at', { ascending: false })
      .limit(PEDIDOS_A_ANALIZAR)
      .then(({ data, error }) => {
        if (!activo) return;
        if (error) {
          console.error('Error al cargar productos frecuentes:', error);
          return;
        }
        const veces = new Map<number, number>();
        for (const pedido of data ?? []) {
          const items = (pedido.items_pedido ?? []) as { producto_id: number }[];
          // Cada producto cuenta una vez por pedido
          for (const id of new Set(items.map((item) => item.producto_id))) {
            veces.set(id, (veces.get(id) ?? 0) + 1);
          }
        }
        setConteo({ documento: documentoCliente, veces });
      });

    return () => {
      activo = false;
    };
  }, [documentoCliente]);

  return useMemo(() => {
    if (!documentoCliente || conteo?.documento !== documentoCliente) return [];
    const { veces } = conteo;
    return productos
      .filter((producto) => veces.has(producto.id))
      .sort((a, b) => (veces.get(b.id) ?? 0) - (veces.get(a.id) ?? 0))
      .slice(0, MAXIMO_FRECUENTES);
  }, [documentoCliente, conteo, productos]);
}
