import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CineTrip — Películas para tu viaje",
  description: "Encontrá películas que duren exactamente lo que dura tu viaje",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
