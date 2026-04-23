import type { Metadata } from "next";
import "./globals.css";

// Metadatos de la aplicación: título y descripción que aparecen en el navegador y buscadores.
export const metadata: Metadata = {
  title: "CineTrip — Películas para tu viaje",
  description: "Encontrá películas que duren exactamente lo que dura tu viaje",
};

// Layout raíz que envuelve todas las páginas de la aplicación.
// Define el idioma de la página y aplica los estilos globales.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
