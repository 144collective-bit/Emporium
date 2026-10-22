/*
 * The Sector 7 Metro drawn (docs/growth-plan.md Phase 8; the numbers are
 * metro.ts): the viaduct down the east ring avenue's median (a deck in spans
 * between its pillars, rails, low parapets and a magenta neon line along
 * both edges, a deeper girder over the river), the four stations (a
 * platform east of the track on brackets, a canopy on posts with the
 * station's name on its fascia, a skybridge over the lanes to the stair
 * tower, the tower with its door at street level, an M roundel over it and
 * a totem on the sidewalk) and the train: two cars in white with a magenta
 * stripe and lit windows, shuttling on the timetable (`trainAt()`), the
 * same for everyone; a ride (metro-ui.ts) takes it over and puts it back on
 * the timetable from where it stops. Everything fixed is built in Batches
 * straight onto the scene (merged per tile by tileBatch()); the details are
 * near only. Under reduced motion the train stands at a station.
 */
import * as THREE from 'three';
import { Batch, PAL, boxAt, canvasTex, FONT_DISPLAY, lit, mergeMeshes, neon, roundRect, toon } from './kit';
import { SLAB, type Tick } from './world';
import { DECK_HALF, DECK_T, DECK_Y, LINE, LINE_X, PILLARS, PILLAR_HALF, PLATFORM, ROUND_TRIP, STATIONS, TRAIN, trainAt, type Station } from './metro';
import { RIVER } from './layout';

/** The platform's top and the train's floor */
export const PLATFORM_Y = DECK_Y + 0.4;
/** The rails' top, where the wheels run */
const RAIL_Y = DECK_Y + 0.08;
const CANOPY_Y = PLATFORM_Y + 2.4;

/** The station signs in one atlas, a row each: the line's name, then each station's */
function signAtlas() {
  const rows = ['SECTOR 7 METRO', ...STATIONS.map((s) => s.name.toUpperCase())];
  const W = 1024;
  const H = 128;
  const tex = canvasTex(W, H * rows.length, (ctx) => {
    rows.forEach((text, i) => {
      const y = i * H;
      ctx.fillStyle = '#100d1e';
      ctx.fillRect(0, y, W, H);
      // The M roundel, then the name
      ctx.fillStyle = PAL.magenta;
      ctx.beginPath();
      ctx.arc(70, y + H / 2, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 64px ${FONT_DISPLAY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('M', 70, y + H / 2 + 4);
      ctx.textAlign = 'left';
      ctx.font = `900 76px ${FONT_DISPLAY}`;
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '6px';
      ctx.fillText(text, 140, y + H / 2 + 5);
      ctx.strokeStyle = PAL.magenta;
      ctx.lineWidth = 6;
      roundRect(ctx, 4, y + 4, W - 8, H - 8, 14);
      ctx.stroke();
    });
  });
  const mat = lit(new THREE.MeshBasicMaterial({ map: tex, toneMapped: true }), 0.95, 1.3);
  /** A board facing +x or -x (`face`), row `row` of the atlas, w long (along z) and h high, its middle at x, y, z */
  const board = (row: number, x: number, y: number, z: number, w: number, h: number, face: 1 | -1) => {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const v0 = 1 - (row + 1) / rows.length;
    const v1 = 1 - row / rows.length;
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) > 0.5 ? v1 - 0.004 : v0 + 0.004);
    g.rotateY((face * Math.PI) / 2);
    g.translate(x, y, z);
    return g;
  };
  return { mat, board };
}

/** A round M sign facing +x or -x: a disc of magenta with a white M (a little texture of its own, shared) */
const roundel = (() => {
  let mat: THREE.Material | null = null;
  return () =>
    (mat ??= lit(
      new THREE.MeshBasicMaterial({
        map: canvasTex(128, 128, (ctx) => {
          ctx.fillStyle = '#100d1e';
          ctx.fillRect(0, 0, 128, 128);
          ctx.fillStyle = PAL.magenta;
          ctx.beginPath();
          ctx.arc(64, 64, 58, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = `900 84px ${FONT_DISPLAY}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('M', 64, 70);
        }),
        toneMapped: true,
      }),
      0.95,
      1.3
    ));
})();

export function buildMetro(scene: THREE.Scene, tick: (f: Tick) => void, opts: { reduced: boolean; low: boolean }) {
  const concrete = toon('#b9b4cc');
  const pier = toon('#7d7898');
  const steel = toon('#2a2838');
  const paving = toon('#cfcadf');
  const dark = toon('#3b3756');
  const roof = toon('#25223a');
  const edge = toon('#ffd23f');
  const glass = toon('#24305a');
  const trim = neon(PAL.magenta, 0.9, 2.4);
  const lamp = neon('#fff1c9', 0.5, 1.3);
  const strip = lit(new THREE.MeshBasicMaterial({ color: '#9fd8ff', toneMapped: true }), 0.4, 1.15);
  const signs = signAtlas();
  const b = new Batch();

  /* ---------- The viaduct ---------- */
  // The deck in spans between pillars (so each piece is a tile's worth or less), with the rails on it
  const cuts = [LINE[0], ...PILLARS.slice(1, -1), LINE[1]];
  for (let i = 0; i < cuts.length - 1; i++) {
    const z0 = cuts[i];
    const z1 = cuts[i + 1];
    b.box(LINE_X - DECK_HALF, DECK_Y - DECK_T, z0, DECK_HALF * 2, DECK_T, z1 - z0, concrete);
    // The rails
    for (const s of [-1, 1]) b.box(LINE_X + s * 0.5 - 0.04, DECK_Y, z0, 0.08, 0.08, z1 - z0, steel);
    // Over the river a deeper girder under it
    if (z0 >= RIVER[0] - 3 && z1 <= RIVER[1] + 3) b.box(LINE_X - DECK_HALF + 0.2, DECK_Y - DECK_T - 0.7, z0, DECK_HALF * 2 - 0.4, 0.7, z1 - z0, concrete);
  }
  // Low parapets along both edges (none beside a platform), each with the line's neon along its outer face
  for (const side of [-1, 1]) {
    // The line less the platforms on its side, in pieces of 12 or less
    let runs: [number, number][] = [[LINE[0], LINE[1]]];
    if (side > 0)
      for (const st of STATIONS) {
        const [a, c] = [st.z - PLATFORM.half, st.z + PLATFORM.half];
        runs = runs.flatMap(([r0, r1]): [number, number][] => (c <= r0 || a >= r1 ? [[r0, r1]] : ([[r0, a], [c, r1]] as [number, number][]).filter(([u, v]) => v - u > 0.2)));
      }
    for (const [r0, r1] of runs) {
      const n = Math.ceil((r1 - r0) / 12);
      for (let k = 0; k < n; k++) {
        const a = r0 + ((r1 - r0) * k) / n;
        const c = r0 + ((r1 - r0) * (k + 1)) / n;
        b.box(LINE_X + side * DECK_HALF - (side > 0 ? 0.12 : 0), DECK_Y, a, 0.12, 0.4, c - a, concrete);
        b.box(side > 0 ? LINE_X + DECK_HALF + 0.006 : LINE_X - DECK_HALF - 0.036, DECK_Y - 0.28, a, 0.03, 0.06, c - a, trim);
      }
    }
  }
  // The pillars, each with a hammerhead under the deck
  for (const z of PILLARS) {
    b.box(LINE_X - PILLAR_HALF, SLAB, z - PILLAR_HALF, PILLAR_HALF * 2, DECK_Y - DECK_T - SLAB - 0.3, PILLAR_HALF * 2, pier);
    b.box(LINE_X - DECK_HALF + 0.15, DECK_Y - DECK_T - 0.3, z - 0.45, DECK_HALF * 2 - 0.3, 0.3, 0.9, pier);
  }

  /* ---------- The stations ---------- */
  for (const [i, s] of STATIONS.entries()) station(b, s, i);
  function station(b: Batch, s: Station, i: number) {
    const z0 = s.z - PLATFORM.half;
    const z1 = s.z + PLATFORM.half;
    const len = z1 - z0;
    // The platform on brackets off the deck, its yellow edge, a parapet on the outside
    b.box(PLATFORM.x0, PLATFORM_Y - 0.3, z0, PLATFORM.x1 - PLATFORM.x0, 0.3, len, concrete);
    b.box(PLATFORM.x0, PLATFORM_Y, z0, PLATFORM.x1 - PLATFORM.x0, 0.006, len, paving);
    b.box(PLATFORM.x0 + 0.02, PLATFORM_Y + 0.006, z0, 0.16, 0.005, len, edge);
    for (let z = z0 + 1; z < z1; z += 3) b.box(LINE_X + DECK_HALF - 0.1, DECK_Y - DECK_T - 0.2, z - 0.15, PLATFORM.x1 - PLATFORM.x0 + 0.1, 0.5, 0.3, pier);
    // (the parapet leaves a gap for the skybridge)
    const tz = (s.tower[1] + s.tower[3]) / 2;
    for (const [a, c] of [
      [z0, tz - 0.9],
      [tz + 0.9, z1],
    ])
      if (c - a > 0.2) b.box(PLATFORM.x1 - 0.1, PLATFORM_Y, a, 0.1, 0.9, c - a, steel);
    // The canopy: posts at the back, a roof reaching out over the train, the magenta trim on its front
    for (let z = z0 + 0.4; z <= z1 - 0.3; z += (len - 0.8) / Math.round((len - 0.8) / 2.6)) b.box(PLATFORM.x1 - 0.35, PLATFORM_Y, z - 0.06, 0.12, CANOPY_Y - PLATFORM_Y, 0.12, steel);
    b.box(LINE_X - 0.6, CANOPY_Y, z0 - 0.2, PLATFORM.x1 - LINE_X + 0.8, 0.14, len + 0.4, roof);
    b.box(LINE_X - 0.64, CANOPY_Y + 0.02, z0 - 0.2, 0.04, 0.08, len + 0.4, trim);
    // The station's name on the fascia, facing the avenue (west) and the platform side
    b.add(signs.board(i + 1, LINE_X - 0.648, CANOPY_Y + 0.45, s.z, 5.2, 0.65, -1), signs.mat);
    b.box(LINE_X - 0.64, CANOPY_Y + 0.12, s.z - 2.75, 0.03, 0.66, 5.5, dark);
    b.add(signs.board(0, PLATFORM.x1 - 0.42, PLATFORM_Y + 1.8, s.z + len / 4, 2.6, 0.32, -1), signs.mat);
    b.add(signs.board(i + 1, PLATFORM.x1 - 0.42, PLATFORM_Y + 1.8, s.z - len / 4, 2.6, 0.32, -1), signs.mat);
    // Lights under the canopy
    b.detail(() => {
      for (let z = z0 + 1.2; z < z1; z += 2.4) b.box(PLATFORM.x0 + 0.5, CANOPY_Y - 0.04, z - 0.3, 0.12, 0.04, 0.6, lamp);
      // Benches against the parapet
      for (const z of [s.z - len / 4, s.z + len / 4]) {
        b.box(PLATFORM.x1 - 0.85, PLATFORM_Y + 0.3, z - 0.6, 0.35, 0.06, 1.2, dark);
        b.box(PLATFORM.x1 - 0.85, PLATFORM_Y, z - 0.55, 0.35, 0.3, 0.08, steel);
        b.box(PLATFORM.x1 - 0.85, PLATFORM_Y, z + 0.47, 0.35, 0.3, 0.08, steel);
      }
    });

    // The skybridge over the east lanes to the tower: a floor, glass sides, a roof
    const [tx0, , tx1] = s.tower;
    const bx0 = PLATFORM.x1 - 0.1;
    const bw = tx0 - bx0 + 0.02;
    b.box(bx0, PLATFORM_Y - 0.3, tz - 0.9, bw, 0.3, 1.8, concrete);
    b.box(bx0, PLATFORM_Y + 2.1, tz - 0.95, bw, 0.14, 1.9, roof);
    for (const sz of [-1, 1]) {
      b.box(bx0, PLATFORM_Y, tz + sz * 0.9 - (sz > 0 ? 0.06 : 0), bw, 2.1, 0.06, glass);
      b.box(bx0, PLATFORM_Y + 2.06, tz + sz * 0.94 - 0.02, bw, 0.04, 0.04, trim);
    }

    // The stair tower: its walls, a lit window strip up the west face, the door at street level, the M over it
    const top = DECK_Y + 2.6;
    const [, tz0, , tz1] = s.tower;
    b.box(tx0, SLAB, tz0, tx1 - tx0, top - SLAB, tz1 - tz0, dark);
    b.box(tx0 - 0.15, top, tz0 - 0.15, tx1 - tx0 + 0.3, 0.2, tz1 - tz0 + 0.3, roof);
    b.box(tx0 - 0.16, top + 0.04, tz0 - 0.16, 0.04, 0.08, tz1 - tz0 + 0.32, trim);
    // (the window strip stops short of the skybridge's floor and starts above the door)
    b.box(tx0 - 0.006, SLAB + 2.6, tz - 0.25, 0.006, PLATFORM_Y - 0.4 - (SLAB + 2.6), 0.5, strip);
    // The door: a dark opening in a magenta frame
    b.box(tx0 - 0.02, SLAB, tz - 0.55, 0.02, 1.7, 1.1, roof);
    b.box(tx0 - 0.05, SLAB + 1.7, tz - 0.62, 0.05, 0.06, 1.24, trim);
    for (const sz of [-1, 1]) b.box(tx0 - 0.05, SLAB, tz + sz * 0.6 - 0.03, 0.05, 1.7, 0.06, trim);
    const m = new THREE.PlaneGeometry(0.7, 0.7);
    m.rotateY(-Math.PI / 2);
    m.translate(tx0 - 0.012, SLAB + 2.2, tz);
    b.add(m, roundel());
    // A totem on the sidewalk by the door: M on top, the line's name down it
    b.detail(() => {
      const px = tx0 - 1.1;
      const pz = tz + 1.6;
      b.box(px - 0.06, SLAB, pz - 0.06, 0.12, 2.6, 0.12, steel);
      for (const f of [-1, 1] as const) {
        const g = new THREE.PlaneGeometry(0.5, 0.5);
        g.rotateY((f * Math.PI) / 2);
        g.translate(px + f * 0.07, SLAB + 2.75, pz);
        b.add(g, roundel());
      }
      b.box(px - 0.06, SLAB + 2.48, pz - 0.27, 0.12, 0.54, 0.54, steel);
    });
  }
  b.build(scene);

  /* ---------- The train ---------- */
  const train = makeTrain(opts.low);
  scene.add(train);
  // The timetable runs on the clock (the same for everyone); a ride moves it on (`offset`)
  let offset = 0;
  let held: { z: number; dir: 1 | -1 } | null = null;
  const now = () => Date.now() / 1000 + offset;
  const set = (z: number, dir: 1 | -1) => {
    train.position.set(LINE_X, RAIL_Y, z);
    train.rotation.y = dir > 0 ? 0 : Math.PI;
  };
  const still = trainAt(0);
  set(still.z, still.dir);
  tick(() => {
    if (opts.reduced) return;
    if (held) return set(held.z, held.dir);
    const p = trainAt(now());
    set(p.z, p.dir);
  });
  return {
    train,
    /** Where the train is now (z, which way) */
    get at() {
      return { z: train.position.z, dir: (train.rotation.y === 0 ? 1 : -1) as 1 | -1 };
    },
    /** A ride holds the train where it puts it (null: back on the timetable) */
    hold(at: { z: number; dir: 1 | -1 } | null) {
      held = at;
      if (at) set(at.z, at.dir);
    },
    /** Back on the timetable at the time `t` into the round trip (`timetableAt()`), from now */
    resume(t: number) {
      offset += t - (now() % ROUND_TRIP);
      held = null;
    },
  };
}

/**
 * The train: two cars along +z, the middle at the origin on the rails. A
 * white body over a dark skirt, a magenta stripe, a band of windows (lit at
 * night), a rounded roof, the cabs' fronts with lamps, bogies under it
 */
function makeTrain(low: boolean) {
  const body = toon('#e9e7f2');
  const skirt = toon('#3b3756');
  const roofM = toon('#cfcadf');
  const stripe = neon(PAL.magenta, 0.9, 1.6);
  const windows = lit(new THREE.MeshBasicMaterial({ color: '#9fd8ff', toneMapped: true }), 0.35, 1.1);
  const head = neon('#fff6c8', 0.8, 2.4);
  const tail = neon('#ff2b2b', 0.8, 2.4);
  const meshes: THREE.Mesh[] = [];
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, m: THREE.Material) => meshes.push(new THREE.Mesh(boxAt(x, y, z, w, h, d), m));
  const carL = (TRAIN.len - 0.2) / 2;
  const W = 1.6;
  for (const c of [0, 1]) {
    const z0 = -TRAIN.len / 2 + c * (carL + 0.2);
    box(-W / 2, 0.22, z0, W, 0.35, carL, skirt);
    box(-W / 2, 0.57, z0, W, 1.25, carL, body);
    box(-W / 2 + 0.08, 1.82, z0 + 0.15, W - 0.16, 0.16, carL - 0.3, roofM);
    // The stripe and the windows on both sides (a touch proud of the body)
    for (const s of [-1, 1]) {
      const x = s > 0 ? W / 2 : -W / 2 - 0.012;
      box(x, 0.66, z0 + 0.1, 0.012, 0.1, carL - 0.2, stripe);
      box(x, 0.98, z0 + 0.35, 0.012, 0.6, carL - 0.7, windows);
    }
    // Bogies
    if (!low) for (const bz of [z0 + 0.9, z0 + carL - 0.9]) box(-0.6, 0, bz - 0.5, 1.2, 0.24, 1.0, skirt);
  }
  // The cabs: a windscreen and lamps at each end
  for (const e of [-1, 1]) {
    const z = e * (TRAIN.len / 2) + (e > 0 ? 0 : -0.012);
    box(-W / 2 + 0.15, 1.05, z, W - 0.3, 0.55, 0.012, windows);
    for (const s of [-1, 1]) box(s * 0.5 - 0.12, 0.6, z, 0.24, 0.12, 0.012, e > 0 ? head : tail);
  }
  const g = mergeMeshes(meshes, { cast: true, receive: true });
  g.name = 'metro-train';
  // It moves: drawn at every distance, as it is
  g.userData.keep = true;
  for (const m of meshes) m.geometry.dispose();
  return g;
}
