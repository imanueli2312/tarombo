import { chromium, type Browser } from "playwright";

// ============================================================================
// Playwright singleton — satu instance browser dipakai ulang untuk semua export
// ============================================================================

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  }
  try {
    return await browserPromise;
  } catch {
    // bila gagal (browser crash), reset & coba lagi
    browserPromise = null;
    browserPromise = chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
    return await browserPromise;
  }
}

export interface RenderOptions {
  html: string;
  /** format kertas untuk PDF: A4 | A3 | A2 | A1 | A0 */
  format?: "A4" | "A3" | "A2" | "A1" | "A0";
  /** bila true → PDF landscape */
  landscape?: boolean;
  /** bila true → PDF skala penuh tanpa pagination (1 halaman) */
  singlePage?: boolean;
  /** untuk image: skala (1-3) */
  scale?: number;
  /** untuk image: tipe file */
  imageType?: "png" | "jpeg";
}

/** Render HTML → PDF buffer. */
export async function renderPdf(opts: RenderOptions): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(opts.html, { waitUntil: "networkidle", timeout: 60_000 });
    // beri waktu render font
    await page.waitForTimeout(300);

    let pdfOptions: Record<string, unknown> = {
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "16mm", right: "16mm" },
      preferCSSPageSize: false,
    };

    if (opts.singlePage) {
      // ukuran custom mengikuti konten — lebar & tinggi sesuai body
      const dims = await page.evaluate(() => {
        const w = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);
        const h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
        return { w, h };
      });
      // padding ekstra di tepi
      const wPx = Math.ceil(dims.w) + 80;
      const hPx = Math.ceil(dims.h) + 80;
      pdfOptions = {
        printBackground: true,
        width: `${wPx}px`,
        height: `${hPx}px`,
        margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
        preferCSSPageSize: false,
      };
    } else {
      pdfOptions = {
        ...pdfOptions,
        format: opts.format ?? "A4",
        landscape: opts.landscape ?? true,
      };
    }

    const buf = await page.pdf(pdfOptions as Parameters<typeof page.pdf>[0]);
    return Buffer.from(buf);
  } finally {
    await page.close();
  }
}

/** Render HTML → image buffer (PNG atau JPEG). */
export async function renderImage(opts: RenderOptions): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  const scale = opts.scale ?? 2;

  try {
    await page.setContent(opts.html, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(300);

    // viewport besar agar layout pohon lebar tidak terpotong
    await page.setViewportSize({ width: 1800, height: 1200 });

    const buf = await page.screenshot({
      fullPage: true,
      type: opts.imageType ?? "png",
      quality: opts.imageType === "jpeg" ? 92 : undefined,
      scale: "device",
    });
    return Buffer.from(buf);
  } finally {
    await page.close();
  }
}

/** Tutup browser (untuk cleanup bila perlu). */
export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}
