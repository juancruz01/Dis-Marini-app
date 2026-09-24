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

-- anon queda solo con lectura. Se quita todo (incluido TRUNCATE, que saltea RLS,
-- y TRIGGER/REFERENCES que Supabase concede por defecto) y se devuelve SELECT.
-- - pedidos / items_pedido: los crea y cancela el servidor
-- - productos / clientes: solo el admin (authenticated) los modifica
revoke all on public.pedidos, public.items_pedido, public.productos, public.clientes from anon;
grant select on public.pedidos, public.items_pedido, public.productos, public.clientes to anon;

-- ─── Verificación ───────────────────────────────────────────────────────────
-- Debería devolver exactamente 4 filas, todas con privilege_type = SELECT.
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon'
  and table_schema = 'public'
  and table_name in ('pedidos', 'items_pedido', 'productos', 'clientes')
order by table_name, privilege_type;
