-- ═══════════════════════════════════════════════════════════════════════════
-- Quita al rol "anon" (visitantes de la web, anon key pública) el permiso de
-- escribir en las tablas. Correr en Supabase → SQL Editor.
--
-- IMPORTANTE: correrlo DESPUÉS de desplegar en Vercel la versión que crea los
-- pedidos desde el servidor (pedidosService.ts) y de cargar la variable
-- SUPABASE_SERVICE_ROLE_KEY. Si se corre antes, el checkout actual deja de andar.
--
-- Contexto: las 4 tablas tienen una policy "Permitir todo en ..." (ALL) para
-- anon y authenticated. El REVOKE se evalúa antes que RLS, así que bloquea las
-- escrituras de anon aunque esas policies sigan existiendo.
--
-- - Los pedidos los crea/cancela el servidor con la service role (no le afecta).
-- - El panel admin usa el rol "authenticated" (no le afecta).
-- - La lectura (catálogo, login por DNI, "Mis pedidos") sigue igual por ahora.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Pedidos: ya no se pueden crear, modificar ni borrar desde el navegador
revoke insert, update, delete on public.pedidos      from anon;
revoke insert, update, delete on public.items_pedido from anon;

-- 2. Catálogo y clientes: solo el admin (authenticated) los modifica
revoke insert, update, delete on public.productos from anon;
revoke insert, update, delete on public.clientes  from anon;

-- ─── Verificación ───────────────────────────────────────────────────────────
-- Debería devolver solo filas con privilege_type = SELECT (o ninguna).
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon'
  and table_schema = 'public'
  and table_name in ('pedidos', 'items_pedido', 'productos', 'clientes')
order by table_name, privilege_type;
