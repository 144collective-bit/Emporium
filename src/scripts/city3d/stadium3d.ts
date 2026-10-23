/*
 * Sector 7 Stadium on screen (Westlake Park's step 2; the numbers are
 * stadium.ts). A place like the landmarks, built at the boot: a spot with a
 * pin, a panel and a far form (lod.ts), standing on the park's big block.
 *
 * - The facade: dark panels between pale ribs, a cyan line round its top
 *   and the gate in the middle of its south side, SECTOR 7 STADIUM over it.
 * - Inside, the stands step down to the track in two tiers with the
 *   concourse between, their seats in sections of magenta, purple and cyan;
 *   the pitch striped in two greens with its lines, the running track
 *   round it.
 * - The roof ring over the upper tier, held off the facade on short posts,
 *   a lit line round its inner edge.
 * - Four floodlight masts outside the corners, their lamps aimed at the
 *   pitch (lit at night), and the big screen on the north side's roof.
 * - A paved apron round it all, the forecourt in front; the car park's cars
 *   (its surface is the park's, westlake3d.ts).
 *
 * The signs are one small atlas of fixed made-up copy. Nothing here is
 * solid (`STADIUM_SOLIDS` is).
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, FONT_MONO, PAL, canvasTex, fx, glowMat, lit, neon, toon } from './kit';
import { SLAB } from './world';
import { parkedCars, type CarId } from './cars';
import type { Spot } from './landmarks';
import { CENTRE, CONCOURSE, FACADE, GATE, MAST, MASTS, NAME, PARKED, PITCH, ROOF, SCREEN, TIERS, TRACK, ovalAt, type Pt } from './stadium';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** Points round each oval: enough that its corners read round */
const N = 96;
const SEATS = ['#e219e5', '#8000ff', '#00c2ff'].map((c) => toon(c));
const CONCRETE = toon('#7d7898');
const DARK = toon('#2a2440');
const RIB = toon('#c9c4e6');
const ROOF_TOP = toon('#e8e6f4');
const ROOF_UNDER = toon('#4a4466');
const IRON = toon('#1b1830');
const APRON = toon('#5e5a78');
const TRACK_RED = toon('#a8473a');
const GRASS = [toon('#2f9a4f'), toon('#278a45')];
const LINE = toon('#f2f0fa');

const at = (a: number, b: number, k: number) => ovalAt(a, b, (2 * Math.PI * k) / N);

/** A flat ring between two ovals at height y (or sloping from y0 at the inner to y1 at the outer), facing up (or down) */
function ring(a0: number, b0: number, a1: number, b1: number, y0: number, y1 = y0, down = false, from = 0, to = N) {
  const pos: number[] = [];
  for (let k = from; k < to; k++) {
    const [p, q] = [at(a0, b0, k), at(a0, b0, k + 1)];
    const [r, s] = [at(a1, b1, k + 1), at(a1, b1, k)];
    const tri = (A: Pt, ya: number, B: Pt, yb: number, C: Pt, yc: number) => {
      // Wound to face up (or down) whichever way round the oval goes
      const up = (B[1] - A[1]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[1] - A[1]) > 0;
      const order = up !== down ? [A, ya, B, yb, C, yc] : [A, ya, C, yc, B, yb];
      for (let i = 0; i < 6; i += 2) pos.push((order[i] as Pt)[0], order[i + 1] as number, (order[i] as Pt)[1]);
    };
    tri(p, y0, q, y0, r, y1);
    tri(p, y0, r, y1, s, y1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** An upright band along an oval from y0 to y1, facing in (towards the middle) or out */
function band(a: number, b: number, y0: number, y1: number, inward: boolean, from = 0, to = N) {
  const pos: number[] = [];
  for (let k = from; k < to; k++) {
    const [p, q] = [at(a, b, k), at(a, b, k + 1)];
    const quad = [
      [p[0], y0, p[1]],
      [q[0], y0, q[1]],
      [q[0], y1, q[1]],
      [p[0], y1, p[1]],
    ];
    // Wound 0-1-2 it faces (-ez, ex): turned round if that's not the way it should face
    const [ex, ez] = [q[0] - p[0], q[1] - p[1]];
    const towards = -ez * (CENTRE[0] - p[0]) + ex * (CENTRE[1] - p[1]) > 0;
    for (const i of towards === inward ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]) pos.push(...quad[i]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** The name over the gate and the big screen's picture: one small atlas, a row each */
function signs() {
  const tex = canvasTex(1024, 512, (c) => {
    // Row 0: the name, white over a dark board with a cyan glow
    c.fillStyle = '#0b0a18';
    c.fillRect(0, 0, 1024, 256);
    c.font = `900 150px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.shadowColor = PAL.cyan;
    c.shadowBlur = 26;
    c.fillStyle = '#e9fbff';
    c.fillText(NAME, 512, 136);
    c.shadowBlur = 0;
    // Row 1: the screen, the city's name and what's on
    const g = c.createLinearGradient(0, 256, 1024, 512);
    g.addColorStop(0, '#2b0a4a');
    g.addColorStop(1, '#0a2a4a');
    c.fillStyle = g;
    c.fillRect(0, 256, 1024, 256);
    c.fillStyle = '#ffffff';
    c.font = `900 120px ${FONT_DISPLAY}`;
    c.fillText('SECTOR 7', 512, 350);
    c.fillStyle = '#7cf3ff';
    c.font = `700 52px ${FONT_MONO}`;
    c.fillText('EVENTS COMING SOON', 512, 450);
  });
  return lit(new THREE.MeshBasicMaterial({ map: tex, toneMapped: true }), 0.95, 1.2);
}
/** A plane showing one row of the atlas (0 the name, 1 the screen) */
function rowPlane(w: number, h: number, row: 0 | 1) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, row === 0 ? 0.5 + uv.getY(i) * 0.5 : uv.getY(i) * 0.5);
  return g;
}

export function buildStadium(scene: THREE.Scene, opts: { low: boolean }): { spot: Spot } {
  const group = new THREE.Group();
  group.name = 'stadium';
  scene.add(group);
  const b = new Batch();
  const S = SLAB;

  // The apron round it all, over the lawn (and clear of the forecourt path's height)
  b.add(ring(FACADE.a, FACADE.b, FACADE.a + 3.2, FACADE.b + 3.2, S + 0.018), APRON);

  // The facade: dark between pale ribs, a band at the top, the gate cut in on the south
  const gateK = N / 4;
  const gateSpan = 3;
  b.add(band(FACADE.a, FACADE.b, S, FACADE.h, false, 0, gateK - gateSpan), DARK);
  b.add(band(FACADE.a, FACADE.b, S, FACADE.h, false, gateK + gateSpan, N), DARK);
  // (over the gate, the wall above its opening)
  b.add(band(FACADE.a, FACADE.b, S + GATE.h, FACADE.h, false, gateK - gateSpan, gateK + gateSpan), DARK);
  b.add(band(FACADE.a - 0.6, FACADE.b - 0.6, S, FACADE.h, true), DARK);
  b.add(ring(FACADE.a - 0.6, FACADE.b - 0.6, FACADE.a, FACADE.b, FACADE.h), RIB);
  for (let k = 0; k < N; k += 4) {
    if (Math.abs(k - gateK) <= gateSpan) continue;
    const [x, z] = at(FACADE.a + 0.12, FACADE.b + 0.12, k);
    b.box(x - 0.18, S, z - 0.18, 0.36, FACADE.h - S + 0.1, 0.36, RIB);
  }
  // The gate: a dark recess with shutters, lit round its frame
  const gw = GATE.w;
  b.box(GATE.x - gw / 2, S, GATE.z - 0.9, gw, GATE.h, 0.3, toon('#141221'));
  for (let i = 0; i < 4; i++) b.box(GATE.x - gw / 2 + 0.15 + i * ((gw - 0.3) / 4), S, GATE.z - 0.62, (gw - 0.3) / 4 - 0.1, GATE.h - 0.25, 0.08, toon('#3b3656'));
  b.box(GATE.x - gw / 2 - 0.2, S + GATE.h, GATE.z - 0.2, gw + 0.4, 0.12, 0.3, neon(PAL.cyan, 0.7, 1.8));
  for (const sx of [-1, 1]) b.box(GATE.x + sx * (gw / 2 + 0.1) - 0.06, S, GATE.z - 0.2, 0.12, GATE.h, 0.3, neon(PAL.cyan, 0.7, 1.8));
  // The cyan line round the top
  b.add(ring(FACADE.a + 0.02, FACADE.b + 0.02, FACADE.a + 0.14, FACADE.b + 0.14, FACADE.h - 0.4), neon(PAL.cyan, 0.6, 2.0));
  b.add(band(FACADE.a + 0.14, FACADE.b + 0.14, FACADE.h - 0.52, FACADE.h - 0.4, false), neon(PAL.cyan, 0.6, 2.0));

  // The stands: each step a riser and a tread, the seats in sections round the bowl
  const sections = 24;
  const seatOf = (k: number) => SEATS[Math.floor((k / N) * sections) % SEATS.length];
  for (const t of TIERS)
    for (let s = 0; s < t.steps; s++) {
      const a0 = t.a + s * t.depth;
      const b0 = t.b + s * t.depth;
      const y0 = S + t.y + s * t.rise;
      b.add(band(a0, b0, s === 0 ? S : y0 - t.rise, y0 + t.rise, true), CONCRETE);
      for (let k = 0; k < N; k += N / sections) b.add(ring(a0, b0, a0 + t.depth, b0 + t.depth, y0 + t.rise, y0 + t.rise, false, k, k + N / sections), seatOf(k));
    }
  // The concourse between the tiers, the walk behind the upper tier, and the wall up to the upper tier's front
  b.add(ring(CONCOURSE.a0, CONCOURSE.b0, CONCOURSE.a1, CONCOURSE.b1, S + CONCOURSE.y + 0.004), CONCRETE);
  b.add(band(CONCOURSE.a1, CONCOURSE.b1, S + CONCOURSE.y, S + TIERS[1].y, true), CONCRETE);
  const top = TIERS[1];
  b.add(ring(top.a + top.steps * top.depth, top.b + top.steps * top.depth, FACADE.a - 0.6, FACADE.b - 0.6, S + top.y + top.steps * top.rise + 0.004), CONCRETE);

  // The track and the pitch: stripes, then the lines
  b.add(ring(TRACK.a - 2.6, TRACK.b - 2.6, TRACK.a + 0.4, TRACK.b + 0.4, S + 0.012), TRACK_RED);
  const stripes = 12;
  for (let i = 0; i < stripes; i++)
    b.box(CENTRE[0] - PITCH.hx + (i * 2 * PITCH.hx) / stripes, S, CENTRE[1] - PITCH.hz, (2 * PITCH.hx) / stripes, 0.02, 2 * PITCH.hz, GRASS[i % 2]);
  b.detail(() => {
    const y = S + 0.026;
    const w = 0.12;
    const [cx, cz] = CENTRE;
    const flat = (x0: number, z0: number, x1: number, z1: number) => b.add(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2), LINE);
    const { hx, hz } = PITCH;
    flat(cx - hx, cz - hz, cx + hx, cz - hz + w);
    flat(cx - hx, cz + hz - w, cx + hx, cz + hz);
    flat(cx - hx, cz - hz, cx - hx + w, cz + hz);
    flat(cx + hx - w, cz - hz, cx + hx, cz + hz);
    flat(cx - w / 2, cz - hz, cx + w / 2, cz + hz);
    b.add(new THREE.RingGeometry(2.6, 2.6 + w, 40).rotateX(-Math.PI / 2).translate(cx, y, cz), LINE);
    // The boxes at each end
    for (const sx of [-1, 1]) {
      const x0 = cx + sx * hx;
      const x1 = cx + sx * (hx - 4.2);
      flat(Math.min(x0, x1), cz - 5, Math.max(x0, x1), cz - 5 + w);
      flat(Math.min(x0, x1), cz + 5 - w, Math.max(x0, x1), cz + 5);
      flat(x1 - w / 2, cz - 5, x1 + w / 2, cz + 5);
      // The goal
      const gx = cx + sx * (hx + 0.5);
      b.box(gx - 0.05, S, cz - 1.9, 0.1, 1.2, 0.1, LINE);
      b.box(gx - 0.05, S, cz + 1.8, 0.1, 1.2, 0.1, LINE);
      b.box(gx - 0.05, S + 1.1, cz - 1.9, 0.1, 0.1, 3.8, LINE);
    }
  });

  // The roof ring: its top and underside, posts off the facade, a lit inner edge
  b.add(ring(ROOF.a0, ROOF.b0, ROOF.a1, ROOF.b1, S + ROOF.y0, S + ROOF.y1), ROOF_TOP);
  b.add(ring(ROOF.a0, ROOF.b0, ROOF.a1, ROOF.b1, S + ROOF.y0 - 0.25, S + ROOF.y1 - 0.25, true), ROOF_UNDER);
  b.add(band(ROOF.a0, ROOF.b0, S + ROOF.y0 - 0.25, S + ROOF.y0, true), ROOF_UNDER);
  b.add(band(ROOF.a1, ROOF.b1, S + ROOF.y1 - 0.25, S + ROOF.y1, false), ROOF_UNDER);
  b.add(band(ROOF.a0 - 0.02, ROOF.b0 - 0.02, S + ROOF.y0 - 0.32, S + ROOF.y0 - 0.22, true), neon(PAL.cyan, 0.5, 1.6));
  for (let k = 2; k < N; k += 8) {
    const [x, z] = at(FACADE.a - 0.3, FACADE.b - 0.3, k);
    b.box(x - 0.14, S + FACADE.h, z - 0.14, 0.28, ROOF.y1 - FACADE.h - 0.2, 0.28, IRON);
  }

  // The floodlights: a mast each, a platform and a bank of lamps facing the pitch
  for (const m of MASTS) {
    b.add(new THREE.CylinderGeometry(MAST.r * 0.7, MAST.r, MAST.h, opts.low ? 6 : 10).translate(m.x, S + MAST.h / 2, m.z), toon('#d9d6ec'));
    const ry = Math.atan2(CENTRE[0] - m.x, CENTRE[1] - m.z);
    const head = (w: number, h: number, d: number, y: number, along: number, mat: THREE.Material) =>
      b.add(new THREE.BoxGeometry(w, h, d).translate(0, y, along).rotateY(ry).translate(m.x, S, m.z), mat);
    head(MAST.head.w + 0.3, 0.12, 1.2, MAST.h - 0.1, 0.2, IRON);
    head(MAST.head.w, MAST.head.h, 0.3, MAST.h + MAST.head.h / 2, 0.45, IRON);
    // (the lamps: a grid of small ones on the front, lit at night)
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 2; j++)
        head(0.5, 0.42, 0.06, MAST.h + 0.2 + j * 0.52 + 0.21, 0.63, neon('#fff6d8', 0.4, 2.4));
  }

  // The screen on the north roof, facing the pitch, on two legs; its back plain
  const sign = signs();
  b.box(SCREEN.x - SCREEN.w / 2 - 0.2, S + SCREEN.y - 0.2, SCREEN.z - 0.35, SCREEN.w + 0.4, SCREEN.h + 0.4, 0.3, IRON);
  for (const sx of [-1, 1]) b.box(SCREEN.x + sx * (SCREEN.w / 2 - 1) - 0.15, S + ROOF.y1 - 0.1, SCREEN.z - 0.3, 0.3, SCREEN.y - ROOF.y1 + 0.2, 0.3, IRON);
  b.add(rowPlane(SCREEN.w, SCREEN.h, 1).translate(SCREEN.x, S + SCREEN.y + SCREEN.h / 2, SCREEN.z - 0.045), sign);
  // The name over the gate, on a board standing proud of the facade
  const nw = 9;
  const nh = nw / 4;
  b.box(GATE.x - nw / 2 - 0.1, S + GATE.h + 0.5, GATE.z + 0.05, nw + 0.2, nh + 0.2, 0.2, IRON);
  b.add(rowPlane(nw, nh, 0).translate(GATE.x, S + GATE.h + 0.6 + nh / 2, GATE.z + 0.257), sign);

  b.build(group);

  // The hover ring round it
  const ringMesh = new THREE.Mesh(new THREE.RingGeometry(FACADE.a + 3.6, FACADE.a + 3.9, 96), glowMat(PAL.cyan, 0, null));
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.scale.set(1, FACADE.b / FACADE.a, 1);
  ringMesh.position.set(CENTRE[0], S + 0.05, CENTRE[1]);
  group.add(fx(ringMesh));

  // The car park's cars (its surface is the park's: westlake3d.ts)
  parkedCars(scene, S, PARKED as [CarId, number, number, number, string][]);

  return { spot: { id: 'stadium', group, focus: V(CENTRE[0], 4, CENTRE[1]), size: 62, pin: V(CENTRE[0], S + ROOF.y1 + 3.6, CENTRE[1]), ring: ringMesh } };
}
