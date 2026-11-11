/*
 * The benchmark (`?bench` in the address; docs/growth-plan.md Phase 0): the
 * same views and the same camera route every time, so a change to the city
 * can be measured like for like, before and after, on a phone and a laptop.
 *
 * The sky is set to clear day (`?bench=night` for night), quality is held
 * where the tier put it (no stepping down or back up while it runs), and the
 * phones' idle 30fps is off. Each view settles for a second, then is
 * measured for a few; then the camera flies the route through them all.
 * For each: frames a second, the average, 95th-percentile and slowest frame
 * (the time between frames drawn, which is what a visitor feels) and the
 * CPU's share of it (the frame's own script and draw submission), draw
 * calls and triangles (all, and the shadow map's), averaged and at most.
 *
 * Results go in a card on the page, the console and `window.__bench` (for
 * scripted runs).
 */
import * as THREE from 'three';
import { mb, sceneMemory, type SceneMemory } from './perf';
import { CORE_ROADS, EXT, LANE, RING_HI, WIDEN } from './layout';
import { WALL_INNER } from './wall';

type V3 = [number, number, number];
export interface BenchView {
  id: string;
  name: string;
  pos: V3;
  target: V3;
}

/** The fixed views, in world numbers (the home view is the city's own, filled in at the start) */
export const BENCH_VIEWS: BenchView[] = [
  { id: 'home', name: 'Home view', pos: [0, 0, 0], target: [0, 0, 0] },
  { id: 'street', name: 'Downtown, street level', pos: [6, 2.2, 44.6], target: [40, 2.4, 43] },
  { id: 'square', name: 'The square and the Emporium', pos: [30, 6.5, 57], target: [30, 4.5, 38] },
  { id: 'overview', name: 'Every district, from high', pos: [75, 81, 105 + WIDEN / 2], target: [20, 0, 34 + WIDEN / 2] },
  { id: 'airport', name: 'The airport', pos: [250, 26, 300], target: [270, 2, 395] },
  { id: 'karts', name: 'The kart park', pos: [-318, 30, -20.5], target: [-318, 0, -90.5] },
  { id: 'highway', name: 'The ring highway, a junction', pos: [0, 30, -120], target: [30, 0, -170] },
  { id: 'trenches', name: 'The Trenches, round The Block', pos: [-60, 30, 120 + WIDEN], target: [-100, 0, 175 + WIDEN] },
  { id: 'park', name: 'Westlake Park, over the lake', pos: [-48, 24, -12], target: [-100, 0, -62] },
  { id: 'uptown', name: 'Uptown, its towers from the river', pos: [-60, 16, 92], target: [-120, 12, 30] },
  // (the polish plan's Phase 10: the districts that had no view)
  { id: 'uptown-north', name: 'Uptown North, from the park', pos: [-62, 20, -20], target: [-25, 10, -100] },
  // The civic quarter (docs/civic-plan.md Phase 5): City Hall over the square from the avenue, and from over Uptown's axis
  { id: 'civic', name: 'The civic square and City Hall', pos: [-140, 7, 4], target: [-140, 6, -40] },
  { id: 'civic-high', name: 'The civic quarter, from over the avenue', pos: [-140, 30, 30], target: [-140, 4, -32] },
  { id: 'mall', name: 'Starlight Mall and Palm Court', pos: [30, 26, -40], target: [60, 2, -120] },
  { id: 'harbour', name: 'Harbour Bridge, from the south bank', pos: [40, 12, 160], target: [64.5, 4, 100] },
  { id: 'sunridge', name: 'Sunridge, over the loop', pos: [120, 28, 10], target: [180, 0, -80] },
  { id: 'southfield', name: 'Southfield, the yards and the park', pos: [60, 30, 300], target: [150, 0, 210] },
  { id: 'lot9', name: 'Lot 9, from the south avenue', pos: [-20, 24, 440], target: [-70, 0, 370] },
  // Crestmont's (docs/crestmont-plan.md Phase 11): the Drive at street level, the Flats from over them, the hills
  { id: 'crest-drive', name: 'Crestmont, Coral Drive', pos: [331, 2.2, 58], target: [331, 1.6, 10] },
  { id: 'crest-flats', name: 'Crestmont, over the Flats', pos: [362, 30, 80], target: [380, 0, -10] },
  { id: 'crest-hills', name: 'Crestmont, the hills', pos: [420, 34, -50], target: [400, 16, -240] },
  // Southbank Docks' port (docs/docks-plan.md Phase 3): over the basin at the cranes, the ship and the stacks
  { id: 'docks', name: 'Southbank Docks, the port', pos: [-290, 26, 215], target: [-345, 6, 170] },
  // The Neon Mile (docs/strip-plan.md Phase 6): over the boulevard from the west, and down it at street level
  { id: 'strip', name: 'The Neon Mile, over the boulevard', pos: [150, 30, 95], target: [200, 5, 30] },
  { id: 'strip-street', name: 'The Neon Mile, the boulevard', pos: [140, 2.2, 33.5], target: [190, 4, 30] },
  // Endswood Estate (docs/estate-plan.md Phase 8): over the Circus and its well, down Endswood Road to St Aldwyn's,
  // and from the common back up to the blocks
  { id: 'ends-circus', name: 'Endswood, over the Circus', pos: [-28, 24, 412], target: [-56, 0, 378] },
  { id: 'ends-street', name: 'Endswood Road, to the church', pos: [4, 2.2, 382.5], target: [30, 7, 366] },
  { id: 'ends-common', name: 'Endswood, from the common', pos: [-74, 9, 468], target: [-58, 5, 395] },
  { id: 'outskirts', name: 'Where the edge was, looking back', pos: [-180, 14, -180], target: [30, 0, 30] },
  { id: 'edge', name: 'The far edge, looking back', pos: [EXT[0] + 20, 14, EXT[0] + 20], target: [30, 0, 30] },
  // The vehicle plan's (Phase 0): where your car's detail and the traffic's show most
  { id: 'drive', name: 'Driving, the east ring avenue', pos: [RING_HI + 1.5 * LANE, 1.9, 52], target: [RING_HI + 1.5 * LANE, 1.2, 30] },
  { id: 'traffic', name: 'Traffic at a ring junction', pos: [RING_HI - 10, 9, CORE_ROADS[1] + 10], target: [RING_HI, 0, CORE_ROADS[1]] },
  // The raised highway and the roads (docs/highway-plan.md Phase 9): along the deck, an exit's cloverleaf, a river
  // span, Kestrel Bridge and a country road
  { id: 'hw-straight', name: 'The raised highway, on the deck', pos: [110, 5.3, -168.5], target: [160, 4.6, -168.5] },
  { id: 'hw-exit', name: 'The raised highway, exit 3', pos: [312, 32, 32], target: [280, 2, -4.5] },
  { id: 'hw-river', name: 'The raised highway, a river span', pos: [-170, 10, 125], target: [-215, 2, 95] },
  { id: 'swing', name: 'Kestrel Bridge', pos: [-78, 9, 100], target: [-112, 1.5, 96] },
  { id: 'rural', name: 'A country road', pos: [72, 6, -380], target: [64.5, 0.5, -420] },
  // The wall round the city (docs/wall-plan.md Phase 6): its foot, a corner from over the land inside it, and the
  // west culvert where the river runs under it
  { id: 'wall', name: 'The wall, from its foot', pos: [WALL_INNER[0] + 40, 6, 40], target: [WALL_INNER[0], 22, 40] },
  { id: 'wall-corner', name: 'The wall, a corner', pos: [WALL_INNER[0] + 55, 45, WALL_INNER[1] + 55], target: [WALL_INNER[0], 15, WALL_INNER[1]] },
  { id: 'wall-culvert', name: 'The wall, the west culvert', pos: [WALL_INNER[0] + 45, 8, 100], target: [WALL_INNER[0], 2, 102] },
];
/** The route, through these views in order and back home */
const ROUTE = ['home', 'street', 'square', 'airport', 'karts', 'highway', 'outskirts', 'edge', 'home'];
const SETTLE = 1;
const MEASURE = 4;
const ROUTE_SECONDS = 48;

export interface BenchStats {
  frames: number;
  fps: number;
  /** Time between frames drawn, ms */
  avg: number;
  p95: number;
  worst: number;
  /** The frame's script and draw submission, ms */
  cpu: number;
  draws: number;
  maxDraws: number;
  tris: number;
  maxTris: number;
  shadowDraws: number;
  shadowTris: number;
}
export interface BenchResult {
  tier: string;
  px: number;
  size: [number, number];
  time: string;
  views: (BenchStats & { id: string; name: string })[];
  route: BenchStats;
  memory: SceneMemory;
  boot: Record<string, number>;
}

class Sampler {
  gaps: number[] = [];
  cpu = 0;
  draws = 0;
  maxDraws = 0;
  tris = 0;
  maxTris = 0;
  shadowDraws = 0;
  shadowTris = 0;
  last = 0;
  start = 0;
  add(now: number, cpu: number, draws: number, tris: number, sDraws: number, sTris: number) {
    if (this.last) this.gaps.push(now - this.last);
    else this.start = now;
    this.last = now;
    this.cpu += cpu;
    this.draws += draws;
    this.tris += tris;
    this.shadowDraws += sDraws;
    this.shadowTris += sTris;
    this.maxDraws = Math.max(this.maxDraws, draws);
    this.maxTris = Math.max(this.maxTris, tris);
  }
  stats(): BenchStats {
    const n = Math.max(1, this.gaps.length + 1);
    const g = [...this.gaps].sort((a, b) => a - b);
    const avg = g.reduce((s, x) => s + x, 0) / Math.max(1, g.length);
    const r = (x: number) => Math.round(x * 10) / 10;
    return {
      frames: n,
      fps: r(g.length ? 1000 / avg : 0),
      avg: r(avg),
      p95: r(g[Math.min(g.length - 1, Math.floor(g.length * 0.95))] ?? 0),
      worst: r(g[g.length - 1] ?? 0),
      cpu: r(this.cpu / n),
      draws: Math.round(this.draws / n),
      maxDraws: this.maxDraws,
      tris: Math.round(this.tris / n),
      maxTris: this.maxTris,
      shadowDraws: Math.round(this.shadowDraws / n),
      shadowTris: Math.round(this.shadowTris / n),
    };
  }
}

export interface BenchDeps {
  host: HTMLElement;
  scene: THREE.Scene;
  tier: string;
  pixelRatio(): number;
  home(): { pos: THREE.Vector3; target: THREE.Vector3 };
  /** Clear day (or night) for the run; the visitor's own sky back after */
  conditions(night: boolean): () => void;
  boot(): Record<string, number>;
  /** More views after the fixed ones (a district's, while one is being measured) */
  extra?: BenchView[];
}

export function createBench(d: BenchDeps, night: boolean) {
  const card = document.createElement('div');
  card.className = 'city-bench';
  const text = document.createElement('pre');
  text.setAttribute('aria-hidden', 'true');
  text.textContent = 'Benchmark: waiting for the city…';
  // Copy results: the card's text and the full results, with the device, to paste back (real phones' numbers)
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'city-bench-copy';
  copy.textContent = 'Copy results';
  copy.hidden = true;
  copy.addEventListener('click', async () => {
    const report = [text.textContent, '', `Device: ${navigator.userAgent}`, `Screen: ${screen.width} x ${screen.height} @ ${devicePixelRatio}x`, '', JSON.stringify(out)].join('\n');
    try {
      await navigator.clipboard.writeText(report);
      copy.textContent = 'Copied';
    } catch {
      // (no clipboard here: the text is selected instead, to copy by hand)
      text.textContent = report;
      getSelection()?.selectAllChildren(text);
      copy.textContent = 'Selected: copy it';
    }
  });
  card.append(text, copy);
  // On the city's root, over the welcome card and the guide (the 3D view's own box sits under them)
  (d.host.closest('[data-city-root]') ?? d.host).append(card);

  const views = [...BENCH_VIEWS, ...(d.extra ?? [])].map((v) => ({ ...v }));
  const pts = (k: 'pos' | 'target') =>
    new THREE.CatmullRomCurve3(
      ROUTE.map((id) => new THREE.Vector3(...views.find((v) => v.id === id)![k])),
      false,
      'centripetal'
    );
  let curves: { pos: THREE.CatmullRomCurve3; target: THREE.CatmullRomCurve3 } | null = null;

  // Where it is: a view (its index), then the route
  let phase: 'idle' | 'views' | 'route' | 'done' = 'idle';
  let index = 0;
  let since = 0;
  let sampler = new Sampler();
  const results: BenchResult['views'] = [];
  let restore: (() => void) | null = null;
  let out: BenchResult | null = null;

  function start(t: number) {
    const h = d.home();
    views[0].pos = h.pos.toArray() as V3;
    views[0].target = h.target.toArray() as V3;
    curves = { pos: pts('pos'), target: pts('target') };
    restore = d.conditions(night);
    phase = 'views';
    index = 0;
    since = t;
    sampler = new Sampler();
  }

  function show() {
    const lines = [`Benchmark · ${d.tier} · px ${d.pixelRatio().toFixed(2)}${night ? ' · night' : ''}`];
    for (const r of results) lines.push(`${r.name.padEnd(32).slice(0, 32)} ${String(r.fps).padStart(5)} fps · ${String(r.p95).padStart(5)} ms p95 · ${r.draws} draws · ${(r.tris / 1e6).toFixed(2)}M`);
    if (phase === 'views') lines.push(`… ${views[index].name}`);
    if (phase === 'route') lines.push('… flying the route');
    if (out) {
      const r = out.route;
      lines.push(`${'Route'.padEnd(32)} ${String(r.fps).padStart(5)} fps · ${String(r.p95).padStart(5)} ms p95 · worst ${r.worst} ms · ${r.draws} draws · ${(r.tris / 1e6).toFixed(2)}M`);
      lines.push(`Memory: geometry ${mb(out.memory.geometry)} · textures ${mb(out.memory.textures)} · ${out.memory.objects} objects`);
      lines.push(`Boot: ${Object.entries(out.boot).map(([k, v]) => `${k} ${(v / 1000).toFixed(2)} s`).join(' · ')}`);
      lines.push('Done. Full results in the console (window.__bench), or Copy results.');
    }
    text.textContent = lines.join('\n');
    copy.hidden = !out;
  }

  return {
    get active() {
      return phase === 'views' || phase === 'route';
    },
    get done() {
      return phase === 'done';
    },
    /** Begin once the city is showing */
    begin(t: number) {
      if (phase === 'idle') {
        start(t);
        show();
      }
    },
    /** Put the camera where the benchmark has got to */
    place(t: number, camera: THREE.PerspectiveCamera, target: THREE.Vector3) {
      if (phase === 'views') {
        const v = views[index];
        camera.position.set(...v.pos);
        target.set(...v.target);
      } else if (phase === 'route' && curves) {
        const k = Math.min(1, (t - since) / ROUTE_SECONDS);
        // Eased in and out, so the ends aren't a jolt
        const u = k * k * (3 - 2 * k);
        curves.pos.getPoint(u, camera.position);
        curves.target.getPoint(u, target);
      }
      camera.lookAt(target);
    },
    /** One frame drawn: its time, the CPU's share, and what it drew */
    sample(t: number, now: number, cpu: number, draws: number, tris: number, sDraws: number, sTris: number) {
      if (phase === 'views') {
        if (t - since >= SETTLE) sampler.add(now, cpu, draws, tris, sDraws, sTris);
        if (t - since >= SETTLE + MEASURE) {
          results.push({ id: views[index].id, name: views[index].name, ...sampler.stats() });
          sampler = new Sampler();
          since = t;
          if (++index >= views.length) phase = 'route';
          show();
        }
      } else if (phase === 'route') {
        sampler.add(now, cpu, draws, tris, sDraws, sTris);
        if (t - since >= ROUTE_SECONDS) {
          phase = 'done';
          const host = d.host.getBoundingClientRect();
          out = {
            tier: d.tier,
            px: d.pixelRatio(),
            size: [Math.round(host.width), Math.round(host.height)],
            time: night ? 'night' : 'day',
            views: results,
            route: sampler.stats(),
            memory: sceneMemory(d.scene),
            boot: d.boot(),
          };
          (window as unknown as { __bench?: BenchResult }).__bench = out;
          console.table(results.map(({ name, fps, avg, p95, worst, cpu, draws, tris, shadowDraws, shadowTris }) => ({ name, fps, avg, p95, worst, cpu, draws, tris, shadowDraws, shadowTris })));
          console.log('Benchmark', out);
          restore?.();
          show();
        }
      }
    },
  };
}

export type Bench = ReturnType<typeof createBench>;
