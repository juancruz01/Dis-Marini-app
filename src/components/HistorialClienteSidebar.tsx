'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';

interface ItemPedido {
  id: string;
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

interface HistorialClienteSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ESTADO_CONFIG: Record<Estado, { label: string; badge: string; icono: string }> = {
  confirmado: { label: 'Confirmado', badge: 'bg-blue-100 text-blue-700', icono: '✅' },
  entregado: { label: 'Entregado', badge: 'bg-green-100 text-green-700', icono: '📦' },
  cancelado: { label: 'Cancelado', badge: 'bg-red-100 text-red-600', icono: '✕' },
};

function formatFecha(iso: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

function formatPeso(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n);
}

export default function HistorialClienteSidebar({ isOpen, onClose }: HistorialClienteSidebarProps) {
  const { cliente } = useCart();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);

  const cargarPedidos = useCallback(async () => {
    if (!cliente) return;
    setCargando(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase
        .from('pedidos')
        .select(`
          id, created_at, total_estimado, estado,
          items_pedido ( id, producto_nombre, cantidad, precio_unitario )
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
      setError(err instanceof Error ? err.message : 'Error al cargar tus pedidos');
    } finally {
      setCargando(false);
    }
  }, [cliente]);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      cargarPedidos();
    }
  }, [isOpen, cargarPedidos]);

  const cancelarPedido = async (pedidoId: string) => {
    if (!cliente) return;
    if (!confirm('¿Seguro que querés cancelar este pedido?')) return;

    setCancelando(pedidoId);
    try {
      const { error: sbError } = await supabase
        .from('pedidos')
        .update({ estado: 'cancelado' })
        .eq('id', pedidoId)
        .eq('cliente_id', cliente.numero_cliente);

      if (sbError) throw sbError;

      setPedidos((prev) =>
        prev.map((p) => (p.id === pedidoId ? { ...p, estado: 'cancelado' } : p))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'No se pudo cancelar el pedido');
    } finally {
      setCancelando(null);
    }
  };

  if (!isOpen) return null;

  const totalGastado = pedidos
    .filter((p) => p.estado !== 'cancelado')
    .reduce((acc, p) => acc + p.total_estimado, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Fondo oscuro con desenfoque */}
      <div
        className="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">

          {/* TÍTULO */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-brand-dark text-white">
            <div>
              <h2 className="text-lg font-black tracking-tight">Mis Pedidos</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Historial de compras de tu comercio</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl p-2 rounded-lg hover:bg-white/10 transition"
            >
              ✕
            </button>
          </div>

          {/* Resumen de gasto total */}
          {!cargando && !error && pedidos.length > 0 && (
            <div className="px-6 py-4 bg-brand-light border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total gastado</span>
                <span className="text-[10px] text-gray-400">{pedidos.length} {pedidos.length === 1 ? 'pedido' : 'pedidos'}</span>
              </div>
              <span className="text-xl font-black text-brand-dark">{formatPeso(totalGastado)}</span>
            </div>
          )}

          {/* LISTA DE PEDIDOS */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
            {cargando && (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">Cargando pedidos...</div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">{error}</div>
            )}

            {!cargando && !error && pedidos.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 gap-2">
                <span className="text-4xl">📋</span>
                <p className="text-sm font-medium">Todavía no hiciste ningún pedido.</p>
              </div>
            )}

            {!cargando && !error && pedidos.map((pedido) => {
              const cfg = ESTADO_CONFIG[pedido.estado] ?? ESTADO_CONFIG.confirmado;
              const puedeCancelar = pedido.estado === 'confirmado';
              return (
                <div
                  key={pedido.id}
                  className="bg-white border border-gray-200/60 rounded-xl p-4 shadow-xs space-y-3"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-xs font-bold text-brand-dark">{formatFecha(pedido.created_at)}</p>
                      <p className="text-[10px] text-gray-400">Ref: {pedido.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase shrink-0 ${cfg.badge}`}>
                      {cfg.icono} {cfg.label}
                    </span>
                  </div>

                  <div className="space-y-1.5 border-t border-gray-100 pt-3">
                    {pedido.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 truncate pr-2">{item.cantidad} × {item.producto_nombre}</span>
                        <span className="font-bold text-brand-dark shrink-0">
                          {formatPeso(item.cantidad * item.precio_unitario)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</span>
                    <span className="font-black text-brand-dark text-sm">{formatPeso(pedido.total_estimado)}</span>
                  </div>

                  {puedeCancelar && (
                    <button
                      onClick={() => cancelarPedido(pedido.id)}
                      disabled={cancelando === pedido.id}
                      className="w-full text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg py-2.5 transition disabled:opacity-50"
                    >
                      {cancelando === pedido.id ? 'Cancelando...' : '✕ Cancelar pedido'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
