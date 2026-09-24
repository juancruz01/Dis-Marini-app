// ─── Formatos y textos compartidos por la tienda ──────────────────────────────

export type TipoVenta = 'kilo' | 'horma' | 'pieza' | 'unidad';

export function tipoVenta(unidadMedida: string): TipoVenta {
  const unidad = unidadMedida.toLowerCase();
  if (unidad === 'kilo' || unidad === 'horma' || unidad === 'pieza') return unidad;
  return 'unidad';
}

// Horma, pieza y kilo tienen precio por kilo; la unidad tiene precio por unidad
export function sufijoPrecio(unidadMedida: string): string {
  return tipoVenta(unidadMedida) === 'unidad' ? 'c/u' : '/kg';
}

export function textoAgregar(unidadMedida: string): string {
  switch (tipoVenta(unidadMedida)) {
    case 'kilo': return 'Agregar 1 kg';
    case 'horma': return 'Agregar horma';
    case 'pieza': return 'Agregar pieza';
    default: return 'Agregar';
  }
}

// "3 kg", "1 horma", "2 piezas", "5 u."
export function etiquetaCantidad(unidadMedida: string, cantidad: number): string {
  switch (tipoVenta(unidadMedida)) {
    case 'kilo': return `${cantidad} kg`;
    case 'horma': return cantidad === 1 ? '1 horma' : `${cantidad} hormas`;
    case 'pieza': return cantidad === 1 ? '1 pieza' : `${cantidad} piezas`;
    default: return `${cantidad} u.`;
  }
}

const formateadorPrecio = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// "$8.450" o "$8.450,50"
export function formatearPrecio(monto: number): string {
  return formateadorPrecio.format(monto).replace(/\s/g, '');
}

// Para buscar sin importar mayúsculas ni acentos: "jamon" encuentra "Jamón"
export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
