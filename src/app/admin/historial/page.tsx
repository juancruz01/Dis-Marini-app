'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import AdminNav from '../../../components/AdminNav';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ItemPedido {
  id: string;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
}

interface Pedido {
  id: string;
  created_at: string;
  cliente_id: string;
  total_estimado: number;
  estado: Estado;
  cliente_nombre?: string;
  items: ItemPedido[];
}

type Periodo = 'hoy' | 'semana' | 'mes' | 'todo';
type Estado = 'confirmado' | 'entregado' | 'cancelado';

function fechaDesde(periodo: Periodo): string | null {
  const ahora = new Date();
  if (periodo === 'hoy') { ahora.setHours(0, 0, 0, 0); return ahora.toISOString(); }
  if (periodo === 'semana') { ahora.setDate(ahora.getDate() - 7); return ahora.toISOString(); }
  if (periodo === 'mes') { ahora.setDate(ahora.getDate() - 30); return ahora.toISOString(); }
  return null;
}

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

const ESTADO_CONFIG: Record<Estado, { label: string; badge: string; icono: string }> = {
  confirmado: { label: 'Confirmado', badge: 'bg-blue-100 text-blue-700',   icono: '✅' },
  entregado:  { label: 'Entregado',  badge: 'bg-green-100 text-green-700', icono: '📦' },
  cancelado:  { label: 'Cancelado',  badge: 'bg-red-100 text-red-600',     icono: '✕' },
};

const TRANSICIONES: Record<Estado, Estado[]> = {
  confirmado: ['entregado', 'cancelado'],
  entregado:  ['cancelado'],
  cancelado:  ['confirmado'],
};

const ESTILOS_BOTON: Record<Estado, string> = {
  entregado:  'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
  cancelado:  'bg-red-50 border-red-200 text-red-600 hover:bg-red-100',
  confirmado: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
};

export default function HistorialPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [busqueda, setBusqueda] = useState('');
  const [pedidoAbierto, setPedidoAbierto] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actualizando, setActualizando] = useState<string | null>(null);

  const cargarPedidos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      let query = supabase
        .from('pedidos')
        .select(`
          id, created_at, cliente_id, total_estimado, estado,
          clientes ( nombre_comercio ),
          items_pedido ( id, producto_nombre, cantidad, precio_unitario )
        `)
        .order('created_at', { ascending: false });

      const desde = fechaDesde(periodo);
      if (desde) query = query.gte('created_at', desde);

      const { data, error: sbError } = await query;
      if (sbError) throw sbError;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapeado: Pedido[] = (data ?? []).map((row: any) => ({
        id: row.id,
        created_at: row.created_at,
        cliente_id: row.cliente_id,
        total_estimado: row.total_estimado,
        estado: row.estado as Estado,
        cliente_nombre: row.clientes?.nombre_comercio ?? row.cliente_id,
        items: row.items_pedido ?? [],
      }));

      setPedidos(mapeado);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar pedidos');
    } finally {
      setCargando(false);
    }
  }, [periodo]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarPedidos();
  }, [cargarPedidos]);

  const cambiarEstado = async (pedidoId: string, nuevoEstado: Estado) => {
    setActualizando(pedidoId);
    try {
      const { error: sbError } = await supabase
        .from('pedidos')
        .update({ estado: nuevoEstado })
        .eq('id', pedidoId);

      if (sbError) throw sbError;

      setPedidos((prev) =>
        prev.map((p) => (p.id === pedidoId ? { ...p, estado: nuevoEstado } : p))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al actualizar el estado');
    } finally {
      setActualizando(null);
    }
  };

  const togglePedido = (id: string) =>
    setPedidoAbierto((prev) => (prev === id ? null : id));

  const pedidosFiltrados = pedidos.filter((p) => {
    const q = busqueda.toLowerCase();
    return (
      p.cliente_nombre?.toLowerCase().includes(q) ||
      p.cliente_id.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  });

  const totalVentas = pedidosFiltrados.reduce((a, p) => a + p.total_estimado, 0);
  const ticketPromedio = pedidosFiltrados.length ? totalVentas / pedidosFiltrados.length : 0;
  const gastoPorCliente = pedidosFiltrados.reduce<Record<string, number>>((acc, p) => {
    const key = p.cliente_nombre ?? p.cliente_id;
    acc[key] = (acc[key] ?? 0) + p.total_estimado;
    return acc;
  }, {});
  const topCliente = Object.entries(gastoPorCliente).sort((a, b) => b[1] - a[1])[0];

  const PERIODOS: { label: string; value: Periodo }[] = [
    { label: 'Hoy', value: 'hoy' },
    { label: '7 días', value: 'semana' },
    { label: '30 días', value: 'mes' },
    { label: 'Todo', value: 'todo' },
  ];

  // ─── Sub-componentes definidos FUERA del return ───────────────────────────
  // BotonesEstado como función normal (no componente anidado) para evitar
  // que React los remonte en cada render y pierda los eventos de click.

  const renderBotonesEstado = (pedido: Pedido) => {
    const enCurso = actualizando === pedido.id;
    const siguientes = TRANSICIONES[pedido.estado] ?? [];

    return (
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-brand-dark/10">
        <span className="text-[10px] text-brand-dark/40 font-bold uppercase self-center mr-1">
          Cambiar a:
        </span>
        {siguientes.map((est) => (
          <button
            key={est}
            disabled={enCurso}
            onClick={(e) => {
              e.stopPropagation();
              cambiarEstado(pedido.id, est);
            }}
            className={`text-[10px] font-black px-3 py-1.5 rounded-lg border transition disabled:opacity-40 ${ESTILOS_BOTON[est]}`}
          >
            {enCurso ? '...' : `${ESTADO_CONFIG[est].icono} ${ESTADO_CONFIG[est].label}`}
          </button>
        ))}
      </div>
    );
  };

  const renderDetalleItems = (pedido: Pedido) => (
    <div className="pt-3 mt-3 border-t border-brand-dark/10 space-y-2">
      <p className="text-[10px] text-brand-dark/40 font-bold uppercase tracking-widest mb-2">
        Productos del pedido
      </p>
      {pedido.items.length === 0 ? (
        <p className="text-brand-dark/30 text-xs">Sin items registrados.</p>
      ) : (
        pedido.items.map((item) => (
          <div
            key={item.id}
            className="flex justify-between items-center bg-white border border-brand-dark/8 rounded-lg px-3 py-2"
          >
            <div>
              <p className="font-bold text-brand-dark text-xs">{item.producto_nombre}</p>
              <p className="text-[10px] text-brand-dark/40">
                {item.cantidad} × {formatPeso(item.precio_unitario)}
              </p>
            </div>
            <p className="font-black text-brand-dark text-xs shrink-0 ml-3">
              {formatPeso(item.cantidad * item.precio_unitario)}
            </p>
          </div>
        ))
      )}
      <div className="flex justify-end pt-2 border-t border-brand-dark/10">
        <p className="text-xs font-black text-brand-dark">
          Total: {formatPeso(pedido.total_estimado)}
        </p>
      </div>
      {renderBotonesEstado(pedido)}
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-light">
      <AdminNav />
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-xl font-black tracking-tight text-brand-dark">Historial de Ventas</h1>
          <p className="text-sm text-brand-dark/50 mt-0.5">Pedidos confirmados por los clientes</p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 flex-wrap">
            {PERIODOS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriodo(p.value)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition border ${
                  periodo === p.value
                    ? 'bg-brand-blue border-brand-blue text-white shadow-sm'
                    : 'bg-white border-brand-dark/15 text-brand-dark/60 hover:border-brand-blue/40 hover:text-brand-blue'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Buscar por cliente o ID..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="bg-white border border-brand-dark/15 rounded-lg px-4 py-2.5 text-sm text-brand-dark placeholder-brand-dark/30 focus:outline-none focus:border-brand-blue w-full"
          />
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-white border border-brand-dark/10 rounded-xl p-3 sm:p-5 shadow-sm">
            <p className="text-[9px] sm:text-[10px] text-brand-dark/40 font-bold uppercase tracking-widest mb-1">Total</p>
            <p className="text-base sm:text-2xl font-black text-brand-dark leading-tight">{formatPeso(totalVentas)}</p>
            <p className="text-[9px] text-brand-dark/40 mt-0.5">{pedidosFiltrados.length} ped.</p>
          </div>
          <div className="bg-white border border-brand-dark/10 rounded-xl p-3 sm:p-5 shadow-sm">
            <p className="text-[9px] sm:text-[10px] text-brand-dark/40 font-bold uppercase tracking-widest mb-1">Promedio</p>
            <p className="text-base sm:text-2xl font-black text-brand-dark leading-tight">{formatPeso(ticketPromedio)}</p>
            <p className="text-[9px] text-brand-dark/40 mt-0.5">por pedido</p>
          </div>
          <div className="bg-white border border-brand-dark/10 rounded-xl p-3 sm:p-5 shadow-sm">
            <p className="text-[9px] sm:text-[10px] text-brand-dark/40 font-bold uppercase tracking-widest mb-1">Top cliente</p>
            <p className="text-xs sm:text-lg font-black text-brand-dark truncate leading-tight">{topCliente?.[0] ?? '—'}</p>
            <p className="text-[9px] text-brand-dark/40 mt-0.5">{topCliente ? formatPeso(topCliente[1]) : 'Sin datos'}</p>
          </div>
        </div>

        {/* Carga / error */}
        {cargando && <div className="text-center py-12 text-brand-dark/40 text-sm">Cargando pedidos...</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>}
        {!cargando && !error && pedidosFiltrados.length === 0 && (
          <div className="text-center py-16 text-brand-dark/30 text-sm bg-white rounded-2xl border border-brand-dark/10">
            No hay pedidos para este período.
          </div>
        )}

        {/* ── MOBILE: cards ─────────────────────────────────────────────────── */}
        {!cargando && !error && pedidosFiltrados.length > 0 && (
          <div className="md:hidden space-y-3">
            {pedidosFiltrados.map((pedido) => {
              const abierto = pedidoAbierto === pedido.id;
              const cfg = ESTADO_CONFIG[pedido.estado] ?? ESTADO_CONFIG.confirmado;
              return (
                <div key={pedido.id} className="bg-white border border-brand-dark/10 rounded-2xl shadow-sm overflow-hidden">
                  {/* ✅ Solo el header expande/colapsa — el detalle queda fuera */}
                  <div
                    onClick={() => togglePedido(pedido.id)}
                    className="px-4 py-4 cursor-pointer select-none"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-black text-brand-dark text-sm truncate">{pedido.cliente_nombre}</p>
                        <p className="text-[10px] text-brand-dark/40 mt-0.5">{formatFecha(pedido.created_at)}</p>
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-1">
                        <p className="font-black text-brand-dark text-sm">{formatPeso(pedido.total_estimado)}</p>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${cfg.badge}`}>
                          {cfg.icono} {cfg.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-[10px] text-brand-dark/30">ID: {pedido.cliente_id}</p>
                      <span className="text-[10px] text-brand-blue font-bold">
                        {abierto ? '▲ Ocultar' : '▼ Ver productos'}
                      </span>
                    </div>
                  </div>
                  {/* ✅ Detalle fuera del área clickeable del header */}
                  {abierto && (
                    <div className="px-4 pb-4">
                      {renderDetalleItems(pedido)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── DESKTOP: tabla ────────────────────────────────────────────────── */}
        {!cargando && !error && pedidosFiltrados.length > 0 && (
          <div className="hidden md:block bg-white border border-brand-dark/10 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-dark/10 text-[11px] text-brand-dark/40 uppercase tracking-wider bg-brand-light">
                  <th className="text-left px-5 py-3 font-bold">Fecha y hora</th>
                  <th className="text-left px-5 py-3 font-bold">Cliente</th>
                  <th className="text-right px-5 py-3 font-bold">Total</th>
                  <th className="text-center px-5 py-3 font-bold">Estado</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map((pedido, i) => {
                  const cfg = ESTADO_CONFIG[pedido.estado] ?? ESTADO_CONFIG.confirmado;
                  return (
                    <React.Fragment key={pedido.id}>
                      <tr
                        className={`border-b border-brand-dark/5 hover:bg-brand-light/60 transition cursor-pointer ${
                          i % 2 === 0 ? 'bg-white' : 'bg-brand-light/30'
                        }`}
                        onClick={() => togglePedido(pedido.id)}
                      >
                        <td className="px-5 py-4 text-brand-dark/60 whitespace-nowrap">{formatFecha(pedido.created_at)}</td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-brand-dark">{pedido.cliente_nombre}</p>
                          <p className="text-[10px] text-brand-dark/40">ID: {pedido.cliente_id}</p>
                        </td>
                        <td className="px-5 py-4 text-right font-black text-brand-dark">{formatPeso(pedido.total_estimado)}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${cfg.badge}`}>
                            {cfg.icono} {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-brand-dark/30 text-xs text-right">
                          {pedidoAbierto === pedido.id ? '▲' : '▼'}
                        </td>
                      </tr>
                      {pedidoAbierto === pedido.id && (
                        <tr className="bg-brand-light/50">
                          <td colSpan={5} className="px-5 py-4">
                            {renderDetalleItems(pedido)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
