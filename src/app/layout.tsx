import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Silsilah",
  description: "Genealogy and Family Tree Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground" style={{ fontFamily: '"Trebuchet MS", sans-serif' }}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}