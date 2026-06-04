import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prospector Preview",
  description: "Painel local para prospecção manual de clientes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
