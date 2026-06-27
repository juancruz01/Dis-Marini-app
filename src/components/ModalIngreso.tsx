'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';

export default function ModalIngreso() {
  const { cliente, definirCliente } = useCart();
  const [documentoIngresado, setDocumentoIngresado] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  if (cliente) return null;

  const manejarIngresoAbonado = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const docLimpio = documentoIngresado.trim();
    if (!docLimpio) return;

    setCargando(true);

    try {
      // Consultamos usando la nueva columna 'documento'
      const { data: clienteEncontrado, error: dbError } = await supabase
        .from('clientes')
        .select('documento, nombre_comercio, lista_asignada')
        .eq('documento', docLimpio)
        .maybeSingle();

      if (dbError) throw dbError;

      if (!clienteEncontrado) {
        setError('El DNI o CUIT no corresponde a un comercio habilitado. Verifíquelo o ingrese como invitado.');
        setCargando(false);
        return;
      }

      // Pasamos el documento al estado global del carrito
      definirCliente(
        clienteEncontrado.documento,
        clienteEncontrado.nombre_comercio,
        clienteEncontrado.lista_asignada
      );
    } catch (err) {
      console.error(err);
      setError('Hubo un error de conexión. Intente nuevamente.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-brand-dark/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100 relative overflow-hidden">
        
        <div className="absolute top-0 left-0 right-0 h-2 bg-brand-blue" />

        {/* Encabezado */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-light rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner text-brand-blue">
            📦
          </div>
          <h2 className="text-2xl font-black text-brand-dark tracking-tight">Distribuidora Marini</h2>
          <p className="text-gray-500 text-sm mt-2 px-2">
            Exclusivo para comercios. Ingrese sus datos para operar con su tarifa asignada.
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={manejarIngresoAbonado} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-brand-dark uppercase tracking-wider mb-2 text-center">
              🪪 Identificación del Comercio
            </label>
            <input
              type="text"
              placeholder="DNI o CUIT (sin guiones)"
              disabled={cargando}
              className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-center font-mono text-xl text-brand-dark focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue outline-none transition disabled:bg-gray-50 bg-gray-50 font-bold placeholder:text-gray-300 placeholder:font-sans placeholder:text-base"
              value={documentoIngresado}
              onChange={(e) => setDocumentoIngresado(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-red-600 text-xs text-center font-semibold bg-red-50 border border-red-100 p-3 rounded-xl animate-pulse">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-brand-dark text-white font-bold py-4 rounded-xl hover:bg-brand-blue active:scale-[0.99] transition-all duration-200 disabled:bg-gray-300 flex items-center justify-center gap-2 shadow-lg shadow-brand-dark/10 text-sm uppercase tracking-wider"
          >
            {cargando ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Acceder a mis Precios'
            )}
          </button>
        </form>

        {/* Separador */}
        <div className="relative flex py-5 items-center">
          <div className="grow border-t border-gray-100"></div>
          <span className="shrink mx-4 text-gray-400 text-[10px] font-bold uppercase tracking-widest">Nuevos Clientes</span>
          <div className="grow border-t border-gray-100"></div>
        </div>

        {/* Botón Invitado */}
        <button
          onClick={() => definirCliente('INVITADO', 'Cliente Invitado / Nuevo', 3)}
          disabled={cargando}
          className="w-full bg-white text-brand-blue font-bold py-3.5 rounded-xl hover:bg-brand-light active:scale-[0.99] transition border-2 border-brand-blue/20 hover:border-brand-blue/40 text-sm tracking-wide"
        >
          Ver Catálogo General
        </button>

      </div>
    </div>
  );
}