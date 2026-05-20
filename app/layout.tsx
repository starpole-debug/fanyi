import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Translator Control Center",
  description: "A Vercel-friendly translator with admin-managed AI settings."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
