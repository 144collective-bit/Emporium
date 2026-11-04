// Security headers (docs/security-plan.md Phase 1): degenemporium.com (public/.htaccess) and the workers.dev copy
// (public/_headers, read by Cloudflare's static assets) send the same set, framing is blocked on both, the full
// policy stays report-only until Phase 5, and the game server's CSP report endpoint keeps only what it should.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readReports } from '../server/src/csp';

/** `Header always set Name "value"` lines from .htaccess, unescaped */
function apache(): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of readFileSync('public/.htaccess', 'utf8').matchAll(/^\s*Header always set ([A-Za-z-]+) "((?:[^"\\]|\\.)*)"\s*$/gm)) out.set(m[1], m[2].replace(/\\"/g, '"'));
  return out;
}
/** The `/*` block's `Name: value` lines from _headers */
function cloudflare(): Map<string, string> {
  const out = new Map<string, string>();
  let on = false;
  for (const line of readFileSync('public/_headers', 'utf8').split('\n')) {
    if (line.startsWith('#') || !line.trim()) continue;
    if (!/^\s/.test(line)) {
      on = line.trim() === '/*';
      continue;
    }
    const m = /^\s+([A-Za-z-]+):\s*(.*)$/.exec(line);
    if (on && m) out.set(m[1], m[2].trim());
  }
  return out;
}
const directives = (csp: string) => new Map(csp.split(';').map((d) => d.trim().split(/\s+/)).filter((d) => d[0]).map((d) => [d[0], d.slice(1)]));

test('both hosts send the same security headers', () => {
  const a = apache();
  const c = cloudflare();
  assert.ok(a.size >= 9, `only ${a.size} headers in .htaccess`);
  assert.deepEqual([...a.keys()].sort(), [...c.keys()].sort());
  for (const [k, v] of a) assert.equal(c.get(k), v, k);
});

test('nobody can frame the site, sniff its files or reach plugins', () => {
  const h = cloudflare();
  assert.equal(h.get('X-Frame-Options'), 'DENY');
  assert.equal(h.get('X-Content-Type-Options'), 'nosniff');
  const enforced = directives(h.get('Content-Security-Policy')!);
  assert.deepEqual(enforced.get('frame-ancestors'), ["'none'"]);
  assert.deepEqual(enforced.get('object-src'), ["'none'"]);
  assert.deepEqual(enforced.get('base-uri'), ["'self'"]);
  // What's enforced today is only what can't break the city; the rest waits in report-only (Phase 5)
  assert.deepEqual([...enforced.keys()].sort(), ['base-uri', 'frame-ancestors', 'object-src']);
  assert.match(h.get('Strict-Transport-Security')!, /^max-age=\d{8,}$/);
});

test('the report-only policy covers everything and reports to the game server', () => {
  const ro = directives(cloudflare().get('Content-Security-Policy-Report-Only')!);
  for (const d of ['default-src', 'script-src', 'style-src', 'font-src', 'img-src', 'connect-src', 'frame-src', 'worker-src', 'object-src', 'base-uri', 'form-action', 'frame-ancestors', 'report-uri', 'report-to']) assert.ok(ro.has(d), d);
  assert.deepEqual(ro.get('default-src'), ["'self'"]);
  // Scripts: never from another host, never eval (WebAssembly only, for three's texture transcoder)
  for (const s of ro.get('script-src')!) assert.ok(["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'"].includes(s), s);
  // The live config's host: a switch in live.ts must be matched here
  assert.ok(ro.get('connect-src')!.includes(new URL(readFileSync('src/scripts/city3d/live.ts', 'utf8').match(/LIVE_URL = '([^']+)'/)![1]).origin));
  assert.equal(ro.get('report-uri')![0], 'https://emporium.144collective.workers.dev/csp-report');
  assert.match(cloudflare().get('Reporting-Endpoints')!, /^csp="https:\/\/emporium\.144collective\.workers\.dev\/csp-report"$/);
});

test('the CSP report endpoint keeps the directive, the blocked source and the page, never a query', () => {
  const legacy = readReports({ 'csp-report': { 'document-uri': 'https://degenemporium.com/?spawn=1,2&x=<b>', 'effective-directive': 'connect-src', 'blocked-uri': 'https://evil.example/steal?k=secret', 'line-number': 12 } });
  assert.deepEqual(legacy, [{ directive: 'connect-src', blocked: 'https://evil.example/steal', page: 'https://degenemporium.com/', line: 12 }]);
  const batch = readReports([
    { type: 'csp-violation', body: { documentURL: 'https://emporium.144collective.workers.dev/', effectiveDirective: 'script-src-elem', blockedURL: 'inline' } },
    { type: 'deprecation', body: { id: 'x' } },
  ]);
  assert.deepEqual(batch, [{ directive: 'script-src-elem', blocked: 'inline', page: 'https://emporium.144collective.workers.dev/' }]);
  // A javascript: or data: address is kept as its scheme only
  assert.equal(readReports({ 'csp-report': { 'effective-directive': 'img-src', 'blocked-uri': 'data:image/png;base64,AAAA' } })[0].blocked, 'data:');
  // Nonsense, or reports without a directive, are dropped; a batch is capped
  for (const raw of [null, 42, 'x', {}, { 'csp-report': 'x' }, [{ type: 'csp-violation' }], { 'csp-report': {} }]) assert.deepEqual(readReports(raw), [], JSON.stringify(raw));
  const many = Array.from({ length: 50 }, () => ({ type: 'csp-violation', body: { effectiveDirective: 'img-src', blockedURL: 'https://a.example/x' } }));
  assert.equal(readReports(many).length, 10);
  // Long values are cut
  assert.ok(readReports({ 'csp-report': { 'effective-directive': 'x'.repeat(1000) } })[0].directive.length <= 60);
});
