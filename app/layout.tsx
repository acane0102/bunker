import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BúnkerApp | Institutional Trading",
  description: "SaaS Multi-tenant para gestión de trading",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      {/* 
        Sin etiqueta <head> manual. 
        Al tener precedence="default", React 19 lo eleva automáticamente al Head real.
      */}
      <link 
        rel="stylesheet" 
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" 
        precedence="default"
      />
      <body className="bg-[#0b0914] text-white antialiased">
        {children}
      </body>
    </html>
  );
}