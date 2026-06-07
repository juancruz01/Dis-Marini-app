'use client';

import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  const manejarLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Login exitoso, redirigimos al dashboard principal
      router.push('/admin');
    } catch (err) {
        const errorParseado = err as Error;
        setError(errorParseado.message || 'Credenciales incorrectas');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100">
        <div className="text-center mb-6">
          <span className="text-3xl">⚙️</span>
          <h2 className="text-xl font-black text-brand-dark mt-2">Panel De Control</h2>
          <p className="text-xs text-gray-400 mt-1">Inicie sesión para gestionar precios y stock</p>
        </div>

        <form onSubmit={manejarLogin} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold p-3 rounded-xl text-center">
              ⚠️ {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
            <input
              type="email"
              required
              placeholder="admin@distribuidoramarini.com"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 text-sm bg-gray-50/50"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Contraseña</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 text-sm bg-gray-50/50"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-brand-dark text-white font-bold py-3.5 rounded-xl hover:bg-brand-blue transition-all duration-200 flex items-center justify-center text-xs uppercase tracking-wider disabled:bg-gray-300 shadow-md shadow-brand-dark/10"
          >
            {cargando ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Ingresar al Panel'}
          </button>
        </form>
      </div>
    </div>
  );
}