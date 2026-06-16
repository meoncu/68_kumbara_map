import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kumbara Takip Sistemi",
  description: "Kumbara Takip ve Saha Operasyon Yönetim Sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
