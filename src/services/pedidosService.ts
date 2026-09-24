'use server';

import { crearClienteSupabaseAdmin } from '../lib/supabase.admin';
import { calcularPrecioAplicado, redondearCentavos } from '../lib/precios';
import type { Producto } from '../context/CartContext';

// ─── Pedidos ──────────────────────────────────────────────────────────────────
// El navegador solo manda QUÉ quiere (producto + cantidad). Precios, lista del
// cliente y total se resuelven acá, contra la base. Cuando esté el ERP, este es
// el único lugar que hay que conectar a su motor de precios.
//
// Los errores esperados se devuelven como valor (no throw): en producción Next
// oculta el mensaje de los errores lanzados desde Server Actions.

const MAX_ITEMS = 200;
const MAX_CANTIDAD = 9999;

export interface ItemSolicitado {
  producto_id: number;
  cantidad: number;
}

export interface ItemConfirmado {
  producto_id: number;
  nombre: string;
  marca: string;
  unidad_medida: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export type ResultadoCrearPedido =
  | { ok: true; pedidoId: string; items: ItemConfirmado[]; total: number }
  | { ok: false; error: string };

export async function crearPedido(
  documentoCliente: string,
  itemsSolicitados: ItemSolicitado[]
): Promise<ResultadoCrearPedido> {
  // ─── 1. Validar entrada (llega de un POST que cualquiera puede armar) ──────
  const documento = typeof documentoCliente === 'string' ? documentoCliente.trim() : '';
  if (!documento) return { ok: false, error: 'Cliente no identificado.' };

  if (!Array.isArray(itemsSolicitados) || itemsSolicitados.length === 0) {
    return { ok: false, error: 'El pedido está vacío.' };
  }
  if (itemsSolicitados.length > MAX_ITEMS) {
    return { ok: false, error: 'El pedido tiene demasiados productos.' };
  }

  // Agrupamos por producto por si llega repetido
  const cantidades = new Map<number, number>();
  for (const item of itemsSolicitados) {
    const id = Number(item?.producto_id);
    const cantidad = Number(item?.cantidad);
    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(cantidad) || cantidad <= 0) {
      return { ok: false, error: 'Hay productos con cantidades inválidas.' };
    }
    cantidades.set(id, (cantidades.get(id) ?? 0) + cantidad);
  }
  for (const cantidad of cantidades.values()) {
    if (cantidad > MAX_CANTIDAD) {
      return { ok: false, error: `La cantidad máxima por producto es ${MAX_CANTIDAD}.` };
    }
  }

  let supabase;
  try {
    supabase = crearClienteSupabaseAdmin();
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'El servidor no está configurado para recibir pedidos.' };
  }

  // ─── 2. Lista de precios: siempre la de la base, nunca la del navegador ────
  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select('documento, lista_asignada')
    .eq('documento', documento)
    .maybeSingle();

  if (clienteError) {
    console.error('Error buscando cliente:', clienteError);
    return { ok: false, error: 'No se pudo verificar el cliente. Intente nuevamente.' };
  }
  if (!cliente) {
    return { ok: false, error: 'El comercio ya no está habilitado. Comuníquese con la distribuidora.' };
  }

  // ─── 3. Productos y precios actuales ──────────────────────────────────────
  const { data: productos, error: productosError } = await supabase
    .from('productos')
    .select('*')
    .in('id', [...cantidades.keys()]);

  if (productosError) {
    console.error('Error buscando productos:', productosError);
    return { ok: false, error: 'No se pudieron verificar los productos. Intente nuevamente.' };
  }

  const productosPorId = new Map((productos as Producto[]).map((p) => [p.id, p]));
  const noDisponibles = [...cantidades.keys()].filter(
    (id) => !productosPorId.get(id)?.stock_disponible
  );
  if (noDisponibles.length > 0) {
    const nombres = noDisponibles
      .map((id) => productosPorId.get(id)?.nombre)
      .filter(Boolean)
      .join(', ');
    return {
      ok: false,
      error: nombres
        ? `Estos productos ya no están disponibles: ${nombres}. Quitalos del carrito para continuar.`
        : 'Algunos productos del carrito ya no existen. Vaciá el carrito y volvé a cargarlos.',
    };
  }

  const items: ItemConfirmado[] = [...cantidades.entries()].map(([id, cantidad]) => {
    const producto = productosPorId.get(id)!;
    const precioUnitario = calcularPrecioAplicado(producto, cliente.lista_asignada);
    return {
      producto_id: id,
      nombre: producto.nombre,
      marca: producto.marca,
      unidad_medida: producto.unidad_medida,
      cantidad,
      precio_unitario: precioUnitario,
      subtotal: redondearCentavos(precioUnitario * cantidad),
    };
  });
  const total = redondearCentavos(items.reduce((acc, item) => acc + item.subtotal, 0));

  // ─── 4. Guardar pedido + ítems ────────────────────────────────────────────
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .insert({ cliente_id: cliente.documento, total_estimado: total, estado: 'confirmado' })
    .select('id')
    .single();

  if (pedidoError || !pedido) {
    console.error('Error creando pedido:', pedidoError);
    return { ok: false, error: 'No se pudo registrar el pedido. Intente nuevamente.' };
  }

  const { error: itemsError } = await supabase.from('items_pedido').insert(
    items.map((item) => ({
      pedido_id: pedido.id,
      producto_id: item.producto_id,
      producto_nombre: item.nombre,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
    }))
  );

  if (itemsError) {
    // Sin ítems el pedido no sirve: lo borramos para no dejar un "confirmado" vacío
    console.error('Error guardando ítems del pedido:', itemsError);
    const { error: rollbackError } = await supabase.from('pedidos').delete().eq('id', pedido.id);
    if (rollbackError) console.error('No se pudo revertir el pedido vacío:', pedido.id, rollbackError);
    return { ok: false, error: 'No se pudo registrar el pedido. Intente nuevamente.' };
  }

  return { ok: true, pedidoId: String(pedido.id), items, total };
}

export type ResultadoCancelarPedido = { ok: true } | { ok: false; error: string };

// El cliente solo puede pasar SU pedido de "confirmado" a "cancelado"
export async function cancelarPedido(
  documentoCliente: string,
  pedidoId: string
): Promise<ResultadoCancelarPedido> {
  const documento = typeof documentoCliente === 'string' ? documentoCliente.trim() : '';
  if (!documento || typeof pedidoId !== 'string' || !pedidoId) {
    return { ok: false, error: 'Datos inválidos.' };
  }

  let supabase;
  try {
    supabase = crearClienteSupabaseAdmin();
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'El servidor no está configurado.' };
  }

  const { data, error } = await supabase
    .from('pedidos')
    .update({ estado: 'cancelado' })
    .eq('id', pedidoId)
    .eq('cliente_id', documento)
    .eq('estado', 'confirmado')
    .select('id');

  if (error) {
    console.error('Error cancelando pedido:', error);
    return { ok: false, error: 'No se pudo cancelar el pedido. Intente nuevamente.' };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: 'El pedido ya no se puede cancelar (puede que ya haya sido entregado).' };
  }
  return { ok: true };
}
