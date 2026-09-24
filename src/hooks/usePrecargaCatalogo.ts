'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getPresignedUrls } from '../services/mediaService';
import type { Producto } from '../context/CartContext';

// ─── Precarga del catálogo ────────────────────────────────────────────────────
// Arranca apenas se abre la página, mientras el cliente todavía escribe su DNI:
// trae los productos, firma las URLs y descarga las fotos en segundo plano.
// Cuando entra al catálogo, las imágenes ya están en la caché del navegador.

export interface PrecargaCatalogo {
  productos: Producto[];
  urlsImagenes: Record<string, string>;
  cargandoProductos: boolean;
  imagenesListas: boolean;
  imagenesCargadas: number;
  imagenesTotales: number;
}

// Descarga una imagen sin mostrarla; se resuelve igual si falla (no bloquea el resto)
function precargarImagen(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

export function usePrecargaCatalogo(): PrecargaCatalogo {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [urlsImagenes, setUrlsImagenes] = useState<Record<string, string>>({});
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [imagenesListas, setImagenesListas] = useState(false);
  const [imagenesCargadas, setImagenesCargadas] = useState(0);
  const [imagenesTotales, setImagenesTotales] = useState(0);

  useEffect(() => {
    let activo = true;

    async function precargar() {
      try {
        const { data, error } = await supabase
          .from('productos')
          .select('*')
          .eq('stock_disponible', true)
          .order('nombre', { ascending: true });

        if (error) throw error;
        if (!activo) return;

        const lista = (data ?? []) as Producto[];
        setProductos(lista);
        setCargandoProductos(false);

        // Una sola llamada para todas las fotos (ver getPresignedUrls)
        const urls = await getPresignedUrls(lista.map((p) => p.imagen_url));
        if (!activo) return;
        setUrlsImagenes(urls);

        // Solo hace falta descargar las fotos de R2; el placeholder es local
        const pendientes = Object.values(urls).filter((url) => url.startsWith('http'));
        setImagenesTotales(pendientes.length);

        await Promise.all(
          pendientes.map((url) =>
            precargarImagen(url).then(() => {
              if (activo) setImagenesCargadas((n) => n + 1);
            })
          )
        );
      } catch (err) {
        console.error('Error al precargar el catálogo:', err);
      } finally {
        // Aunque algo falle, no dejamos al cliente trabado en la pantalla de carga
        if (activo) {
          setCargandoProductos(false);
          setImagenesListas(true);
        }
      }
    }

    precargar();
    return () => {
      activo = false;
    };
  }, []);

  return {
    productos,
    urlsImagenes,
    cargandoProductos,
    imagenesListas,
    imagenesCargadas,
    imagenesTotales,
  };
}
