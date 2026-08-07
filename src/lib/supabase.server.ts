import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// ─── Cliente Supabase para Server Actions / Route Handlers ────────────────────
// Lee la sesión desde las cookies que ya validó el middleware (proxy.ts).
// Usar getUser() (no getSession()) porque revalida contra el servidor de Supabase.
export async function crearClienteSupabaseServidor() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // No-op: en este uso solo leemos la sesión para autorizar,
          // no necesitamos refrescar cookies desde acá.
        },
      },
    }
  );
}

export async function requerirSesionAdmin() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No autorizado.');
  }
}
