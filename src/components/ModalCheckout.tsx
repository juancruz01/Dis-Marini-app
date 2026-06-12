'use client';

import React, { useState } from 'react';
import { useCart } from '../context/CartContext';

interface ModalCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalCheckout({ isOpen, onClose }: ModalCheckoutProps) {
  const { cart, obtenerTotal, cliente, limpiarCarrito } = useCart();
  
  //Estados estándar del formulario
  const [metodoEntrega, setMetodoEntrega] = useState('Reparto');
  const [comentarios, setComentarios] = useState('');
  const [enviando, setEnviando] = useState(false);

  //ESTADOS: Exclusivos para clientes nuevos / invitados
  const [nombreInvitado, setNombreInvitado] = useState('');
  const [telefonoInvitado, setTelefonoInvitado] = useState('');
  const [direccionInvitado, setDireccionInvitado] = useState('');

  if (!isOpen || !cliente) return null;

  // Evaluamos si el cliente actual es un invitado
  const esInvitado = cliente.numero_cliente === '9999' || cliente.nombre_comercio.toLowerCase().includes('invitado');

  const enviarPorWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);

    const telefonoDistribuidora = '541159320255'; 

    let mensaje = `*📦 NUEVO PEDIDO - DISTRIBUIDORA MARINI*\n`;
    mensaje += `-------------------------------------------\n`;
    
    if (esInvitado) {
      mensaje += `*⚠️ CLIENTE NUEVO / INVITADO*\n`;
      mensaje += `*Comercio:* ${nombreInvitado.trim()}\n`;
      mensaje += `*Teléfono:* ${telefonoInvitado.trim()}\n`;
      mensaje += `*Dirección:* ${direccionInvitado.trim()}\n`;
    } else {
      mensaje += `*Cliente:* ${cliente.nombre_comercio}\n`;
      mensaje += `*N° Cuenta:* ${cliente.numero_cliente}\n`;
    }

    mensaje += `*Método:* ${metodoEntrega}\n`;
    if (comentarios.trim()) {
      mensaje += `*Notas:* ${comentarios.trim()}\n`;
    }
    mensaje += `-------------------------------------------\n\n`;

    // 2. Detallar los productos del carrito
    mensaje += `*DETALLE DEL PEDIDO:*\n`;
    cart.forEach((item) => {
      const subtotalItem = item.precioAplicado * item.cantidad;
      mensaje += `• ${item.cantidad} x ${item.producto.nombre} (${item.producto.marca})\n`;
      mensaje += `  _Precio: $${item.precioAplicado.toLocaleString('es-AR')} c/u | Subtotal: $${subtotalItem.toLocaleString('es-AR')}_\n\n`;
    });

    // 3. Agregar el total estimado
    mensaje += `-------------------------------------------\n`;
    mensaje += `*TOTAL ESTIMADO:* $${obtenerTotal().toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n`;
    mensaje += `_⚠️ Sujeto a variaciones según peso final de balanza._`;

    // 4. Enviar a WhatsApp
    const mensajeCodificado = encodeURIComponent(mensaje);
    const urlWhatsApp = `https://api.whatsapp.com/send?phone=${telefonoDistribuidora}&text=${mensajeCodificado}`;

    window.open(urlWhatsApp, '_blank');
    
    setTimeout(() => {
      limpiarCarrito();
      onClose();
      setEnviando(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-55 bg-brand-dark/50 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-brand-dark">Finalizar Pedido</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Complete los datos para enviar la orden de compra.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm p-2">✕</button>
        </div>

        <form onSubmit={enviarPorWhatsApp} className="space-y-4 text-xs">
          
          {/* CAMPOS EXCLUSIVOS PARA INVITADOS(no clientes) */}
          {esInvitado && (
            <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl space-y-3">
              <span className="block font-black text-amber-800 text-[10px] uppercase tracking-wider">
                📋 Datos de contacto comercial
              </span>
              
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Nombre de su Comercio / Almacén</label>
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
                  <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Teléfono Móvil</label>
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
                  <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Dirección del Local</label>
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

          {/* Opción de Entrega */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              ¿Cómo recibe el pedido?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMetodoEntrega('Reparto')}
                className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${
                  metodoEntrega === 'Reparto'
                    ? 'border-brand-blue bg-brand-light text-brand-blue shadow-xs'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                🚚 Reparto programado
              </button>
              <button
                type="button"
                onClick={() => setMetodoEntrega('Retira en Local')}
                className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${
                  metodoEntrega === 'Retira en Local'
                    ? 'border-brand-blue bg-brand-light text-brand-blue shadow-xs'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                🏪 Retiro en depósito
              </button>
            </div>
          </div>

          {/* Notas o Comentarios */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Aclaraciones adicionales (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ej: El queso cremoso que sea Barraza..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 text-sm font-medium transition text-gray-800 bg-gray-50/30 resize-none"
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
            />
          </div>

          {/* Resumen rápido */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-400 uppercase">Total a enviar:</span>
            <span className="text-xl font-black text-brand-dark">
              ${obtenerTotal().toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Botón de envío */}
          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-[#25D366] text-white font-bold py-4 rounded-xl hover:bg-[#20ba5a] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 text-sm uppercase tracking-wider disabled:bg-gray-300"
          >
            {enviando ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span className="text-base">💬</span> Enviar por WhatsApp
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}