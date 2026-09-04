import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Produksi: error TypeScript harus menggagalkan build (tipe sudah bersih).
  // Jangan matikan ini kembali — bug tipe akan lolos ke produksi.
  typescript: {
    ignoreBuildErrors: false,
  },
  // Catatan: lint dijalankan terpisah (`bun run lint` / CI) — Next.js 16
  // tidak lagi menjalankan ESLint saat build.
  reactStrictMode: true,
  // Nonaktifkan telemetry saat build produksi
  poweredByHeader: false,
  async headers() {
    const isDev = process.env.NODE_ENV === "development";

    return [
      {
        // Audit T-06: sw.js tidak boleh di-cache peramban — SW lama bisa
        // bertahan via heuristic caching ±24 jam dan menahan pengunjung di
        // versi aplikasi lawas.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          // Cegah clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Cegah MIME-sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Batasi kebocoran URL ke pihak ketiga
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Matikan permission API yang tidak dipakai
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          // Paksa HTTPS pada browser modern
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Content Security Policy — pragmatis untuk Next.js.
          // Audit R-04: 'unsafe-eval' hanya dibutuhkan React Refresh/HMR di
          // development; di produksi dihilangkan.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
