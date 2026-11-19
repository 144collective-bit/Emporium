/*
 * The High Road's places drawn (docs/south-plan.md Phase 3, step 3c; the data is highroad.ts), in the village's chunk
 * (village3d.ts calls `registerHighRoad()`): the Victorian rows (brick, three storeys, shopfronts with a fascia and its
 * sign, sash windows over, a slate roof behind a parapet), Endswood Parade (60s, two storeys, a canopy along its
 * shops), the Brook & Lantern (two storeys under a big gable, its ground floor painted, lit warm at night), the boarded
 * Duke of Endswood, Kestrel Fuel (a canopy on posts over two pump islands, the kiosk behind), Aldwyn's Green Bus Garage
 * (Victorian brick, a gable to the street, two arched doors), Sparkle Hand Wash (a canopy over its bay), the gap site
 * and the station's site behind hoardings. Every sign from one atlas (made-up names only, no numbers), lit at night.
 * Each building level on its base (a plinth where the hill falls), not lifted onto the ground.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, PAL, canvasTex, lit, neon, roundRect, siteMat, toon } from './kit';
import { site } from './tilework';
import { BACK_IN, HEIGHT, SHOPS, STATION_DOOR, STATION_WALL, shopFoot, type Shop } from './highroad';
import { BUILDING_STAIRS as STATION_STAIRS, LINE_COLOUR, STAIR_RUN as STATION_STAIR_RUN } from './southline';

type Pt = [number, number];

/* ---------- The signs: one atlas, a row a name ---------- */

const NAMED = SHOPS.filter((s) => s.name);
const SIGNS = (() => {
  const W = 512;
  const H = 64;
  const tex = canvasTex(W, H * NAMED.length, (c) => {
    NAMED.forEach((s, i) => {
      const y = i * H;
      const dim = s.kind === 'boarded';
      c.fillStyle = dim ? '#2a2830' : '#14121f';
      c.fillRect(0, y, W, H);
      c.strokeStyle = dim ? '#5a5560' : s.colour;
      c.lineWidth = 5;
      roundRect(c, 6, y + 6, W - 12, H - 12, 8);
      c.stroke();
      c.fillStyle = dim ? '#8a8490' : '#fff6e0';
      c.font = `800 34px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const size = Math.min(34, (34 * (W - 50)) / c.measureText(s.name.toUpperCase()).width);
      c.font = `800 ${size}px ${FONT_DISPLAY}`;
      c.fillText(s.name.toUpperCase(), W / 2, y + H / 2 + 2);
    });
  });
  return { mat: siteMat('highroad-signs', lit(new THREE.MeshBasicMaterial({ map: tex, toneMapped: true }), 0.95, 1.15)), rows: NAMED.length };
})();

/* ---------- Materials ---------- */

const BRICK = toon('#9b3b2a');
const YELLOW = toon('#c9a85a');
const CONCRETE = toon('#b3aa9e');
const SLATE = toon('#3e4352');
const STONE = toon('#d9d1c2');
const DARK = toon('#2b2e38');
const GLASS_LIT = neon('#ffd99a', 0.14, 1.05);
const GLASS_DARK = toon('#27324a');
const SHOP_GLASS = neon('#ffe7b8', 0.22, 1.2);
const PLY = toon('#a3804f');
const STATION_STONE = toon('#e3dccd');
const HOARD_LINE = toon(LINE_COLOUR);
/** The city's M mark (as the raised metro's, metro3d.ts): a magenta disc with a white M, over the station's door */
let mark: THREE.Material | null = null;
const stationMark = () =>
  (mark ??= siteMat(
    'station-mark',
    lit(
      new THREE.MeshBasicMaterial({
        map: canvasTex(256, 128, (c) => {
          c.fillStyle = '#100d1e';
          c.fillRect(0, 0, 256, 128);
          c.fillStyle = PAL.magenta;
          c.beginPath();
          c.arc(128, 64, 56, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = '#ffffff';
          c.font = `900 80px ${FONT_DISPLAY}`;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText('M', 128, 68);
        }),
      }),
      0.9,
      1.2
    )
  ));
const POST = toon('#d8d4e6');
const PUMP = toon('#2b2d3a');
const paints = new Map<string, THREE.Material>();
const paintOf = (c: string) => paints.get(c) ?? (paints.set(c, toon(c)), paints.get(c)!);

/** Triangles both ways round (a roof's and a gable's faces seen from either side, whichever way they were wound) */
const both = (pos: number[]) => {
  const back: number[] = [];
  for (let i = 0; i < pos.length; i += 9) back.push(...pos.slice(i, i + 3), ...pos.slice(i + 6, i + 9), ...pos.slice(i + 3, i + 6));
  return [...pos, ...back];
};

/* ---------- In a building's frame (x along its front, z out of it, y up from its base) ---------- */

function frameOf(s: Shop) {
  const [nx, nz] = s.face;
  return new THREE.Matrix4().makeBasis(new THREE.Vector3(nz, 0, -nx), new THREE.Vector3(0, 1, 0), new THREE.Vector3(nx, 0, nz)).setPosition(s.at[0], s.base, s.at[1]);
}
function kit(b: Batch, s: Shop) {
  const M = frameOf(s);
  const put = (g: THREE.BufferGeometry, m: THREE.Material) => {
    // (a textured material keeps its uv: the signs, the station's M mark)
    if (g.getAttribute('uv') && m !== SIGNS.mat && !(m as THREE.MeshBasicMaterial).map) g.deleteAttribute('uv');
    if (!g.index) g.setIndex([...Array(g.getAttribute('position').count).keys()]);
    b.add(g.applyMatrix4(M), m);
  };
  /** A box x0..x1, y0..y1, z0..z1 in the frame */
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, m: THREE.Material) =>
    put(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), m);
  /** A panel on the front (z out), x0..x1, y0..y1 */
  const pane = (x0: number, x1: number, y0: number, y1: number, z: number, m: THREE.Material) => put(new THREE.PlaneGeometry(x1 - x0, y1 - y0).translate((x0 + x1) / 2, (y0 + y1) / 2, z), m);
  /** Its sign, x0..x1 at y (the atlas's row for its name) */
  const sign = (x0: number, x1: number, y: number, h: number, z: number) => {
    const row = NAMED.indexOf(s);
    if (row < 0) return;
    const g = new THREE.PlaneGeometry(x1 - x0, h);
    const uv = g.getAttribute('uv') as THREE.BufferAttribute;
    const [v0, v1] = [1 - (row + 1) / SIGNS.rows, 1 - row / SIGNS.rows];
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) > 0.5 ? v1 - 0.002 : v0 + 0.002);
    put(g.translate((x0 + x1) / 2, y, z), SIGNS.mat);
  };
  /** A gabled roof over x0..x1, z0..z1 from its eaves y: its ridge along x (or along z: a gable to the street) */
  const gable = (x0: number, x1: number, z0: number, z1: number, y: number, rise: number, alongX: boolean, roof: THREE.Material, end: THREE.Material) => {
    const pos: number[] = [];
    const tri = (a: number[], c: number[], d: number[]) => pos.push(...a, ...c, ...d);
    if (alongX) {
      const zm = (z0 + z1) / 2;
      tri([x0, y, z1], [x1, y, z1], [x1, y + rise, zm]);
      tri([x0, y, z1], [x1, y + rise, zm], [x0, y + rise, zm]);
      tri([x1, y, z0], [x0, y, z0], [x0, y + rise, zm]);
      tri([x1, y, z0], [x0, y + rise, zm], [x1, y + rise, zm]);
      const e: number[] = [];
      e.push(x0, y, z0, x0, y, z1, x0, y + rise, zm, x1, y, z1, x1, y, z0, x1, y + rise, zm);
      const g2 = new THREE.BufferGeometry();
      g2.setAttribute('position', new THREE.Float32BufferAttribute(both(e), 3));
      g2.computeVertexNormals();
      put(g2, end);
    } else {
      const xm = (x0 + x1) / 2;
      tri([x0, y, z0], [x0, y, z1], [xm, y + rise, z1]);
      tri([x0, y, z0], [xm, y + rise, z1], [xm, y + rise, z0]);
      tri([x1, y, z1], [x1, y, z0], [xm, y + rise, z0]);
      tri([x1, y, z1], [xm, y + rise, z0], [xm, y + rise, z1]);
      const e: number[] = [];
      e.push(x1, y, z1, x0, y, z1, xm, y + rise, z1, x0, y, z0, x1, y, z0, xm, y + rise, z0);
      const g2 = new THREE.BufferGeometry();
      g2.setAttribute('position', new THREE.Float32BufferAttribute(both(e), 3));
      g2.computeVertexNormals();
      put(g2, end);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(both(pos), 3));
    g.computeVertexNormals();
    put(g, roof);
  };
  return { box, pane, sign, gable };
}

/** A sash window's glass on the front, lit or dark by a seeded pick */
const pick = (s: Shop, k: number) => ((s.at[0] * 13.1 + s.at[1] * 7.7 + k * 3.3) % 1 + 1) % 1;

function drawShop(b: Batch, s: Shop, low: boolean) {
  const k = kit(b, s);
  const w = s.w / 2;
  const plinth = s.base - s.low + 0.12;
  const floor = HEIGHT.shop;
  const top = floor + (s.storeys - 1) * HEIGHT.storey;
  const brick = s.kind === 'row' && pick(s, 9) < 0.3 ? YELLOW : BRICK;
  const glass = (x: number, y0: number, y1: number, ww: number, n: number) => k.pane(x - ww / 2, x + ww / 2, y0, y1, 0.012, pick(s, n) < 0.55 ? GLASS_LIT : GLASS_DARK);
  b.detail(() => {
    switch (s.kind) {
      case 'row':
      case 'parade':
      case 'pub':
      case 'boarded': {
        const parade = s.kind === 'parade';
        const pub = s.kind === 'pub' || s.kind === 'boarded';
        k.box(-w, w, -plinth, top, -s.d, 0, parade ? CONCRETE : brick);
        // The ground floor's front: its shopfront glass, the fascia and its sign over it
        if (s.kind === 'boarded') {
          k.pane(-w + 0.4, w - 0.4, 0.3, floor - 0.3, 0.012, PLY);
          for (let x = -w + 1; x < w - 0.5; x += 1.6) k.pane(x - 0.4, x + 0.4, floor + 0.3, floor + 0.9, 0.012, PLY);
        } else {
          k.pane(-w + 0.25, w - 0.25, 0.25, floor - 0.32, 0.012, SHOP_GLASS);
          if (pub) k.box(-w, w, 0, floor - 0.25, -0.05, 0.03, paintOf(s.colour));
          if (pub) for (let x = -w + 0.9; x < w - 0.5; x += 2.2) k.pane(x - 0.7, x + 0.7, 0.35, floor - 0.4, 0.04, SHOP_GLASS);
        }
        k.box(-w, w, floor - 0.3, floor, 0, 0.12, s.kind === 'boarded' ? DARK : paintOf(s.colour));
        k.sign(-w + 0.2, w - 0.2, floor - 0.15, 0.24, 0.125);
        // Its storeys over: sash windows (a parade's a long band), a parapet (or a big gable over the pub)
        for (let f = 1; f < s.storeys; f++) {
          const y0 = floor + (f - 1) * HEIGHT.storey + 0.25;
          if (parade) glass(0, y0, y0 + 0.55, s.w - 0.6, f);
          else if (s.kind !== 'boarded') for (const x of pub ? [-w + 1.5, -w + 4, w - 4, w - 1.5] : [-w + 1.1, w - 1.1]) glass(x, y0, y0 + 0.62, 0.7, f * 7 + x);
        }
        if (pub) k.gable(-w, w, -s.d - 0.2, 0.2, top, 2.2, false, SLATE, s.kind === 'boarded' ? DARK : brick);
        else {
          k.box(-w, w, top, top + 0.35, -0.15, 0, parade ? CONCRETE : brick);
          if (!parade) k.gable(-w, w, -s.d + 0.15, -0.15, top, 1.2, true, SLATE, brick);
          else k.box(-w + 0.05, w - 0.05, top - 0.05, top + 0.02, -s.d + 0.05, -0.05, DARK);
          // (the parade's canopy along its shops)
          if (parade) k.box(-w, w, floor - 0.02, floor + 0.06, 0, 1.0, CONCRETE);
        }
        if (!low && !parade && s.kind !== 'boarded')
          b.detail(() => {
            // Up close: a stone sill under each window, the pilasters either side of the shopfront
            k.box(-w, -w + 0.18, 0, floor, 0, 0.1, STONE);
            k.box(w - 0.18, w, 0, floor, 0, 0.1, STONE);
          });
        break;
      }
      case 'petrol': {
        // The canopy on four posts over the forecourt, its fascia and sign; two pump islands; the kiosk at the back
        const h = HEIGHT.canopy;
        const [c0, c1] = [-s.d + 4.5, -0.6];
        for (const x of [-w + 1.5, w - 1.5]) for (const z of [c0 + 0.8, c1 - 0.8]) k.box(x - 0.12, x + 0.12, 0, h, z - 0.12, z + 0.12, POST);
        k.box(-w + 0.6, w - 0.6, h, h + 0.4, c0, c1, paintOf(s.colour));
        k.box(-w + 0.7, w - 0.7, h - 0.02, h + 0.02, c0 + 0.1, c1 - 0.1, POST);
        k.sign(-w + 2, w - 2, h + 0.2, 0.32, c1 + 0.012);
        for (const x of [-w / 2.2, w / 2.2]) {
          k.box(x - 0.9, x + 0.9, 0, 0.18, (c0 + c1) / 2 - 0.35, (c0 + c1) / 2 + 0.35, CONCRETE);
          for (const dx of [-0.45, 0.45]) k.box(x + dx - 0.2, x + dx + 0.2, 0.18, 1.1, (c0 + c1) / 2 - 0.15, (c0 + c1) / 2 + 0.15, PUMP);
        }
        const kw = s.w * 0.45 / 2;
        k.box(-kw, kw, -plinth, 2.2, -s.d + BACK_IN, -s.d + 4, CONCRETE);
        k.box(-kw, kw, 2.2, 2.35, -s.d + BACK_IN, -s.d + 4.2, paintOf(s.colour));
        // (the kiosk's glass front: to the forecourt)
        put(k, s, -kw + 0.3, kw - 0.3, 0.3, 1.8, -s.d + 4 + 0.012);
        break;
      }
      case 'garage': {
        // Victorian brick: tall walls, a gable to the street, two arched doors, its name over them
        const h = HEIGHT.garage;
        k.box(-w, w, -plinth, h, -s.d, 0, BRICK);
        k.gable(-w - 0.2, w + 0.2, -s.d - 0.2, 0.25, h, HEIGHT.garageRidge, false, SLATE, BRICK);
        for (const x of [-w / 2, w / 2]) {
          k.pane(x - 2.6, x + 2.6, 0, 3.4, 0.012, DARK);
          k.box(x - 2.8, x + 2.8, 3.4, 3.7, 0, 0.08, STONE);
        }
        k.sign(-w + 1.5, w - 1.5, 4.15, 0.42, 0.06);
        // (a band of high windows down each side, lit at night)
        for (let z = -1.5; z > -s.d + 1; z -= 2) for (const x of [-w - 0.012, w + 0.012]) {
          const g = new THREE.PlaneGeometry(1.2, 0.7).rotateY(x < 0 ? -Math.PI / 2 : Math.PI / 2).translate(x, 3.6, z);
          g.deleteAttribute('uv');
          b.add(g.applyMatrix4(frameOf(s)), GLASS_LIT);
        }
        break;
      }
      case 'carwash': {
        // A canopy on posts over its bay, its sign; the wash bay's back wall
        const h = HEIGHT.canopy;
        for (const x of [-w + 0.6, w - 0.6]) for (const z of [-0.8, -s.d + 1]) k.box(x - 0.1, x + 0.1, 0, h, z - 0.1, z + 0.1, POST);
        k.box(-w + 0.3, w - 0.3, h, h + 0.35, -s.d + 0.5, -0.3, paintOf(s.colour));
        k.sign(-w + 1.5, w - 1.5, h + 0.18, 0.3, -0.3 + 0.012);
        const kw = s.w * 0.45 / 2;
        k.box(-kw, kw, -plinth, 2.2, -s.d + BACK_IN, -s.d + 4, CONCRETE);
        break;
      }
      case 'station': {
        // The underground station's building (docs/south-plan.md Phase 4e): pale walls round it, its door at its
        // front's east end on to the landing, the stairs down inside (no floor over them: southline.ts), a band in the
        // line's colour with its name, the city's M mark over the door, glass along the rest of its front, a flat roof
        const h = HEIGHT.station;
        const t = STATION_WALL;
        const [d0, d1] = STATION_DOOR;
        k.box(-w, d0, -plinth, h, -t, 0, STATION_STONE);
        k.box(d1, w, -plinth, h, -t, 0, STATION_STONE);
        k.box(d0, d1, 1.55, h, -t, 0, STATION_STONE);
        k.box(-w, w, -plinth, h, -s.d, -s.d + t, STATION_STONE);
        for (const x of [-w, w - t]) k.box(x, x + t, -plinth, h, -s.d + t, -t, STATION_STONE);
        k.box(-w - 0.08, w + 0.08, h, h + 0.12, -s.d - 0.08, 0.08, CONCRETE);
        k.box(-w, w, h - 0.42, h, 0, 0.06, HOARD_LINE);
        k.sign(-w + 0.5, d0 - 0.3, h - 0.21, 0.3, 0.065);
        k.pane(-w + 0.4, d0 - 0.3, 0.35, 1.45, 0.012, SHOP_GLASS);
        k.pane(d0 + 0.45, d1 - 0.45, h - 0.38, h - 0.04, 0.07, stationMark());
        // The floor inside: the landing inside the door, and past the stairs' foot at the west end (none over them)
        const [top, foot] = [STATION_STAIRS.at, STATION_STAIRS.at - STATION_STAIR_RUN];
        k.box(top, w - t, -plinth, 0, -s.d + t, -t, CONCRETE);
        k.box(-w + t, foot, -plinth, 0, -s.d + t, -t, CONCRETE);
        if (!low) k.box(top - 0.1, top + 0.1, 0, 0.9, -s.d + t, -s.d + t + 0.1, HOARD_LINE);
        break;
      }
      case 'gap': {
        // A hoarding along the front, rough ground behind it
        k.box(-w, w, -plinth, HEIGHT.hoarding, -0.3, 0, PLY);
        break;
      }
    }
  }, 'all');
}
/** A pane on the front at depth z (the kiosk's glass) */
function put(k: ReturnType<typeof kit>, _s: Shop, x0: number, x1: number, y0: number, y1: number, z: number) {
  k.pane(x0, x1, y0, y1, z, SHOP_GLASS);
}

const rectOf = (pts: Pt[], pad: number): [number, number, number, number] => [Math.min(...pts.map((p) => p[0])) - pad, Math.min(...pts.map((p) => p[1])) - pad, Math.max(...pts.map((p) => p[0])) + pad, Math.max(...pts.map((p) => p[1])) + pad];

/** The High Road's buildings, a site of a few each, in the order they stand */
export function registerHighRoad(low: boolean) {
  for (let i = 0; i < SHOPS.length; i += 5) {
    const list = SHOPS.slice(i, i + 5);
    site(`village high road ${i}`, rectOf(list.flatMap((s) => shopFoot(s)), 3), (into) => {
      const b = new Batch();
      for (const s of list) drawShop(b, s, low);
      b.build(into, { cast: true, receive: true, lift: false });
    });
  }
}
