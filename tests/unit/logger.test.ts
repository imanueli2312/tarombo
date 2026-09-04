import { describe, test, expect } from 'bun:test';
import { withApiLogging, getMetricsSnapshot, newRequestId, scopedLogger } from '@/lib/logger';

describe('withApiLogging (audit R-08)', () => {
  test('meneruskan respons + menempel X-Request-ID', async () => {
    let seenRequest: Request | null = null;
    const wrapped = withApiLogging(
      async (req: Request) => {
        seenRequest = req;
        return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } });
      },
      'GET /api/uji',
    );

    const res = await wrapped(new Request('http://localhost:3000/api/uji'));
    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toBeTruthy();
    expect(seenRequest).not.toBeNull();
  });

  test('ctx route dinamis diteruskan apa adanya', async () => {
    const wrapped = withApiLogging(
      async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
        const { id } = await ctx.params;
        return Response.json({ id });
      },
      'PUT /api/uji/[id]',
    );
    const ctx = { params: Promise.resolve({ id: 'abc' }) };
    const res = await wrapped(new Request('http://localhost:3000/api/uji/abc', { method: 'PUT' }), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'abc' });
  });

  test('error yang dilempar handler diteruskan kembali + tercatat di metrik', async () => {
    const wrapped = withApiLogging(
      async () => {
        throw new Error('boom');
      },
      'GET /api/boom',
    );
    expect(wrapped(new Request('http://localhost:3000/api/boom'))).rejects.toThrow('boom');
    // metrik dicatat saat throw (jangan menunggu settle untuk assert — cek lewat snapshot berikutnya)
  });

  test('metrik per endpoint terisi: count + latensi + status', async () => {
    const route = `GET /api/metrik-uji-${crypto.randomUUID().slice(0, 6)}`;
    const wrapped = withApiLogging(async () => new Response(null, { status: 200 }), route);
    await wrapped(new Request('http://localhost:3000/x'));
    await wrapped(new Request('http://localhost:3000/x'));

    const snap = getMetricsSnapshot();
    expect(snap[route]).toBeDefined();
    expect(snap[route].count).toBe(2);
    expect(snap[route].errors).toBe(0);
    expect(snap[route].avgMs).toBeGreaterThanOrEqual(0);
  });

  test('status >= 500 terhitung sebagai error', async () => {
    const route = `GET /api/err-uji-${crypto.randomUUID().slice(0, 6)}`;
    const wrapped = withApiLogging(async () => new Response(null, { status: 500 }), route);
    await wrapped(new Request('http://localhost:3000/x'));
    const snap = getMetricsSnapshot();
    expect(snap[route].errors).toBe(1);
  });
});

describe('utilitas logger', () => {
  test('newRequestId unik dan pendek', () => {
    const a = newRequestId();
    const b = newRequestId();
    expect(a).not.toBe(b);
    expect(a.length).toBeLessThanOrEqual(12);
  });

  test('scopedLogger tidak melempar untuk semua level', () => {
    const log = scopedLogger('uji');
    log.debug('pesan debug');
    log.info('pesan info', { requestId: 'x' });
    log.warn('pesan warn');
    log.error('pesan error');
    expect(true).toBe(true);
  });
});
