import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mantenemos tu IP local para que sigas probando desde el celular
  allowedDevOrigins: ['192.168.0.178'],
  
  images: {
    // Las imágenes de productos viven en R2 detrás de URLs firmadas que cambian
    // en cada request. El optimizador de Vercel las trata como "imagen nueva"
    // cada vez y agota la cuota gratuita (1000/mes) en minutos -> error 402.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      // AGREGAMOS EL DOMINIO DE TU BUCKET DE CLOUDFLARE R2
      {
        protocol: 'https',
        hostname: 'marini-media.cbecfe453701233cd33e6ffe106836c3.r2.cloudflarestorage.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;