import type { MetadataRoute } from 'next';

// App instalable (PWA): el cliente la agrega a la pantalla de inicio del celular
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Distribuidora Marini',
    short_name: 'Marini',
    description: 'Catálogo mayorista y pedidos de Distribuidora Marini.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F4F8FC',
    theme_color: '#003057',
    lang: 'es-AR',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
