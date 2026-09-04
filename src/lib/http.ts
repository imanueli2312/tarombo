import { NextResponse } from 'next/server';

/**
 * Helper HTTP bersama untuk seluruh route API.
 *
 * Menutup tiga temuan audit sekaligus:
 * - S-03: 9 handler melempar 500 untuk body JSON malformed — kini 400.
 * - S-07: body-size hanya dibatasi di transfer/import — kini 1 MB default
 *   di semua endpoint tulis (transfer/import tetap memakai limit 5 MB-nya).
 * - S-13: CSRF hanya mengandalkan SameSite=Lax — verifikasi Origin/Referer
 *   menjadi lapis kedua.
 */

/** Batas ukuran body JSON default: 1 MB (audit S-07). */
export const MAX_JSON_BODY_BYTES = 1_048_576;

export function jsonError(status: number, message: string, headers?: Record<string, string>): NextResponse {
  return NextResponse.json({ error: message }, { status, headers });
}

export interface ReadJsonOk<T> {
  ok: true;
  data: T;
}
export interface ReadJsonErr {
  ok: false;
  response: NextResponse;
}

/**
 * Baca body JSON dengan seragam dan aman:
 * - Content-Length di atas maxBytes → 413 (ditolak sebelum stream dibaca).
 * - Ukuran aktual di atas maxBytes (request chunked) → 413.
 * - JSON tidak valid → 400, bukan 500 dari exception.
 *
 * Pemakaian:
 *   const parsed = await readJsonBody(request);
 *   if (!parsed.ok) return parsed.response;
 *   const body = parsed.data;
 */
export async function readJsonBody<T = Record<string, unknown>>(
  request: Request,
  maxBytes: number = MAX_JSON_BODY_BYTES,
): Promise<ReadJsonOk<T> | ReadJsonErr> {
  const declared = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declared) && declared > maxBytes) {
    return {
      ok: false,
      response: jsonError(413, `Payload terlalu besar — maksimum ${Math.floor(maxBytes / 1024)} KB`),
    };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, response: jsonError(400, 'Format permintaan tidak valid') };
  }

  if (Buffer.byteLength(text, 'utf8') > maxBytes) {
    return {
      ok: false,
      response: jsonError(413, `Payload terlalu besar — maksimum ${Math.floor(maxBytes / 1024)} KB`),
    };
  }

  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, response: jsonError(400, 'Format permintaan tidak valid') };
  }
}

/**
 * Paginasi standar (audit S-06): GET list besar mendukung ?limit=&offset=.
 * Default 500 baris (data keluarga lazimnya jauh di bawah itu — perilaku UI
 * tidak berubah), dibatasi 1000 agar respons tetap terikat.
 */
export const DEFAULT_PAGE_LIMIT = 500;
export const MAX_PAGE_LIMIT = 1000;

export interface PageParams {
  limit: number;
  offset: number;
}

export function parsePageParams(request: Request): PageParams {
  const { searchParams } = new URL(request.url);
  const limitRaw = Number(searchParams.get('limit') ?? DEFAULT_PAGE_LIMIT);
  const offsetRaw = Number(searchParams.get('offset') ?? 0);

  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.floor(limitRaw), 1), MAX_PAGE_LIMIT)
    : DEFAULT_PAGE_LIMIT;
  const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.floor(offsetRaw) : 0;

  return { limit, offset };
}

/**
 * Verifikasi Origin/Referer untuk endpoint tulis — lapis kedua CSRF di atas
 * SameSite=Lax (audit S-13).
 *
 * Prinsip (OWASP — Origin verification): peramban modern SELALU mengirim
 * header Origin pada permintaan POST/PUT/DELETE lintas-origin. Jadi:
 * - Origin/Referer cocok dengan host permintaan → lolos (permintaan same-origin).
 * - Origin/Referer TIDAK cocok → tolak 403 (permintaan lintas-site — CSRF).
 * - Kedua header absen (curl, skrip deploy, health prober) → lolos; klien
 *   non-browser tidak memiliki risiko CSRF karena penyerang lintas-site
 *   tidak bisa mencegah peramban mengirim Origin.
 */
export function assertSameOrigin(request: Request): NextResponse | null {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null;

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  if (!origin && !referer) return null;

  const target = origin ?? referer ?? '';
  let targetHost: string | null = null;
  try {
    targetHost = new URL(target).host || null;
  } catch {
    return jsonError(403, 'Origin tidak valid');
  }
  if (!targetHost) return jsonError(403, 'Origin tidak valid');

  // Host header mungkin absen pada Request sintetis (test/undici) — fallback
  // ke host pada URL permintaan (selalu absolut di Next.js route handler).
  let host = request.headers.get('host');
  if (!host) {
    try {
      host = new URL(request.url).host || null;
    } catch {
      host = null;
    }
  }
  if (host && targetHost !== host) {
    return jsonError(403, 'Permintaan lintas-origin ditolak');
  }
  return null;
}
