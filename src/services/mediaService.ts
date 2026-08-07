'use server';

import { r2Client, R2_CONFIG } from '../lib/cloudflare';
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requerirSesionAdmin } from '../lib/supabase.server';

// Genera una URL temporal para visualizar la imagen en el catálogo
export const getPresignedUrl = async (fileKey: string | null): Promise<string> => {
  if (!fileKey) return '/productos/placeholder.jpg';
  
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
    return '/productos/placeholder.jpg';
  }
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