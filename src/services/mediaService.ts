'use server';

import { r2Client, R2_CONFIG } from '../lib/cloudflare';
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requerirSesionAdmin } from '../lib/supabase.server';

const PLACEHOLDER = '/productos/placeholder.svg';
const MAX_URLS_POR_LLAMADA = 500;

// Genera una URL temporal para visualizar una imagen
async function firmarUrl(fileKey: string): Promise<string> {
  // Si ya es una URL completa o un placeholder local, la devolvemos directo
  if (fileKey.startsWith('http') || fileKey.startsWith('/')) {
    return fileKey;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: fileKey,
    });
    // La URL expira en 1 hora (3600 segundos)
    return await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  } catch (error) {
    console.error('Error generando URL de Cloudflare R2:', error);
    return PLACEHOLDER;
  }
}

// Firma todas las imágenes de una vez. Next ejecuta las Server Actions de a una
// por navegador: con una llamada por producto, cualquier otra acción (ej. cancelar
// un pedido) quedaba esperando detrás de decenas de firmas.
// Devuelve { key: url }; las keys vacías o inválidas no aparecen (usar placeholder).
export const getPresignedUrls = async (
  fileKeys: (string | null)[]
): Promise<Record<string, string>> => {
  if (!Array.isArray(fileKeys)) return {};

  const keysUnicas = [
    ...new Set(fileKeys.filter((k): k is string => typeof k === 'string' && k.length > 0)),
  ].slice(0, MAX_URLS_POR_LLAMADA);

  // La firma es un cálculo local (no hay request a R2), así que en paralelo es rápido
  const urls = await Promise.all(keysUnicas.map(firmarUrl));
  return Object.fromEntries(keysUnicas.map((key, i) => [key, urls[i]]));
};

// Genera la URL de subida (PUT) para que el Admin suba el archivo
export const getPresignedUploadUrl = async (key: string, contentType: string): Promise<string> => {
  await requerirSesionAdmin();
  const command = new PutObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: key,
    ContentType: contentType,
  });
  // Expiración rápida de 5 minutos para subir el archivo
  return await getSignedUrl(r2Client, command, { expiresIn: 300 });
};

// Borra un archivo de Cloudflare R2 usando su key (ej: "productos/123_abc.jpg")
export const deleteFileFromR2 = async (fileKey: string | null): Promise<boolean> => {
  if (!fileKey || fileKey.startsWith('http') || fileKey.startsWith('/')) {
    return false; // Si no hay key o es una imagen por defecto/URL externa, no hace nada
  }

  await requerirSesionAdmin();

  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: fileKey,
    });
    await r2Client.send(command);
    console.log(`✓ Archivo eliminado de R2: ${fileKey}`);
    return true;
  } catch (error) {
    console.error('Error al eliminar archivo de Cloudflare R2:', error);
    return false;
  }
};