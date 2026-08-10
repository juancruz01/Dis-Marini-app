// Redimensiona y comprime una imagen en el navegador antes de subirla a R2,
// para que el catálogo no tenga que bajar fotos de varios MB para mostrar
// un thumbnail de 80px.
export async function resizeImageFile(
  file: File,
  maxDimension = 1000,
  quality = 0.82
): Promise<{ blob: Blob; extension: string }> {
  // SVG y GIF no pasan por canvas: se rompería el vector o la animación
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return { blob: file, extension: file.name.split('.').pop() || 'jpg' };
  }

  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen');
  ctx.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();

  // El PNG se mantiene PNG (por transparencia); el resto se comprime como JPEG
  const tipoSalida = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const extension = tipoSalida === 'image/png' ? 'png' : 'jpg';

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('No se pudo comprimir la imagen'))),
      tipoSalida,
      quality
    );
  });

  return { blob, extension };
}
