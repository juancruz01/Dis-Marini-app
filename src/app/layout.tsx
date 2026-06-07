import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "../context/CartContext"; // Importamos el provider

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Distribuidora de Fiambres y Lácteos",
  description: "Catálogo mayorista de precios",
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