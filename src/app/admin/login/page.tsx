'use client';

import React, { useState, Suspense } from 'react';
import { supabase } from '../../../lib/supabase';
import { useSearchParams } from 'next/navigation';

// ─── Formulario separado para poder usar useSearchParams dentro de Suspense ───
// Next.js requiere que useSearchParams esté dentro de un Suspense boundary,
// de lo contrario el componente no renderiza correctamente en producción.
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [intentos, setIntentos] = useState(0);

  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') ?? '/admin/productos';

  const bloqueado = intentos >= 5;

  const manejarLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bloqueado) return;

    setCargando(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.session) {
        // Redirección completa para que el middleware reciba las cookies
        // de sesión correctamente en el primer request post-login.
        window.location.href = redirectTo;
        
      }
    } catch (err) {
      const errorParseado = err as Error;
      setIntentos((prev) => prev + 1);

      if (errorParseado.message?.includes('Invalid login credentials')) {
        setError('El correo o la contraseña son incorrectos.');
      } else if (errorParseado.message?.includes('Email not confirmed')) {
        setError('El correo no fue confirmado. Revisá tu bandeja de entrada.');
      } else {
        setError(errorParseado.message || 'Ocurrió un error al intentar iniciar sesión.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <form onSubmit={manejarLogin} className="space-y-4">

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold p-3 rounded-xl text-center">
          ⚠️ {error}
          {intentos >= 3 && intentos < 5 && (
            <p className="mt-1 font-normal text-red-400">
              Intentos restantes: {5 - intentos}
            </p>
          )}
        </div>
      )}

      {/* Bloqueado */}
      {bloqueado && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-4 rounded-xl text-center space-y-1">
          <p>🔒 Demasiados intentos fallidos.</p>
          <p className="font-normal text-red-500">
            Recargá la página para volver a intentarlo o contactá al administrador.
          </p>
        </div>
      )}

      {/* Correo */}
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
          Correo Electrónico
        </label>
        <input
          type="email"
          required
          disabled={bloqueado}
          placeholder="admin@distribuidoramarini.com"
          autoComplete="email"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 text-sm bg-gray-50/50 disabled:opacity-50"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {/* Contraseña */}
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
          Contraseña
        </label>
        <input
          type="password"
          required
          disabled={bloqueado}
          placeholder="••••••••"
          autoComplete="current-password"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 text-sm bg-gray-50/50 disabled:opacity-50"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {/* Botón */}
      <button
        type="submit"
        disabled={cargando || bloqueado}
        className="w-full bg-brand-dark text-white font-bold py-3.5 rounded-xl hover:bg-brand-blue transition-all duration-200 flex items-center justify-center text-xs uppercase tracking-wider disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md shadow-brand-dark/10"
      >
        {cargando
          ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : 'Ingresar al Panel'
        }
      </button>
    </form>
  );
}

// ─── Página principal envuelta en Suspense ────────────────────────────────────
export default function AdminLogin() {
  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100">

        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-3xl">⚙️</span>
          <h2 className="text-xl font-black text-brand-dark mt-2">Panel de Control</h2>
          <p className="text-xs text-gray-400 mt-1">
            Inicie sesión para gestionar precios y stock
          </p>
        </div>

        {/* Suspense necesario para useSearchParams en Next.js */}
        <Suspense fallback={
          <div className="flex justify-center py-8">
            <span className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <LoginForm />
        </Suspense>

        {/* Pie */}
        <p className="text-center text-[10px] text-gray-300 mt-6">
          Acceso restringido · Solo personal autorizado
        </p>
      </div>
    </div>
  );
}