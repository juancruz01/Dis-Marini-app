'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useCart } from '../context/CartContext';

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ModalCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
}

type Paso = 'formulario' | 'enviando' | 'exito' | 'error';

// ─── Componente ───────────────────────────────────────────────────────────────
export default function ModalCheckout({ isOpen, onClose }: ModalCheckoutProps) {
  const { cart, obtenerTotal, cliente, limpiarCarrito } = useCart();

  const [metodoEntrega, setMetodoEntrega] = useState<'Reparto' | 'Retira en Local'>('Reparto');
  const [comentarios, setComentarios] = useState('');
  const [paso, setPaso] = useState<Paso>('formulario');
  const [errorMsg, setErrorMsg] = useState('');

  const [nombreInvitado, setNombreInvitado] = useState('');
  const [telefonoInvitado, setTelefonoInvitado] = useState('');
  const [direccionInvitado, setDireccionInvitado] = useState('');

  if (!isOpen || !cliente) return null;

  const esInvitado =
    cliente.numero_cliente === '9999' ||
    cliente.nombre_comercio.toLowerCase().includes('invitado');

  const total = obtenerTotal();

  // ─── 1. Guardar en Supabase ────────────────────────────────────────────────
  const guardarEnSupabase = async (): Promise<string> => {
    const { data: pedidoData, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({
        cliente_id: cliente.numero_cliente,
        total_estimado: total,
        estado: 'confirmado',
      })
      .select('id')
      .single();

    if (pedidoError || !pedidoData) {
      throw new Error(pedidoError?.message ?? 'No se pudo crear el pedido');
    }

    const items = cart.map((item) => ({
      pedido_id: pedidoData.id,
      producto_id: item.producto.id,
      producto_nombre: item.producto.nombre,
      cantidad: item.cantidad,
      precio_unitario: item.precioAplicado,
    }));

    const { error: itemsError } = await supabase.from('items_pedido').insert(items);
    if (itemsError) throw new Error(itemsError.message);

    return pedidoData.id as string;
  };

  // ─── 2. Armar mensaje WhatsApp ─────────────────────────────────────────────
  const armarMensaje = (pedidoId: string) => {
    const nombreComercio = esInvitado ? nombreInvitado.trim() : cliente.nombre_comercio;
    const cuentaLinea = esInvitado
      ? `*Teléfono:* ${telefonoInvitado.trim()}\n*Dirección:* ${direccionInvitado.trim()}\n`
      : `*N° Cuenta:* ${cliente.numero_cliente}\n`;

    let msg = `*📦 NUEVO PEDIDO - DISTRIBUIDORA MARINI*\n`;
    msg += `-------------------------------------------\n`;
    if (esInvitado) msg += `*⚠️ CLIENTE NUEVO / INVITADO*\n`;
    msg += `*Comercio:* ${nombreComercio}\n`;
    msg += cuentaLinea;
    msg += `*Método:* ${metodoEntrega}\n`;
    if (comentarios.trim()) msg += `*Notas:* ${comentarios.trim()}\n`;
    msg += `*Ref. pedido:* ${pedidoId.slice(0, 8).toUpperCase()}\n`;
    msg += `-------------------------------------------\n\n`;
    msg += `*DETALLE DEL PEDIDO:*\n`;

    cart.forEach((item) => {
      const sub = item.precioAplicado * item.cantidad;
      msg += `• ${item.cantidad} x ${item.producto.nombre} (${item.producto.marca})\n`;
      msg += `  _$${item.precioAplicado.toLocaleString('es-AR')} c/u | Subtotal: $${sub.toLocaleString('es-AR')}_\n\n`;
    });

    msg += `-------------------------------------------\n`;
    msg += `*TOTAL ESTIMADO:* $${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n`;
    msg += `_⚠️ Sujeto a variaciones según peso final de balanza._`;

    return msg;
  };

  // ─── 3. Handler principal ──────────────────────────────────────────────────
  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaso('enviando');
    setErrorMsg('');

    try {
      const pedidoId = await guardarEnSupabase();

      const mensaje = armarMensaje(pedidoId);
      const url = `https://api.whatsapp.com/send?phone=541159320255&text=${encodeURIComponent(mensaje)}`;
      window.open(url, '_blank');

      setPaso('exito');

      setTimeout(() => {
        limpiarCarrito();
        onClose();
        setPaso('formulario');
        setComentarios('');
        setNombreInvitado('');
        setTelefonoInvitado('');
        setDireccionInvitado('');
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el pedido';
      setErrorMsg(msg);
      setPaso('error');
    }
  };

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-55 bg-brand-dark/50 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-brand-dark">Finalizar Pedido</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Complete los datos para enviar la orden de compra.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={paso === 'enviando'}
            className="text-gray-400 hover:text-gray-600 text-sm p-2 disabled:opacity-30"
          >
            ✕
          </button>
        </div>

        {/* Estado: éxito */}
        {paso === 'exito' && (
          <div className="text-center py-8 space-y-2">
            <p className="text-4xl">✅</p>
            <p className="font-black text-brand-dark text-lg">¡Pedido registrado!</p>
            <p className="text-xs text-gray-400">WhatsApp abierto. Cerrando en un momento...</p>
          </div>
        )}

        {/* Estado: error */}
        {paso === 'error' && (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">
              <p className="font-bold mb-1">No se pudo registrar el pedido</p>
              <p className="text-xs text-red-400">{errorMsg}</p>
            </div>
            <button
              onClick={() => setPaso('formulario')}
              className="w-full py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
            >
              Volver a intentar
            </button>
          </div>
        )}

        {/* Formulario */}
        {(paso === 'formulario' || paso === 'enviando') && (
          <form onSubmit={handleConfirmar} className="space-y-4 text-xs">

            {/* Campos invitado */}
            {esInvitado && (
              <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl space-y-3">
                <span className="block font-black text-amber-800 text-[10px] uppercase tracking-wider">
                  📋 Datos de contacto comercial
                </span>
                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">
                    Nombre del comercio / almacén
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Fiambrería San Cayetano"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-sm outline-none focus:border-brand-blue"
                    value={nombreInvitado}
                    onChange={(e) => setNombreInvitado(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">
                      Teléfono móvil
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej: 1123456789"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-sm outline-none focus:border-brand-blue"
                      value={telefonoInvitado}
                      onChange={(e) => setTelefonoInvitado(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">
                      Dirección del local
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Av. Mitre 1234, Avellaneda"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-sm outline-none focus:border-brand-blue"
                      value={direccionInvitado}
                      onChange={(e) => setDireccionInvitado(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Método de entrega */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                ¿Cómo recibe el pedido?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Reparto', 'Retira en Local'] as const).map((opcion) => (
                  <button
                    key={opcion}
                    type="button"
                    onClick={() => setMetodoEntrega(opcion)}
                    className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${
                      metodoEntrega === opcion
                        ? 'border-brand-blue bg-brand-light text-brand-blue shadow-xs'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opcion === 'Reparto' ? '🚚 Reparto programado' : '🏪 Retiro en depósito'}
                  </button>
                ))}
              </div>
            </div>

            {/* Comentarios */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Aclaraciones adicionales (opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Ej: El queso cremoso que sea Barraza..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 text-sm font-medium transition text-gray-800 bg-gray-50/30 resize-none"
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
              />
            </div>

            {/* Resumen */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Total estimado</span>
                <span className="text-[10px] text-gray-300">
                  ({cart.length} {cart.length === 1 ? 'producto' : 'productos'})
                </span>
              </div>
              <span className="text-xl font-black text-brand-dark">
                ${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={paso === 'enviando'}
              className="w-full bg-[#25D366] text-white font-bold py-4 rounded-xl hover:bg-[#20ba5a] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 text-sm uppercase tracking-wider disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {paso === 'enviando' ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando pedido...
                </>
              ) : (
                <>
                  <span className="text-base">💬</span> Confirmar y enviar por WhatsApp
                </>
              )}
            </button>

            <p className="text-center text-[10px] text-gray-300">
              El pedido se guarda automáticamente antes de abrir WhatsApp.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
