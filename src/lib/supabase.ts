import { createBrowserClient } from '@supabase/ssr';

// ─── Cliente Supabase para el navegador (compatible con middleware) ────────────
// Usamos createBrowserClient de @supabase/ssr en vez de createClient de
// @supabase/supabase-js. La diferencia clave: este cliente guarda la sesión
// en COOKIES además de localStorage, por lo que el middleware del servidor
// puede leerla y validarla en cada request.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);