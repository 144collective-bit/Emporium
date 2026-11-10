/*
 * City Hall on screen (docs/civic-plan.md Phase 2; the numbers are civic.ts): two sites in Westlake Park's chunk
 * (registered by civic3d.ts), in stern stripped classicism. Pale stone over a darker podium; wide steps up from the
 * square between two cheeks with bronze torchères; eight square columns across the portico under a plain
 * entablature, SECTOR 7 · CITY HALL carved on its frieze and the emblem (a seven-pointed star in a ring, made up) on
 * the attic over it; long crimson banners with the star on the wall behind the columns, a bronze door on the axis;
 * tall windows in the ends and the back block, dark by day and warm at night; the stepped tower over the back
 * block, its tiers ribbed with stone piers between slit windows, a gold star lit on each face of the second tier,
 * a lantern and a gold finial over the city. The place's pick boxes are the boot's (index.ts, civic.ts).
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, neon, siteMat, toon } from './kit';
import { site } from './tilework';
import {
  ANTA_W,
  AXIS,
  BACK_H,
  BANNER,
  BANNER_XS,
  CITYHALL_TIP,
  CITYHALL_TOP,
  COLUMN,
  COLUMNS,
  DOOR,
  FRIEZE_H,
  FRONT_H,
  FRONT_RANGE,
  HALL,
  HALL_GROUND as G,
  PODIUM_Y,
  PORTICO,
  STAR,
  STEPS,
  STEP_N,
  TIERS,
  TOWER_C,
} from './civic';

const STONE = toon('#ddd6c6');
const SHADE = toon('#c6bea9');
const DARK = toon('#9d947e');
const BRONZE = toon('#5c4128');
const GOLD = toon('#c9a24c');
/** Windows: dark glass by day, warm at night (under the bloom's threshold) */
const WIN = neon('#f0d39c', 0.07, 1.0);
/** The stars on the tower and the lantern: soft gold at night */
const STAR_LIT = neon('#ffd27a', 0.35, 1.25);
const LANTERN = neon('#ffe7b8', 0.12, 1.1);
const BULB = neon('#ffe6b0', 0.5, 2.4);

/** The banner: a crimson field, gold edges, the star at its head, a stripe down it (one small texture, both cities' copy fixed) */
const BANNER_MAT = siteMat(
  'cityhall-banner',
  toon('#ffffff', {
    map: canvasTex(128, 512, (c) => {
      c.fillStyle = '#7a1c29';
      c.fillRect(0, 0, 128, 512);
      c.fillStyle = '#c9a24c';
      c.fillRect(6, 6, 116, 6);
      c.fillRect(6, 500, 116, 6);
      c.fillRect(6, 6, 6, 500);
      c.fillRect(116, 6, 6, 500);
      c.fillRect(58, 150, 12, 330);
      starPath(c, 64, 84, 44, STAR.inner);
      c.fill();
    }),
  })
);
/** The frieze's carved name (fixed, made-up copy) */
const FRIEZE_MAT = siteMat(
  'cityhall-frieze',
  toon('#ffffff', {
    map: canvasTex(1024, 52, (c) => {
      c.fillStyle = '#ddd6c6';
      c.fillRect(0, 0, 1024, 52);
      c.fillStyle = '#6f675a';
      c.font = `800 38px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const word = 'SECTOR 7  ·  CITY HALL';
      // (spaced out, as carved letters are)
      const spread = 18;
      const w = c.measureText(word).width + spread * (word.length - 1);
      let x = 512 - w / 2;
      c.textAlign = 'left';
      for (const ch of word) {
        c.fillText(ch, x, 28);
        x += c.measureText(ch).width + spread;
      }
    }),
  })
);

/** A seven-pointed star's outline on a canvas */
function starPath(c: CanvasRenderingContext2D, x: number, y: number, r: number, inner: number) {
  c.beginPath();
  for (let k = 0; k < STAR.points * 2; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / STAR.points;
    const rr = k % 2 ? r * inner : r;
    if (k) c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
}
/** The star as a thin solid, facing +z, its centre at the origin */
function starGeometry(r: number, depth = 0.08) {
  const s = new THREE.Shape();
  for (let k = 0; k < STAR.points * 2; k++) {
    const a = Math.PI / 2 + (k * Math.PI) / STAR.points;
    const rr = k % 2 ? r * STAR.inner : r;
    if (k) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.deleteAttribute('uv');
  return g;
}
/** A flat pane facing out of a wall: centre, size, the wall's axis ('x': it faces ±x, 'z': ±z) and which way */
function pane(cx: number, cy: number, cz: number, w: number, h: number, axis: 'x' | 'z', sign: 1 | -1, uv = false) {
  const g = new THREE.PlaneGeometry(w, h);
  // (the shared paint has no texture: only a textured pane keeps its uv)
  if (!uv) g.deleteAttribute('uv');
  if (axis === 'x') g.rotateY((sign * Math.PI) / 2);
  else if (sign < 0) g.rotateY(Math.PI);
  return g.translate(cx, cy, cz);
}
/** Tall windows along a wall: from a to b (along the wall), every `every`, on the face at `at` facing `sign`, rows between [y0, y1] */
function windows(b: Batch, axis: 'x' | 'z', at: number, sign: 1 | -1, a: number, c: number, every: number, rows: [number, number][]) {
  const n = Math.max(1, Math.floor((c - a) / every));
  const step = (c - a) / n;
  for (let k = 0; k < n; k++) {
    const u = a + step * (k + 0.5);
    for (const [y0, y1] of rows) {
      const [cx, cz] = axis === 'x' ? [at + sign * 0.02, u] : [u, at + sign * 0.02];
      b.add(pane(cx, (y0 + y1) / 2, cz, 1.1, y1 - y0, axis, sign), WIN);
      // A stone sill under each, and a lintel over it (near only)
      b.detail(() => {
        const [sx, sz, sw, sd] = axis === 'x' ? [at + (sign > 0 ? 0 : -0.18), u - 0.75, 0.18, 1.5] : [u - 0.75, at + (sign > 0 ? 0 : -0.18), 1.5, 0.18];
        b.box(sx, y0 - 0.14, sz, sw, 0.14, sd, SHADE);
        b.box(sx, y1, sz, sw, 0.2, sd, SHADE);
      });
    }
  }
}

/** The front: the steps, the podium and its cheeks, the colonnade, the portico, the front range */
function front(b: Batch) {
  const [x0, z0, x1, z1] = PORTICO;
  const rise = (PODIUM_Y - G) / STEP_N;
  const tread = (STEPS[3] - STEPS[1]) / STEP_N;
  // The steps, each its own tread (none overlapping another), and the podium under the portico
  for (let k = 0; k < STEP_N; k++) b.box(STEPS[0], G, STEPS[3] - (k + 1) * tread, STEPS[2] - STEPS[0], (k + 1) * rise, tread, k % 2 ? SHADE : STONE);
  b.box(x0, G, z0, x1 - x0, PODIUM_Y - G, z1 - z0, DARK);
  // The cheeks either side of the steps with their coping, a bronze torchère on each
  for (const [cx0, cx1] of [
    [x0, STEPS[0]],
    [STEPS[2], x1],
  ]) {
    b.box(cx0, G, STEPS[1], cx1 - cx0, PODIUM_Y + 0.3 - G, STEPS[3] - STEPS[1], DARK);
    b.box(cx0 - 0.08, PODIUM_Y + 0.3, STEPS[1] - 0.08, cx1 - cx0 + 0.16, 0.12, STEPS[3] - STEPS[1] + 0.16, SHADE);
    const [tx, tz] = [(cx0 + cx1) / 2, STEPS[3] - 0.7];
    b.detail(() => {
      b.box(tx - 0.07, PODIUM_Y + 0.42, tz - 0.07, 0.14, 2, 0.14, BRONZE);
      b.box(tx - 0.2, PODIUM_Y + 2.42, tz - 0.2, 0.4, 0.08, 0.4, BRONZE);
    });
    b.add(new THREE.SphereGeometry(0.22, 10, 6).translate(tx, PODIUM_Y + 2.72, tz), BULB);
  }
  // The columns: a base, a plain square shaft, a slab capital
  for (const [cx, cz] of COLUMNS) {
    const w = COLUMN.w;
    b.box(cx - w / 2 - 0.12, PODIUM_Y, cz - w / 2 - 0.12, w + 0.24, 0.3, w + 0.24, SHADE);
    b.box(cx - w / 2, PODIUM_Y + 0.3, cz - w / 2, w, COLUMN.h - 0.65, w, STONE);
    b.box(cx - w / 2 - 0.14, PODIUM_Y + COLUMN.h - 0.35, cz - w / 2 - 0.14, w + 0.28, 0.35, w + 0.28, SHADE);
  }
  // The antae closing the portico's ends
  b.box(x0, PODIUM_Y, z0, ANTA_W, COLUMN.h, z1 - 0.3 - z0, STONE);
  b.box(x1 - ANTA_W, PODIUM_Y, z0, ANTA_W, COLUMN.h, z1 - 0.3 - z0, STONE);
  // The entablature (the frieze over the columns, the portico's ceiling under it), a cornice, the attic, a cornice
  const ey = PODIUM_Y + COLUMN.h;
  b.box(x0, ey, z0, x1 - x0, FRIEZE_H, z1 - 0.3 - z0, STONE);
  b.add(pane(AXIS, ey + FRIEZE_H / 2, z1 - 0.3 + 0.02, 20, (20 * 52) / 1024, 'z', 1, true), FRIEZE_MAT);
  b.box(x0 - 0.25, ey + FRIEZE_H, z0, x1 - x0 + 0.5, 0.2, z1 - 0.05 - z0, SHADE);
  b.box(x0, ey + FRIEZE_H + 0.2, z0, x1 - x0, FRONT_H - ey - FRIEZE_H - 0.2, z1 - 0.5 - z0, STONE);
  // The emblem on the attic over the door: a gold star in a ring
  const sy = (ey + FRIEZE_H + 0.2 + FRONT_H) / 2;
  b.add(starGeometry(STAR.door).translate(AXIS, sy, z1 - 0.5), GOLD);
  b.add(new THREE.TorusGeometry(STAR.door + 0.12, 0.05, 6, 40).translate(AXIS, sy, z1 - 0.45), GOLD);
  // The front range behind, its cornice over everything
  const [fx0, fz0, fx1, fz1] = FRONT_RANGE;
  b.box(fx0, G, fz0, fx1 - fx0, FRONT_H - G, fz1 - fz0, STONE);
  b.box(fx0 - 0.3, FRONT_H, fz0 - 0.3, fx1 - fx0 + 0.6, 0.25, z1 - fz0 + 0.3, SHADE);
  // The bronze door on the axis, its stone surround, a transom lit at night; the banners in the other bays
  b.box(AXIS - DOOR.w / 2 - 0.35, PODIUM_Y, fz1, DOOR.w + 0.7, DOOR.h + 0.5, 0.08, SHADE);
  b.box(AXIS - DOOR.w / 2, PODIUM_Y, fz1 + 0.04, DOOR.w, DOOR.h, 0.08, BRONZE);
  b.add(pane(AXIS, PODIUM_Y + DOOR.h + 0.22, fz1 + 0.1, DOOR.w, 0.3, 'z', 1), WIN);
  for (const x of BANNER_XS) {
    const h = BANNER.top - BANNER.bottom;
    const g = new THREE.PlaneGeometry(BANNER.w, h).translate(x, PODIUM_Y + BANNER.bottom + h / 2, fz1 + 0.05);
    b.add(g, BANNER_MAT);
    b.box(x - BANNER.w / 2 - 0.1, PODIUM_Y + BANNER.top, fz1 + 0.02, BANNER.w + 0.2, 0.08, 0.1, BRONZE);
  }
  // Tall windows in the front range's ends
  for (const [x, s] of [
    [fx0, -1],
    [fx1, 1],
  ] as [number, 1 | -1][])
    windows(b, 'x', x, s, fz0 + 0.4, fz1 - 0.4, 3, [[G + 1.4, G + 4.6], [G + 6, G + 9.2]]);
}

/** The back block and the stepped tower over it */
function back(b: Batch) {
  const [x0, z0, x1, z1] = HALL.back;
  b.box(x0, G, z0, x1 - x0, BACK_H - G, z1 - z0, STONE);
  // (its base course a little proud of the wall: nothing flush)
  b.box(x0 - 0.06, G, z0 - 0.06, x1 - x0 + 0.12, 0.9, z1 - z0, DARK);
  b.box(x0 - 0.3, BACK_H, z0 - 0.3, x1 - x0 + 0.6, 0.25, z1 - z0 + 0.3, SHADE);
  const rows: [number, number][] = [
    [G + 1.6, G + 4.6],
    [G + 6, G + 9.6],
  ];
  windows(b, 'x', x0, -1, z0 + 0.6, z1 - 0.6, 3, rows);
  windows(b, 'x', x1, 1, z0 + 0.6, z1 - 0.6, 3, rows);
  windows(b, 'z', z0, -1, x0 + 0.6, x1 - 0.6, 3, rows);
  // The tower's tiers: each a stone block ribbed with piers, slit windows between, a cornice; the lantern on top
  const [cx, cz] = TOWER_C;
  let y0 = BACK_H + 0.25;
  TIERS.forEach((t, i) => {
    const h = t.top - y0;
    const last = i === TIERS.length - 1;
    b.box(cx - t.half, y0, cz - t.half, t.half * 2, h, t.half * 2, STONE);
    if (!last) b.box(cx - t.half - 0.2, t.top - 0.18, cz - t.half - 0.2, t.half * 2 + 0.4, 0.18, t.half * 2 + 0.4, SHADE);
    // Piers on every face (at every distance: they're the tower's look), slit windows between them
    const n = Math.max(3, Math.round((t.half * 2) / 1.5));
    for (let k = 0; k <= n; k++) {
      const u = -t.half + 0.15 + ((t.half * 2 - 0.3) * k) / n;
      for (const s of [-1, 1] as const) {
        b.box(cx + u - 0.13, y0, cz + s * t.half + (s > 0 ? 0 : -0.22), 0.26, h - 0.2, 0.22, STONE);
        b.box(cx + s * t.half + (s > 0 ? 0 : -0.22), y0, cz + u - 0.13, 0.22, h - 0.2, 0.26, STONE);
        if (k < n && !last && i !== 1) {
          const m = u + (t.half * 2 - 0.3) / n / 2;
          b.add(pane(cx + m, y0 + h / 2, cz + s * (t.half + 0.02), 0.5, h - 1.2, 'z', s), WIN);
          b.add(pane(cx + s * (t.half + 0.02), y0 + h / 2, cz + m, 0.5, h - 1.2, 'x', s), WIN);
        }
      }
    }
    // The second tier: the emblem on each face, a gold star lit at night
    if (i === 1) {
      const sy = y0 + h / 2;
      for (const s of [-1, 1] as const) {
        b.add(starGeometry(STAR.tower).rotateY(s > 0 ? 0 : Math.PI).translate(cx, sy, cz + s * (t.half + 0.24)), STAR_LIT);
        b.add(starGeometry(STAR.tower).rotateY((s * Math.PI) / 2).translate(cx + s * (t.half + 0.24), sy, cz), STAR_LIT);
      }
    }
    // The lantern: lit glazing round the crown under its cap
    if (last) {
      for (const s of [-1, 1] as const) {
        b.add(pane(cx, y0 + h / 2, cz + s * (t.half + 0.02), t.half * 2 - 0.6, h - 0.5, 'z', s), LANTERN);
        b.add(pane(cx + s * (t.half + 0.02), y0 + h / 2, cz, t.half * 2 - 0.6, h - 0.5, 'x', s), LANTERN);
      }
    }
    y0 = t.top;
  });
  // The cap and the gold finial
  const cap = TIERS.at(-1)!.half + 0.25;
  b.box(cx - cap, CITYHALL_TOP, cz - cap, cap * 2, 0.2, cap * 2, SHADE);
  b.add(new THREE.ConeGeometry(0.35, CITYHALL_TIP - CITYHALL_TOP - 0.2, 4, 1, true).rotateY(Math.PI / 4).translate(cx, (CITYHALL_TOP + 0.2 + CITYHALL_TIP) / 2, cz), GOLD);
}

export function registerCityHall() {
  site('cityhall front', [PORTICO[0] - 0.4, FRONT_RANGE[1] - 0.4, PORTICO[2] + 0.4, STEPS[3] + 0.2], (into) => {
    const b = new Batch();
    front(b);
    b.build(into, { cast: true, receive: true });
  });
  site('cityhall back', [HALL.back[0] - 0.4, HALL.back[1] - 0.4, HALL.back[2] + 0.4, HALL.back[3] + 0.4], (into) => {
    const b = new Batch();
    back(b);
    b.build(into, { cast: true, receive: true });
  });
}
