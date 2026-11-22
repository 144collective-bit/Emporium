/*
 * The golf course's life drawn (docs/golf-plan.md Phase 5; the rules and data are golflife.ts), from golf3d.ts's
 * `register()`:
 *
 * - **What stands on the course**, a site a hole, near only: the flagstick in the cup, the tee markers, the ball
 *   washer, the bench, the hole's sign (its name, one texture for all eighteen: `signMat()`), a rake by each bunker.
 * - **The flags**: their cloth, one instanced mesh for all eighteen on the main thread, streaming with the wind and
 *   fluttering (moved only while the camera's near the course; under reduced motion they hold the first frame); their
 *   sticks are drawn near and far so a flag never flies on its own.
 * - **The golfers** (golflife.ts `GOLFERS`), into the crowd's spare slots (life.ts `addPeople()`), each a park-style
 *   mover (`golferAt()`): their swing and putt the crowd's `golf` and `putt` rows, played from the start of the shot
 *   (`Moment.since`), the club in the right hand (the wardrobe's `held: 'club'`, crowdlook.ts's `golfer` role).
 * - **The carts, the mower and the ducks**: one instanced mesh each (`cartGeometry()`, `mowerGeometry()`,
 *   `duckGeometry()`), moved on the main thread's tick while the camera's near the course; the carts' drivers and the
 *   greenkeeper the crowd's, seated, riding with them.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, lit, paintMat, siteMat, toon } from './kit';
import { site } from './tilework';
import { CROWD_VIEW } from './character';
import { GOLF_RECT, golfLift } from './golflift';
import { HOLES, type Pt } from './golf';
import { CART, CARTS, DUCKS, FLAG, FURNITURE, GOLFERS, cartAt, duckAt, golferAt, mowerAt, type HoleFurniture } from './golflife';
import { golfWater } from './golflift';
import { addPeople } from './life';
import type { ParkPerson } from './parklife';
import { windStrength } from './dusk';
import type { Tick } from './world';

/** The front nine's flags and the back nine's */
export const FLAG_COLOURS = ['#e23b3b', '#f2c230'];
/** The hole signs' board (tiles) and the texture's rows */
const SIGN = { w: 1.1, h: 0.34, post: 0.75 };
const ROW_H = 56;
const SIGN_W = 512;

let SIGN_MAT: THREE.Material | null = null;
/** One texture of every hole's name, a row each (gold on the club's green, as its name over the porch) */
function signMat() {
  SIGN_MAT ??= siteMat(
    'golf-signs',
    lit(
      new THREE.MeshBasicMaterial({
        map: canvasTex(SIGN_W, ROW_H * HOLES.length, (c, w, h) => {
          const rh = h / HOLES.length;
          for (const [i, hole] of HOLES.entries()) {
            const y = i * rh;
            c.fillStyle = '#1f4a33';
            c.fillRect(0, y, w, rh);
            c.strokeStyle = '#d9b45a';
            c.lineWidth = rh * 0.07;
            c.strokeRect(rh * 0.1, y + rh * 0.1, w - rh * 0.2, rh * 0.8);
            c.fillStyle = '#e6c46a';
            c.font = `bold ${Math.round(rh * 0.5)}px ${FONT_DISPLAY}`;
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText(hole.name.toUpperCase(), w / 2, y + rh * 0.54);
          }
        }),
      }),
      0.9,
      1.2
    )
  );
  return SIGN_MAT;
}

/** A board facing `ry` showing row `i` of the signs' texture, both faces */
function signBoard(i: number): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(SIGN.w, SIGN.h);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const [v0, v1] = [1 - (i + 1) / HOLES.length, 1 - i / HOLES.length];
  for (let k = 0; k < uv.count; k++) uv.setY(k, uv.getY(k) > 0.5 ? v1 : v0);
  return g;
}

const at = (g: THREE.BufferGeometry, p: Pt, y: number, ry = 0) => g.rotateY(ry).translate(p[0], y, p[1]);

/** One Batch's shape as a single vertex-coloured geometry (its toons merged into the paint, as dogs3d.ts's) */
function shapeOf(fill: (b: Batch) => void) {
  const b = new Batch();
  fill(b);
  const g = new THREE.Group();
  b.build(g);
  return (g.children[0] as THREE.Mesh).geometry;
}
/** A golf cart: +z its front, the ground under its middle at the origin (golflife.ts `CART`) */
export function cartGeometry() {
  return shapeOf((b) => {
    const { len, wide } = CART;
    const body = toon('#f1ede2');
    const dark = toon('#1b1830');
    const seat = toon('#2f5a3e');
    const roof = toon('#f7f4ec');
    b.box(-wide / 2, 0.12, -len / 2, wide, 0.16, len, body);
    // (the nose, the floor and the seat with its back, the roof on four posts, the bag on the back)
    b.box(-wide / 2, 0.28, len / 2 - 0.3, wide, 0.16, 0.3, body);
    b.box(-wide / 2 + 0.04, 0.26, -0.18, wide - 0.08, 0.06, 0.34, seat);
    b.box(-wide / 2 + 0.04, 0.32, -0.2, wide - 0.08, 0.26, 0.05, seat);
    for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) b.box(x * (wide / 2 - 0.03) - 0.015, 0.28, z * 0.36 - 0.015, 0.03, 0.62, 0.03, dark);
    b.box(-wide / 2 - 0.03, 0.9, -0.48, wide + 0.06, 0.04, 0.98, roof);
    // (a golf bag stood on the back, its clubs' heads out of the top)
    b.add(new THREE.CylinderGeometry(0.09, 0.08, 0.46, 8).translate(0, 0.5, -len / 2 + 0.1), toon('#2f4a6a'));
    for (const dx of [-0.04, 0.03]) b.box(dx - 0.02, 0.72, -len / 2 + 0.08, 0.04, 0.06, 0.05, toon('#c9ccd4'));
    for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) b.add(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 8).rotateZ(Math.PI / 2).translate(x * (wide / 2 + 0.01), 0.1, z * (len / 2 - 0.22)), dark);
  });
}
/** The greenkeeper's ride-on mower: +z its front */
export function mowerGeometry() {
  return shapeOf((b) => {
    const green = toon('#3f8a4c');
    const dark = toon('#1b1830');
    b.box(-0.3, 0.12, -0.45, 0.6, 0.22, 0.9, green);
    b.box(-0.36, 0.04, 0.2, 0.72, 0.1, 0.42, toon('#55545e'));
    b.box(-0.18, 0.34, -0.36, 0.36, 0.08, 0.32, toon('#1f2a24'));
    b.box(-0.02, 0.34, 0.12, 0.04, 0.3, 0.04, dark);
    for (const [x, z, r] of [[-1, -1, 0.15], [1, -1, 0.15], [-1, 1, 0.09], [1, 1, 0.09]]) b.add(new THREE.CylinderGeometry(r, r, 0.08, 8).rotateZ(Math.PI / 2).translate(x * 0.32, r, z * 0.34), dark);
  });
}
/** A duck on the water: +z its bill, the waterline at the origin */
export function duckGeometry() {
  return shapeOf((b) => {
    const C = toon('#f2f0f8');
    b.add(new THREE.SphereGeometry(0.09, 8, 6).scale(0.75, 0.6, 1.2).translate(0, 0.03, 0), C);
    b.add(new THREE.SphereGeometry(0.05, 8, 6).translate(0, 0.12, 0.08), C);
    b.box(-0.015, 0.11, 0.12, 0.03, 0.015, 0.05, toon('#e2a13a'));
  });
}
/** The ducks' plumage (mallard green heads aside, they're one colour each: a brown, a white, a grey) */
const DUCK_COATS = ['#8a6a48', '#f2efe6', '#7d8288', '#5b7a4a'];

type Mats = Record<'white' | 'blue' | 'post' | 'wood' | 'iron' | 'rake', THREE.Material>;
/** A hole's green's things into a Batch: the flagstick in its cup, the rakes by the bunkers */
function drawGreen(b: Batch, f: HoleFurniture, m: Mats) {
  // (the stick near and far, so its flag never flies on its own; the cup near)
  const y = golfLift(...f.pin);
  b.add(at(new THREE.CylinderGeometry(0.018, 0.018, FLAG.stick, 5), f.pin, y + FLAG.stick / 2), m.white);
  b.detail(() => {
    b.add(at(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 8), f.pin, y + 0.005), m.iron);
    // A rake by each bunker, lying on the grass at its edge
    for (const r of f.rakes) {
      const ry = golfLift(...r.at);
      b.add(at(new THREE.BoxGeometry(0.03, 0.03, 1.1).translate(0, 0.02, 0), r.at, ry, r.ry), m.post);
      b.add(at(new THREE.BoxGeometry(0.32, 0.03, 0.06).translate(0, 0.02, 0.56), r.at, ry, r.ry), m.rake);
    }
  }, 'near');
}
/** A hole's tee's things into a Batch */
function drawTee(b: Batch, f: HoleFurniture, i: number, m: Mats) {
  // The tee markers: a ball on a short peg each
  for (const p of f.markers) {
    const y = golfLift(...p);
    b.add(at(new THREE.SphereGeometry(0.09, 8, 6), p, y + 0.11), i < 9 ? m.blue : m.white);
  }
  // The ball washer: a post, its tub and the handle on top
  {
    const y = golfLift(...f.washer);
    b.add(at(new THREE.CylinderGeometry(0.035, 0.04, 0.6, 6), f.washer, y + 0.3), m.post);
    b.add(at(new THREE.BoxGeometry(0.22, 0.2, 0.12), f.washer, y + 0.7, f.bench.ry), m.blue);
    b.add(at(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 4), f.washer, y + 0.88), m.iron);
  }
  // The bench: its slatted seat and back on two legs, facing the tee
  {
    const { at: p, ry } = f.bench;
    const y = golfLift(...p);
    const put = (g: THREE.BufferGeometry, mat: THREE.Material) => b.add(g.rotateY(ry).translate(p[0], y, p[1]), mat);
    put(new THREE.BoxGeometry(1.1, 0.04, 0.32).translate(0, 0.3, 0), m.wood);
    put(new THREE.BoxGeometry(1.1, 0.2, 0.04).rotateX(-0.15).translate(0, 0.48, -0.16), m.wood);
    // (a post at each corner, under the seat's ends)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(new THREE.BoxGeometry(0.05, 0.3, 0.05).translate(sx * 0.48, 0.15, sz * 0.12), m.post);
  }
  // The hole's sign: its name on a board on a post, at the back of the tee
  {
    const { at: p, ry } = f.sign;
    const y = golfLift(...p);
    b.add(at(new THREE.BoxGeometry(0.07, SIGN.post, 0.07), p, y + SIGN.post / 2), m.post);
    // (a back board a hair behind the face, so the two never meet in one plane)
    b.add(at(new THREE.BoxGeometry(SIGN.w + 0.06, SIGN.h + 0.06, 0.03), p, y + SIGN.post + SIGN.h / 2 - 0.02, ry), m.post);
    const face = signBoard(i).translate(0, 0, 0.022);
    b.add(at(face, p, y + SIGN.post + SIGN.h / 2 - 0.02, ry), signMat());
    const back = signBoard(i).rotateY(Math.PI).translate(0, 0, -0.022);
    b.add(at(back, p, y + SIGN.post + SIGN.h / 2 - 0.02, ry), signMat());
  }
}

export function registerGolfLife({ low, scene, tick }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  const m = {
    white: toon('#f2efe6'),
    blue: toon('#2f6fb5'),
    post: toon('#3b3a44'),
    wood: toon('#a8743f'),
    iron: toon('#55545e'),
    rake: toon('#d9b45a'),
  };
  // (each hole's things are two clusters, the tee's and the green's: a site each, so neither's rect spans the hole)
  const rectOf = (list: Pt[]): [number, number, number, number] => [Math.min(...list.map((p) => p[0])) - 2, Math.min(...list.map((p) => p[1])) - 2, Math.max(...list.map((p) => p[0])) + 2, Math.max(...list.map((p) => p[1])) + 2];
  for (const [i, f] of FURNITURE.entries()) {
    site(`golf tee ${f.n}`, rectOf([...f.markers, f.washer, f.bench.at, f.sign.at]), (into) => {
      const b = new Batch();
      b.lod = 'near';
      drawTee(b, f, i, m);
      b.build(into, { cast: !low, receive: true });
    });
    site(`golf green ${f.n}`, rectOf([f.pin, ...f.rakes.map((r) => r.at)]), (into) => {
      const b = new Batch();
      drawGreen(b, f, m);
      b.build(into, { cast: !low, receive: true });
    });
  }

  if (!scene) return;
  // The golfers, into the crowd's spare slots (phones the trimmed half left out)
  addPeople(
    [],
    GOLFERS.filter((g) => !(low && g.trim)).map((g): ParkPerson => {
      const at = { x: 0, z: 0, ry: 0, clip: 'look' as const, speed: 0 } as Parameters<typeof golferAt>[2];
      return {
        id: g.id,
        trim: g.trim,
        at(t, out) {
          golferAt(g, t, at);
          out.x = at.x;
          out.z = at.z;
          out.ry = at.ry;
          out.y = golfLift(at.x, at.z);
          out.clip = at.clip;
          out.speed = at.speed;
          out.since = at.since;
          return out;
        },
      };
    })
  );
  // The carts' drivers and the greenkeeper, seated (the crowd's sit), riding with them
  const carts = CARTS.map((c, i) => ({ c, i })).filter(({ c }) => !(low && c.trim));
  const seatOf = (p: { x: number; z: number; ry: number }, fwd: number, left: number, out: { x: number; z: number }) => {
    const [fx, fz] = [Math.sin(p.ry), Math.cos(p.ry)];
    // (left of the way it faces: three.js's +x when it faces +z)
    out.x = p.x + fx * fwd + fz * left;
    out.z = p.z + fz * fwd - fx * left;
    return out;
  };
  const rider = (id: string, where: (t: number) => { x: number; z: number; ry: number }, fwd: number, left: number, y: number): ParkPerson => {
    const seat = { x: 0, z: 0 };
    return {
      id,
      trim: false,
      at(t, out) {
        const p = where(t);
        seatOf(p, fwd, left, seat);
        out.x = seat.x;
        out.z = seat.z;
        out.ry = p.ry;
        out.y = golfLift(seat.x, seat.z) + y;
        out.clip = 'sit';
        out.speed = 0;
        return out;
      },
    };
  };
  addPeople(
    [],
    [...carts.map(({ i }) => rider(`golf-cart-${i}`, (t) => cartAt(i, t), CART.seat.fwd, CART.seat.left, CART.seat.y)), rider('golf-mower', mowerAt, -0.2, 0, 0.42)]
  );
  if (!tick) return;
  // The carts, the mower and the ducks: instanced, moved on the main thread's tick near the course
  const paint = paintMat();
  const mk = (geo: THREE.BufferGeometry, n: number, name: string) => {
    const m = new THREE.InstancedMesh(geo, paint, n);
    m.name = name;
    m.castShadow = !low;
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(m);
    return m;
  };
  const cartMesh = mk(cartGeometry(), carts.length, 'golf carts');
  const mowerMesh = mk(mowerGeometry(), 1, 'golf mower');
  const ducks = DUCKS.map((d, i) => ({ d, i })).filter(({ d }) => !(low && d.trim));
  const duckMesh = mk(duckGeometry(), ducks.length, 'golf ducks');
  const cc = new THREE.Color();
  carts.forEach((_, k) => cartMesh.setColorAt(k, cc.set('#ffffff')));
  mowerMesh.setColorAt(0, cc.set('#ffffff'));
  ducks.forEach(({ i }, k) => duckMesh.setColorAt(k, cc.set(DUCK_COATS[i % DUCK_COATS.length])));
  const lm = new THREE.Matrix4();
  const lq = new THREE.Quaternion();
  const lv = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const unit = new THREE.Vector3(1, 1, 1);
  const place = (mesh: THREE.InstancedMesh, k: number, p: { x: number; z: number; ry: number }, y: number) => {
    lq.setFromAxisAngle(up, p.ry);
    mesh.setMatrixAt(k, lm.compose(lv.set(p.x, y, p.z), lq, unit));
  };
  const moveLife = (t: number) => {
    carts.forEach(({ i }, k) => {
      const p = cartAt(i, t);
      place(cartMesh, k, p, golfLift(p.x, p.z));
    });
    const m = mowerAt(t);
    place(mowerMesh, 0, m, golfLift(m.x, m.z));
    ducks.forEach(({ d, i }, k) => place(duckMesh, k, duckAt(i, t), golfWater(d.lake)));
    for (const mesh of [cartMesh, mowerMesh, duckMesh]) mesh.instanceMatrix.needsUpdate = true;
  };
  moveLife(0);
  // The flags' cloth: a short wedge of a pennant, pinned at the stick's top, coloured by the nine
  const cloth = new THREE.BufferGeometry();
  cloth.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, FLAG.w, -FLAG.h / 2, 0, 0, -FLAG.h, 0], 3));
  cloth.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  cloth.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 1, 1, 1, 1, 1, 1], 3));
  const mat = (paintMat() as THREE.MeshToonMaterial).clone();
  mat.side = THREE.DoubleSide;
  const flags = new THREE.InstancedMesh(cloth, mat, FURNITURE.length);
  flags.name = 'golf flags';
  flags.frustumCulled = false;
  flags.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const c = new THREE.Color();
  FURNITURE.forEach((_, i) => flags.setColorAt(i, c.set(FLAG_COLOURS[i < 9 ? 0 : 1])));
  scene.add(flags);
  const tops = FURNITURE.map((f) => new THREE.Vector3(f.pin[0], golfLift(...f.pin) + FLAG.stick - 0.01, f.pin[1]));
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const one = new THREE.Vector3(1, 1, 1);
  /** Where the wind blows the flags (radians about y: from the west, a little north) */
  const WIND_YAW = 0.35;
  const update = (t: number, rain: number) => {
    const w = windStrength(rain) / 0.05;
    tops.forEach((p, i) => {
      // (each streams downwind, swinging and flapping on its own beat; harder in the rain)
      const swing = Math.sin(t * 1.3 + i * 1.7) * 0.22 + Math.sin(t * 3.1 + i) * 0.08 * w;
      const flap = Math.sin(t * 7 + i * 2.3) * 0.12 * Math.min(2, w);
      e.set(flap, WIND_YAW + swing, 0, 'YXZ');
      m4.compose(p, q.setFromEuler(e), one);
      flags.setMatrixAt(i, m4);
    });
    flags.instanceMatrix.needsUpdate = true;
  };
  update(0, 0);
  const [x0, z0, x1, z1] = GOLF_RECT;
  tick(({ t, rain }) => {
    const ex = CROWD_VIEW.eye.x;
    const ez = CROWD_VIEW.eye.z;
    const near = Math.hypot(Math.max(x0 - ex, ex - x1, 0), Math.max(z0 - ez, ez - z1, 0)) < 200;
    for (const o of [flags, cartMesh, mowerMesh, duckMesh]) o.visible = near;
    if (!near) return;
    update(t, rain);
    moveLife(t);
  });
}
