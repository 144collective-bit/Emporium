/*
 * Crestmont's houses upgraded, drawn (crestgrand.ts, the premium upgrade's Phase 2): the balconies by their kind, the
 * hill mansions' roof terraces and the gates, each in its house's own frame through the house's own helpers (so they
 * land in the house's site and batch: estates3d.ts and mansions3d.ts). The main shapes are drawn at every distance
 * (a balcony's slab and its rail's top, a deck and its rail, the piers and their lanterns); the bars, balusters,
 * gilding, furniture and leaves near only (phones trimmed as now: the bars and balusters a plain panel).
 */
import * as THREE from 'three';
import { neon, toon } from './kit';
import { BALCONY, DECK_RAIL, GATE_LEAF, PIER, balconyRect, type Balcony, type BalconyKind, type RoofDeck } from './crestgrand';

/** A house's drawing helpers, in its own frame */
export interface Draw {
  box: (u0: number, y0: number, v0: number, u1: number, y1: number, v1: number, m: THREE.Material) => void;
  add: (g: THREE.BufferGeometry, m: THREE.Material) => void;
  detail: (f: () => void) => void;
  low: boolean;
}

const IRON = toon('#1e1d22');
const STONE = toon('#e2d8c4');
const STONE_SHADE = toon('#c4b99f');
const OAK = toon('#5a3a26');
const GLASS = toon('#a9dcef');
const STEEL = toon('#9aa1a8');
const GOLD = toon('#d9a94a');
const BRONZE = toon('#8a6a3a');
const TERRACOTTA = toon('#c97b56');
const TEAK = toon('#a8743f');
const CUSHION = toon('#f1ede2');
const CANOPY = toon('#f4ead2');
const LEAF = toon('#4f7a3a');
/** The lanterns' glass, the rails' and decks' small lights: small, warm, the only things bright enough to bloom */
const GLOW = neon('#ffe2a8', 0.25, 1.3);
const LED = neon('#fff0d0', 0.15, 1.4);

/** A rail's three open sides round a balcony, or all four round a deck: each run as (u0, v0) to (u1, v1) */
function sides(r: [number, number, number, number], open: 'front' | 'all', v: number, n: 1 | -1): [number, number, number, number][] {
  const [u0, v0, u1, v1] = r;
  const out: [number, number, number, number][] = [];
  if (open === 'all')
    out.push([u0, v0, u1, v0], [u0, v1, u1, v1], [u0, v0, u0, v1], [u1, v0, u1, v1]);
  else {
    const far = n > 0 ? v1 : v0;
    out.push([u0, far, u1, far], [u0, v, u0, far], [u1, v, u1, far]);
  }
  return out;
}

/** A rail along a run, of a kind: its top always, its bars or balusters near (a plain panel on phones) */
function rail(D: Draw, kind: BalconyKind, [a0, b0, a1, b1]: [number, number, number, number], y: number, h: number) {
  const alongU = Math.abs(a1 - a0) >= Math.abs(b1 - b0);
  const L = Math.hypot(a1 - a0, b1 - b0);
  const t = kind === 'stone' ? 0.09 : kind === 'oak' ? 0.06 : 0.035;
  const run = (y0: number, y1: number, w: number, m: THREE.Material) =>
    alongU ? D.box(Math.min(a0, a1), y0, b0 - w, Math.max(a0, a1), y1, b0 + w, m) : D.box(a0 - w, y0, Math.min(b0, b1), a0 + w, y1, Math.max(b0, b1), m);
  const at = (s: number): [number, number] => [a0 + ((a1 - a0) * s) / L, b0 + ((b1 - b0) * s) / L];
  if (kind === 'glass') {
    run(y, y + h - 0.04, 0.012, GLASS);
    run(y + h - 0.04, y + h, 0.025, STEEL);
    return;
  }
  // (the top: a stone coping, an oak or an iron handrail)
  run(y + h - (kind === 'stone' ? 0.1 : 0.05), y + h, t, kind === 'stone' ? STONE : kind === 'oak' ? OAK : IRON);
  if (D.low) {
    D.detail(() => run(y, y + h - 0.1, t * 0.6, kind === 'stone' ? STONE_SHADE : kind === 'oak' ? OAK : IRON));
    return;
  }
  D.detail(() => {
    run(y, y + 0.06, t, kind === 'stone' ? STONE : kind === 'oak' ? OAK : IRON);
    const step = kind === 'stone' ? 0.17 : kind === 'oak' ? 0.14 : 0.12;
    const n = Math.max(2, Math.round(L / step));
    for (let i = 1; i < n; i++) {
      const [u, v] = at((i * L) / n);
      if (kind === 'stone') D.add(new THREE.CylinderGeometry(0.035, 0.05, h - 0.16, 6).translate(u, y + 0.06 + (h - 0.16) / 2, v), STONE);
      else D.box(u - 0.015, y + 0.06, v - 0.015, u + 0.015, y + h - 0.05, v + 0.015, kind === 'oak' ? OAK : IRON);
    }
    // (an iron rail's gilded knobs at its ends)
    if (kind === 'iron') for (const s of [0, L]) D.add(new THREE.SphereGeometry(0.035, 6, 4).translate(...xyz(at(s), y + h + 0.03)), GOLD);
  });
}
const xyz = ([u, v]: [number, number], y: number): [number, number, number] => [u, y, v];

/** A balcony: its slab (on brackets or corbels, near), its rail round its open sides */
export function drawBalcony(D: Draw, b: Balcony) {
  const r = balconyRect(b);
  const slab = b.kind === 'oak' ? OAK : b.kind === 'glass' ? CUSHION : STONE;
  D.box(r[0], b.y - BALCONY.slab, r[1], r[2], b.y, r[3], slab);
  for (const s of sides(r, 'front', b.v, b.n)) rail(D, b.kind, s, b.y, BALCONY.rail);
  D.detail(() => {
    // (under it: an iron balcony's scrolled brackets, a stone one's corbels, an oak one's braces; a glass one's none)
    if (b.kind === 'glass') return;
    for (const u of [r[0] + 0.15, r[2] - 0.15]) {
      const [v0, v1] = b.n > 0 ? [b.v, b.v + b.d * 0.7] : [b.v - b.d * 0.7, b.v];
      D.box(u - 0.04, b.y - BALCONY.slab - 0.3, v0, u + 0.04, b.y - BALCONY.slab, v1, b.kind === 'oak' ? OAK : b.kind === 'stone' ? STONE_SHADE : IRON);
    }
  });
}

/** A roof terrace: its deck's surface, its rail all round, a light at its corners; near, its furniture */
export function drawDeck(D: Draw, d: RoofDeck, kind: BalconyKind) {
  const [u0, v0, u1, v1] = d.r;
  D.add(new THREE.PlaneGeometry(u1 - u0, v1 - v0).rotateX(-Math.PI / 2).translate((u0 + u1) / 2, d.y + 0.008, (v0 + v1) / 2), d.kind === 'flat' ? TEAK : kind === 'stone' ? STONE : TERRACOTTA);
  for (const s of sides(d.rail, 'all', 0, 1)) rail(D, kind, s, d.y + 0.01, DECK_RAIL.h);
  for (const [u, v] of [
    [d.rail[0], d.rail[1]],
    [d.rail[2], d.rail[1]],
    [d.rail[0], d.rail[3]],
    [d.rail[2], d.rail[3]],
  ])
    D.add(new THREE.SphereGeometry(0.06, 6, 4).translate(u, d.y + DECK_RAIL.h + 0.1, v), GLOW);
  D.detail(() => {
    for (const t of d.things) {
      const y = d.y + 0.01;
      if (t.kind === 'pot') {
        D.add(new THREE.CylinderGeometry(t.r, t.r * 0.75, 0.45, 8).translate(t.u, y + 0.225, t.v), TERRACOTTA);
        D.add(new THREE.IcosahedronGeometry(t.r * 1.3, 0).translate(t.u, y + 0.85, t.v), LEAF);
        D.add(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 4).translate(t.u, y + 0.55, t.v), OAK);
      } else if (t.kind === 'lounger') D.box(t.u - t.r * 0.8, y, t.v - 0.6, t.u + t.r * 0.8, y + 0.28, t.v + 0.6, CUSHION);
      else if (t.kind === 'parasol') {
        D.add(new THREE.CylinderGeometry(0.025, 0.025, 2.0, 5).translate(t.u, y + 1.0, t.v), OAK);
        D.add(new THREE.ConeGeometry(0.9, 0.3, 8, 1, true).translate(t.u, y + 2.05, t.v), CANOPY);
      } else {
        D.add(new THREE.CylinderGeometry(t.r, t.r, 0.05, 10).translate(t.u, y + 0.7, t.v), TEAK);
        D.add(new THREE.CylinderGeometry(0.04, 0.06, 0.7, 5).translate(t.u, y + 0.35, t.v), IRON);
        for (const s of [-1, 1]) D.box(t.u + s * (t.r + 0.25) - 0.18, y + 0.42, t.v - 0.18, t.u + s * (t.r + 0.25) + 0.18, y + 0.47, t.v + 0.18, IRON);
      }
    }
    // (a strip of light under the rail's top, on the deck's back)
    D.box(d.rail[0] + 0.1, d.y + DECK_RAIL.h - 0.14, d.rail[1] - 0.04, d.rail[2] - 0.1, d.y + DECK_RAIL.h - 0.11, d.rail[1] - 0.02, LED);
  });
}

/** A gate pier's top: an iron lantern (or a modern house's light strip), and a plain bronze plaque on its street face */
export function drawPierTop(D: Draw, u: number, v: number, h: number, half: number, modern: boolean, out: 1 | -1 = 1) {
  if (modern) {
    D.box(u - half - 0.02, h, v - half - 0.02, u + half + 0.02, h + 0.06, v + half + 0.02, IRON);
    D.box(u - 0.04, h - 0.9, v + out * (half + 0.004), u + 0.04, h - 0.2, v + out * (half + 0.02), LED);
  } else {
    const l = PIER.lantern;
    D.box(u - half - 0.05, h, v - half - 0.05, u + half + 0.05, h + 0.1, v + half + 0.05, STONE_SHADE);
    // (phones: the lantern near only, as the piers' globes were)
    const lantern = () => {
      D.box(u - l - 0.03, h + 0.1, v - l - 0.03, u + l + 0.03, h + 0.17, v + l + 0.03, IRON);
      D.box(u - l, h + 0.17, v - l, u + l, h + 0.17 + PIER.lanternH - 0.08, v + l, GLOW);
      D.add(new THREE.ConeGeometry(l * 1.5, 0.15, 4).rotateY(Math.PI / 4).translate(u, h + 0.17 + PIER.lanternH, v), IRON);
    };
    if (D.low) D.detail(lantern);
    else lantern();
    D.detail(() => {
      for (const [su, sv] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ])
        D.box(u + su * l - 0.012, h + 0.17, v + sv * l - 0.012, u + su * l + 0.012, h + 0.17 + PIER.lanternH - 0.08, v + sv * l + 0.012, IRON);
      D.add(new THREE.SphereGeometry(0.035, 6, 4).translate(u, h + 0.17 + PIER.lanternH + 0.1, v), GOLD);
    });
  }
  const p = PIER.plaque;
  D.box(u - p.w / 2, p.y, v + out * (half + 0.004), u + p.w / 2, p.y + p.h, v + out * (half + 0.02), modern ? STEEL : BRONZE);
}

/**
 * A gate's leaf swung open into the grounds: its hinge at (u, v), running `len` back along -v (`dir` -1) from it.
 * Wrought iron: a frame, its top rail rising to its free end, bars with gilded spear tips, a scroll in its middle; a
 * modern house's: a steel frame and timber slats. Near only.
 */
export function drawLeaf(D: Draw, u: number, v: number, len: number, modern: boolean) {
  const { h, arch, bar, tip } = GATE_LEAF;
  const v1 = v - len;
  if (modern) {
    D.box(u - 0.03, 0.1, v1, u + 0.03, h, v, IRON);
    if (!D.low) for (let y = 0.2; y < h - 0.05; y += 0.13) D.box(u - 0.035, y, v1 + 0.03, u + 0.035, y + 0.09, v - 0.03, TEAK);
    return;
  }
  for (const y of [0.15, 0.55]) D.box(u - 0.025, y, v1, u + 0.025, y + 0.04, v, IRON);
  D.box(u - 0.03, 0.1, v - 0.06, u + 0.03, h + 0.05, v, IRON);
  D.box(u - 0.03, 0.1, v1, u + 0.03, h + arch + 0.05, v1 + 0.06, IRON);
  // (the top rail in four pieces, rising to the free end)
  const top = (s: number) => h + arch * Math.sin((s * Math.PI) / 2);
  for (let k = 0; k < 4; k++) {
    const [s0, s1] = [k / 4, (k + 1) / 4];
    const y = (top(s0) + top(s1)) / 2;
    D.box(u - 0.025, y - 0.025, v - len * s1, u + 0.025, y + 0.025, v - len * s0, IRON);
  }
  if (D.low) return;
  const n = Math.max(3, Math.round(len / bar));
  for (let i = 1; i < n; i++) {
    const s = i / n;
    const vv = v - len * s;
    const y1 = top(s);
    D.box(u - 0.012, 0.15, vv - 0.012, u + 0.012, y1, vv + 0.012, IRON);
    D.add(new THREE.ConeGeometry(0.025, tip, 4).translate(u, y1 + tip / 2, vv), GOLD);
  }
  D.add(new THREE.TorusGeometry(0.16, 0.014, 4, 12).rotateY(Math.PI / 2).translate(u, 0.85, v - len / 2), GOLD);
}
