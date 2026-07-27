import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // ─── Cliente Supabase lado servidor ───────────────────────────────────────
  // IMPORTANTE: usar createServerClient (NO createClient) para que las cookies
  // de sesión se lean y escriban correctamente en el contexto del middleware.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ─── Verificar sesión ─────────────────────────────────────────────────────
  // getUser() hace una verificación real contra el servidor de Supabase.
  // Es más seguro que getSession(), que solo lee el JWT local sin validarlo.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const esRutaLogin = pathname === '/admin/login';

  // ─── Reglas de acceso ─────────────────────────────────────────────────────

  // Sin sesión → solo puede estar en /admin/login
  if (!user && !esRutaLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    // Guardamos la ruta original para redirigir después del login
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Con sesión → no tiene sentido estar en /admin/login, mandarlo al panel
  if (user && esRutaLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/productos';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

// ─── Matcher: SOLO rutas /admin/* ─────────────────────────────────────────────
// No interceptamos rutas de clientes ni archivos estáticos.
// Esto evita lentitud innecesaria en el resto de la app.
export const config = {
  matcher: ['/admin', '/admin/:path*'],
};