import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mantenemos tu IP local para que sigas probando desde el celular
  allowedDevOrigins: ['192.168.0.178'],
  
  images: {
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