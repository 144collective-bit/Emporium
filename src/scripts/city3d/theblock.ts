/*
 * The Block on screen (growth plan Phase 9 step 2; the numbers are
 * `THE_BLOCK` in projects.ts): the courtyard at the heart of The Trenches,
 * where the storyline will start. A place like the Fight Club (spot
 * `trenches`, its pin over the court, a panel with Walk in), built at the
 * boot:
 *
 * - the plaza by the metro station's stair tower, paved, with the name over
 *   it on a gantry;
 * - the basketball court: its lines, two hoops, a chain-link fence (a gate
 *   in each long side) and benches along it for whoever's next;
 * - the playground on its soft ground: a climbing frame with a slide,
 *   swings, a see-saw;
 * - the handball wall, painted, with a game on;
 * - the community garden's raised beds, picnic tables, trees, lamps and
 *   string lights between poles over all of it at night;
 * - its people: players on the court, people on the benches, at the
 *   tables, in the garden and chatting by the station.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, PAL, canvasTex, fx, glowMat, glowTex, lit, neon, occlude, toon } from './kit';
import { SLAB as S, addLamp, addPool, addTree, type Tick } from './world';
import { THE_BLOCK, blockFence } from './projects';
import type { Idle, Spot } from './landmarks';
import type { Pt, Rect } from './downtown';

const INK = toon('#1b1830');
const METAL = toon('#2a2b38');
const WOOD = toon('#8a5a3c');
const STONE = toon('#8f8ab0');
const CREAM = toon('#e8e2f0');
const SEAT = S + 0.3;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: THREE.Material) => b.box(x0, y0, z0, x1 - x0, y1 - y0, z1 - z0, mat);
const cyl = (b: Batch, r: number, h: number, x: number, y: number, z: number, mat: THREE.Material, seg = 8) => b.add(new THREE.CylinderGeometry(r, r, h, seg).translate(x, y + h / 2, z), mat);
/** A flat rectangle of ground a little over the slab (each kind at its own height: never flush) */
const flat = (b: Batch, [x0, z0, x1, z1]: Rect, y: number, mat: THREE.Material) => b.add(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, S + y, (z0 + z1) / 2), mat);

/** A bench, the sitter facing `ry` (0 is +z), the seat at SEAT */
function bench(b: Batch, [x, z]: Pt, ry: number) {
  const g = (w: number, h: number, d: number, px: number, py: number, pz: number) => new THREE.BoxGeometry(w, h, d).translate(px, py + h / 2, pz).rotateY(ry).translate(x, S, z);
  b.add(g(1.3, 0.06, 0.32, 0, 0.24, 0), WOOD);
  b.add(g(1.3, 0.3, 0.05, 0, 0.32, -0.16), WOOD);
  for (const sx of [-0.55, 0.55]) b.add(g(0.05, 0.26, 0.3, sx, 0, 0), INK);
}

/** The chain-link: a diamond mesh with its wire showing (the fence is see-through, so it's drawn in the FX layer) */
const meshTex = canvasTex(64, 64, (c) => {
  c.clearRect(0, 0, 64, 64);
  c.strokeStyle = 'rgba(255,255,255,0.95)';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(64, 64);
  c.moveTo(64, 0);
  c.lineTo(0, 64);
  c.stroke();
});
meshTex.wrapS = meshTex.wrapT = THREE.RepeatWrapping;

/** The name over the plaza: THE BLOCK in neon on a dark board */
const nameTex = canvasTex(1024, 256, (c) => {
  c.clearRect(0, 0, 1024, 256);
  c.fillStyle = '#0b0a18';
  c.fillRect(40, 30, 944, 196);
  c.strokeStyle = PAL.magenta;
  c.lineWidth = 10;
  c.strokeRect(52, 42, 920, 172);
  c.font = `900 150px ${FONT_DISPLAY}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.shadowColor = PAL.cyan;
  c.shadowBlur = 24;
  c.fillStyle = '#c8fbff';
  c.fillText('THE BLOCK', 512, 136);
});

/** The handball wall's mural (made-up words only) */
const wallTex = canvasTex(512, 256, (c) => {
  const g = c.createLinearGradient(0, 0, 512, 0);
  g.addColorStop(0, '#8000ff');
  g.addColorStop(0.5, '#e219e5');
  g.addColorStop(1, '#ff6a2f');
  c.fillStyle = g;
  c.fillRect(0, 0, 512, 256);
  c.fillStyle = 'rgba(11,10,24,0.35)';
  for (let i = 0; i < 8; i++) c.fillRect(0, 150 + i * 14, 512, 6);
  c.save();
  c.translate(256, 110);
  c.rotate(-0.06);
  c.font = `900 96px ${FONT_DISPLAY}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = 16;
  c.strokeStyle = PAL.ink;
  c.strokeText('TRENCH LIFE', 0, 0);
  c.fillStyle = '#ffd23f';
  c.fillText('TRENCH LIFE', 0, 0);
  c.restore();
  // The line a ball has to land over, in paint
  c.fillStyle = '#ffffff';
  c.fillRect(0, 196, 512, 6);
});

export function buildTheBlock(scene: THREE.Scene, crowd: Idle[], opts: { tick: (f: Tick) => void; reduced: boolean; low: boolean }): { spot: Spot } {
  const B = THE_BLOCK;
  const [X0, Z0, X1, Z1] = B.rect;
  const group = new THREE.Group();
  group.name = 'trenches';
  scene.add(group);
  const b = new Batch();
  const low = opts.low;

  /* ----- The ground: paving over the courtyard, the plaza a shade lighter, paths ----- */
  const paving = toon('#6c6794');
  flat(b, [X0 + 0.5, Z0 + 0.5, X1 - 0.5, Z1 - 0.5], 0.012, paving);
  flat(b, B.plaza, 0.018, toon('#837eab'));
  // Grass round the garden and the playground's edge
  flat(b, [X0 + 1.5, Z1 - 8.5, X0 + 14, Z1 - 1.5], 0.018, toon('#3f8a55'));

  /* ----- The court ----- */
  const [c0, cz0, c1, cz1] = B.court;
  const [cx, cz] = [(c0 + c1) / 2, (cz0 + cz1) / 2];
  flat(b, [c0 - 0.4, cz0 - 0.4, c1 + 0.4, cz1 + 0.4], 0.018, toon('#2d4a8a'));
  flat(b, [c0 + 0.8, cz0 + 0.8, c1 - 0.8, cz1 - 0.8], 0.024, toon('#3a62b0'));
  // Lines: the edge, half way, the circle, the keys and the arcs
  const line = CREAM;
  const L = 0.07;
  const ly = S + 0.037;
  for (const [x0, z0, x1, z1] of [
    [c0, cz0, c1, cz0 + L],
    [c0, cz1 - L, c1, cz1],
    [c0, cz0, c0 + L, cz1],
    [c1 - L, cz0, c1, cz1],
    [c0, cz - L / 2, c1, cz + L / 2],
  ] as Rect[])
    box(b, x0, ly - 0.004, z0, x1, ly, z1, line);
  b.add(new THREE.RingGeometry(1.1, 1.1 + L, 32).rotateX(-Math.PI / 2).translate(cx, ly, cz), line);
  for (const e of [-1, 1]) {
    const base = e < 0 ? cz0 : cz1;
    const key: Rect = [cx - 1.2, Math.min(base, base - e * 3.6), cx + 1.2, Math.max(base, base - e * 3.6)];
    flat(b, key, 0.03, toon('#e219e5'));
    // The three-point arc
    const arc = new THREE.RingGeometry(3.9, 3.9 + L, 32, 1, e < 0 ? Math.PI : 0, Math.PI).rotateX(-Math.PI / 2);
    b.add(arc.translate(cx, ly, base - e * 0.9), line);
    // The hoop: a padded pole outside the line, the arm, the backboard, the rim and its net
    const pz = base + e * 0.55;
    cyl(b, 0.08, 2.9, cx, S, pz, METAL);
    box(b, cx - 0.12, S, pz - 0.12, cx + 0.12, S + 1.2, pz + 0.12, toon('#e23b3b'));
    box(b, cx - 0.05, S + 2.8, Math.min(pz, pz - e * 0.6), cx + 0.05, S + 2.88, Math.max(pz, pz - e * 0.6), METAL);
    const bz = pz - e * 0.6;
    box(b, cx - 0.9, S + 2.45, bz - 0.04, cx + 0.9, S + 3.5, bz + 0.04, CREAM);
    box(b, cx - 0.3, S + 2.62, bz - e * 0.05 - 0.004, cx + 0.3, S + 2.66, bz - e * 0.05 + 0.004, toon('#e23b3b'));
    const rz = bz - e * 0.32;
    b.add(new THREE.TorusGeometry(0.23, 0.02, 6, 20).rotateX(Math.PI / 2).translate(cx, S + 2.62, rz), toon('#ff6a2f'));
    b.detail(() => b.add(new THREE.CylinderGeometry(0.23, 0.15, 0.4, 12, 1, true).translate(cx, S + 2.42, rz), CREAM));
  }

  /* ----- The fence: posts, a top rail and the chain-link ----- */
  const [f0, fz0, f1, fz1] = B.fence;
  const H = B.fenceH;
  const posts: Pt[] = [];
  for (const [x0, z0, x1, z1] of blockFence()) {
    const alongX = x1 - x0 > z1 - z0;
    const len = alongX ? x1 - x0 : z1 - z0;
    const n = Math.max(1, Math.round(len / 2.5));
    for (let i = 0; i <= n; i++) posts.push(alongX ? [x0 + (len * i) / n, (z0 + z1) / 2] : [(x0 + x1) / 2, z0 + (len * i) / n]);
    box(b, x0 - 0.02, S + H - 0.06, z0 - 0.02, x1 + 0.02, S + H, z1 + 0.02, METAL);
  }
  const seen = new Set<string>();
  for (const [x, z] of posts) {
    const k = `${x.toFixed(2)},${z.toFixed(2)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    cyl(b, 0.045, H + 0.04, x, S, z, METAL, 6);
  }
  const wire = lit(new THREE.MeshBasicMaterial({ color: '#b9bdd6', map: meshTex, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, depthWrite: false }), 0.85, 0.35);
  const wires: THREE.BufferGeometry[] = [];
  for (const [x0, z0, x1, z1] of blockFence()) {
    const alongX = x1 - x0 > z1 - z0;
    const len = alongX ? x1 - x0 : z1 - z0;
    const g = new THREE.PlaneGeometry(len, H - 0.1);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len * 3, uv.getY(i) * (H - 0.1) * 3);
    if (!alongX) g.rotateY(Math.PI / 2);
    wires.push(g.translate((x0 + x1) / 2, S + (H - 0.1) / 2, (z0 + z1) / 2));
  }
  const fenceMesh = new THREE.Mesh(mergeAll(wires), wire);
  fenceMesh.userData.keep = true;
  group.add(fx(fenceMesh));
  // Benches outside the fence's west side for whoever has next; the ball's on the court
  for (const [x, z, ry] of B.benches) bench(b, [x, z], ry);
  b.add(new THREE.SphereGeometry(0.12, 10, 8).translate(cx + 1.6, S + 0.14, cz + 2.4), toon('#ff6a2f'));

  /* ----- The playground ----- */
  const [p0, pz0, p1, pz1] = B.playground;
  flat(b, B.playground, 0.018, toon('#d0573f'));
  flat(b, [p0 + 0.3, pz0 + 0.3, p1 - 0.3, pz1 - 0.3], 0.022, toon('#e06a4a'));
  // The climbing frame: a deck on four posts, a roof, a ladder up one side and a slide down the other
  const [kx, kz] = [p0 + 3, pz0 + 3.2];
  for (const [dx, dz] of [
    [-0.9, -0.9],
    [0.9, -0.9],
    [-0.9, 0.9],
    [0.9, 0.9],
  ] as Pt[])
    box(b, kx + dx - 0.07, S, kz + dz - 0.07, kx + dx + 0.07, S + 2.6, kz + dz + 0.07, toon('#ffd23f'));
  box(b, kx - 1, S + 1.2, kz - 1, kx + 1, S + 1.3, kz + 1, WOOD);
  b.add(new THREE.ConeGeometry(1.5, 0.7, 4).rotateY(Math.PI / 4).translate(kx, S + 2.95, kz), toon('#00a3d6'));
  for (let i = 0; i < 4; i++) box(b, kx - 0.35, S + 0.25 + i * 0.28, kz - 1.05 - i * 0.18, kx + 0.35, S + 0.3 + i * 0.28, kz - 0.95 - i * 0.18, METAL);
  // The slide runs down from the deck's east edge
  b.add(new THREE.BoxGeometry(2.6, 0.05, 0.7).rotateZ(-Math.atan2(1.2, 2.3)).translate(kx + 1 + 1.15, S + 0.66, kz), toon('#e219e5'));
  for (const e of [-1, 1]) b.add(new THREE.BoxGeometry(2.6, 0.18, 0.04).rotateZ(-Math.atan2(1.2, 2.3)).translate(kx + 1 + 1.15, S + 0.74, kz + e * 0.36), toon('#e219e5'));
  // Swings: an A-frame with two seats on chains
  const [sx, sz] = [p1 - 2.6, pz0 + 2.6];
  for (const e of [-1, 1]) {
    for (const d of [-0.5, 0.5]) b.add(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 6).rotateX(-d * 0.5).translate(sx + e * 1.6, S + 1.2, sz + d * 0.62), toon('#00a3d6'));
  }
  b.add(new THREE.CylinderGeometry(0.05, 0.05, 3.3, 6).rotateZ(Math.PI / 2).translate(sx, S + 2.38, sz), toon('#00a3d6'));
  for (const d of [-0.6, 0.6]) {
    box(b, sx + d - 0.22, S + 0.5, sz - 0.1, sx + d + 0.22, S + 0.56, sz + 0.1, INK);
    for (const e of [-0.2, 0.2]) box(b, sx + d + e - 0.01, S + 0.56, sz - 0.01, sx + d + e + 0.01, S + 2.36, sz + 0.01, METAL);
  }
  // A see-saw
  const [ssx, ssz] = [p1 - 2.6, pz1 - 2.2];
  box(b, ssx - 0.15, S, ssz - 0.15, ssx + 0.15, S + 0.4, ssz + 0.15, METAL);
  b.add(new THREE.BoxGeometry(3, 0.08, 0.3).rotateZ(0.16).translate(ssx, S + 0.46, ssz), toon('#2bff88'));
  // A low wall round it to sit on
  for (const [x0, z0, x1, z1] of [
    [p0 - 0.15, pz0 - 0.15, p1 + 0.15, pz0],
    [p0 - 0.15, pz1, p1 + 0.15, pz1 + 0.15],
    [p0 - 0.15, pz0, p0, pz1 - 2],
  ] as Rect[])
    box(b, x0, S, z0, x1, S + 0.35, z1, STONE);

  /* ----- The handball wall ----- */
  const [h0, hz0, h1, hz1] = B.handball;
  box(b, h0, S, hz0, h1, S + B.handballH, hz1, toon('#6c6794'));
  box(b, h0 - 0.05, S + B.handballH, hz0 - 0.05, h1 + 0.05, S + B.handballH + 0.08, hz1 + 0.05, STONE);
  // Painted both sides
  const mural = lit(new THREE.MeshBasicMaterial({ map: wallTex, toneMapped: true }), 0.95, 0.5);
  for (const e of [-1, 1]) {
    const g = new THREE.PlaneGeometry(h1 - h0 - 0.2, B.handballH - 0.3);
    if (e < 0) g.rotateY(Math.PI);
    b.add(g.translate((h0 + h1) / 2, S + 0.15 + (B.handballH - 0.3) / 2, e < 0 ? hz0 - 0.008 : hz1 + 0.008), mural);
  }
  // Its court: lines on the paving in front (south)
  box(b, h0, S + 0.016, hz1 + 4.5, h1, S + 0.02, hz1 + 4.57, CREAM);
  for (const x of [h0, h1 - 0.07]) box(b, x, S + 0.016, hz1, x + 0.07, S + 0.02, hz1 + 4.57, CREAM);

  /* ----- The garden, the tables, the plaza's gantry ----- */
  for (const [x0, z0, x1, z1] of B.beds) {
    box(b, x0, S, z0, x1, S + 0.45, z1, WOOD);
    box(b, x0 + 0.08, S + 0.45, z0 + 0.08, x1 - 0.08, S + 0.47, z1 - 0.08, toon('#3b2a22'));
    b.detail(() => {
      for (let x = x0 + 0.45; x < x1 - 0.2; x += 0.6)
        for (let z = z0 + 0.45; z < z1 - 0.2; z += 0.7) b.add(new THREE.IcosahedronGeometry(0.22, 0).translate(x, S + 0.62, z), toon((x * 7 + z) % 2 > 1 ? '#36b06c' : '#2a8a55'));
    });
  }
  for (const [x, z] of B.tables) {
    box(b, x - 0.9, S + 0.68, z - 0.45, x + 0.9, S + 0.74, z + 0.45, WOOD);
    for (const e of [-1, 1]) {
      box(b, x - 0.9, S + 0.38, z + e * 0.75 - 0.15, x + 0.9, S + 0.43, z + e * 0.75 + 0.15, WOOD);
      for (const d of [-0.7, 0.7]) box(b, x + d - 0.04, S, z - 0.85, x + d + 0.04, S + 0.68, z + 0.85, INK);
    }
  }
  // The gantry over the plaza: two posts, a beam and the name (a cut-out, so it occludes the outlines behind)
  const [g0, gz0, g1] = B.plaza;
  const gz = gz0 + 5.6;
  const gw = 7;
  const gx = (g0 + g1) / 2 + 6.5;
  for (const e of [-1, 1]) box(b, gx + e * gw / 2 - 0.12, S, gz - 0.12, gx + e * gw / 2 + 0.12, S + 4.2, gz + 0.12, INK);
  box(b, gx - gw / 2 - 0.1, S + 4.2, gz - 0.12, gx + gw / 2 + 0.1, S + 4.36, gz + 0.12, INK);
  // (one face each way: read from the avenue, and from the courtyard)
  const nameMat = lit(new THREE.MeshBasicMaterial({ map: nameTex, transparent: true, depthWrite: false, toneMapped: true }), 1, 1.6);
  for (const ry of [0, Math.PI]) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(gw - 0.6, (gw - 0.6) / 4).translate(0, 0, 0.14), nameMat);
    sign.position.set(gx, S + 4.36 + (gw - 0.6) / 8 + 0.05, gz);
    sign.rotation.y = ry;
    sign.userData.keep = true;
    group.add(fx(sign));
    group.add(occlude(sign.clone(), nameTex));
  }
  // (a neon line under the beam)
  box(b, gx - gw / 2 + 0.2, S + 4.12, gz - 0.13, gx + gw / 2 - 0.2, S + 4.16, gz - 0.125, neon(PAL.magenta, 0.6, 2.4));

  /* ----- Lights: string lights between the poles, lamps, pools of light ----- */
  const top = S + 3.4;
  const poles = B.poles.map(([x, z]) => {
    cyl(b, 0.06, 3.4, x, S, z, INK, 6);
    return V(x, top, z);
  });
  const bulbs: number[] = [];
  const string = (a: THREE.Vector3, c: THREE.Vector3, n: number, sag: number) => {
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      bulbs.push(a.x + (c.x - a.x) * t, a.y + (c.y - a.y) * t - Math.sin(t * Math.PI) * sag, a.z + (c.z - a.z) * t);
    }
  };
  string(poles[0], poles[1], 30, 0.6);
  string(poles[2], poles[3], 30, 0.6);
  string(poles[0], poles[3], 40, 0.9);
  string(poles[1], poles[2], 40, 0.9);
  string(poles[4], poles[5], 18, 0.4);
  const bulbGeo = new THREE.BufferGeometry();
  bulbGeo.setAttribute('position', new THREE.Float32BufferAttribute(bulbs, 3));
  const lights = new THREE.Points(bulbGeo, lit(new THREE.PointsMaterial({ color: PAL.warm, map: glowTex, size: 0.26, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), 0.25, 1.4));
  lights.userData.keep = true;
  group.add(fx(lights));
  // Floodlights over the court on two of the fence's posts
  for (const [x, z] of [
    [f0, fz0],
    [f1, fz1],
  ] as Pt[]) {
    cyl(b, 0.07, 4.6, x, S, z, METAL, 6);
    box(b, x - 0.35, S + 4.6, z - 0.12, x + 0.35, S + 4.9, z + 0.12, INK);
    box(b, x - 0.3, S + 4.6, z - 0.13, x + 0.3, S + 4.85, z - 0.125, neon('#fff2c8', 0.4, 1.3));
  }
  addPool(cx, cz - 4, 6, S + 0.03);
  addPool(cx, cz + 4, 6, S + 0.03);
  for (const [x, z] of [
    [X0 + 8, Z0 + 8.5],
    [X1 - 4, Z1 - 11],
    [X0 + 14.5, Z1 - 10],
  ] as Pt[])
    addLamp(x, z, 0);
  // Trees round the edge, clear of everything
  for (const [x, z] of [
    [X0 + 1.4, Z0 + 23],
    [X0 + 1.4, Z0 + 28],
    [X1 - 1.5, Z0 + 12],
    [X1 - 1.5, Z0 + 20],
    [X1 - 1.5, Z0 + 27],
    [X1 - 3, Z1 - 1.6],
    [X0 + 16, Z1 - 1.6],
    [X0 + 16, Z0 + 20],
  ] as Pt[])
    addTree(x, z, 0.95, false);

  b.build(group);

  /* ----- Its people ----- */
  // (the game of two on two on the court is play.ts's: they move); someone on the benches waiting
  B.benches.forEach(([x, z, ry], i) => {
    if (low && i % 2) return;
    crowd.push({ x, z, y: SEAT, ry, act: 'sit' });
  });
  for (const [x, z] of B.tables) for (const e of low ? [1] : [-1, 1]) crowd.push({ x: x + 0.3 * e, z: z + e * 0.75, y: SEAT + 0.12, ry: e < 0 ? 0 : Math.PI, act: 'sit' });
  // Chatting on the plaza by the station's stairs, and in the garden
  const groups: Pt[] = [
    [g0 + 4, gz0 + 3],
    [g1 - 4, gz0 + 3.5],
    [X0 + 8, Z1 - 9.5],
  ];
  for (const [gx2, gz2] of groups.slice(0, low ? 2 : 3))
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + gx2;
      const px = gx2 + Math.cos(a) * 0.55;
      const pz = gz2 + Math.sin(a) * 0.55;
      crowd.push({ x: px, z: pz, ry: Math.atan2(gx2 - px, gz2 - pz), act: 'chat' });
    }
  // A game of handball: two in front of the wall
  crowd.push({ x: h0 + 2.5, z: hz1 + 2.6, ry: Math.PI, act: 'look' }, { x: h1 - 2.2, z: hz1 + 3.2, ry: Math.PI + 0.3, act: 'look' });
  // Kids' parents by the playground's wall
  crowd.push({ x: p1 + 0.8, z: pz0 + 5, ry: -Math.PI / 2, act: 'look' });

  /* ----- The place: the hover ring round the court, the pin over it ----- */
  const ring = new THREE.Mesh(new THREE.RingGeometry(9.5, 9.7, 80), glowMat(PAL.cyan, 0, null));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(B.focus[0], S + 0.04, B.focus[1]);
  group.add(fx(ring));
  const spot: Spot = { id: 'trenches', group, focus: V(B.focus[0], 1.5, B.focus[1]), size: 26, pin: V(cx, 6.2, cz), ring };
  return { spot };
}

function mergeAll(geos: THREE.BufferGeometry[]) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (const g of geos) {
    const base = pos.length / 3;
    const p = g.attributes.position;
    const u = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      uv.push(u.getX(i), u.getY(i));
    }
    const ix = g.index!;
    for (let i = 0; i < ix.count; i++) idx.push(base + ix.getX(i));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setIndex(idx);
  out.computeVertexNormals();
  return out;
}
