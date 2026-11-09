// How long each test file took (scripts/test.mjs runs it beside Node's own spec reporter, polish plan
// Phase 4): a line per file, then the slowest five, so a test that grows slow is seen. Node runs the
// files side by side and reports each test with its `file`, so a file's time is from its first test
// starting to its last one ending (wall clock), with its tests' own durations summed beside it.
import { basename } from 'node:path';

export default async function* reporter(source) {
  /** By file: when its first test started, when its last ended, its tests' durations summed, how many failed */
  const files = new Map();
  const of = (file) => {
    let f = files.get(file);
    if (!f) files.set(file, (f = { name: basename(file).replace(/\.mjs$/, '.ts'), from: Date.now(), to: Date.now(), own: 0, n: 0, failed: 0 }));
    return f;
  };
  for await (const e of source) {
    if (!e.data?.file) continue;
    if (e.type === 'test:start') of(e.data.file);
    else if (e.type === 'test:pass' || e.type === 'test:fail') {
      const f = of(e.data.file);
      f.to = Date.now();
      f.own += e.data.details?.duration_ms ?? 0;
      f.n++;
      if (e.type === 'test:fail') f.failed++;
    }
  }
  if (!files.size) return;
  const rows = [...files.values()].map((f) => ({ ...f, ms: Math.max(f.to - f.from, f.own) }));
  yield '\nTest files (wall clock, running side by side):\n';
  for (const f of rows.sort((a, b) => a.to - b.to)) yield `  ${f.failed ? 'FAIL' : 'ok  '} ${f.name.padEnd(30)} ${(f.ms / 1000).toFixed(1).padStart(6)} s  ${String(f.n).padStart(3)} tests\n`;
  const slow = [...rows].sort((a, b) => b.ms - a.ms).slice(0, 5);
  yield `Slowest: ${slow.map((f) => `${f.name} ${(f.ms / 1000).toFixed(1)} s`).join(', ')}\n`;
}
