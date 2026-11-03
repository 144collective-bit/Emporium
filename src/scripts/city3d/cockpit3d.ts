/*
 * Your aircraft's cockpit (docs/firstperson-plan.md, Phase 6; the numbers are cockpits.ts's): a chunk of its own,
 * fetched the first time you look from the pilot's seat (V). Drawn in the aircraft's own space, on a group fly.ts
 * puts where the aircraft is each frame:
 *
 * - the cabin's lining with the windows cut in it (the shell's own faces point away from you inside, and the
 *   aircraft's glazing is hidden while you're in here, aircraft.ts `glass()`), the frames round them, the glass,
 *   the floor and the foot well, the seat, the bulkhead behind;
 * - the panel and its glare shield: the Sky Hopper's six round gauges and a rev counter, the Neon Dart's two
 *   screens (the attitude with its speed and height tapes, the map), the Whirlybird's small pedestal; needles, the
 *   attitude's horizon, the compass card and the turn needle working; lit faintly at night, under the bloom;
 * - the controls moving with the sim's input: the yoke, the side stick or the cyclic, the throttle quadrant or the
 *   collective, the pedals, and the Neon Dart's gear lever (with its three lights) and flaps' lever with the gear;
 * - the pilot (walk mode's Degen) seated with his hands and feet on them (cockpits.ts `pilotPose()`);
 * - the Whirlybird's rotor shadow flickering over the panel and the floor by day (not under reduced motion).
 */
import * as THREE from 'three';
import { createDegen, type Degen, type Outfit } from './character';
import { COCKPITS, PILOT_SCALE, controlsOf, feetOf, inHole, pilotPose, pilotRoot, sectionAt, type Cockpit, type Controls, type Gauge } from './cockpits';
import { PANELS } from './airframe';
import { Batch, FONT_DISPLAY, canvasTex, fx, lit, liveTex, moving, neon, toon } from './kit';
import type { FlyState } from './flight-sim';
import type { PlaneId } from './myplane';
import { seatEye } from './seateye';

const LINING = toon('#454a63');
const FRAME = toon('#23263a');
const PANEL = toon('#262a3d');
const SHIELD = toon('#191b29');
const FLOOR = toon('#2c2f40');
const SEAT = toon('#7a3348');
const SEAT_DARK = toon('#5a2335');
const METAL = toon('#9a96b8');
const GRIP = toon('#1b1830');
const KNOB = toon('#e8e4f6');
const RIM = toon('#c9c4e6');
const GAUGE_BACK = toon('#0e1320');
const glassMat = () => (theGlass ??= toon('#a6e6f7', { transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide, name: 'cockpit-glass' }));
let theGlass: THREE.MeshToonMaterial | null = null;
/** The gauges' faces and the screens: lit faintly by day and fully at night (under the bloom's threshold) */
const faceMat = (map: THREE.Texture) => lit(new THREE.MeshBasicMaterial({ map, name: 'cockpit-face' }), 0.85, 1);
const NEEDLE = () => neon('#ff8a3d', 0.6, 1);
const SYMBOL = () => neon('#ffd34d', 0.6, 1);
const INSET = 0.03;
/** A needle at rest points down to the left; full is down to the right (radians about the face's normal) */
const REST = 2.36;

/* ---------- The cabin ---------- */

/** A point on the body's inside at (x, a): the lining's radius in from the shell */
function inside(st: Cockpit['body'], x: number, a: number, inset: number) {
  const [r, cy, sy] = sectionAt(st, x);
  const t = a * Math.PI * 2;
  const rr = Math.max(0.05, r - inset);
  return new THREE.Vector3(x, cy + Math.sin(t) * rr * sy, Math.cos(t) * rr);
}
/** The lining (wound to face in), the frames round each window and the glass in them */
function lining(k: Cockpit) {
  const [x0, x1] = k.liner;
  const NX = Math.max(2, Math.round((x1 - x0) / 0.05));
  const NA = 56;
  const dx = (x1 - x0) / NX;
  const da = 1 / NA;
  const out = { lining: [] as number[], frame: [] as number[], glass: [] as number[] };
  const quad = (list: number[], xa: number, xb: number, aa: number, ab: number, inset: number) => {
    const [p00, p10, p01, p11] = [inside(k.body, xa, aa, inset), inside(k.body, xb, aa, inset), inside(k.body, xa, ab, inset), inside(k.body, xb, ab, inset)];
    for (const p of [p00, p11, p10, p00, p01, p11]) list.push(p.x, p.y, p.z);
  };
  for (let i = 0; i < NX; i++)
    for (let j = 0; j < NA; j++) {
      const [xa, xb, aa, ab] = [x0 + i * dx, x0 + (i + 1) * dx, j * da, (j + 1) * da];
      const [xm, am] = [(xa + xb) / 2, (aa + ab) / 2];
      if (inHole(k.holes, xm, am)) {
        quad(out.glass, xa, xb, aa, ab, 0.012);
        continue;
      }
      // (a cell beside a window is its frame)
      const edge = inHole(k.holes, xm + dx, am) || inHole(k.holes, xm - dx, am) || inHole(k.holes, xm, am + da) || inHole(k.holes, xm, am - da);
      quad(edge ? out.frame : out.lining, xa, xb, aa, ab, edge ? INSET + 0.008 : INSET);
    }
  const geo = (list: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(list, 3));
    g.computeVertexNormals();
    return g;
  };
  return { lining: geo(out.lining), frame: geo(out.frame), glass: geo(out.glass) };
}
/** The cabin's section at x as an outline (z, y) between two heights, the lining's width */
function sectionShape(k: Cockpit, x: number, y0: number, y1: number, inset = INSET + 0.005, most = Infinity) {
  const [r, cy, sy] = sectionAt(k.body, x);
  const rr = r - inset;
  const half = (y: number) => Math.min(most, rr * Math.sqrt(Math.max(0, 1 - ((y - cy) / (rr * sy)) ** 2)));
  const pts: THREE.Vector2[] = [];
  const N = 16;
  for (let i = 0; i <= N; i++) {
    const y = y0 + ((y1 - y0) * i) / N;
    pts.push(new THREE.Vector2(half(y), y));
  }
  for (let i = N; i >= 0; i--) {
    const y = y0 + ((y1 - y0) * i) / N;
    pts.push(new THREE.Vector2(-half(y), y));
  }
  return { shape: new THREE.Shape(pts), half };
}
/** A flat shape drawn in (z, y) laid on the plane at x, facing aft (towards him) */
const facingAft = (g: THREE.BufferGeometry, x: number) => g.rotateY(-Math.PI / 2).translate(x, 0, 0);

/* ---------- The gauges' faces ---------- */

const LABEL: Partial<Record<Gauge['kind'], string>> = { speed: 'KM/H', altitude: 'ALT', climb: 'VS', revs: 'RPM', turn: 'TURN' };
/** A dial's face: ticks round three quarters (a full turn for the altimeter), its label */
function dialTex(kind: Gauge['kind']) {
  return canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#0e1320';
    c.fillRect(0, 0, w, h);
    c.translate(w / 2, h / 2);
    const full = kind === 'altitude';
    const n = full ? 10 : kind === 'climb' ? 8 : 12;
    for (let i = 0; i <= (full ? n * 5 - 1 : n * 2); i++) {
      const major = full ? i % 5 === 0 : i % 2 === 0;
      const a = full ? (i / (n * 5)) * Math.PI * 2 : -REST + (i / (n * 2)) * REST * 2;
      c.save();
      c.rotate(a);
      c.fillStyle = major ? '#e9f6ff' : '#8fa6bb';
      c.fillRect(-1.5, -58, 3, major ? 12 : 7);
      c.restore();
      if (full && major) {
        c.fillStyle = '#e9f6ff';
        c.font = `700 14px ${FONT_DISPLAY}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(String(i / 5), Math.sin(a) * 36, -Math.cos(a) * 36);
      }
    }
    // (a green arc on the speed and the revs, the climb's zero mark)
    if (kind === 'speed' || kind === 'revs') {
      c.strokeStyle = '#2bd97a';
      c.lineWidth = 4;
      c.beginPath();
      c.arc(0, 0, 50, -Math.PI / 2 - REST * 0.6, -Math.PI / 2 + REST * 0.5);
      c.stroke();
    }
    if (kind === 'turn') {
      c.strokeStyle = '#e9f6ff';
      c.lineWidth = 3;
      for (const s of [-1, 1]) {
        c.beginPath();
        c.moveTo(s * 40, 12);
        c.lineTo(s * 52, 18);
        c.stroke();
      }
    }
    const label = LABEL[kind];
    if (label) {
      c.fillStyle = '#9fc2d8';
      c.font = `700 13px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.fillText(label, 0, kind === 'turn' ? -22 : 30);
    }
  });
}
/** The attitude's ball: sky over ground with the pitch ladder, twice as tall as the face (it slides with the pitch) */
function attitudeTex() {
  return canvasTex(128, 256, (c, w, h) => {
    c.fillStyle = '#2f8fd8';
    c.fillRect(0, 0, w, h / 2);
    c.fillStyle = '#8a5a2e';
    c.fillRect(0, h / 2, w, h / 2);
    c.fillStyle = '#ffffff';
    c.fillRect(0, h / 2 - 1.5, w, 3);
    for (const k of [-3, -2, -1, 1, 2, 3]) {
      const y = h / 2 - k * 18;
      const half = k % 2 ? 14 : 24;
      c.fillRect(w / 2 - half, y - 1, half * 2, 2);
    }
  });
}
/** The compass card: N, E, S, W and the ticks between */
function headingTex() {
  return canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#0e1320';
    c.fillRect(0, 0, w, h);
    c.translate(w / 2, h / 2);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (let i = 0; i < 36; i++) {
      c.save();
      c.rotate((i / 36) * Math.PI * 2);
      c.fillStyle = '#e9f6ff';
      c.fillRect(-1, -60, 2, i % 3 ? 6 : 11);
      if (i % 9 === 0) {
        c.font = `800 18px ${FONT_DISPLAY}`;
        c.fillStyle = i === 0 ? '#ff8a3d' : '#e9f6ff';
        c.fillText(['N', 'E', 'S', 'W'][i / 9], 0, -38);
      }
      c.restore();
    }
  });
}

/* ---------- The Neon Dart's screens ---------- */

interface Screens {
  pfd: THREE.CanvasTexture;
  mfd: THREE.CanvasTexture;
}
const SW = 256;
const SH = 192;
/** Draw the attitude screen: the horizon rolled and shifted, the speed and height tapes, the heading */
function drawPfd(c: CanvasRenderingContext2D, s: FlyState, alt: number, kmh: number) {
  const [w, h] = [SW, SH];
  c.save();
  c.fillStyle = '#05070d';
  c.fillRect(0, 0, w, h);
  c.beginPath();
  c.rect(44, 14, w - 88, h - 44);
  c.clip();
  c.translate(w / 2, 14 + (h - 44) / 2);
  c.rotate(-s.roll);
  const shift = s.pitch * 160;
  c.fillStyle = '#2f8fd8';
  c.fillRect(-200, -300 + shift, 400, 300);
  c.fillStyle = '#7a4f28';
  c.fillRect(-200, shift, 400, 300);
  c.fillStyle = '#ffffff';
  c.fillRect(-200, shift - 1, 400, 2);
  for (const k of [-2, -1, 1, 2]) c.fillRect(-14 * (k % 2 ? 1 : 1.6), shift - k * 24 - 1, 28 * (k % 2 ? 1 : 1.6), 2);
  c.restore();
  // (the aircraft's symbol, fixed)
  c.fillStyle = '#ffd34d';
  c.fillRect(w / 2 - 34, 14 + (h - 44) / 2 - 2, 22, 4);
  c.fillRect(w / 2 + 12, 14 + (h - 44) / 2 - 2, 22, 4);
  c.fillRect(w / 2 - 3, 14 + (h - 44) / 2 - 3, 6, 6);
  // The tapes: speed on the left, height on the right, each with its readout box
  c.font = `700 13px ${FONT_DISPLAY}`;
  c.textBaseline = 'middle';
  const tape = (x: number, v: number, step: number, label: string) => {
    c.fillStyle = '#141a2a';
    c.fillRect(x, 14, 40, h - 44);
    c.fillStyle = '#cfe6f5';
    c.textAlign = 'center';
    const mid = 14 + (h - 44) / 2;
    for (let k = -4; k <= 4; k++) {
      const val = Math.round(v / step) * step + k * step;
      const y = mid - (val - v) * (22 / step);
      if (y < 20 || y > h - 36 || val < 0) continue;
      c.fillText(String(val), x + 20, y);
    }
    c.fillStyle = '#05070d';
    c.fillRect(x + 1, mid - 9, 38, 18);
    c.strokeStyle = '#ffd34d';
    c.strokeRect(x + 1, mid - 9, 38, 18);
    c.fillStyle = '#ffffff';
    c.fillText(String(Math.round(v)), x + 20, mid);
    c.fillStyle = '#7fa6bf';
    c.fillText(label, x + 20, 8);
  };
  tape(2, kmh, 20, 'KM/H');
  tape(w - 42, alt, 20, 'M');
  // The heading along the foot
  const hdg = (((90 - (s.yaw * 180) / Math.PI) % 360) + 360) % 360;
  c.fillStyle = '#141a2a';
  c.fillRect(44, h - 28, w - 88, 26);
  c.fillStyle = '#cfe6f5';
  c.textAlign = 'center';
  for (let k = -3; k <= 3; k++) {
    const val = Math.round(hdg / 10) * 10 + k * 10;
    const x = w / 2 + (val - hdg) * 3.2;
    if (x < 52 || x > w - 52) continue;
    c.fillText(String(((val % 360) + 360) % 360).padStart(3, '0'), x, h - 15);
  }
  c.fillStyle = '#ffd34d';
  c.fillRect(w / 2 - 1, h - 30, 2, 6);
}
/** Draw the map: heading up, range rings, the aircraft, north's arrow, the gear */
function drawMfd(c: CanvasRenderingContext2D, s: FlyState, gear: number) {
  const [w, h] = [SW, SH];
  c.fillStyle = '#05070d';
  c.fillRect(0, 0, w, h);
  const [cx, cy] = [w / 2, h - 46];
  c.strokeStyle = '#2b6f8f';
  c.lineWidth = 2;
  for (const r of [50, 100]) {
    c.beginPath();
    c.arc(cx, cy, r, Math.PI, 0);
    c.stroke();
  }
  // (north's arrow round the rings as it turns)
  c.save();
  c.translate(cx, cy);
  c.rotate(s.yaw - Math.PI / 2);
  c.fillStyle = '#ff8a3d';
  c.font = `800 14px ${FONT_DISPLAY}`;
  c.textAlign = 'center';
  c.fillText('N', 0, -112);
  c.restore();
  c.fillStyle = '#ffd34d';
  c.beginPath();
  c.moveTo(cx, cy - 10);
  c.lineTo(cx - 7, cy + 7);
  c.lineTo(cx + 7, cy + 7);
  c.closePath();
  c.fill();
  // The gear's three lights and its word
  c.font = `700 13px ${FONT_DISPLAY}`;
  c.textAlign = 'left';
  c.fillStyle = gear > 0.98 ? '#2bd97a' : gear > 0.02 ? '#ffb02e' : '#55607a';
  for (const [x, y] of [
    [16, 16],
    [8, 30],
    [24, 30],
  ])
    c.fillRect(x, y, 10, 10);
  c.fillStyle = '#cfe6f5';
  c.fillText(gear > 0.98 ? 'GEAR DN' : gear > 0.02 ? 'GEAR' : 'GEAR UP', 40, 28);
  c.textAlign = 'right';
  c.fillText(s.ground ? 'TAXI' : 'FLY', w - 10, 18);
}

/* ---------- Building it ---------- */

/** A group with its own Batch built in */
function built(b: Batch, cast = false) {
  const g = new THREE.Group();
  b.build(g, { cast, receive: true });
  return g;
}
const cyl = (r: number, len: number, seg = 10) => new THREE.CylinderGeometry(r, r, len, seg).translate(0, len / 2, 0);

interface Needle {
  o: THREE.Object3D;
  kind: Gauge['kind'];
}

/** The cockpit for one of your aircraft, with its pilot */
export function createCockpit(id: PlaneId, outfit: Outfit, opts: { low: boolean; reduced: boolean }) {
  const k = COCKPITS[id];
  const group = new THREE.Group();
  group.name = `cockpit-${id}`;
  group.userData.keep = true;
  moving(group);

  // The cabin: the lining, the frames, the glass, the bulkhead, the floor and the well, the seat
  const lin = lining(k);
  const b = new Batch();
  b.add(lin.lining, LINING);
  b.add(lin.frame, FRAME);
  const back = sectionShape(k, k.liner[0], sectionAt(k.body, k.liner[0])[1] - sectionAt(k.body, k.liner[0])[0] * sectionAt(k.body, k.liner[0])[2], topAt(k));
  b.add(new THREE.ShapeGeometry(back.shape).rotateY(Math.PI / 2).translate(k.liner[0] + 0.005, 0, 0), FRAME);
  const floorHalf = sectionShape(k, (k.liner[0] + k.panel.x) / 2, k.floor, k.floor + 0.01).half(k.floor + 0.05);
  b.box(k.liner[0], k.floor - 0.03, -floorHalf, k.panel.x - k.liner[0], 0.03, floorHalf * 2, FLOOR);
  const wellHalf = sectionShape(k, k.well.x0, k.floor, k.well.y).half(k.well.y) - 0.03;
  b.box(k.well.x0, k.floor, -wellHalf, k.well.x1 - k.well.x0, k.well.y - k.floor, wellHalf * 2, FLOOR);
  const [sx, sy] = k.seat;
  const cushion = sy - 0.07;
  b.box(sx - 0.24, cushion - 0.09, -0.17, 0.34, 0.09, 0.34, SEAT);
  b.box(sx - 0.26, k.floor, -0.12, 0.3, cushion - 0.09 - k.floor, 0.24, FLOOR);
  b.add(new THREE.BoxGeometry(0.08, 0.5, 0.32).translate(0, 0.25, 0).rotateZ(0.18).translate(sx - 0.26, cushion, 0), SEAT_DARK);
  // The panel (its face on the cabin's section between its foot and the glare shield) and the shield over it
  const panel = sectionShape(k, k.panel.x, k.panel.y0, k.panel.y1, INSET + 0.01, k.panel.half);
  b.add(facingAft(new THREE.ShapeGeometry(panel.shape), k.panel.x), PANEL);
  const shieldHalf = panel.half(k.panel.y1) - 0.01;
  b.box(k.panel.x - k.panel.shield, k.panel.y1, -shieldHalf, k.panel.shield + 0.04, 0.035, shieldHalf * 2, SHIELD);
  // (a pedestal's sides, back to the face)
  if (k.panel.half) for (const e of [-1, 1]) b.box(k.panel.x, k.panel.y0, e > 0 ? k.panel.half - 0.02 : -k.panel.half, 0.16, k.panel.y1 - k.panel.y0, 0.02, PANEL);
  // Each lever's housing; the Neon Dart's side stick on its console; the yoke's column through the panel
  const l = k.lever;
  if (l.kind === 'quadrant') b.box(l.at[0] - 0.09, k.floor, l.at[2] - (l.twin ? 0.07 : 0.05), 0.18, l.at[1] - k.floor + 0.02, l.twin ? 0.14 : 0.1, PANEL);
  else b.box(l.at[0] - 0.08, k.floor, l.at[2] - 0.05, 0.14, l.at[1] - k.floor - 0.02, 0.1, PANEL);
  const s = k.stick;
  if (s.kind === 'stick') b.box(s.at[0] - 0.2, k.floor, s.at[2] - 0.06, 0.32, s.at[1] - k.floor, 0.12, PANEL);
  if (s.kind === 'cyclic') b.add(new THREE.CylinderGeometry(0.05, 0.07, 0.04, 12).translate(s.at[0], s.at[1] + 0.02, 0), SHIELD);
  // (the Sky Hopper's wing runs over the cabin: a headliner just under it)
  if (id === 'prop') {
    const w = PANELS.prop!.wing;
    const y = w.y - w.thick / 2 - 0.006;
    const half = sectionShape(k, 0.3, y - 0.01, y).half(y) - 0.01;
    b.box(w.outline[1][0], y - 0.012, -half, w.outline[0][0] - w.outline[1][0], 0.012, half * 2, LINING);
  }
  group.add(built(b));
  const glass = fx(new THREE.Mesh(lin.glass, glassMat()));
  glass.renderOrder = 2;
  group.add(glass);

  // The gauges: faces (lit), rims, needles and the moving cards
  const needles: Needle[] = [];
  let ball: { disc: THREE.Object3D; tex: THREE.Texture } | null = null;
  let card: THREE.Object3D | null = null;
  let turnSym: THREE.Object3D | null = null;
  let screens: Screens | null = null;
  const rims = new Batch();
  const x = k.panel.x - 0.006;
  const at = (g: Gauge, off: number) => new THREE.Vector3(x - off, g.y, g.z);
  for (const g of k.gauges) {
    if (g.kind === 'pfd' || g.kind === 'mfd') {
      const tex = liveTex(SW, SH, (c) => {
        c.fillStyle = '#05070d';
        c.fillRect(0, 0, SW, SH);
      });
      screens ??= { pfd: tex, mfd: tex };
      screens[g.kind] = tex;
      const m = new THREE.Mesh(facingAft(new THREE.PlaneGeometry(g.w!, g.h!), 0), faceMat(tex));
      m.position.copy(at(g, 0.004));
      group.add(m);
      rims.add(facingAft(new THREE.PlaneGeometry(g.w! + 0.02, g.h! + 0.02), 0).translate(x - 0.002, g.y, g.z), GRIP);
      continue;
    }
    rims.add(facingAft(new THREE.RingGeometry(g.r, g.r + 0.008, 24), 0).translate(x - 0.007, g.y, g.z), RIM);
    rims.add(facingAft(new THREE.CircleGeometry(g.r + 0.008, 24), 0).translate(x - 0.001, g.y, g.z), GAUGE_BACK);
    if (g.kind === 'attitude') {
      const tex = attitudeTex();
      tex.repeat.set(1, 0.5);
      tex.offset.set(0, 0.25);
      const disc = new THREE.Mesh(facingAft(new THREE.CircleGeometry(g.r, 24), 0), faceMat(tex));
      disc.position.copy(at(g, 0.004));
      group.add(disc);
      ball = { disc, tex };
      // (the aircraft's symbol over it, fixed)
      const sym = new THREE.Mesh(facingAft(new THREE.PlaneGeometry(g.r * 1.1, 0.006), 0), SYMBOL());
      sym.position.copy(at(g, 0.009));
      group.add(sym);
      continue;
    }
    if (g.kind === 'heading') {
      card = new THREE.Mesh(facingAft(new THREE.CircleGeometry(g.r, 24), 0), faceMat(headingTex()));
      card.position.copy(at(g, 0.004));
      group.add(card);
      const lubber = new THREE.Mesh(facingAft(new THREE.PlaneGeometry(0.004, 0.018), 0).translate(0, g.r - 0.012, 0), NEEDLE());
      lubber.position.copy(at(g, 0.009));
      group.add(lubber);
      continue;
    }
    const face = new THREE.Mesh(facingAft(new THREE.CircleGeometry(g.r, 24), 0), faceMat(dialTex(g.kind)));
    face.position.copy(at(g, 0.004));
    group.add(face);
    const pivot = new THREE.Group();
    pivot.position.copy(at(g, 0.009));
    if (g.kind === 'turn') {
      // (a little aircraft that banks with the turn)
      const sym = new THREE.Mesh(
        facingAft(new THREE.PlaneGeometry(g.r * 1.3, 0.008), 0).translate(0, 0, 0),
        SYMBOL()
      );
      pivot.add(sym);
      const fin = new THREE.Mesh(facingAft(new THREE.PlaneGeometry(0.006, 0.02), 0).translate(0, 0.012, 0), SYMBOL());
      pivot.add(fin);
      turnSym = pivot;
    } else {
      const needle = new THREE.Mesh(facingAft(new THREE.PlaneGeometry(0.005, g.r * 0.85), 0).translate(0, g.r * 0.36, 0), NEEDLE());
      pivot.add(needle);
      pivot.rotation.x = g.kind === 'altitude' ? 0 : -REST;
      needles.push({ o: pivot, kind: g.kind });
    }
    group.add(pivot);
  }
  group.add(built(rims));

  // The controls, each its own group so it moves
  const stick = new THREE.Group();
  let yokeWheel: THREE.Group | null = null;
  if (s.kind === 'yoke') {
    // The column forward into the panel, the wheel on its hub (its horns turning about the column)
    const col = new Batch();
    col.add(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 10).rotateZ(-Math.PI / 2).translate(0.25, 0, 0), METAL);
    stick.add(built(col));
    const wb = new Batch();
    wb.add(new THREE.BoxGeometry(0.03, 0.035, 0.26), GRIP);
    for (const z of [-0.12, 0.12]) wb.add(new THREE.CylinderGeometry(0.016, 0.016, 0.09, 10).translate(0, 0.03, z), GRIP);
    wb.add(new THREE.BoxGeometry(0.035, 0.05, 0.06), METAL);
    yokeWheel = built(wb);
    stick.add(yokeWheel);
  } else {
    const sb = new Batch();
    sb.add(cyl(0.012, s.len - 0.04), METAL);
    sb.add(new THREE.CapsuleGeometry(0.02, 0.06, 4, 10).translate(0, s.len - 0.01, 0), GRIP);
    stick.add(built(sb));
    stick.position.set(...s.at);
  }
  group.add(stick);
  const levers: THREE.Group[] = [];
  const leverZ = l.kind === 'quadrant' && l.twin ? [l.at[2] - 0.025, l.at[2] + 0.025] : [l.at[2]];
  for (const z of leverZ) {
    const lb = new Batch();
    if (l.kind === 'quadrant') {
      lb.add(cyl(0.008, l.len), METAL);
      lb.add(new THREE.BoxGeometry(0.035, 0.025, 0.028).translate(0, l.len, 0), id === 'prop' ? GRIP : KNOB);
    } else {
      // The collective: an arm forward from its pivot, its twist grip at the end
      lb.add(new THREE.CylinderGeometry(0.014, 0.014, l.len, 10).rotateZ(-Math.PI / 2).translate(l.len / 2, 0, 0), METAL);
      lb.add(new THREE.CylinderGeometry(0.022, 0.022, 0.09, 10).rotateZ(-Math.PI / 2).translate(l.len - 0.03, 0, 0), GRIP);
    }
    const lever = built(lb);
    lever.position.set(l.at[0], l.at[1], z);
    group.add(lever);
    levers.push(lever);
  }
  // The pedals (their faces just ahead of his ankles)
  const pedals = [1, -1].map(() => {
    const pb = new Batch();
    pb.add(new THREE.BoxGeometry(0.02, 0.09, 0.06).rotateZ(-0.35).translate(0.05, -0.03, 0), METAL);
    const p = built(pb);
    group.add(p);
    return p;
  });
  // The Neon Dart's gear lever (its wheel-shaped knob down with the gear, its three lights) and flaps' lever
  let gearLever: THREE.Group | null = null;
  let flapLever: THREE.Group | null = null;
  const gearLights: THREE.Mesh[] = [];
  const GREEN = neon('#2bd97a', 0.5, 1);
  const DARK = toon('#2a3040');
  if (id === 'bizjet') {
    const gb = new Batch();
    gb.add(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 8).rotateZ(Math.PI / 2).translate(-0.035, 0, 0), METAL);
    gb.add(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 14).translate(-0.07, 0, 0), KNOB);
    gearLever = built(gb);
    gearLever.position.set(k.panel.x - 0.004, 1.2, -0.42);
    group.add(gearLever);
    for (let i = 0; i < 3; i++) {
      const lamp = new THREE.Mesh(facingAft(new THREE.PlaneGeometry(0.014, 0.014), 0), DARK);
      lamp.position.set(k.panel.x - 0.005, 1.27 + (i === 0 ? 0.02 : 0), -0.42 + (i - 1) * 0.022);
      group.add(lamp);
      gearLights.push(lamp);
    }
    const fb = new Batch();
    fb.add(cyl(0.006, 0.09), METAL);
    fb.add(new THREE.BoxGeometry(0.02, 0.012, 0.03).translate(0, 0.09, 0), KNOB);
    flapLever = built(fb);
    flapLever.position.set(l.at[0] - 0.06, l.at[1], l.at[2] - 0.075);
    group.add(flapLever);
  }

  // The Whirlybird's rotor shadow, over the panel and the floor
  let shade: THREE.MeshBasicMaterial | null = null;
  if (id === 'heli' && !opts.reduced) {
    shade = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0, depthWrite: false, name: 'cockpit-shade' });
    const over = fx(new THREE.Mesh(facingAft(new THREE.ShapeGeometry(panel.shape), k.panel.x - 0.012), shade));
    over.renderOrder = 3;
    const floor = fx(new THREE.Mesh(new THREE.PlaneGeometry(k.panel.x - k.liner[0], floorHalf * 2).rotateX(-Math.PI / 2).translate((k.panel.x + k.liner[0]) / 2, k.well.y + 0.004, 0), shade));
    floor.renderOrder = 3;
    group.add(over, floor);
  }

  // The pilot: walk mode's Degen, seated
  let pilot: Degen | null = createDegen(outfit);
  pilot.g.rotation.set(0, Math.PI / 2, 0);
  pilot.g.scale.setScalar(PILOT_SCALE);
  pilot.g.position.copy(pilotRoot(id));
  if (pilot.held) pilot.held.visible = false;
  group.add(pilot.g);

  const eye = seatEye('plane');
  const nobody = new THREE.Vector3(k.seat[0] + 0.09, k.seat[1] + 0.5, 0);
  let gear = 1;
  let screenT = 0;
  const Q1 = new THREE.Quaternion();
  const Q2 = new THREE.Quaternion();
  const AX = new THREE.Vector3(1, 0, 0);
  const AZ = new THREE.Vector3(0, 0, 1);

  return {
    id,
    group,
    /** From his eyes (cockpits.ts `view`) and his size, for fly.ts, which keeps the numbers out of the boot */
    view: k.view,
    /** His own eyes (seateye.ts): `pos` and `at` set, the eye's motion returned; `eyeOff()` gives him his head back */
    look(pos: THREE.Vector3, at: THREE.Vector3, yaw: number, pitch: number, dt: number, st: FlyState) {
      return eye.look(group, pilot, PILOT_SCALE, nobody, pos, at, yaw, pitch, dt, { speed: st.speed, yawRate: st.yawRate }, k.view.down);
    },
    eyeOff() {
      eye.off();
    },
    get pilot() {
      return pilot;
    },
    /**
     * One frame: the controls where the input has them, the pilot's hands and feet on them, the gauges reading the
     * sim; `alt` the height over the ground (m), `kmh` the ground speed, `sun` 0..1 (the rotor's shadow by day)
     */
    update(st: FlyState, c: Controls, dt: number, t: number, read: { alt: number; kmh: number; top: number; climb: number; sun: number }, look = 0) {
      gear = c.gear;
      const ctl = controlsOf(id, c);
      if (yokeWheel && ctl.hub) {
        stick.position.copy(ctl.hub);
        yokeWheel.rotation.x = ctl.roll;
      } else {
        // (tilted as controlsOf() tilts the grip: about z for the pitch, then about x for the turn)
        const pitch = s.kind === 'cyclic' ? -c.fore * s.travel : c.climb * s.travel;
        stick.quaternion.copy(Q1.setFromAxisAngle(AX, c.turn * s.travel)).multiply(Q2.setFromAxisAngle(AZ, pitch));
      }
      for (const lv of levers) lv.rotation.z = l.kind === 'quadrant' ? -ctl.angle : ctl.angle;
      const feet = feetOf(id, c);
      pedals.forEach((p, i) => p.position.copy(feet[i]));
      if (gearLever) gearLever.rotation.z = gear > 0.5 ? 0.5 : -0.5;
      if (flapLever) flapLever.rotation.z = gear * 0.5;
      for (const lamp of gearLights) lamp.material = gear > 0.98 ? GREEN : DARK;
      if (pilot) {
        pilotPose(pilot.pose, id, c, look);
        pilot.update();
      }
      // The gauges
      const k01 = (v: number) => THREE.MathUtils.clamp(v, 0, 1);
      for (const n of needles) {
        let a = 0;
        if (n.kind === 'speed') a = -REST + k01(read.kmh / (read.top * 1.15)) * REST * 2;
        else if (n.kind === 'revs') a = -REST + k01(st.spool) * REST * 2;
        else if (n.kind === 'climb') a = -Math.PI / 2 + THREE.MathUtils.clamp(st.vy / Math.max(1, read.climb), -1, 1) * 2.2;
        else if (n.kind === 'altitude') a = (read.alt / 100) * Math.PI * 2;
        n.o.rotation.x += (a - n.o.rotation.x) * Math.min(1, dt * 8);
      }
      if (ball) {
        ball.disc.rotation.x = -st.roll;
        // (nose up: more sky, the horizon lower)
        ball.tex.offset.y = 0.25 + THREE.MathUtils.clamp(st.pitch * 0.6, -0.24, 0.24);
      }
      // (the heading, 0 north and clockwise, at the top: the card turned back by it)
      if (card) card.rotation.x = st.yaw - Math.PI / 2;
      if (turnSym) turnSym.rotation.x += (THREE.MathUtils.clamp(-st.yawRate * 0.5, -0.5, 0.5) - turnSym.rotation.x) * Math.min(1, dt * 6);
      // The Neon Dart's screens, ten times a second
      screenT -= dt;
      if (screens && screenT <= 0) {
        screenT = 0.1;
        const pc = (screens.pfd.image as HTMLCanvasElement).getContext('2d');
        const mc = (screens.mfd.image as HTMLCanvasElement).getContext('2d');
        if (pc) {
          pc.setTransform((screens.pfd.image as HTMLCanvasElement).width / SW, 0, 0, (screens.pfd.image as HTMLCanvasElement).height / SH, 0, 0);
          drawPfd(pc, st, read.alt, read.kmh);
          screens.pfd.needsUpdate = true;
        }
        if (mc) {
          mc.setTransform((screens.mfd.image as HTMLCanvasElement).width / SW, 0, 0, (screens.mfd.image as HTMLCanvasElement).height / SH, 0, 0);
          drawMfd(mc, st, gear);
          screens.mfd.needsUpdate = true;
        }
      }
      // The rotor's shadow: its four blades passing over, beating slowly against the frame rate
      if (shade) shade.opacity = st.spool > 0.3 ? read.sun * 0.16 * Math.max(0, Math.sin(t * 7.3)) ** 3 : 0;
    },
    dispose() {
      eye.off();
      group.removeFromParent();
      if (pilot) {
        pilot.g.removeFromParent();
        pilot.dispose();
        pilot = null;
      }
      group.traverse((o) => {
        if (o instanceof THREE.Mesh && !(o.material as THREE.Material).userData?.shared) o.geometry.dispose();
      });
    },
  };
}
export type CockpitView = ReturnType<typeof createCockpit>;

/** The body's top over the lining's back end (for the bulkhead's outline) */
function topAt(k: Cockpit) {
  const [r, cy, sy] = sectionAt(k.body, k.liner[0]);
  return cy + r * sy;
}
