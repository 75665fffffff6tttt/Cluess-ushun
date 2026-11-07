import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Давлат синови ҳисобот генератори",
  description:
    "Ўсимликларни ҳимоя қилиш воситалари давлат синови илмий ҳисоботини автоматик яратиш тизими.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz-Cyrl" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
