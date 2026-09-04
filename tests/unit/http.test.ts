import { describe, test, expect } from 'bun:test';
import { readJsonBody, assertSameOrigin, parsePageParams, MAX_PAGE_LIMIT, DEFAULT_PAGE_LIMIT } from '@/lib/http';

function postRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  });
}

describe('readJsonBody (audit S-03 + S-07)', () => {
  test('JSON valid lolos', async () => {
    const r = await readJsonBody(postRequest('{"nama":"Raja"}'));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual({ nama: 'Raja' });
  });

  test('JSON malformed → 400 (dulunya 500 dari exception)', async () => {
    const r = await readJsonBody(postRequest('{bukan json'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(400);
  });

  test('Content-Length di atas 1 MB → 413 sebelum body dibaca', async () => {
    const r = await readJsonBody(
      new Request('http://localhost:3000/api/x', {
        method: 'POST',
        headers: { 'content-length': String(2 * 1024 * 1024) },
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(413);
  });

  test('body aktual di atas 1 MB (chunked) → 413', async () => {
    const big = 'x'.repeat(MAX_PAGE_LIMIT === 500 ? 1048577 : 1048577); // 1 MB + 1 byte
    const r = await readJsonBody(postRequest(JSON.stringify({ data: big })));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(413);
  });

  test('maxBytes kustom dihormati (transfer/import 5 MB)', async () => {
    const r = await readJsonBody(postRequest('{"data":"12345678901234567890"}'), 10);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(413);
  });
});

describe('assertSameOrigin (audit S-13)', () => {
  test('GET selalu lolos', () => {
    expect(assertSameOrigin(new Request('http://localhost:3000/api/x'))).toBeNull();
  });

  test('POST tanpa Origin/Referer (curl, skrip) → lolos', () => {
    expect(assertSameOrigin(postRequest('{}'))).toBeNull();
  });

  test('POST same-origin → lolos', () => {
    expect(
      assertSameOrigin(postRequest('{}', { origin: 'http://localhost:3000' })),
    ).toBeNull();
  });

  test('POST lintas-origin → 403', () => {
    const r = assertSameOrigin(postRequest('{}', { origin: 'http://evil.example.com' }));
    expect(r).not.toBeNull();
    expect(r?.status).toBe(403);
  });

  test('Referer lintas-origin → 403 (Origin absen, fallback Referer)', () => {
    const r = assertSameOrigin(postRequest('{}', { referer: 'http://evil.example.com/page' }));
    expect(r?.status).toBe(403);
  });

  test('Origin "null" (iframe sandbox) → 403', () => {
    const r = assertSameOrigin(postRequest('{}', { origin: 'null' }));
    expect(r?.status).toBe(403);
  });
});

describe('parsePageParams (audit S-06)', () => {
  function getWith(qs: string): Request {
    return new Request(`http://localhost:3000/api/x${qs}`);
  }

  test('default 500 / offset 0', () => {
    const p = parsePageParams(getWith(''));
    expect(p.limit).toBe(DEFAULT_PAGE_LIMIT);
    expect(p.offset).toBe(0);
  });

  test('limit & offset eksplisit dihormati', () => {
    const p = parsePageParams(getWith('?limit=100&offset=200'));
    expect(p.limit).toBe(100);
    expect(p.offset).toBe(200);
  });

  test('limit dibatasi atas MAX_PAGE_LIMIT', () => {
    expect(parsePageParams(getWith('?limit=99999')).limit).toBe(MAX_PAGE_LIMIT);
  });

  test('nilai tidak valid jatuh ke default', () => {
    const p = parsePageParams(getWith('?limit=abc&offset=-5'));
    expect(p.limit).toBe(DEFAULT_PAGE_LIMIT);
    expect(p.offset).toBe(0);
  });
});
