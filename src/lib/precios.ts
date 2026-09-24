import type { Producto } from '../context/CartContext';

// ─── Cálculo de precios ───────────────────────────────────────────────────────
// Módulo compartido entre navegador y servidor. El catálogo y el carrito lo usan
// para mostrar el estimado; el servidor (pedidosService) lo usa para calcular el
// precio que realmente se guarda en el pedido.

// Peso de respaldo para hormas/piezas que todavía no tienen peso_estimado cargado
export const PESO_POR_DEFECTO_KG = 3.5;

export function precioSegunLista(producto: Producto, lista: number): number {
  if (lista === 1) return producto.precio_lista_1;
  if (lista === 2) return producto.precio_lista_2;
  return producto.precio_lista_3;
}

export function esVentaPorPeso(producto: Producto): boolean {
  const unidad = producto.unidad_medida.toLowerCase();
  return unidad === 'horma' || unidad === 'pieza';
}

export function pesoParaEstimar(producto: Producto): number {
  return producto.peso_estimado || PESO_POR_DEFECTO_KG;
}

// Redondeo a centavos para no arrastrar decimales de punto flotante
export function redondearCentavos(monto: number): number {
  return Math.round(monto * 100) / 100;
}

// Precio por unidad que se agrega al carrito: para horma/pieza es precio por kilo x peso estimado
export function calcularPrecioAplicado(producto: Producto, lista: number): number {
  const precioBase = precioSegunLista(producto, lista);
  const precio = esVentaPorPeso(producto) ? precioBase * pesoParaEstimar(producto) : precioBase;
  return redondearCentavos(precio);
}
