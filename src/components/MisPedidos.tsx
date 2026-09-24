'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ClipboardList, RotateCcw } from 'lucide-react';
import { useCart } from '../context/CartContext';
import type { Producto } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { cancelarPedido as cancelarPedidoServidor } from '../services/pedidosService';
import { etiquetaCantidad, formatearPrecio } from '../lib/formato';
import EncabezadoVista from './tienda/EncabezadoVista';

interface ItemPedido {
  id: string;
  producto_id: number;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
}

type Estado = 'confirmado' | 'entregado' | 'cancelado';

interface Pedido {
  id: string;
  created_at: string;
  total_estimado: number;
  estado: Estado;
  items: ItemPedido[];
}

const ESTADOS: Record<Estado, { label: string; clase: string }> = {
  confirmado: { label: 'Confirmado', clase: 'bg-brand-soft text-[#0B4F8A]' },
  entregado: { label: 'Entregado', clase: 'bg-[#E8F6EE] text-[#1E6B3F]' },
  cancelado: { label: 'Cancelado', clase: 'bg-[#FDECEA] text-[#B42318]' },
};

const ITEMS_VISIBLES = 2;

// "Hoy, 10:42" · "Ayer, 18:05" · "lun 21/09, 09:15"
function formatFecha(iso: string): string {
  const fecha = new Date(iso);
  const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  if (fecha.toDateString() === hoy.toDateString()) return `Hoy, ${hora}`;
  if (fecha.toDateString() === ayer.toDateString()) return `Ayer, ${hora}`;
  const dia = fecha.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  return `${dia.replace('.', '')}, ${hora}`;
}

export default function MisPedidos({
  productos,
  onAbrirCarrito,
}: {
  productos: Producto[];
  onAbrirCarrito: () => void;
}) {
  const { cliente, agregarAlCarrito, mostrarAviso } = useCart();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());

  const productosPorId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);

  const cargarPedidos = useCallback(async () => {
    if (!cliente) return;
    setCargando(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase
        .from('pedidos')
        .select(`
          id, created_at, total_estimado, estado,
          items_pedido ( id, producto_id, producto_nombre, cantidad, precio_unitario )
        `)
        .eq('cliente_id', cliente.numero_cliente)
        .order('created_at', { ascending: false });

      if (sbError) throw sbError;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapeado: Pedido[] = (data ?? []).map((row: any) => ({
        id: row.id,
        created_at: row.created_at,
        total_estimado: row.total_estimado,
        estado: row.estado as Estado,
        items: row.items_pedido ?? [],
      }));
      setPedidos(mapeado);
    } catch (err: unknown) {
      console.error('Error al cargar pedidos:', err);
      setError('No pudimos cargar tus pedidos. Revisá tu conexión e intentá de nuevo.');
    } finally {
      setCargando(false);
    }
  }, [cliente]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarPedidos();
  }, [cargarPedidos]);

  // Resumen del mes en curso (sin cancelados)
  const resumenMes = useMemo(() => {
    const ahora = new Date();
    const delMes = pedidos.filter((p) => {
      const fecha = new Date(p.created_at);
      return (
        p.estado !== 'cancelado' &&
        fecha.getMonth() === ahora.getMonth() &&
        fecha.getFullYear() === ahora.getFullYear()
      );
    });
    return { cantidad: delMes.length, total: delMes.reduce((acc, p) => acc + p.total_estimado, 0) };
  }, [pedidos]);

  const etiquetaItem = (item: ItemPedido) => {
    const producto = productosPorId.get(item.producto_id);
    return producto ? etiquetaCantidad(producto.unidad_medida, item.cantidad) : `${item.cantidad} ×`;
  };

  const cancelarPedido = async (pedidoId: string) => {
    if (!cliente) return;
    if (!confirm('¿Seguro que querés cancelar este pedido?')) return;

    setCancelando(pedidoId);
    try {
      // Va por el servidor: el navegador no tiene permiso de modificar pedidos
      const resultado = await cancelarPedidoServidor(cliente.numero_cliente, pedidoId);
      if (!resultado.ok) throw new Error(resultado.error);

      setPedidos((prev) => prev.map((p) => (p.id === pedidoId ? { ...p, estado: 'cancelado' } : p)));
      mostrarAviso('Pedido cancelado');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'No se pudo cancelar el pedido');
    } finally {
      setCancelando(null);
    }
  };

  // Carga en el carrito los productos del pedido que hoy siguen disponibles, a precio actual
  const repetirPedido = (pedido: Pedido) => {
    let agregados = 0;
    let sinStock = 0;
    for (const item of pedido.items) {
      const producto = productosPorId.get(item.producto_id);
      if (producto) {
        agregarAlCarrito(producto, item.cantidad);
        agregados++;
      } else {
        sinStock++;
      }
    }

    if (agregados === 0) {
      mostrarAviso('Ninguno de esos productos está disponible hoy');
      return;
    }
    const texto = agregados === 1 ? 'Agregamos 1 producto' : `Agregamos ${agregados} productos`;
    mostrarAviso(sinStock > 0 ? `${texto} · ${sinStock} sin stock` : `${texto} al carrito`);
    onAbrirCarrito();
  };

  const alternarDetalle = (id: string) =>
    setAbiertos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });

  return (
    <>
      <EncabezadoVista>
        <h1 className="text-[22px] font-extrabold text-white">Mis pedidos</h1>
        <div className="grid grid-cols-2 gap-2.5 md:max-w-md">
          <div className="rounded-xl bg-white/10 px-3 py-2.5">
            <p className="text-xs font-semibold text-[#B9C9DA]">Pedidos este mes</p>
            <p className="text-xl font-extrabold text-white">{cargando ? '–' : resumenMes.cantidad}</p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2.5">
            <p className="text-xs font-semibold text-[#B9C9DA]">Total del mes</p>
            <p className="text-xl font-extrabold text-white">{cargando ? '–' : formatearPrecio(resumenMes.total)}</p>
          </div>
        </div>
      </EncabezadoVista>

      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 pb-28 pt-4 md:pb-12">
        {cargando && (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Cargando pedidos">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl border border-brand-line bg-white" />
            ))}
          </div>
        )}

        {!cargando && error && (
          <div className="rounded-2xl border border-[#F1C4BE] bg-[#FDECEA] p-4 text-sm font-semibold text-[#B42318]">
            {error}
            <button type="button" onClick={cargarPedidos} className="mt-2 block font-bold underline">
              Reintentar
            </button>
          </div>
        )}

        {!cargando && !error && pedidos.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-brand-line bg-white px-6 py-14 text-center">
            <ClipboardList className="size-10 text-[#9AAABB]" strokeWidth={1.5} aria-hidden="true" />
            <p className="font-bold text-brand-ink">Todavía no hiciste ningún pedido</p>
            <p className="text-sm text-brand-muted">Cuando confirmes uno, lo vas a ver acá.</p>
          </div>
        )}

        {!cargando && !error && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {pedidos.map((pedido) => {
              const estado = ESTADOS[pedido.estado] ?? ESTADOS.confirmado;
              const abierto = abiertos.has(pedido.id);
              const itemsVisibles = abierto ? pedido.items : pedido.items.slice(0, ITEMS_VISIBLES);
              const ocultos = pedido.items.length - itemsVisibles.length;

              return (
                <article key={pedido.id} className="flex flex-col gap-3 rounded-2xl border border-brand-line bg-white p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[15px] font-extrabold text-brand-ink">{formatFecha(pedido.created_at)}</p>
                      <p className="text-xs font-semibold text-brand-muted">Ref. {pedido.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${estado.clase}`}>
                      {estado.label}
                    </span>
                  </div>

                  <ul className="flex flex-col gap-1.5 border-t border-[#EEF2F7] pt-3 text-sm">
                    {itemsVisibles.map((item) => (
                      <li key={item.id} className="flex justify-between gap-3">
                        <span className="min-w-0 text-[#22384F]">
                          <span className="font-semibold">{etiquetaItem(item)}</span> {item.producto_nombre}
                        </span>
                        <span className="shrink-0 font-bold text-brand-ink">
                          {formatearPrecio(item.cantidad * item.precio_unitario)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {(ocultos > 0 || (abierto && pedido.items.length > ITEMS_VISIBLES)) && (
                    <button
                      type="button"
                      onClick={() => alternarDetalle(pedido.id)}
                      aria-expanded={abierto}
                      className="-mt-1 flex items-center gap-1 self-start text-sm font-bold text-brand-link"
                    >
                      {abierto ? 'Ver menos' : `+ ${ocultos} ${ocultos === 1 ? 'producto más' : 'productos más'}`}
                      <ChevronDown className={`size-4 transition ${abierto ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                  )}

                  <div className="flex items-baseline justify-between border-t border-[#EEF2F7] pt-3">
                    <span className="text-[13px] font-semibold text-brand-muted">Total estimado</span>
                    <span className="text-[19px] font-extrabold text-brand-ink">{formatearPrecio(pedido.total_estimado)}</span>
                  </div>

                  <div className={`grid gap-2 ${pedido.estado === 'confirmado' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {pedido.estado === 'confirmado' && (
                      <button
                        type="button"
                        onClick={() => cancelarPedido(pedido.id)}
                        disabled={cancelando === pedido.id}
                        className="h-11 rounded-xl border border-[#F1C4BE] bg-white text-sm font-bold text-[#B42318] transition hover:bg-[#FDECEA] disabled:opacity-50"
                      >
                        {cancelando === pedido.id ? 'Cancelando...' : 'Cancelar'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => repetirPedido(pedido)}
                      className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-brand-dark text-sm font-bold text-white transition hover:bg-brand-ink active:scale-[0.98]"
                    >
                      <RotateCcw className="size-[17px]" strokeWidth={2.5} aria-hidden="true" />
                      {pedido.estado === 'confirmado' ? 'Repetir' : 'Repetir pedido'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
