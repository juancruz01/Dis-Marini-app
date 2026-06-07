import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Registramos los colores de Distribuidora Marini
        brand: {
          dark: "#003057",   // Azul Marino Principal
          blue: "#057EDD",   // Azul Brillante de acento
          light: "#F4F8FC",  // Un fondo sutil celeste/grisáceo para matizar
        }
      },
    },
  },
  plugins: [],
};
export default config;