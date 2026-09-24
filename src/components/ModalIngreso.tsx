'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
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
      const { data: clienteEncontrado, error: dbError } = await supabase
        .from('clientes')
        .select('documento, nombre_comercio, lista_asignada')
        .eq('documento', docLimpio)
        .maybeSingle();

      if (dbError) throw dbError;

      if (!clienteEncontrado) {
        setError('Ese DNI o CUIT no corresponde a un comercio habilitado. Revisalo o comunicate con la distribuidora.');
        setCargando(false);
        return;
      }

      definirCliente(
        clienteEncontrado.documento,
        clienteEncontrado.nombre_comercio,
        clienteEncontrado.lista_asignada
      );
    } catch (err) {
      console.error(err);
      setError('Hubo un error de conexión. Intentá nuevamente.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-brand-light">
      <div className="h-44 shrink-0 bg-brand-dark sm:h-56" aria-hidden="true" />

      <div className="-mt-28 flex flex-1 justify-center px-4 pb-8 sm:-mt-36">
        <div className="h-fit w-full max-w-md rounded-3xl bg-white p-7 shadow-[0_20px_50px_rgba(0,48,87,0.15)]">
          <div className="mb-7 flex flex-col items-center gap-5 text-center">
            <Image src="/marini-logo-azul.png" alt="Distribuidora Marini" width={200} height={43} priority />
            <div>
              <h1 className="text-[22px] font-extrabold text-brand-ink">Catálogo para comercios</h1>
              <p className="mt-1.5 text-[15px] text-brand-muted">
                Ingresá con el DNI o CUIT de tu comercio para ver tus precios y hacer pedidos.
              </p>
            </div>
          </div>

          <form onSubmit={manejarIngresoAbonado} className="space-y-4">
            <div>
              <label htmlFor="documento-comercio" className="mb-2 block text-[13px] font-bold text-brand-muted">
                DNI o CUIT (sin guiones)
              </label>
              <input
                id="documento-comercio"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Ej: 20123456789"
                disabled={cargando}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'error-ingreso' : undefined}
                className="h-14 w-full rounded-xl border-2 border-brand-line bg-brand-light/50 px-4 text-center text-xl font-bold tracking-wider text-brand-ink outline-none transition placeholder:text-base placeholder:font-medium placeholder:tracking-normal placeholder:text-[#8A99A8] focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/15 disabled:opacity-60"
                value={documentoIngresado}
                onChange={(e) => setDocumentoIngresado(e.target.value)}
              />
            </div>

            {error && (
              <p id="error-ingreso" role="alert" className="rounded-xl border border-[#F1C4BE] bg-[#FDECEA] p-3 text-center text-sm font-semibold text-[#B42318]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={cargando || !documentoIngresado.trim()}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-brand-dark text-[15px] font-bold text-white transition hover:bg-brand-ink active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cargando ? (
                <span className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-label="Ingresando" />
              ) : (
                <>
                  Ver mis precios
                  <ArrowRight className="size-5" aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
