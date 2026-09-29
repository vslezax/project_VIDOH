import type { Metadata } from "next";
import { codeNext, onest } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "VDH // ВЫДОХ",
  description: "твой путь самовыражения",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
      <html lang="ru" className={`${codeNext.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
      </html>
  );
}