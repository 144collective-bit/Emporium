/*
 * Uptown's new buildings on screen (docs/finance-plan.md Phase 7; the numbers
 * are uptownsites.ts), part of Uptown's chunk (uptown3d.ts), a site each:
 *
 * - **The Circle Theatre:** its curved front to the circle (the marble foyer
 *   and its chandeliers through the glass, the atlas's grand band), limestone
 *   over it, the fly tower in brick behind, the marquee along the front (its
 *   name and the films on its fascia, lit underneath), posters in frames
 *   between the doors, a vertical CIRCLE blade; the marquee's bulbs chase on
 *   the main thread's tick (three materials of their own, steady under
 *   reduced motion).
 * - **The Exchange:** a limestone hall behind a portico of six columns on
 *   steps, an entablature with its name and a pediment, the ticker along its
 *   side on the diagonal (made-up words on one texture its tick scrolls).
 * - **The Grand Hotel:** limestone over its ground floor (the grand band on
 *   the cross street, shops on the diagonal), a cornice, the pool deck on its
 *   roof behind a glass rail (the pool lit at night, loungers, umbrellas, a
 *   bar), the glass penthouse, its name lit on a frame along the roof's edge,
 *   a HOTEL blade, the porte-cochère and flags over its door.
 * - **A tower going up:** hoardings with made-up developer copy, floors on
 *   columns round a concrete core, formwork at the top; the tower crane's
 *   mast here, its jib turning on the main thread.
 * - **Pocket gardens:** paving, beds, a fountain bowl, a bench.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, lit, moving, neon, siteMat, toon } from './kit';
import { SLAB, type Tick } from './world';
import { site } from './tilework';
import { ATLAS, flat, normalOf, rim, shrink, wall, walls } from './highrise3d';
import { PODIUM, GROUND } from './highrise';
import { EXCHANGE, FILMS, GARDENS, GARDEN_FOUNTAINS, FOUNTAIN_R, HOARDING_COPY, HOTEL, HOTEL_NAME, MARQUEE, THEATRE, TICKER_WORDS, WORKS, theatreFront } from './uptownsites';
import { bench } from './plaza3d';
import type { Pt, Rect } from './uptown';

/* ---------- Signs ---------- */

/** One atlas of the buildings' names and lines, a row each (fixed made-up copy) */
const ROWS = ['CIRCLE THEATRE', `NOW SHOWING · ${FILMS[0]} · ${FILMS[3]}`, `CINEMA · ${FILMS[1]} · ${FILMS[2]}`, 'THE EXCHANGE', HOTEL_NAME, ...HOARDING_COPY];
const ROW_H = 64;
const SIGNS = (() => {
  const tex = canvasTex(1024, ROW_H * ROWS.length, (c) => {
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    ROWS.forEach((text, i) => {
      const y = i * ROW_H;
      const hoarding = i >= 5;
      c.fillStyle = i === 3 ? '#d9ccb0' : i === 4 ? '#14121f' : hoarding ? ['#1c2a55', '#2b4a3a', '#5a1f2e', '#14121f'][i % 4] : '#0b0a18';
      c.fillRect(0, y, 1024, ROW_H);
      if (i <= 2) {
        // The marquee's bulbs drawn round its board
        c.fillStyle = '#ffe9a8';
        for (let x = 10; x < 1024; x += 22) {
          c.fillRect(x, y + 4, 6, 6);
          c.fillRect(x, y + ROW_H - 10, 6, 6);
        }
      }
      c.fillStyle = i === 3 ? '#8a6a2a' : i === 4 ? '#f3e2b0' : i === 0 ? '#ff5ce0' : hoarding ? '#ffffff' : '#ffffff';
      c.font = `${i === 3 || i === 4 ? 600 : 800} ${i <= 2 ? 34 : 40}px ${FONT_DISPLAY}`;
      if (i === 3 || i === 4) (c as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '10px';
      c.fillText(text, 512, y + ROW_H / 2 + 2);
      (c as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px';
      if (hoarding) {
        // A skyline drawn along the developer's boards
        c.fillStyle = 'rgba(255,255,255,0.18)';
        for (let x = 0; x < 1024; x += 60) c.fillRect(x + 6, y + ROW_H - 10 - ((x * 7) % 30), 40, 10 + ((x * 7) % 30));
      }
    });
  });
  return siteMat('uptown-sites-signs', lit(new THREE.MeshBasicMaterial({ map: tex, color: '#ffffff' }), 0.95, 1.35));
})();
const rowUv = (i: number): [number, number, number, number] => [0, 1 - (i + 1) / ROWS.length, 1, 1 - i / ROWS.length];
/** The films' posters: one atlas of six, each a colour field, a shape and its title */
const POSTERS = (() => {
  const tex = canvasTex(768, 192, (c) => {
    const cols = [['#2a0a3a', '#ff4fd8'], ['#0a1a3a', '#4fe3ff'], ['#1a2a1a', '#f2c94c'], ['#3a0a1a', '#ff8a3d'], ['#101028', '#b46bff'], ['#0a2a2a', '#6fcf97']];
    FILMS.forEach((f, i) => {
      const x = i * 128;
      const [bg, fg] = cols[i % cols.length];
      c.fillStyle = bg;
      c.fillRect(x, 0, 128, 192);
      c.fillStyle = fg;
      c.beginPath();
      c.arc(x + 64, 80, 34, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = bg;
      c.beginPath();
      c.arc(x + 76, 70, 30, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#ffffff';
      c.font = `800 15px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.fillText(f, x + 64, 160);
      c.strokeStyle = '#c9a24a';
      c.lineWidth = 4;
      c.strokeRect(x + 2, 2, 124, 188);
    });
  });
  return siteMat('uptown-posters', lit(new THREE.MeshBasicMaterial({ map: tex, color: '#ffffff' }), 0.9, 1.2));
})();
/** The vertical blades: CIRCLE and HOTEL, a letter over the next, in neon on black */
const BLADES = (() => {
  const tex = canvasTex(128, 512, (c) => {
    c.fillStyle = '#0b0a18';
    c.fillRect(0, 0, 128, 512);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `800 52px ${FONT_DISPLAY}`;
    [...'CIRCLE'].forEach((ch, i) => {
      c.fillStyle = '#ff5ce0';
      c.fillText(ch, 32, 46 + i * 80);
    });
    [...'HOTEL'].forEach((ch, i) => {
      c.fillStyle = '#ffd27a';
      c.fillText(ch, 96, 56 + i * 96);
    });
  });
  return siteMat('uptown-blades', lit(new THREE.MeshBasicMaterial({ map: tex, color: '#ffffff' }), 1, 1.6));
})();
/** The ticker's words, one long texture its tick scrolls */
const TICKER_TEX = (() => {
  const tex = canvasTex(2048, 64, (c) => {
    c.fillStyle = '#05040b';
    c.fillRect(0, 0, 2048, 64);
    c.font = `700 38px ${FONT_DISPLAY}`;
    c.textBaseline = 'middle';
    let x = 20;
    for (let i = 0; x < 1960; i++) {
      const w = TICKER_WORDS[i % TICKER_WORDS.length];
      const width = c.measureText(w).width;
      if (x + width > 2010) break;
      c.fillStyle = ['#7dffb0', '#ffd23f', '#ffffff', '#4fe3ff'][i % 4];
      c.fillText(w, x, 34);
      x += width + 26;
      c.fillStyle = '#ff5ce0';
      c.fillText('•', x, 34);
      x += 44;
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
})();
const TICKER = siteMat('uptown-ticker', lit(new THREE.MeshBasicMaterial({ map: TICKER_TEX, color: '#ffffff' }), 0.85, 1));

/** A plane w x h with these UVs standing at (x, y, z) facing the way `ry` turns +z, or lying flat facing up */
function decal(b: Batch, mat: THREE.Material, uv: [number, number, number, number], x: number, y: number, z: number, w: number, h: number, ry: number) {
  const g = new THREE.PlaneGeometry(w, h);
  const a = g.attributes.uv;
  for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * (uv[2] - uv[0]), uv[1] + a.getY(i) * (uv[3] - uv[1]));
  b.add(g.rotateY(ry).translate(x, y, z), mat);
}
/** A wall's facing (ry) from its outward normal */
const ryOf = (n: Pt) => Math.atan2(n[0], n[1]);

const ROOF = toon('#3a3550');
const PARAPET = toon('#5a5478');
const STONE = toon('#e6dcc4');
const STONE_DARK = toon('#a89c80');
const GOLD = toon('#c9a24a');
const BRONZE = toon('#6a4a2a');
const DARK = toon('#1b1830');
const STEEL = toon('#8f93ad');
const RAIL_GLASS = toon('#a9dcef');
const CREAM = toon('#f1ece2');
const SOFT_LIGHT = neon('#fff1d0', 0.45, 1.5);
const CANOPY_EDGE = neon('#ffd27a', 0.15, 2.2);
const WATER = neon('#3fd0f0', 0.8, 1.15);
const UMBRELLA = toon('#f1ece2');
const CORNICE = toon('#efe6d0');

/** A building's body: its ground floor's band side by side by which way each wall faces, limestone over it, a string course, a cornice, its roof and parapet */
function body(b: Batch, line: Pt[], h: number, ground: (n: Pt) => 'grand' | 'service' | 'luxe' | 'dining' | 'atrium') {
  line.forEach((a, i) => {
    const c = line[(i + 1) % line.length];
    if (Math.hypot(c[0] - a[0], c[1] - a[1]) < 0.05) return;
    const g = ground(normalOf(a, c));
    if (g === 'grand' || g === 'service' || g === 'atrium') wall(b, ATLAS[g], a, c, SLAB, SLAB + PODIUM.h, 0);
    else {
      wall(b, ATLAS.store[g], a, c, SLAB, SLAB + GROUND.h, 0);
      wall(b, ATLAS.ribbon, a, c, SLAB + GROUND.h, SLAB + PODIUM.h, 0);
    }
  });
  walls(b, ATLAS.masonry.limestone, line, SLAB + PODIUM.h, SLAB + h - 0.35);
  walls(b, ATLAS.masonry.limestone, shrink(line, -0.03), SLAB + h - 0.35, SLAB + h, 0.5);
  rim(b, shrink(line, -0.1), SLAB + PODIUM.h - 0.06, 0.2, 0.14, CORNICE);
  rim(b, shrink(line, -0.16), SLAB + h - 0.5, 0.32, 0.2, CORNICE);
  flat(b, shrink(line, 0.006), SLAB + h - 0.02, ROOF);
  rim(b, shrink(line, 0.07), SLAB + h - 0.02, 0.16, 0.3, PARAPET);
}

/* ---------- The Circle Theatre ---------- */



function theatre(b: Batch) {
  const { poly, h, fly } = THEATRE;
  body(b, poly, h, (n) => (n[0] > 0.3 ? 'grand' : 'service'));
  // The fly tower in brick behind, its roof
  const [fx0, fz0, fx1, fz1, top] = fly;
  const flyLine: Pt[] = [[fx0, fz0], [fx0, fz1], [fx1, fz1], [fx1, fz0]];
  walls(b, ATLAS.masonry.brick, flyLine, SLAB + h - 0.3, SLAB + top);
  flat(b, shrink(flyLine, 0.006), SLAB + top - 0.02, ROOF);
  rim(b, shrink(flyLine, 0.07), SLAB + top - 0.02, 0.16, 0.3, PARAPET);
  // The marquee: its soffit lit underneath, its fascia with the name and the films, a dark top
  const { y } = THEATRE.marquee;
  const Y = SLAB + y;
  for (let i = 1; i < MARQUEE.length; i++) {
    const [p, q] = [MARQUEE[i - 1], MARQUEE[i]];
    const quad = (a: Pt, c: Pt, d: Pt, e: Pt, yy: number, mat: THREE.Material, down = false) => {
      const g = new THREE.BufferGeometry();
      const v = [a, c, d, e].flatMap(([x, z]) => [x, yy, z]);
      g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      g.setIndex(down ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
      g.computeVertexNormals();
      b.add(g, mat);
    };
    // (top and soffit: the strip between the front and the marquee's edge)
    quad(p.inner, p.outer, q.outer, q.inner, Y + 0.55, DARK);
    quad(p.inner, p.outer, q.outer, q.inner, Y - 0.005, SOFT_LIGHT, true);
  }
  // The fascia, in pieces along the curve, the atlas's lines laid along it (the name in the middle, the films either side)
  const total = MARQUEE.slice(1).reduce((s, q, i) => s + Math.hypot(q.outer[0] - MARQUEE[i].outer[0], q.outer[1] - MARQUEE[i].outer[1]), 0);
  let run = 0;
  for (let i = 1; i < MARQUEE.length; i++) {
    const [p, q] = [MARQUEE[i - 1], MARQUEE[i]];
    const len = Math.hypot(q.outer[0] - p.outer[0], q.outer[1] - p.outer[1]);
    const third = Math.min(2, Math.floor((run + len / 2) / (total / 3)));
    const row = [1, 0, 2][third];
    const u0 = ((run - (total / 3) * third) / (total / 3)) % 1;
    const u1 = u0 + len / (total / 3);
    const n = p.n;
    const g = new THREE.BufferGeometry();
    const a = p.outer;
    const c = q.outer;
    // (facing out along n: seen from outside, the later point (smaller z) on the right)
    g.setAttribute('position', new THREE.Float32BufferAttribute([a[0], Y, a[1], c[0], Y, c[1], c[0], Y + 0.55, c[1], a[0], Y + 0.55, a[1]], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([n[0], 0, n[1], n[0], 0, n[1], n[0], 0, n[1], n[0], 0, n[1]], 3));
    const [, v0, , v1] = rowUv(row);
    g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v0, u1, v0, u1, v1, u0, v1], 2));
    // (wound to face n: a, c, then up)
    const cross = (c[0] - a[0]) * n[1] - (c[1] - a[1]) * n[0];
    g.setIndex(cross < 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
    b.add(g, SIGNS);
    run += len;
  }
  b.detail(() => {
    // Posters in gold frames along the front either side of the doors, at eye height
    MARQUEE.forEach(({ inner, n }, i) => {
      if (i % 3 !== 1 || Math.abs(inner[1] - THEATRE.door[1]) < 2.4) return;
      const k = (i / 3) | 0;
      const [x, z] = [inner[0] + n[0] * 0.04, inner[1] + n[1] * 0.04];
      decal(b, POSTERS, [(k % FILMS.length) / FILMS.length, 0, (k % FILMS.length + 1) / FILMS.length, 1], x, SLAB + 1.35, z, 0.72, 1.08, ryOf(n));
    });
    // Brass posts and a rope at the doors
    const [dx, dz] = THEATRE.door;
    for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.04, 0.05, 0.9, 6).translate(dx + 0.6, SLAB + 0.45, dz + s * 1.6), GOLD);
  });
  // The CIRCLE blade at the front's north end, out from the wall over the marquee
  const bz = THEATRE.marquee.z0 - 0.9;
  const bx = theatreFront(bz);
  b.box(bx - 0.02, SLAB + 3.9, bz - 0.06, 1.05, 4.4, 0.12, DARK);
  for (const s of [-1, 1]) decal(b, BLADES, [0, 0.02, 0.5, 0.98], bx + 0.5, SLAB + 6.1, bz + s * 0.065, 0.9, 4.2, s > 0 ? 0 : Math.PI);
  b.box(bx + 1.0, SLAB + 3.9, bz - 0.07, 0.06, 4.4, 0.14, CANOPY_EDGE);
}

/* ---------- The Exchange ---------- */

function exchange(b: Batch) {
  const { hall, h, portico: P, ticker } = EXCHANGE;
  body(b, hall, h, (n) => (n[1] < -0.5 ? 'grand' : 'service'));
  // The steps across its front, the columns on the top step, the entablature, its name, the pediment
  const zf = EXCHANGE.poly[0][1];
  const zb = hall[0][1];
  for (let k = 0; k < 3; k++) b.box(P.x0 - 0.6 + k * 0.15, SLAB, zf + k * 0.22, P.x1 - P.x0 + 1.2 - k * 0.3, 0.12 * (k + 1), zb - zf - k * 0.22, STONE_DARK);
  const top = SLAB + 0.36;
  for (let i = 0; i < P.cols; i++) {
    const x = P.x0 + ((P.x1 - P.x0) * i) / (P.cols - 1);
    b.add(new THREE.CylinderGeometry(0.24, 0.28, P.colH - 0.36 - 0.3, 12, 1, true).translate(x, top + (P.colH - 0.66) / 2 + 0.15, P.z), STONE);
    b.box(x - 0.34, top, P.z - 0.34, 0.68, 0.15, 0.68, STONE_DARK);
    b.box(x - 0.36, SLAB + P.colH - 0.3, P.z - 0.36, 0.72, 0.3, 0.72, STONE_DARK);
  }
  const E0 = SLAB + P.colH;
  b.box(P.x0 - 0.6, E0, P.z - 0.5, P.x1 - P.x0 + 1.2, 0.75, zb - P.z + 0.55, STONE);
  b.box(P.x0 - 0.62, E0 + 0.62, P.z - 0.52, P.x1 - P.x0 + 1.24, 0.08, 0.04, GOLD);
  decal(b, SIGNS, rowUv(3), (P.x0 + P.x1) / 2, E0 + 0.33, P.z - 0.505, Math.min(7, P.x1 - P.x0), 0.42, Math.PI);
  // The pediment: a triangle across the portico, a raking cornice on it
  const w = P.x1 - P.x0 + 1.2;
  const shape = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, P.peak - P.colH - 0.75)]);
  const ped = new THREE.ExtrudeGeometry(shape, { depth: zb - P.z + 0.4, bevelEnabled: false }).translate((P.x0 + P.x1) / 2, E0 + 0.75, P.z - 0.45);
  b.add(ped, STONE);
  // The ticker along its side on the diagonal (west, the hall's first side), on a dark band
  const [a, c] = [hall[0], hall[1]];
  const n = normalOf(a, c);
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const mid: Pt = [(a[0] + c[0]) / 2 + n[0] * 0.03, (a[1] + c[1]) / 2 + n[1] * 0.03];
  b.add(new THREE.BoxGeometry(len - 0.6, ticker.h + 0.12, 0.05).rotateY(ryOf(n)).translate(mid[0] - n[0] * 0.02, SLAB + ticker.y, mid[1] - n[1] * 0.02), DARK);
  const g = new THREE.PlaneGeometry(len - 0.8, ticker.h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * ((len - 0.8) / (ticker.h * 32)));
  b.add(g.rotateY(ryOf(n)).translate(mid[0] + n[0] * 0.01, SLAB + ticker.y, mid[1] + n[1] * 0.01), TICKER);
  // Bronze doors behind the columns
  b.box((P.x0 + P.x1) / 2 - 1.1, SLAB + 0.36, zb - 0.06, 2.2, 2.6, 0.04, BRONZE);
}

/* ---------- The Grand Hotel ---------- */

function hotel(b: Batch, low: boolean) {
  const { poly, h, penthouse: ph, pool, door } = HOTEL;
  body(b, poly, h, (n) => (n[1] > 0.5 ? 'grand' : n[0] > 0.3 ? 'luxe' : 'service'));
  const R = SLAB + h;
  // The glass rail round the roof, the penthouse in glass behind the pool, its roof
  rim(b, shrink(poly, 0.2), R - 0.02, 0.04, 1.0, RAIL_GLASS);
  const phLine: Pt[] = [[ph[0], ph[1]], [ph[0], ph[3]], [ph[2], ph[3]], [ph[2], ph[1]]];
  walls(b, ATLAS.atrium, phLine, R - 0.02, SLAB + ph[4]);
  flat(b, shrink(phLine, 0.006), SLAB + ph[4] - 0.02, ROOF);
  rim(b, shrink(phLine, -0.06), SLAB + ph[4] - 0.1, 0.14, 0.12, CANOPY_EDGE);
  // The pool: lit water a step over the deck, a white coping round it
  flat(b, pool, R + 0.04, WATER);
  rim(b, shrink(pool, -0.08), R - 0.02, 0.16, 0.1, CREAM);
  // The name along the roof's edge on the diagonal, on a steel frame, facing out
  const [a, c] = [poly[2], poly[3]];
  const n = normalOf(a, c);
  const mid: Pt = [(a[0] + c[0]) / 2 - n[0] * 0.5, (a[1] + c[1]) / 2 - n[1] * 0.5];
  for (const s of [-2.6, 0, 2.6]) b.box(mid[0] - n[1] * s - 0.05, R, mid[1] + n[0] * s - 0.05, 0.1, 1.4, 0.1, STEEL);
  decal(b, SIGNS, rowUv(4), mid[0] + n[0] * 0.07, R + 1.35, mid[1] + n[1] * 0.07, 7, 0.75, ryOf(n));
  // The HOTEL blade at the corner of the cross street and the diagonal, out over the sidewalk
  const [cx, cz] = poly[2];
  const bx = cx - 1.2;
  b.box(bx - 0.06, SLAB + 4.2, cz, 0.12, 4.0, 0.95, DARK);
  for (const s of [-1, 1]) decal(b, BLADES, [0.5, 0.02, 1, 0.98], bx + s * 0.065, SLAB + 6.2, cz + 0.48, 0.85, 3.8, s * (Math.PI / 2));
  b.box(bx - 0.07, SLAB + 4.2, cz + 0.93, 0.14, 4.0, 0.05, CANOPY_EDGE);
  // The porte-cochère over the sidewalk to the kerb, lit along its edge, on two posts at the kerb
  const [dx, dz] = door;
  const out = 2.25;
  b.box(dx - 2.4, SLAB + 2.95, dz + 0.01, 4.8, 0.14, out, DARK);
  b.box(dx - 2.4, SLAB + 2.9, dz + out - 0.06, 4.8, 0.05, 0.06, CANOPY_EDGE);
  for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.07, 0.07, 2.95, 8, 1, true).translate(dx + s * 2.2, SLAB + 1.475, dz + out - 0.25), GOLD);
  b.detail(() => {
    // Under it, a lit soffit; flags out from the wall over it
    b.box(dx - 2.3, SLAB + 2.94, dz + 0.1, 4.6, 0.01, out - 0.2, SOFT_LIGHT);
    for (const k of [-1, 0, 1]) {
      const fx = dx + k * 1.4;
      b.add(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 6, 1, true).rotateX(-0.9).translate(fx, SLAB + 4.4, dz + 0.6), STEEL);
      b.add(new THREE.BoxGeometry(0.02, 0.5, 0.8).rotateX(-0.9).translate(fx + 0.02, SLAB + 4.55, dz + 0.95), [toon('#5a1f2e'), toon('#c9a24a'), toon('#1c2a55')][k + 1]);
    }
    if (low) return;
    // On the deck: loungers along the pool's back, umbrellas, a bar against the penthouse
    const [px0, pz0] = pool[0];
    for (let k = 0; k < 3; k++) {
      const z = pz0 + 0.6 + k * 1.4;
      b.box(px0 - 1.0, R, z - 0.3, 0.75, 0.12, 0.6, CREAM);
      b.add(new THREE.BoxGeometry(0.06, 0.45, 0.6).rotateZ(-0.6).translate(px0 - 1.0, R + 0.25, z), CREAM);
    }
    for (const k of [0.5, 2.5]) {
      b.add(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 6, 1, true).translate(px0 - 0.4, R + 0.9, pz0 + k), STEEL);
      b.add(new THREE.ConeGeometry(0.85, 0.32, 8, 1, true).translate(px0 - 0.4, R + 1.85, pz0 + k), UMBRELLA);
    }
    b.box(ph[2] + 0.05, R, ph[1] + 0.6, 0.6, 1.0, 2.2, BRONZE);
    b.box(ph[2] + 0.03, R + 1.0, ph[1] + 0.55, 0.66, 0.05, 2.3, GOLD);
  });
}

/* ---------- A tower going up ---------- */

const CONCRETE = toon('#a8a4b8');
const CONCRETE_DARK = toon('#7a7690');
const FORMWORK = toon('#e0b54a');
const SAFETY = toon('#ff8a3d');
const PLYWOOD = toon('#c9a77a');
const CRANE = toon('#f2c94c');

function works(b: Batch) {
  const { poly, tower: [x0, z0, x1, z1], floors, floor, core, crane, hoarding } = WORKS;
  // The hoardings round it, the developer's copy on their outer faces
  poly.forEach((a, i) => {
    const c = poly[(i + 1) % poly.length];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const n = normalOf(a, c);
    b.add(new THREE.BoxGeometry(len, hoarding, 0.08).rotateY(ryOf(n)).translate((a[0] + c[0]) / 2 - n[0] * 0.04, SLAB + hoarding / 2, (a[1] + c[1]) / 2 - n[1] * 0.04), PLYWOOD);
    for (let d = 0.2; d + 2.6 < len; d += 3) {
      const t = (d + 1.3) / len;
      const [px, pz] = [a[0] + (c[0] - a[0]) * t + n[0] * 0.006, a[1] + (c[1] - a[1]) * t + n[1] * 0.006];
      decal(b, SIGNS, rowUv(5 + ((i + Math.round(d)) % HOARDING_COPY.length)), px, SLAB + 1.2, pz, 2.6, 0.9, ryOf(n));
    }
  });
  // The floors up so far on their columns, the core rising through them, the top two in formwork with safety boards
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  b.box(cx - 0.8, SLAB, cz - 0.8, 1.6, core, 1.6, CONCRETE_DARK);
  for (let k = 1; k <= floors; k++) {
    const y = SLAB + k * floor;
    b.box(x0, y - 0.16, z0, x1 - x0, 0.16, z1 - z0, CONCRETE);
    for (const [px, pz] of [[x0 + 0.2, z0 + 0.2], [x1 - 0.2, z0 + 0.2], [x0 + 0.2, z1 - 0.2], [x1 - 0.2, z1 - 0.2]] as Pt[]) b.box(px - 0.12, y - floor, pz - 0.12, 0.24, floor - 0.16, 0.24, CONCRETE);
    if (k >= floors - 1) rim(b, [[x0, z0], [x0, z1], [x1, z1], [x1, z0]], y, 0.04, 0.5, k === floors ? FORMWORK : SAFETY);
  }
  b.detail(() => {
    // Rebar out of the core's top, a skip and pallets of blocks by the crane
    for (let k = 0; k < 6; k++) b.box(cx - 0.7 + (k % 3) * 0.6, SLAB + core, cz - 0.6 + Math.floor(k / 3) * 1.2, 0.04, 0.9, 0.04, DARK);
    b.box(crane.x + 1.0, SLAB, crane.z - 0.6, 1.4, 0.7, 0.9, SAFETY);
    for (let k = 0; k < 2; k++) b.box(crane.x - 0.4 + k * 0.9, SLAB, crane.z + 1.0, 0.7, 0.5, 0.7, CONCRETE_DARK);
  });
  // The crane's mast: four chords, a rung every metre (near), its base on the slab
  const m = 0.45;
  const top = SLAB + crane.h - 1.6;
  b.box(crane.x - 0.8, SLAB, crane.z - 0.8, 1.6, 0.5, 1.6, CONCRETE);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(crane.x + sx * m - 0.05, SLAB + 0.5, crane.z + sz * m - 0.05, 0.1, top - SLAB - 0.5, 0.1, CRANE);
  b.detail(() => {
    for (let y = SLAB + 1.5; y < top; y += 1.0)
      for (const [ax, az, w, d] of [[-m, -m, 2 * m, 0.05], [-m, m, 2 * m, 0.05], [-m, -m, 0.05, 2 * m], [m, -m, 0.05, 2 * m]]) b.box(crane.x + ax, y, crane.z + az, w || 0.05, 0.05, d || 0.05, CRANE);
  });
}

/** The crane's top: the slewing ring, the cab, the tower top, the jib with its trolley and hook, the counter-jib and its weights; turned about its mast */
function craneTop(): THREE.Group {
  const b = new Batch();
  const { h, jib, counter } = WORKS.crane;
  const y0 = h - 1.6;
  b.box(-0.6, y0, -0.6, 1.2, 0.4, 1.2, DARK);
  b.box(0.3, y0 - 0.2, 0.6, 0.9, 0.9, 0.9, CRANE);
  b.box(0.35, y0 + 0.1, 1.48, 0.8, 0.45, 0.03, RAIL_GLASS);
  // The tower top, an A over the ring
  for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(0.1, 3.2, 0.1).rotateX(s * 0.18).translate(0, y0 + 2.0, s * 0.3), CRANE);
  // The jib along +x: two bottom chords, a top chord, bracing every metre
  const yj = y0 + 0.4;
  for (const s of [-1, 1]) b.box(0, yj, s * 0.3 - 0.04, jib, 0.08, 0.08, CRANE);
  b.box(0, yj + 0.7, -0.04, jib - 0.6, 0.08, 0.08, CRANE);
  for (let x = 0.5; x < jib - 0.6; x += 1) b.add(new THREE.BoxGeometry(0.05, 0.85, 0.05).rotateZ(0.6).translate(x, yj + 0.38, 0), CRANE);
  // The counter-jib along -x and its concrete weights
  for (const s of [-1, 1]) b.box(-counter, yj, s * 0.35 - 0.05, counter, 0.1, 0.1, CRANE);
  b.box(-counter, yj - 0.9, -0.5, 1.2, 1.0, 1.0, CONCRETE);
  // Pendants from the A's top to both ends
  const apex = new THREE.Vector3(0, y0 + 3.5, 0);
  for (const end of [new THREE.Vector3(jib - 0.6, yj + 0.78, 0), new THREE.Vector3(-counter, yj + 0.1, 0)]) {
    const len = apex.distanceTo(end);
    const g = new THREE.BoxGeometry(0.035, len, 0.035).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(apex).normalize()));
    b.add(g.translate((apex.x + end.x) / 2, (apex.y + end.y) / 2, (apex.z + end.z) / 2), DARK);
  }
  // The trolley two-thirds out, its cable down to the hook and a bundle of rebar on it
  const tx = jib * 0.62;
  b.box(tx - 0.3, yj - 0.25, -0.35, 0.6, 0.25, 0.7, DARK);
  b.box(tx - 0.015, yj - 9, -0.015, 0.03, 8.75, 0.03, DARK);
  b.box(tx - 0.2, yj - 9.3, -0.2, 0.4, 0.3, 0.4, SAFETY);
  b.box(tx - 1.1, yj - 9.6, -0.15, 2.2, 0.12, 0.3, CONCRETE_DARK);
  // A warning light at the tip
  b.add(new THREE.OctahedronGeometry(0.13, 0).translate(0, y0 + 3.65, 0), neon('#ff2a2a', 0.3, 2.4));
  const g = new THREE.Group();
  b.build(g, { cast: true, receive: false });
  g.position.set(WORKS.crane.x, SLAB, WORKS.crane.z);
  g.name = 'uptown-crane';
  return moving(g);
}

/* ---------- Pocket gardens ---------- */

const PAVING = toon('#cfc7b8');
const BED = toon('#4a3a32');
const HEDGE = toon('#2f6b45');
const BLOOMS = ['#ff4fd8', '#ffd23f', '#ff8a3d', '#f3f2f7'].map((c) => toon(c));

function garden(b: Batch, [x0, z0, x1, z1]: Rect, [fx, fz]: Pt, i: number) {
  b.box(x0, SLAB, z0, x1 - x0, 0.012, z1 - z0, PAVING);
  // Beds along the side by the street of the circle, clipped hedges on them, flowers (near)
  b.box(x0, SLAB, z0, 0.9, 0.28, z1 - z0, BED);
  b.box(x0 + 0.08, SLAB + 0.28, z0 + 0.1, 0.74, 0.32, z1 - z0 - 0.2, HEDGE);
  b.detail(() => {
    for (let k = 0; k < 6; k++) b.box(x1 - 0.5, SLAB + 0.012, z0 + 0.3 + k * ((z1 - z0 - 0.6) / 5) - 0.12, 0.24, 0.3, 0.24, BLOOMS[(k + i) % BLOOMS.length]);
  });
  // The fountain: a stone bowl, the water, a jet
  b.add(new THREE.CylinderGeometry(FOUNTAIN_R, FOUNTAIN_R + 0.08, 0.5, 16, 1).translate(fx, SLAB + 0.25, fz), STONE);
  b.add(new THREE.CylinderGeometry(FOUNTAIN_R - 0.1, FOUNTAIN_R - 0.1, 0.02, 16).translate(fx, SLAB + 0.48, fz), WATER);
  b.detail(() => b.add(new THREE.ConeGeometry(0.12, 0.7, 6, 1, true).translate(fx, SLAB + 0.85, fz), RAIL_GLASS));
  bench(b, [(x0 + x1) / 2, z0 + 0.45], 0, SLAB + 0.012);
}

/* ---------- Registering ---------- */

/** The marquee's bulbs: three sets, each a material of its own lit in turn (chasing), round its outer edge */
function bulbs(scene: THREE.Scene, tick?: (f: Tick) => void) {
  const pts: THREE.Vector3[] = [];
  for (let i = 1; i < MARQUEE.length; i++) {
    const [p, q] = [MARQUEE[i - 1].outer, MARQUEE[i].outer];
    const n = Math.max(1, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.32));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      for (const y of [THEATRE.marquee.y - 0.02, THEATRE.marquee.y + 0.57]) pts.push(new THREE.Vector3(p[0] + (q[0] - p[0]) * t, SLAB + y, p[1] + (q[1] - p[1]) * t));
    }
  }
  const geo = new THREE.SphereGeometry(0.05, 6, 4);
  const mats = [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: '#ffe9a8', toneMapped: true }));
  const meshes = mats.map((mat, k) => {
    const own = pts.filter((_, i) => Math.floor(i / 2) % 3 === k);
    const m = new THREE.InstancedMesh(geo, mat, own.length);
    own.forEach((p, i) => m.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)));
    m.name = 'theatre-bulbs';
    m.userData.keep = true;
    scene.add(m);
    return m;
  });
  const base = new THREE.Color('#ffe9a8');
  const set = (t: number, night: number) =>
    mats.forEach((mat, k) => {
      const on = Math.floor(t * 6) % 3 === k;
      mat.color.copy(base).multiplyScalar((0.55 + 1.9 * night) * (on ? 1 : 0.35));
    });
  set(0, 0.5);
  tick?.(({ t, night }) => set(t, night));
  return meshes;
}

export function registerSites(low: boolean, scene: THREE.Scene | null, tick?: (f: Tick) => void) {
  const pad = ([x0, z0, x1, z1]: Rect, m: number): Rect => [x0 - m, z0 - m, x1 + m, z1 + m];
  site('uptown theatre', pad(THEATRE.rect, 2), (into) => {
    const b = new Batch();
    theatre(b);
    b.build(into, { cast: true, receive: true });
  });
  site('uptown exchange', pad(EXCHANGE.rect, 1), (into) => {
    const b = new Batch();
    exchange(b);
    b.build(into, { cast: true, receive: true });
  });
  site('uptown hotel', pad(HOTEL.rect, 2.5), (into) => {
    const b = new Batch();
    hotel(b, low);
    b.build(into, { cast: true, receive: true });
  });
  site('uptown works', pad(WORKS.rect, 1), (into) => {
    const b = new Batch();
    works(b);
    b.build(into, { cast: true, receive: true });
  });
  GARDENS.forEach((r, i) =>
    site(`uptown garden ${i}`, r, (into) => {
      const b = new Batch();
      garden(b, r, GARDEN_FOUNTAINS[i], i);
      b.build(into, { cast: false, receive: true });
    })
  );
  // On the main thread: the crane's top turning slowly, the marquee's bulbs chasing, the ticker's words going by
  if (!scene) return;
  const crane = craneTop();
  scene.add(crane);
  bulbs(scene, tick);
  tick?.(({ t, dt }) => {
    crane.rotation.y = t * 0.04;
    TICKER_TEX.offset.x = (TICKER_TEX.offset.x + dt * 0.05) % 1;
  });
}
