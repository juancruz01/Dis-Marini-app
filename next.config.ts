import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.0.178'],
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co', // Autoriza todas las imágenes guardadas en buckets de Supabase
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com', // Autoriza los placeholders de prueba
      }
    ],
  },
};

export default nextConfig;