import 'server-only';
import { createClient } from '@supabase/supabase-js';

// ─── Cliente Supabase con service role (SOLO servidor) ────────────────────────
// Saltea RLS: se usa únicamente desde Server Actions que validan todo por su
// cuenta (ej. crear pedidos con precios calculados en el servidor).
// La key NUNCA debe llevar el prefijo NEXT_PUBLIC_ ni llegar al navegador.
export function crearClienteSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Falta configurar SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.');
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
