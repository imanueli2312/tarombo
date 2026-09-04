import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ServiceWorkerProvider } from "@/components/providers/sw-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export const metadata: Metadata = {
  title: "Tarombo Hariandja",
  description: "Pohon Keluarga Digital Marga Hariandja",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tarombo",
  },
  openGraph: {
    title: "Tarombo Hariandja",
    description: "Pohon Keluarga Digital Marga Hariandja",
    type: "website",
    locale: "id_ID",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Petunjuk sesi dari server (audit R-06): cookie token httpOnly tidak bisa
  // dibaca JS — layout membocorkan HANYA keberadaannya ke AuthProvider agar
  // pengunjung tanpa sesi tidak menunggu spinner /api/auth/me yang sia-sia.
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore.has("token");

  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ServiceWorkerProvider>
          <ThemeProvider>
            <QueryProvider>
              <AuthProvider initialHasSession={hasSessionCookie}>{children}</AuthProvider>
            </QueryProvider>
          </ThemeProvider>
        </ServiceWorkerProvider>
        <Toaster />
      </body>
    </html>
  );
}
