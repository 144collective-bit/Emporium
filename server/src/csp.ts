/*
 * Content Security Policy reports (docs/security-plan.md Phase 1). Both hosts send their report-only policy's
 * reports here (report-uri and the Reporting API's report-to): what Phase 5 would block, before it does. Each
 * report is cut to the directive, the blocked source and the page (its origin and path, no query) and logged
 * to the Worker's logs (observability). Nothing is stored. Small and rate-limited, as anyone can post here.
 */

/** Largest report body taken (a browser's are well under 2 KB; the Reporting API batches a few) */
export const REPORT_MAX = 16_384;
/** Reports a minute taken from one address */
export const REPORT_RATE = 30;
/** Reports kept from one body (the Reporting API batches) */
const BATCH = 10;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const hits = new Map<string, { n: number; t: number }>();

/** Over REPORT_RATE this minute from this address (the oldest entry goes when the table is full, never the lot) */
function limited(ip: string, now: number) {
  const h = hits.get(ip);
  if (!h || now - h.t > 60_000) {
    hits.delete(ip);
    hits.set(ip, { n: 1, t: now });
    if (hits.size > 5000) hits.delete(hits.keys().next().value!);
    return false;
  }
  return ++h.n > REPORT_RATE;
}

const text = (v: unknown, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '');
/** A page or a blocked address as its origin and path only (a query could carry anything) */
function place(v: unknown) {
  const s = text(v, 500);
  if (!s) return '';
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'wss:' || u.protocol === 'ws:' ? `${u.origin}${u.pathname}`.slice(0, 200) : u.protocol;
  } catch {
    // 'inline', 'eval', 'wasm-eval', 'data', 'blob' and the like
    return s.slice(0, 40);
  }
}

export interface CspReport {
  directive: string;
  blocked: string;
  page: string;
  line?: number;
}

/** The reports in a body, in either form, tidied (exported for the tests) */
export function readReports(body: unknown): CspReport[] {
  const out: CspReport[] = [];
  const one = (r: Record<string, unknown>) => {
    const line = Number(r['line-number'] ?? r.lineNumber);
    out.push({
      directive: text(r['effective-directive'] ?? r.effectiveDirective ?? r['violated-directive'], 60),
      blocked: place(r['blocked-uri'] ?? r.blockedURL),
      page: place(r['document-uri'] ?? r.documentURL),
      ...(Number.isFinite(line) && line > 0 ? { line: Math.floor(line) } : {}),
    });
  };
  if (Array.isArray(body)) {
    // The Reporting API: [{ type: 'csp-violation', body: {...} }, ...]
    for (const r of body.slice(0, BATCH))
      if (r && typeof r === 'object' && (r as Record<string, unknown>).type === 'csp-violation' && typeof (r as Record<string, unknown>).body === 'object' && (r as Record<string, unknown>).body)
        one((r as { body: Record<string, unknown> }).body);
  } else if (body && typeof body === 'object' && typeof (body as Record<string, unknown>)['csp-report'] === 'object' && (body as Record<string, unknown>)['csp-report']) {
    // report-uri: { "csp-report": {...} }
    one((body as { 'csp-report': Record<string, unknown> })['csp-report']);
  }
  return out.filter((r) => r.directive);
}

export async function cspReport(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return new Response(null, { status: 405, headers: CORS });
  const ip = req.headers.get('CF-Connecting-IP') ?? 'local';
  if (limited(ip, Date.now())) return new Response(null, { status: 429, headers: CORS });
  const size = Number(req.headers.get('Content-Length') ?? 0);
  if (size > REPORT_MAX) return new Response(null, { status: 413, headers: CORS });
  let raw = '';
  try {
    raw = await req.text();
  } catch {
    return new Response(null, { status: 400, headers: CORS });
  }
  if (raw.length > REPORT_MAX) return new Response(null, { status: 413, headers: CORS });
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400, headers: CORS });
  }
  for (const r of readReports(body)) console.log(JSON.stringify({ csp: r }));
  return new Response(null, { status: 204, headers: CORS });
}
