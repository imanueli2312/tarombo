import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Health check endpoint — untuk load balancer, uptime monitoring,
 * dan container orchestration (Docker healthcheck, Kubernetes probe).
 *
 * Desain:
 * - TANPA autentikasi (harus bisa diakses oleh prober).
 * - Ringan: hanya SELECT 1 + hitung uptime — tidak membocorkan data.
 * - Cache-Control: no-store agar prober tidak mendapat respons basi.
 * - Deep check database: jika SQLite tidak bisa diakses, status turun
 *   menjadi 503 sehingga load balancer dapat memindahkan traffic.
 */

export const dynamic = 'force-dynamic';

const startedAt = Date.now();

// Versi aplikasi — dibaca dari package.json (output standalone juga membawa
// file ini). Fallback ke env saat dibuat lewat npm/bun run.
let _cachedVersion: string | null = null;
function getAppVersion(): string {
  if (_cachedVersion) return _cachedVersion;
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
    ) as { version?: string };
    _cachedVersion = pkg.version || '0.0.0';
  } catch {
    _cachedVersion = process.env.npm_package_version || '0.0.0';
  }
  return _cachedVersion;
}

export async function GET() {
  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

  // --- Database (SQLite) ---
  const t0 = Date.now();
  try {
    // Lazy import agar health check tidak memicu inisialisasi DB saat build
    const { getDb } = await import('@/lib/db');
    const db = getDb();
    db.prepare('SELECT 1').get();
    checks.database = { ok: true, latencyMs: Date.now() - t0 };
  } catch (error) {
    checks.database = { ok: false, error: error instanceof Error ? error.message : 'unknown' };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  const body = {
    status: allOk ? 'ok' : 'degraded',
    checks,
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    version: getAppVersion(),
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: allOk ? 200 : 503,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
