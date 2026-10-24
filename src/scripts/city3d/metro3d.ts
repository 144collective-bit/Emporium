/*
 * The Sector 7 Metro drawn (docs/growth-plan.md Phases 8 and 9; the numbers
 * are metro.ts): the viaduct along its tracks (a deck in spans between its
 * pillars, in short straight pieces round the bend, rails, low parapets
 * with a magenta neon line along both edges, a deeper girder over the
 * river), the stations (a platform beside the track on brackets, a canopy
 * on posts with the station's name on its fascia, a skybridge to the stair
 * tower, the tower with its door at street level, an M roundel over it and
 * a totem on the sidewalk) and the train: two cars in white with a magenta
 * stripe and lit windows, each following the track (round the bend too), on
 * the timetable (`trainAt()`), the same for everyone; a ride (metro-ui.ts)
 * takes it over and puts it back on the timetable from where it stops.
 * Everything fixed is built in Batches straight onto the scene (merged per
 * tile by tileBatch()); the details are near only. Under reduced motion the
 * train stands at a station.
 *
 * Over The Trenches (the grit step, the owner's call) it's a dark steel el:
 * the deck grimy, deep plate girders under both edges with cross-bracing
 * between them, steel pillars (flanged columns on concrete plinths, tagged
 * and billed: grit3d.ts) with steel hammerheads, a sodium lamp under each
 * span with its pool of light on the avenue, and sparks off the wheels as
 * the train goes over (not under reduced motion).
 */
import * as THREE from 'three';
import { Batch, PAL, boxAt, canvasTex, FONT_DISPLAY, fx, glowTex, lit, mergeMeshes, neon, roundRect, toon } from './kit';
import { SLAB, addPool, type Tick } from './world';
import { inTrenches } from './trenches';
import { EL_SPANS, PLINTH } from './grit';
import {
  DECK_HALF,
  DECK_T,
  DECK_Y,
  PILLARS,
  PILLAR_HALF,
  PLATFORM,
  PLATFORM_SIDE,
  ROUND_TRIP,
  STATIONS,
  SWITCH_S,
  TRACKS,
  TRAIN,
  carAt,
  pointOn,
  sideOf,
  stationAt,
  trainAt,
  type Pt,
  type Run,
  type Station,
  type TrackId,
} from './metro';
import { deckY, onHarbour } from './harbour';

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
  /** A board facing +z (or -z), row `row` of the atlas, w wide and h high, its middle at the origin */
  const board = (row: number, w: number, h: number, back = false) => {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const v0 = 1 - (row + 1) / rows.length;
    const v1 = 1 - row / rows.length;
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) > 0.5 ? v1 - 0.004 : v0 + 0.004);
    if (back) g.rotateY(Math.PI);
    return g;
  };
  return { mat, board };
}

/** A round M sign facing +z: a disc of magenta with a white M (a little texture of its own, shared) */
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

/**
 * A frame on the ground: its x along `dir`, its z along `nrm`, y up, its
 * origin at `o`. `box()` and `add()` put things into a Batch in it
 */
function frame(b: Batch, o: Pt, dir: Pt, nrm: Pt) {
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(dir[0], 0, dir[1]), new THREE.Vector3(0, 1, 0), new THREE.Vector3(nrm[0], 0, nrm[1])).setPosition(o[0], 0, o[1]);
  return {
    box(x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material) {
      b.add(boxAt(x, y, z, w, h, d).applyMatrix4(m), mat);
    },
    add(g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) {
      b.add(g.translate(x, y, z).applyMatrix4(m), mat);
    },
  };
}
/** A track's frame at a distance along it: x along the way it runs, z out to its right */
const trackFrame = (b: Batch, id: TrackId, s: number) => {
  const p = pointOn(id, s);
  return frame(b, p.at, p.dir, sideOf(p.dir, 1));
};

/** The straight pieces of a track between two distances along it (each a point and the next) */
function piecesOf(id: TrackId, s0: number, s1: number): [number, number][] {
  const t = TRACKS[id];
  const cuts = [s0, ...t.cum.filter((c) => c > s0 + 1e-6 && c < s1 - 1e-6), s1];
  return cuts.slice(1).map((c, i) => [cuts[i], c]);
}

export function buildMetro(scene: THREE.Scene, tick: (f: Tick) => void, opts: { reduced: boolean; low: boolean }) {
  const concrete = toon('#b9b4cc');
  const pier = toon('#7d7898');
  const steel = toon('#2a2838');
  // (the el over The Trenches)
  const grimy = toon('#6b6780');
  const plinth = toon('#8a8698');
  const sodium = neon('#ffb35c', 0.5, 2.4);
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
  /** Is a distance along a track beside a station's platform, on its platform side */
  const atPlatform = (id: TrackId, s: number) => STATIONS.some((st) => st.track === id && Math.abs(s - st.s) < PLATFORM.half);
  /** Where the branch meets the main line: no parapet across the other's deck there */
  const atSwitch = (id: TrackId, s: number, side: number) => (id === 'main' ? s > SWITCH_S - 1 && s < SWITCH_S + 9 && side === -1 : s < 9 && side === 1);
  for (const t of Object.values(TRACKS)) {
    // The deck in spans between its pillars (each a tile's worth or less), with the rails on it
    const ps = PILLARS.filter((p) => p.track === t.id).map((p) => p.s);
    const cuts = [0, ...ps.slice(t.id === 'branch' ? 0 : 1, -1), t.len];
    for (let i = 0; i < cuts.length - 1; i++)
      for (const [a, c] of piecesOf(t.id, cuts[i], cuts[i + 1])) {
        const f = trackFrame(b, t.id, a);
        const l = c - a + 0.02;
        const el = inTrenches(...pointOn(t.id, (a + c) / 2).at);
        f.box(0, DECK_Y - DECK_T, -DECK_HALF, l, DECK_T, DECK_HALF * 2, el ? grimy : concrete);
        if (el) {
          // Over The Trenches: deep plate girders under both edges, braced across near
          for (const s of [-1, 1]) {
            const zc = s * (DECK_HALF - 0.22);
            f.box(0, DECK_Y - DECK_T - 0.5, zc - 0.03, l, 0.5, 0.06, steel);
            f.box(0, DECK_Y - DECK_T - 0.55, zc - 0.13, l, 0.05, 0.26, steel);
          }
          b.detail(() => {
            const span = (DECK_HALF - 0.22) * 2;
            for (let x = 0.7; x < l - 0.5; x += 1.4)
              for (const s of [-1, 1]) {
                const g = new THREE.BoxGeometry(Math.hypot(1.2, span), 0.05, 0.05).rotateY(s * Math.atan2(span, 1.2));
                f.add(g, steel, x, DECK_Y - DECK_T - 0.3, 0);
              }
          });
        }
        for (const s of [-1, 1]) f.box(0, DECK_Y, s * 0.5 - 0.04, l, 0.08, 0.08, steel);
        // Over the river it rides on Harbour Bridge (harbour.ts): its raised centre, on steel posts from the deck's median
        // Low parapets along both edges (none beside a platform, nor across the other track at the switch), the line's neon along each
        for (const side of [-1, 1]) {
          const mid = (a + c) / 2;
          if ((side === PLATFORM_SIDE && atPlatform(t.id, mid)) || atSwitch(t.id, mid, side)) continue;
          f.box(0, DECK_Y, side > 0 ? DECK_HALF - 0.12 : -DECK_HALF, l, 0.4, 0.12, concrete);
          f.box(0, DECK_Y - 0.28, side > 0 ? DECK_HALF + 0.006 : -DECK_HALF - 0.036, l, 0.06, 0.03, trim);
        }
      }
  }
  // The pillars, each with a hammerhead under the deck across the track
  for (const p of PILLARS) {
    const f = trackFrame(b, p.track, p.s);
    if (inTrenches(...p.at)) {
      // A flanged steel column on a concrete plinth, a steel hammerhead
      const H = PLINTH.half;
      const y0 = SLAB + PLINTH.h;
      const h = DECK_Y - DECK_T - 0.3 - y0;
      f.box(-H, SLAB, -H, H * 2, PLINTH.h, H * 2, plinth);
      f.box(-PILLAR_HALF + 0.03, y0, -PILLAR_HALF + 0.03, (PILLAR_HALF - 0.03) * 2, h, (PILLAR_HALF - 0.03) * 2, steel);
      for (const s of [-1, 1]) f.box(s > 0 ? PILLAR_HALF - 0.03 : -PILLAR_HALF, y0, -PILLAR_HALF, 0.03, h, PILLAR_HALF * 2, steel);
      f.box(-0.45, DECK_Y - DECK_T - 0.3, -DECK_HALF + 0.1, 0.9, 0.3, DECK_HALF * 2 - 0.2, steel);
      b.detail(() => {
        // Gusset plates where the column meets the hammerhead, a base plate on the plinth
        for (const s of [-1, 1]) f.box(-0.04, DECK_Y - DECK_T - 0.75, s > 0 ? PILLAR_HALF - 0.03 : -0.6, 0.08, 0.45, 0.6 - PILLAR_HALF + 0.03, steel);
        f.box(-PILLAR_HALF - 0.01, y0, -PILLAR_HALF - 0.01, (PILLAR_HALF + 0.01) * 2, 0.04, (PILLAR_HALF + 0.01) * 2, steel);
      });
      continue;
    }
    if (onHarbour(...p.at)) {
      // On Harbour Bridge: a riveted steel post from the median's kerb on the deck, braced up into its hammerhead
      const y0 = deckY(p.at[1]) + SLAB;
      const h = DECK_Y - DECK_T - 0.3 - y0;
      f.box(-PILLAR_HALF + 0.04, y0, -PILLAR_HALF + 0.04, (PILLAR_HALF - 0.04) * 2, h, (PILLAR_HALF - 0.04) * 2, steel);
      f.box(-PILLAR_HALF - 0.02, y0, -PILLAR_HALF - 0.02, (PILLAR_HALF + 0.02) * 2, 0.06, (PILLAR_HALF + 0.02) * 2, steel);
      for (const s of [-1, 1]) {
        const g = new THREE.BoxGeometry(0.06, 0.06, Math.hypot(0.6, 0.55)).rotateX(s * Math.atan2(0.55, 0.6));
        f.add(g, steel, 0, DECK_Y - DECK_T - 0.3 - 0.28, s * 0.3);
      }
      f.box(-0.45, DECK_Y - DECK_T - 0.3, -DECK_HALF + 0.15, 0.9, 0.3, DECK_HALF * 2 - 0.3, steel);
      continue;
    }
    f.box(-PILLAR_HALF, SLAB, -PILLAR_HALF, PILLAR_HALF * 2, DECK_Y - DECK_T - SLAB - 0.3, PILLAR_HALF * 2, pier);
    f.box(-0.45, DECK_Y - DECK_T - 0.3, -DECK_HALF + 0.15, 0.9, 0.3, DECK_HALF * 2 - 0.3, pier);
  }
  // A sodium lamp under each span over The Trenches, its pool on the avenue below
  for (const sp of EL_SPANS) {
    const f = trackFrame(b, sp.track, sp.s);
    f.box(-0.3, DECK_Y - DECK_T - 0.1, -0.09, 0.6, 0.08, 0.18, steel);
    f.box(-0.26, DECK_Y - DECK_T - 0.115, -0.07, 0.52, 0.015, 0.14, sodium);
    addPool(sp.at[0], sp.at[1], 4.6, 0.03, true);
  }

  /* ---------- The stations ---------- */
  STATIONS.forEach((s, i) => station(s, i));
  function station(s: Station, i: number) {
    const mid = stationAt(s);
    // The station's frame: x along the track, z out to the platform's side (so the platform is at +z)
    const out = sideOf(mid.dir, PLATFORM_SIDE);
    const f = frame(b, mid.at, mid.dir, out);
    const h = PLATFORM.half;
    const w = PLATFORM.to - PLATFORM.from;
    // The platform on brackets off the deck, its yellow edge, a parapet on the outside (with a gap for the skybridge)
    f.box(-h, PLATFORM_Y - 0.3, PLATFORM.from, h * 2, 0.3, w, concrete);
    f.box(-h, PLATFORM_Y, PLATFORM.from, h * 2, 0.006, w, paving);
    f.box(-h, PLATFORM_Y + 0.006, PLATFORM.from + 0.02, h * 2, 0.005, 0.16, edge);
    for (let x = -h + 1; x < h; x += 3) f.box(x - 0.15, DECK_Y - DECK_T - 0.2, DECK_HALF - 0.1, 0.3, 0.5, w + 0.1, pier);
    // The tower's middle along the track and how far out it is
    const [tx0, tz0, tx1, tz1] = s.tower;
    const tc: Pt = [(tx0 + tx1) / 2, (tz0 + tz1) / 2];
    const ta = (tc[0] - mid.at[0]) * mid.dir[0] + (tc[1] - mid.at[1]) * mid.dir[1];
    const tOut = (tc[0] - mid.at[0]) * out[0] + (tc[1] - mid.at[1]) * out[1];
    const tHalf = Math.abs(out[0]) > 0.5 ? (tx1 - tx0) / 2 : (tz1 - tz0) / 2;
    for (const [a, c] of [
      [-h, ta - 0.9],
      [ta + 0.9, h],
    ])
      if (c - a > 0.2) f.box(a, PLATFORM_Y, PLATFORM.to - 0.1, c - a, 0.9, 0.1, steel);
    // The canopy: posts at the back, a roof reaching out over the train, the magenta trim on its far edge
    const posts = Math.round((h * 2 - 0.8) / 2.6);
    for (let k = 0; k <= posts; k++) f.box(-h + 0.4 + ((h * 2 - 0.8) * k) / posts - 0.06, PLATFORM_Y, PLATFORM.to - 0.35, 0.12, CANOPY_Y - PLATFORM_Y, 0.12, steel);
    f.box(-h - 0.2, CANOPY_Y, -0.6, h * 2 + 0.4, 0.14, PLATFORM.to + 0.8, roof);
    f.box(-h - 0.2, CANOPY_Y + 0.02, -0.64, h * 2 + 0.4, 0.08, 0.04, trim);
    // The station's name on the fascia, facing out over the street on the track's far side, and boards along the platform
    f.box(-2.75, CANOPY_Y + 0.12, -0.67, 5.5, 0.66, 0.03, dark);
    f.add(signs.board(i + 1, 5.2, 0.65, true), signs.mat, 0, CANOPY_Y + 0.45, -0.678);
    f.add(signs.board(0, 2.6, 0.32, true), signs.mat, h / 2, PLATFORM_Y + 1.8, PLATFORM.to - 0.42);
    f.add(signs.board(i + 1, 2.6, 0.32, true), signs.mat, -h / 2, PLATFORM_Y + 1.8, PLATFORM.to - 0.42);
    // Lights under the canopy, benches against the parapet
    b.detail(() => {
      for (let x = -h + 1.2; x < h; x += 2.4) f.box(x - 0.3, CANOPY_Y - 0.04, PLATFORM.from + 0.5, 0.6, 0.04, 0.12, lamp);
      for (const x of [-h / 2, h / 2]) {
        f.box(x - 0.6, PLATFORM_Y + 0.3, PLATFORM.to - 0.85, 1.2, 0.06, 0.35, dark);
        f.box(x - 0.55, PLATFORM_Y, PLATFORM.to - 0.85, 0.08, 0.3, 0.35, steel);
        f.box(x + 0.47, PLATFORM_Y, PLATFORM.to - 0.85, 0.08, 0.3, 0.35, steel);
      }
    });

    // The skybridge from the platform to the tower: a floor, glass sides, a roof
    const b0 = PLATFORM.to - 0.1;
    const bl = tOut - tHalf - b0 + 0.02;
    if (bl > 0.05) {
      f.box(ta - 0.9, PLATFORM_Y - 0.3, b0, 1.8, 0.3, bl, concrete);
      f.box(ta - 0.95, PLATFORM_Y + 2.1, b0, 1.9, 0.14, bl, roof);
      for (const sx of [-1, 1]) {
        f.box(ta + sx * 0.9 - (sx > 0 ? 0.06 : 0), PLATFORM_Y, b0, 0.06, 2.1, bl, glass);
        f.box(ta + sx * 0.94 - 0.02, PLATFORM_Y + 2.06, b0, 0.04, 0.04, bl, trim);
      }
    }

    // The stair tower: its walls, a lit window strip up the face the door is in, the door at street level, the M over it
    const top = DECK_Y + 2.6;
    b.box(tx0, SLAB, tz0, tx1 - tx0, top - SLAB, tz1 - tz0, dark);
    b.box(tx0 - 0.15, top, tz0 - 0.15, tx1 - tx0 + 0.3, 0.2, tz1 - tz0 + 0.3, roof);
    for (const [x, z, w2, d2] of [
      [tx0 - 0.16, tz0 - 0.16, 0.04, tz1 - tz0 + 0.32],
      [tx1 + 0.12, tz0 - 0.16, 0.04, tz1 - tz0 + 0.32],
      [tx0 - 0.16, tz0 - 0.16, tx1 - tx0 + 0.32, 0.04],
      [tx0 - 0.16, tz1 + 0.12, tx1 - tx0 + 0.32, 0.04],
    ])
      b.box(x, top + 0.04, z, w2, 0.08, d2, trim);
    // The door's face: a frame on it, x along the face, z out of it
    const [fx, fz] = s.face;
    const fo: Pt = [s.door.x - fx * 0.4, s.door.z - fz * 0.4];
    const d = frame(b, fo, [fz, -fx], [fx, fz]);
    // (the window strip stops short of the skybridge's floor and starts above the door)
    d.box(-0.25, SLAB + 2.6, 0, 0.5, PLATFORM_Y - 0.4 - (SLAB + 2.6), 0.006, strip);
    d.box(-0.55, SLAB, 0, 1.1, 1.7, 0.02, roof);
    d.box(-0.62, SLAB + 1.7, 0, 1.24, 0.06, 0.05, trim);
    for (const sx of [-1, 1]) d.box(sx * 0.6 - 0.03, SLAB, 0, 0.06, 1.7, 0.05, trim);
    d.add(new THREE.PlaneGeometry(0.7, 0.7), roundel(), 0, SLAB + 2.2, 0.012);
    // A totem on the sidewalk by the door: M on top
    b.detail(() => {
      d.box(1.54, SLAB, 1.04, 0.12, 2.6, 0.12, steel);
      d.box(1.33, SLAB + 2.48, 1.04, 0.54, 0.54, 0.12, steel);
      d.add(new THREE.PlaneGeometry(0.5, 0.5), roundel(), 1.6, SLAB + 2.75, 1.17);
      d.add(new THREE.PlaneGeometry(0.5, 0.5).rotateY(Math.PI), roundel(), 1.6, SLAB + 2.75, 1.03);
    });
  }
  b.build(scene);

  /* ---------- The train ---------- */
  // Two cars, each placed on the track where it is (so they follow the bend); the front one carries the white lamps
  const front = makeCar(opts.low, 'front');
  const back = makeCar(opts.low, 'back');
  const train = new THREE.Group();
  train.name = 'metro-train';
  // It moves: drawn at every distance, as it is
  train.userData.keep = true;
  train.add(front, back);
  scene.add(train);
  const GAP = (TRAIN.len - 0.2) / 4 + 0.05;
  // The timetable runs on the clock (the same for everyone); a ride moves it on (`offset`)
  let offset = 0;
  let held: { run: Run; d: number } | null = null;
  const now = () => Date.now() / 1000 + offset;
  const place = (car: THREE.Object3D, tr: { run: Run; d: number }, off: number) => {
    const c = carAt(tr, off);
    car.position.set(c.at[0], RAIL_Y, c.at[1]);
    car.rotation.y = Math.atan2(c.dir[0], c.dir[1]);
  };
  const set = (tr: { run: Run; d: number }) => {
    place(front, tr, GAP);
    place(back, tr, -GAP);
  };
  set(trainAt(0));
  // Sparks off the wheels over The Trenches: a few at a time from under each car, falling and fading
  const N = 72;
  const sparkPos = new Float32Array(N * 3).fill(-100);
  const sparkVel = new Float32Array(N * 3);
  const sparkLife = new Float32Array(N);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparks = fx(new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: '#ffcf7a', map: glowTex, size: 0.32, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
  sparks.frustumCulled = false;
  sparks.userData.keep = true;
  scene.add(sparks);
  let nextSpark = 0;
  let live = 0;
  const last = new THREE.Vector3();
  /** How fast the train is going (tiles a second), from where it was a frame ago */
  let speed = 0;
  tick((env) => {
    if (opts.reduced && !held) return;
    set(held ?? trainAt(now()));
    const dt = Math.min(env.dt, 0.1);
    if (dt > 0) speed = speed * 0.8 + (front.position.distanceTo(last) / dt) * 0.2;
    last.copy(front.position);
    if (opts.reduced) return;
    // A burst now and then from under a car moving over The Trenches
    nextSpark -= dt;
    if (nextSpark <= 0 && speed > 2) {
      nextSpark = 0.08 + Math.random() * 0.5;
      const car = Math.random() < 0.5 ? front : back;
      if (inTrenches(car.position.x, car.position.z)) {
        const fwd = new THREE.Vector3(Math.sin(car.rotation.y), 0, Math.cos(car.rotation.y));
        const end = (Math.random() < 0.5 ? -1 : 1) * TRAIN.len * 0.18;
        const side = Math.random() < 0.5 ? -0.45 : 0.45;
        const [ox, oz] = [car.position.x + fwd.x * end + fwd.z * side, car.position.z + fwd.z * end - fwd.x * side];
        for (let k = 0, i = 0; k < 8 && i < N; i++) {
          if (sparkLife[i] > 0) continue;
          sparkLife[i] = 0.35 + Math.random() * 0.4;
          sparkPos.set([ox, RAIL_Y + 0.05, oz], i * 3);
          sparkVel.set([-fwd.x * speed * 0.3 + (Math.random() - 0.5) * 2.5, Math.random() * 1.5, -fwd.z * speed * 0.3 + (Math.random() - 0.5) * 2.5], i * 3);
          k++;
        }
      }
    }
    live = 0;
    for (let i = 0; i < N; i++) {
      if (sparkLife[i] <= 0) continue;
      sparkLife[i] -= dt;
      if (sparkLife[i] <= 0) {
        sparkPos[i * 3 + 1] = -100;
        continue;
      }
      live++;
      sparkVel[i * 3 + 1] -= 9 * dt;
      for (let a = 0; a < 3; a++) sparkPos[i * 3 + a] += sparkVel[i * 3 + a] * dt;
    }
    sparks.visible = live > 0;
    if (live || sparks.visible) sparkGeo.attributes.position.needsUpdate = true;
  });
  return {
    train,
    /** How loud the train is from (x, z) (0-1): near it and moving (sound.ts rumbles with it) */
    rumbleAt(x: number, z: number) {
      const d = Math.min(Math.hypot(front.position.x - x, front.position.z - z), Math.hypot(back.position.x - x, back.position.z - z));
      return Math.min(1, speed / 6) * Math.max(0, 1 - Math.max(0, d - 5) / 45);
    },
    /** A ride holds the train where it puts it (null: back on the timetable where it was) */
    hold(at: { run: Run; d: number } | null) {
      held = at;
      if (at) set(at);
    },
    /** Back on the timetable at the time `t` into the round trip (`timetableAt()`), from now */
    resume(t: number) {
      offset += t - (now() % ROUND_TRIP);
      held = null;
    },
  };
}

/**
 * A car of the train, along +z, its middle at the origin on the rails: a
 * white body over a dark skirt, a magenta stripe, a band of windows (lit at
 * night), a rounded roof, bogies under it; the cab at its outer end (+z for
 * the front car, -z for the back) with a windscreen and lamps, white at the
 * front and red at the back; the other end has the gangway to the other car
 */
function makeCar(low: boolean, which: 'front' | 'back') {
  const body = toon('#e9e7f2');
  const skirt = toon('#3b3756');
  const roofM = toon('#cfcadf');
  const stripe = neon(PAL.magenta, 0.9, 1.6);
  const windows = lit(new THREE.MeshBasicMaterial({ color: '#9fd8ff', toneMapped: true }), 0.35, 1.1);
  const lamps = which === 'front' ? neon('#fff6c8', 0.8, 2.4) : neon('#ff2b2b', 0.8, 2.4);
  const meshes: THREE.Mesh[] = [];
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, m: THREE.Material) => meshes.push(new THREE.Mesh(boxAt(x, y, z, w, h, d), m));
  const L = (TRAIN.len - 0.2) / 2;
  const W = 1.6;
  const z0 = -L / 2;
  box(-W / 2, 0.22, z0, W, 0.35, L, skirt);
  box(-W / 2, 0.57, z0, W, 1.25, L, body);
  box(-W / 2 + 0.08, 1.82, z0 + 0.15, W - 0.16, 0.16, L - 0.3, roofM);
  // The stripe and the windows on both sides (a touch proud of the body)
  for (const s of [-1, 1]) {
    const x = s > 0 ? W / 2 : -W / 2 - 0.012;
    box(x, 0.66, z0 + 0.1, 0.012, 0.1, L - 0.2, stripe);
    box(x, 0.98, z0 + 0.35, 0.012, 0.6, L - 0.7, windows);
  }
  // Bogies
  if (!low) for (const bz of [z0 + 0.9, z0 + L - 0.9]) box(-0.6, 0, bz - 0.5, 1.2, 0.24, 1.0, skirt);
  // The cab at its outer end: a windscreen and lamps; a dark gangway at the other
  const e = which === 'front' ? 1 : -1;
  const ze = (e * L) / 2 + (e > 0 ? 0 : -0.012);
  box(-W / 2 + 0.15, 1.05, ze, W - 0.3, 0.55, 0.012, windows);
  for (const s of [-1, 1]) box(s * 0.5 - 0.12, 0.6, ze, 0.24, 0.12, 0.012, lamps);
  box(-0.45, 0.6, (-e * L) / 2 - (e > 0 ? 0.1 : 0), 0.9, 1.2, 0.1, skirt);
  const g = mergeMeshes(meshes, { cast: true, receive: true });
  for (const m of meshes) m.geometry.dispose();
  return g;
}
