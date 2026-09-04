import { describe, test, expect } from 'bun:test';
import {
  consumeRateLimit,
  resetRateLimit,
  getClientIp,
  DEFAULT_LOGIN_RATE_LIMIT,
  LOGIN_IP_RATE_LIMIT,
  type RateLimitOptions,
} from '@/lib/rate-limit';

const fastOpts: RateLimitOptions = { limit: 2, windowMs: 100, blockMs: 100 };

function makeRequest(headers: Record<string, string>): Request {
  return new Request('http://localhost:3000/api/x', { headers });
}

describe('consumeRateLimit', () => {
  test('mengizinkan hingga limit lalu memblok', () => {
    const key = `test:${crypto.randomUUID()}`;
    const r1 = consumeRateLimit(key, fastOpts);
    const r2 = consumeRateLimit(key, fastOpts);
    const r3 = consumeRateLimit(key, fastOpts);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(false); // percobaan ke-3 melebihi limit 2
    expect(r3.retryAfterSec).toBeGreaterThan(0);
  });

  test('sisa percobaan berkurang', () => {
    const key = `test:${crypto.randomUUID()}`;
    const r1 = consumeRateLimit(key, fastOpts);
    const r2 = consumeRateLimit(key, fastOpts);
    expect(r1.remaining).toBe(1);
    expect(r2.remaining).toBe(0);
  });

  test('resetRateLimit membersihkan bucket', () => {
    const key = `test:${crypto.randomUUID()}`;
    consumeRateLimit(key, fastOpts);
    consumeRateLimit(key, fastOpts);
    expect(consumeRateLimit(key, fastOpts).ok).toBe(false);
    resetRateLimit(key);
    expect(consumeRateLimit(key, fastOpts).ok).toBe(true);
  });

  test('jendela baru setelah expiry mengizinkan lagi', async () => {
    const key = `test:${crypto.randomUUID()}`;
    consumeRateLimit(key, fastOpts);
    consumeRateLimit(key, fastOpts);
    expect(consumeRateLimit(key, fastOpts).ok).toBe(false);
    await Bun.sleep(120); // blockMs + windowMs = 100ms
    expect(consumeRateLimit(key, fastOpts).ok).toBe(true);
  });

  test('konstanta login sesuai desain audit (T-04)', () => {
    expect(DEFAULT_LOGIN_RATE_LIMIT.limit).toBe(5);
    expect(LOGIN_IP_RATE_LIMIT.limit).toBe(30);
    expect(LOGIN_IP_RATE_LIMIT.windowMs).toBe(15 * 60 * 1000);
  });
});

describe('getClientIp (audit T-03 — XFF spoof)', () => {
  test('X-Real-IP (proxy tepercaya) diprioritaskan', () => {
    const req = makeRequest({
      'x-real-ip': '203.0.113.9',
      'x-forwarded-for': '1.2.3.4, 5.6.7.8',
    });
    expect(getClientIp(req)).toBe('203.0.113.9');
  });

  test('XFF: entri TERAKHIRI dipakai — entri pertama (spoofable) diabaikan', () => {
    const req = makeRequest({
      'x-forwarded-for': '1.2.3.4, 198.51.100.7',
    });
    expect(getClientIp(req)).toBe('198.51.100.7');
  });

  test('XFF entri tunggal dipakai apa adanya', () => {
    const req = makeRequest({ 'x-forwarded-for': '198.51.100.7' });
    expect(getClientIp(req)).toBe('198.51.100.7');
  });

  test('X-Real-IP tidak valid diabaikan → fallback XFF', () => {
    const req = makeRequest({
      'x-real-ip': 'bukan-ip',
      'x-forwarded-for': '198.51.100.7',
    });
    expect(getClientIp(req)).toBe('198.51.100.7');
  });

  test('tanpa header proxy → unknown (akses langsung dev)', () => {
    expect(getClientIp(makeRequest({}))).toBe('unknown');
  });

  test('IPv6 (termasuk bentuk [::1]) dikenali', () => {
    expect(getClientIp(makeRequest({ 'x-real-ip': '2001:db8::1' }))).toBe('2001:db8::1');
    expect(getClientIp(makeRequest({ 'x-real-ip': '[::1]' }))).toBe('[::1]');
  });
});
