'use client';

import React, { useState } from 'react';
import { useCart } from '../context/CartContext';

interface ModalCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalCheckout({ isOpen, onClose }: ModalCheckoutProps) {
  const { cart, obtenerTotal, cliente, limpiarCarrito } = useCart();
  
  // Estados del formulario
  const [metodoEntrega, setMetodoEntrega] = useState('Reparto');
  const [comentarios, setComentarios] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!isOpen || !cliente) return null;

  const enviarPorWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);

    // 1. Número de teléfono de la Distribuidora (Formato internacional, ej: 54911...)
    // Cambialo por el número real de tu cliente
    const telefonoDistribuidora = '5491159320255'; 

    // 2. Construir el encabezado del mensaje
    let mensaje = `*📦 NUEVO PEDIDO - DISTRIBUIDORA MARINI*\n`;
    mensaje += `-------------------------------------------\n`;
    mensaje += `*Cliente:* ${cliente.nombre_comercio}\n`;
    mensaje += `*N° Cuenta:* ${cliente.numero_cliente}\n`;
    mensaje += `*Tarifa Aplicada:* Lista ${cliente.lista_asignada}\n`;
    mensaje += `*Método:* ${metodoEntrega}\n`;
    if (comentarios.trim()) {
      mensaje += `*Notas:* ${comentarios.trim()}\n`;
    }
    mensaje += `-------------------------------------------\n\n`;

    // 3. Detallar los productos del carrito
    mensaje += `*DETALLE DEL PEDIDO:*\n`;
    cart.forEach((item) => {
      const subtotalItem = item.precioAplicado * item.cantidad;
      mensaje += `• ${item.cantidad} x ${item.producto.nombre} (${item.producto.marca})\n`;
      mensaje += `  _Precio: $${item.precioAplicado.toLocaleString('es-AR')} c/u | Subtotal: $${subtotalItem.toLocaleString('es-AR')}_\n\n`;
    });

    // 4. Agregar el total estimado
    mensaje += `-------------------------------------------\n`;
    mensaje += `*TOTAL ESTIMADO:* $${obtenerTotal().toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n`;
    mensaje += `_⚠️ Sujeto a variaciones según peso final de balanza._`;

    // 5. Codificar el texto para URL
    const mensajeCodificado = encodeURIComponent(mensaje);
    
    // 6. Detectar si es móvil o escritorio para usar api.whatsapp o web.whatsapp
    const urlWhatsApp = `https://api.whatsapp.com/send?phone=${telefonoDistribuidora}&text=${mensajeCodificado}`;

    // 7. Abrir WhatsApp y limpiar el estado para una nueva compra
    window.open(urlWhatsApp, '_blank');
    
    setTimeout(() => {
      limpiarCarrito(); // Vacía el carrito local tras enviar
      onClose();
      setEnviando(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-55 bg-brand-dark/50 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-black text-brand-dark">Finalizar Pedido</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
        </div>

        <form onSubmit={enviarPorWhatsApp} className="space-y-4">
          
          {/* Opción de Entrega */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
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
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Aclaraciones adicionales (Opcional)
            </label>
            <textarea
              rows={3}
              placeholder="Ej: El queso cremoso que sea Barraza. Entregar antes de las 12hs..."
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

          {/* Botón de envío de WhatsApp */}
          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-[#25D366] text-white font-bold py-4 rounded-xl hover:bg-[#20ba5a] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 text-sm uppercase tracking-wider disabled:bg-gray-300"
          >
            {enviando ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span className="text-base">💬</span> Enviar Pedido por WhatsApp
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}