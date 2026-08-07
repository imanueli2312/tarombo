import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tarombo Hariandja — Marga Hariandja Family Tree",
  description:
    "The official family tree (tarombo) of the extended Hariandja clan (Marga Hariandja). Preserve, explore, and celebrate our lineage.",
  keywords: [
    "Hariandja",
    "Marga Hariandja",
    "Tarombo",
    "Family Tree",
    "Batak",
    "Genealogy",
  ],
  authors: [{ name: "Marga Hariandja" }],
  icons: {
    icon: "/tarombo-ikon02.png",
  },
  openGraph: {
    title: "Tarombo Hariandja",
    description: "Family tree of the extended Hariandja clan",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <Toaster />
        <SonnerToaster position="top-right" richColors />
      </body>
    </html>
  );
}
