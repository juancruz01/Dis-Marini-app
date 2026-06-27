import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "../context/CartContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Distribuidora Marini | Catálogo Mayorista',
  description: 'Comprá fiambres, lácteos y productos mayoristas al mejor precio. Distribución directa para comercios.',
  keywords: ['distribuidora marini', 'fiambres mayorista', 'lácteos por mayor', 'catálogo mayorista', 'marini web'],
  
  // 🌟 Esto controla cómo se ve en buscadores y pestañas
  icons: {
    icon: '/favicon.ico', // Acordate de tener un favicon en tu carpeta public
  },

  // 🌟 Open Graph: Esto controla cómo se ve en WhatsApp, Facebook, etc.
  openGraph: {
    title: 'Distribuidora Marini | Catálogo Mayorista',
    description: 'Accedé a nuestro catálogo exclusivo para comercios. Los mejores precios en fiambres y lácteos.',
    url: 'https://distribuidora-marini.vercel.app/', // Cambialo por tu URL real de Vercel cuando la tengas
    siteName: 'Distribuidora Marini',
    images: [
      {
        url: 'https://distribuidora-marini.vercel.app/logo-app.jpg', // Ruta absoluta a la imagen de portada
        width: 1200,
        height: 630,
        alt: 'Distribuidora Marini Catálogo',
      },
    ],
    locale: 'es_AR',
    type: 'website',
  },

  // 🌟 Twitter Cards: Por si se comparte ahí
  twitter: {
    card: 'summary_large_image',
    title: 'Distribuidora Marini | Catálogo Mayorista',
    description: 'Catálogo online exclusivo para comercios con tarifas personalizadas.',
    images: ['https://tu-dominio-de-vercel.vercel.app/og-image.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}