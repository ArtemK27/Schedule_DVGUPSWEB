import type { IncomingMessage, ServerResponse } from 'http';

const DEFAULT_UPSTREAM_BASE = 'https://dvgupstimetable.ru';

const ALLOWED_ENDPOINTS = new Set([
  '/api/schedule',
  '/api/all_groups',
  '/api/teachers',
  '/api/auditoriums',
  '/api/schedule/teacher',
  '/api/schedule/auditorium',
  '/api/health',
]);

type VercelRequest = IncomingMessage & {
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type VercelResponse = ServerResponse & {
  status?: (code: number) => VercelResponse;
  json?: (data: unknown) => VercelResponse;
  send?: (body: unknown) => VercelResponse;
};

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, Origin, Referer, x-dvgups-base, x-dvgups-endpoint'
  );
  res.setHeader('Access-Control-Max-Age', '86400');
}

async function readRawBody(req: VercelRequest): Promise<string> {
  if (typeof req.body === 'string') {
    return req.body;
  }
  if (req.body && typeof req.body === 'object') {
    return JSON.stringify(req.body);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

function resolveTargetEndpoint(req: VercelRequest): string {
  const headerEndpoint = req.headers['x-dvgups-endpoint'];
  if (typeof headerEndpoint === 'string' && headerEndpoint.trim().startsWith('/api/')) {
    const clean = headerEndpoint.trim().split('?')[0];
    if (ALLOWED_ENDPOINTS.has(clean)) return clean;
  }

  const parsedUrl = new URL(req.url || '/api/schedule', 'http://localhost');
  const queryEndpoint =
    (typeof req.query?.endpoint === 'string' ? req.query.endpoint : null) ||
    parsedUrl.searchParams.get('endpoint');

  if (queryEndpoint && queryEndpoint.trim().startsWith('/api/')) {
    const clean = queryEndpoint.trim().split('?')[0];
    if (ALLOWED_ENDPOINTS.has(clean)) return clean;
  }

  const pathname = parsedUrl.pathname.replace(/^\/dvgups-proxy/, '');
  if (ALLOWED_ENDPOINTS.has(pathname)) {
    return pathname;
  }

  return '/api/schedule';
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    const baseHeader = req.headers['x-dvgups-base'];
    const baseUrl = (
      typeof baseHeader === 'string' && baseHeader.trim().startsWith('http')
        ? baseHeader.trim()
        : DEFAULT_UPSTREAM_BASE
    ).replace(/\/+$/, '');

    const targetEndpoint = resolveTargetEndpoint(req);
    const targetUrl = `${baseUrl}${targetEndpoint}`;

    const rawBody =
      req.method && req.method !== 'GET' && req.method !== 'HEAD'
        ? await readRawBody(req)
        : '';

    // Allow GET /api/schedule?group=...&date=... to also work by converting query params to POST payload for dvgupstimetable.ru
    const parsedUrl = new URL(req.url || '/api/schedule', 'http://localhost');
    const queryGroup =
      (typeof req.query?.group === 'string' ? req.query.group : null) ||
      parsedUrl.searchParams.get('group');
    const queryDate =
      (typeof req.query?.date === 'string' ? req.query.date : null) ||
      parsedUrl.searchParams.get('date');

    let upstreamMethod = req.method || 'POST';
    let upstreamBody = rawBody;

    if (targetEndpoint === '/api/schedule' && upstreamMethod === 'GET' && queryGroup) {
      upstreamMethod = 'POST';
      upstreamBody = JSON.stringify({
        group: queryGroup.trim(),
        date: (queryDate || new Date().toISOString().slice(0, 10)).trim(),
      });
    } else if (
      (targetEndpoint === '/api/all_groups' ||
        targetEndpoint === '/api/teachers' ||
        targetEndpoint === '/api/auditoriums' ||
        targetEndpoint === '/api/health') &&
      upstreamMethod !== 'GET'
    ) {
      upstreamMethod = 'GET';
      upstreamBody = '';
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const fetchInit: RequestInit = {
      method: upstreamMethod,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0',
        Accept: '*/*',
        Referer: `${baseUrl}/`,
        Origin: baseUrl,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    };

    if (upstreamMethod !== 'GET' && upstreamMethod !== 'HEAD' && upstreamBody) {
      fetchInit.body = upstreamBody;
    }

    const upstreamRes = await fetch(targetUrl, fetchInit);
    clearTimeout(timeout);

    const text = await upstreamRes.text();
    res.statusCode = upstreamRes.status;
    res.setHeader(
      'Content-Type',
      upstreamRes.headers.get('content-type') || 'application/json; charset=utf-8'
    );
    res.end(text);
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        success: false,
        error: 'Upstream unreachable',
        details: String(err),
      })
    );
  }
}
