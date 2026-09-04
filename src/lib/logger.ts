/**
 * Logging terstruktur + metrik sederhana (audit R-08).
 *
 * - Setiap baris log berbentuk JSON baris-tunggal (stdout) dengan level,
 *   scope, dan konteks (requestId, durasi, status) — mudah difilter lewat
 *   `docker logs` / journald / cloud log agent berdasarkan level.
 * - withApiLogging membungkus route handler: mengukur latensi, mencatat
 *   status, menempelkan header X-Request-ID, dan mengisi metrik per-endpoint
 *   (jumlah request + error + total latensi) yang bisa dilihat admin di
 *   /api/metrics.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function minLevel(): LogLevel {
  const fromEnv = process.env.LOG_LEVEL as LogLevel | undefined;
  if (fromEnv && fromEnv in LEVEL_ORDER) return fromEnv;
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

export interface LogContext {
  requestId?: string;
  method?: string;
  route?: string;
  status?: number;
  durationMs?: number;
  [key: string]: unknown;
}

function emit(level: LogLevel, scope: string, message: string, ctx?: LogContext) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel()]) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    ...ctx,
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export interface ScopedLogger {
  debug(message: string, ctx?: LogContext): void;
  info(message: string, ctx?: LogContext): void;
  warn(message: string, ctx?: LogContext): void;
  error(message: string, ctx?: LogContext): void;
}

export function scopedLogger(scope: string): ScopedLogger {
  return {
    debug: (m, c) => emit('debug', scope, m, c),
    info: (m, c) => emit('info', scope, m, c),
    warn: (m, c) => emit('warn', scope, m, c),
    error: (m, c) => emit('error', scope, m, c),
  };
}

export function newRequestId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

// ---------------------------------------------------------------------------
// Metrik in-memory sederhana (audit R-08)
// ---------------------------------------------------------------------------

export interface EndpointMetrics {
  count: number;
  errors: number;
  totalMs: number;
  lastStatus: number;
  lastAt: string;
}

const metrics = new Map<string, EndpointMetrics>();

function recordMetric(route: string, status: number, durationMs: number) {
  const key = route;
  const m = metrics.get(key) ?? { count: 0, errors: 0, totalMs: 0, lastStatus: 200, lastAt: '' };
  m.count += 1;
  if (status >= 500) m.errors += 1;
  m.totalMs += durationMs;
  m.lastStatus = status;
  m.lastAt = new Date().toISOString();
  metrics.set(key, m);
}

/** Snapshot metrik per endpoint — dipakai /api/metrics (admin). */
export function getMetricsSnapshot(): Record<string, EndpointMetrics & { avgMs: number }> {
  const out: Record<string, EndpointMetrics & { avgMs: number }> = {};
  for (const [route, m] of metrics) {
    out[route] = { ...m, avgMs: m.count > 0 ? Math.round(m.totalMs / m.count) : 0 };
  }
  return out;
}

// ---------------------------------------------------------------------------
// Wrapper route handler
// ---------------------------------------------------------------------------

/**
 * Bungkus route handler API: request-id, log terstruktur, metrik latensi.
 *
 * `export const GET = withApiLogging(GETHandler, 'GET /api/xxx')`
 */
export function withApiLogging<Req extends Request, Args extends unknown[]>(
  handler: (request: Req, ...args: Args) => Promise<Response>,
  route: string,
): (request: Req, ...args: Args) => Promise<Response> {
  const log = scopedLogger('api');
  return async (request: Req, ...args: Args): Promise<Response> => {
    const started = Date.now();
    const requestId = newRequestId();
    let response: Response;
    try {
      response = await handler(request, ...args);
    } catch (error) {
      // Route seharusnya menangani error-nya sendiri — baris ini menangkap
      // yang lolos (mis. bug throw di luar try/catch handler).
      log.error('handler threw', {
        requestId,
        route,
        method: request.method,
        durationMs: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
      });
      recordMetric(route, 500, Date.now() - started);
      throw error;
    }
    const durationMs = Date.now() - started;
    const ctx: LogContext = {
      requestId,
      method: request.method,
      route,
      status: response.status,
      durationMs,
    };
    if (response.status >= 500) log.error('request completed with error', ctx);
    else if (response.status >= 400) log.warn('request rejected', ctx);
    else log.info('request completed', ctx);

    recordMetric(route, response.status, durationMs);

    try {
      response.headers.set('X-Request-ID', requestId);
    } catch {
      // Header immutable (respons dari cache dsb.) — abaikan
    }
    return response;
  };
}
