'use client';

import React, { useState } from 'react';
import { CircleCheck, MessageCircle, Store, Truck, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { crearPedido, type ItemConfirmado } from '../services/pedidosService';
import { etiquetaCantidad, formatearPrecio } from '../lib/formato';
import { WHATSAPP_PEDIDOS } from '../lib/config';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ModalCheckoutProps {
  isOpen: boolean;
  // Cierra checkout y carrito (pedido enviado)
  onClose: () => void;
  // Vuelve al carrito sin enviar
  onVolver: () => void;
}

type Paso = 'formulario' | 'enviando' | 'exito' | 'error';
type MetodoEntrega = 'Reparto' | 'Retira en Local';

const METODOS: { valor: MetodoEntrega; titulo: string; icono: typeof Truck }[] = [
  { valor: 'Reparto', titulo: 'Reparto', icono: Truck },
  { valor: 'Retira en Local', titulo: 'Retiro en depósito', icono: Store },
];

// ─── Componente ───────────────────────────────────────────────────────────────
export default function ModalCheckout({ isOpen, onClose, onVolver }: ModalCheckoutProps) {
  const { cart, obtenerTotal, cliente, limpiarCarrito } = useCart();

  const [metodoEntrega, setMetodoEntrega] = useState<MetodoEntrega>('Reparto');
  const [comentarios, setComentarios] = useState('');
  const [paso, setPaso] = useState<Paso>('formulario');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !cliente) return null;

  // Estimado para mostrar; el total real lo calcula el servidor al confirmar
  const total = obtenerTotal();

  // ─── 1. Armar mensaje WhatsApp (con los precios que confirmó el servidor) ──
  const armarMensaje = (pedidoId: string, items: ItemConfirmado[], totalConfirmado: number) => {
    let msg = `*📦 NUEVO PEDIDO - DISTRIBUIDORA MARINI*\n`;
    msg += `-------------------------------------------\n`;
    msg += `*Comercio:* ${cliente.nombre_comercio}\n`;
    msg += `*N° Cuenta:* ${cliente.numero_cliente}\n`;
    msg += `*Método:* ${metodoEntrega}\n`;
    if (comentarios.trim()) msg += `*Notas:* ${comentarios.trim()}\n`;
    msg += `*Ref. pedido:* ${pedidoId.slice(0, 8).toUpperCase()}\n`;
    msg += `-------------------------------------------\n\n`;
    msg += `*DETALLE DEL PEDIDO:*\n`;

    items.forEach((item) => {
      msg += `• ${etiquetaCantidad(item.unidad_medida, item.cantidad)} - ${item.nombre} (${item.marca})\n`;
      msg += `  _${formatearPrecio(item.precio_unitario)} c/u | Subtotal: ${formatearPrecio(item.subtotal)}_\n\n`;
    });

    msg += `-------------------------------------------\n`;
    msg += `*TOTAL ESTIMADO:* ${formatearPrecio(totalConfirmado)}\n`;
    msg += `_⚠️ Sujeto a variaciones según peso final de balanza._`;

    return msg;
  };

  // ─── 2. Handler principal ──────────────────────────────────────────────────
  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaso('enviando');
    setErrorMsg('');

    // Se abre antes del await para que el navegador no la bloquee como popup
    const ventanaWsp = window.open('', '_blank');

    try {
      // Solo mandamos producto + cantidad: precios y total los resuelve el servidor
      const resultado = await crearPedido(
        cliente.numero_cliente,
        cart.map((item) => ({ producto_id: item.producto.id, cantidad: item.cantidad }))
      );
      if (!resultado.ok) throw new Error(resultado.error);

      const mensaje = armarMensaje(resultado.pedidoId, resultado.items, resultado.total);
      const url = `https://api.whatsapp.com/send?phone=${WHATSAPP_PEDIDOS}&text=${encodeURIComponent(mensaje)}`;

      if (ventanaWsp) {
        ventanaWsp.location.href = url;
      } else {
        // Fallback por si igual fue bloqueada
        window.open(url, '_blank');
      }

      setPaso('exito');

      setTimeout(() => {
        limpiarCarrito();
        onClose();
        setPaso('formulario');
        setComentarios('');
      }, 2000);
    } catch (err: unknown) {
      // Si el pedido no se guardó, cerramos la pestaña que quedó en blanco
      ventanaWsp?.close();
      const msg = err instanceof Error ? err.message : 'Error al procesar el pedido';
      setErrorMsg(msg);
      setPaso('error');
    }
  };

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-brand-dark/50 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-checkout"
    >
      <div className="max-h-[92vh] w-full max-w-md space-y-5 overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl safe-bottom sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="titulo-checkout" className="text-lg font-extrabold text-brand-ink">Confirmar pedido</h3>
            <p className="text-[13px] text-brand-muted">Lo registramos y te abrimos WhatsApp para enviarlo.</p>
          </div>
          <button
            type="button"
            onClick={onVolver}
            disabled={paso === 'enviando' || paso === 'exito'}
            aria-label="Volver al carrito"
            className="grid size-11 shrink-0 place-items-center rounded-xl text-brand-muted transition hover:bg-brand-light disabled:opacity-30"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Estado: éxito */}
        {paso === 'exito' && (
          <div className="flex flex-col items-center gap-2 py-8 text-center" role="status">
            <CircleCheck className="size-14 text-[#1E7A4A]" strokeWidth={1.75} aria-hidden="true" />
            <p className="text-lg font-extrabold text-brand-ink">¡Pedido registrado!</p>
            <p className="text-sm text-brand-muted">Te abrimos WhatsApp. Cerrando en un momento...</p>
          </div>
        )}

        {/* Estado: error */}
        {paso === 'error' && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-[#F1C4BE] bg-[#FDECEA] p-4" role="alert">
              <p className="font-bold text-[#B42318]">No se pudo registrar el pedido</p>
              <p className="mt-1 text-sm text-[#8F1D14]">{errorMsg}</p>
            </div>
            <button
              type="button"
              onClick={() => setPaso('formulario')}
              className="h-12 w-full rounded-xl border border-brand-line text-sm font-bold text-brand-ink transition hover:bg-brand-light"
            >
              Volver a intentar
            </button>
          </div>
        )}

        {/* Formulario */}
        {(paso === 'formulario' || paso === 'enviando') && (
          <form onSubmit={handleConfirmar} className="space-y-5">
            {/* Método de entrega */}
            <fieldset>
              <legend className="mb-2 text-[13px] font-bold text-brand-muted">¿Cómo recibís el pedido?</legend>
              <div className="grid grid-cols-2 gap-2">
                {METODOS.map(({ valor, titulo, icono: Icono }) => {
                  const activo = metodoEntrega === valor;
                  return (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => setMetodoEntrega(valor)}
                      aria-pressed={activo}
                      className={`flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 text-sm font-bold transition ${
                        activo
                          ? 'border-brand-dark bg-brand-soft text-brand-dark'
                          : 'border-brand-line text-[#22384F] hover:border-[#C9D6E3]'
                      }`}
                    >
                      <Icono className="size-5" aria-hidden="true" />
                      {titulo}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Comentarios */}
            <div>
              <label htmlFor="comentarios-pedido" className="mb-2 block text-[13px] font-bold text-brand-muted">
                Aclaraciones (opcional)
              </label>
              <textarea
                id="comentarios-pedido"
                rows={2}
                placeholder="Ej: El queso cremoso que sea Barraza..."
                className="w-full resize-none rounded-xl border border-brand-line bg-brand-light/50 px-4 py-3 text-[15px] text-brand-ink outline-none transition placeholder:text-brand-muted focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/15"
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
              />
            </div>

            {/* Resumen */}
            <div className="flex items-center justify-between rounded-2xl bg-brand-light p-4">
              <div>
                <p className="text-[13px] font-semibold text-brand-muted">Total estimado</p>
                <p className="text-xs text-brand-muted">
                  {cart.length} {cart.length === 1 ? 'producto' : 'productos'}
                </p>
              </div>
              <span className="text-xl font-extrabold text-brand-ink">{formatearPrecio(total)}</span>
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={paso === 'enviando'}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#15803D] text-[15px] font-bold text-white transition hover:bg-[#166534] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paso === 'enviando' ? (
                <>
                  <span className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
                  Guardando pedido...
                </>
              ) : (
                <>
                  <MessageCircle className="size-5" aria-hidden="true" />
                  Confirmar y enviar por WhatsApp
                </>
              )}
            </button>

            <p className="text-center text-xs text-brand-muted">
              El pedido queda guardado aunque no envíes el mensaje.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
