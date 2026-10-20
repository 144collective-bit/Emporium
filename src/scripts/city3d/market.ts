/*
 * The market square, east of the East districts on the north bank avenue:
 * two rows of four market stalls either side of a paved aisle, a MARKET
 * gantry over the west entrance, lamps and string lights. Stall 0 is yours
 * (a cyan canopy, a YOUR STALL board, a ring on the ground) and shows a crate
 * stack for each kind of stock you hold; the other seven are run by traders
 * (idle Degens from the shared crowd) with their goods on show.
 *
 * Drawn in world numbers (it's outside the core). Footprints and your
 * stall's spot are MARKET_SITE / STALL_SPOT in solids.ts.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, PAL, canvasTex, fx, lit, neon, neonSign, occlude, plane, toon } from './kit';
import { MARKET } from './layout';
import { MARKET_SITE, STALL_SPOT } from './solids';
import { SLAB as S, addLamp } from './world';
import type { Idle } from './landmarks';
import { GOODS, good, stallLevel, type Slot } from './tycoon';

/** The traders' stalls: canopy colours and what they sell (fixed: decoration) */
const TRADERS: { canopy: string; goods: string[] }[] = [
  { canopy: '#ff6ad5', goods: ['gummies', 'glow'] },
  { canopy: '#ffd23f', goods: ['coffee'] },
  { canopy: '#e23b3b', goods: ['tees', 'sneakers'] },
  { canopy: '#2bff88', goods: ['glow', 'coffee'] },
  { canopy: '#8000ff', goods: ['neon'] },
  { canopy: '#ff8a3d', goods: ['gummies', 'tees'] },
  { canopy: '#00c2ff', goods: ['sneakers'] },
];

const GOODSNAME = (id: string) => good(id as never).name.toUpperCase();
/** Counter height: about a Degen's waist */
const COUNTER = 0.5;

/** A striped canopy texture */
const stripes = (color: string) =>
  canvasTex(128, 64, (c) => {
    for (let x = 0; x < 128; x += 32) {
      c.fillStyle = color;
      c.fillRect(x, 0, 16, 64);
      c.fillStyle = '#f3f2f7';
      c.fillRect(x + 16, 0, 16, 64);
    }
    // A scalloped edge along the bottom
    c.fillStyle = color;
    for (let x = 0; x < 128; x += 16) {
      c.beginPath();
      c.arc(x + 8, 60, 8, 0, Math.PI);
      c.fill();
    }
  });

const board = (text: string, color: string) =>
  canvasTex(256, 64, (c) => {
    c.fillStyle = '#0b0a18';
    c.fillRect(0, 0, 256, 64);
    c.strokeStyle = color;
    c.lineWidth = 6;
    c.strokeRect(3, 3, 250, 58);
    c.font = `900 38px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = color;
    c.fillText(text, 128, 35);
  });

export function buildMarket(scene: THREE.Scene, crowd: Idle[]) {
  const g = new THREE.Group();
  g.name = 'market';
  scene.add(g);
  const b = new Batch();
  const wood = toon('#6b4630');
  const counterTop = toon('#d9c7a3');
  const post = toon('#2b2a40');
  const crate = toon('#a8743f');

  MARKET_SITE.stalls.forEach((t, i) => {
    const mine = i === 0;
    const f = t.facing; // +1: front faces +z
    const front = t.z + (f * t.d) / 2;
    const back = t.z - (f * t.d) / 2;
    const x0 = t.x - t.w / 2;
    // Counter along the front at a Degen's waist (he's about a tile tall), a back board, four posts
    b.box(x0, S, Math.min(front, front - f * 0.55), t.w, COUNTER, 0.55, wood);
    b.box(x0 - 0.02, S + COUNTER, Math.min(front, front - f * 0.6), t.w + 0.04, 0.05, 0.6, counterTop);
    b.box(x0, S, Math.min(back, back + f * 0.12), t.w, 1.35, 0.12, toon(mine ? '#14304a' : '#3a3550'));
    for (const px of [x0 + 0.05, x0 + t.w - 0.1])
      for (const pz of [front - f * 0.06, back + f * 0.06]) b.box(px, S, pz - 0.03, 0.06, pz === front - f * 0.06 ? 1.43 : 1.73, 0.06, post);
    // The traders' goods on their counters (yours are drawn from your stock below)
    if (!mine) {
      TRADERS[i - 1].goods.forEach((id, k) => {
        const c = good(id as never).color;
        for (let n = 0; n < 3; n++) b.box(x0 + 0.15 + k * 0.8 + n * 0.22, S + COUNTER + 0.05, front - f * 0.45 - (f < 0 ? 0.24 : 0), 0.18, 0.16, 0.24, toon(c));
      });
      // Crates stacked behind the counter
      b.box(x0 + 0.2, S, back + f * 0.2 - (f < 0 ? 0.45 : 0), 0.45, 0.4, 0.45, crate);
    }
    // Striped canopy, sloping down to the front
    const canopy = new THREE.Mesh(new THREE.PlaneGeometry(t.w + 0.3, t.d + 0.35), new THREE.MeshToonMaterial({ map: stripes(mine ? PAL.cyan : TRADERS[i - 1].canopy), side: THREE.DoubleSide }));
    canopy.position.set(t.x, S + 1.6, t.z + f * 0.1);
    canopy.rotation.set(-Math.PI / 2 + f * 0.22, 0, 0);
    if (f < 0) canopy.rotation.z = Math.PI;
    canopy.castShadow = true;
    g.add(canopy);
    // A name board on top of the back board
    const sign = plane(1.3, 0.32, lit(new THREE.MeshBasicMaterial({ map: board(mine ? 'YOUR STALL' : GOODSNAME(TRADERS[i - 1].goods[0]), mine ? PAL.cyan : TRADERS[i - 1].canopy) }), 0.9, 1.35));
    sign.position.set(t.x, S + 1.86, back + f * 0.08);
    if (f < 0) sign.rotation.y = Math.PI;
    g.add(fx(sign));
    // A trader behind every other stall's counter; shoppers browsing
    if (!mine) {
      crowd.push({ x: t.x + 0.2, z: back + f * 0.55, ry: f > 0 ? 0 : Math.PI, act: 'look' });
      if (i % 2 === 0) crowd.push({ x: t.x - 0.3, z: front + f * 0.55, ry: f > 0 ? Math.PI : 0, act: 'look' });
    }
  });
  // Shoppers chatting in the aisle
  const az = (MARKET_SITE.stalls[0].z + MARKET_SITE.stalls[4].z) / 2;
  crowd.push({ x: MARKET.ox + 5.9, z: az - 0.25, ry: 2.4, act: 'chat' }, { x: MARKET.ox + 6.4, z: az + 0.15, ry: -0.8, act: 'chat' });

  // Your stall: a ring on the ground where you stand to run it
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 32), neon(PAL.cyan, 0.6, 2.2));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(STALL_SPOT.x, S + 0.012, STALL_SPOT.z);
  g.add(fx(ring));

  // The MARKET gantry over the aisle's west entrance, facing the city
  const G = MARKET_SITE.gantry;
  for (const z of [G.z0, G.z1]) b.box(G.x - 0.08, S, z - 0.08, 0.16, 2.9, 0.16, post);
  b.box(G.x - 0.1, S + 2.55, G.z0, 0.2, 0.55, G.z1 - G.z0, toon('#0b0a18'));
  const gtex = neonSign('MARKET', PAL.pink, { board: null, size: 190, tracking: 14 });
  const gsign = plane(G.z1 - G.z0 - 0.3, 0.5, lit(new THREE.MeshBasicMaterial({ map: gtex, transparent: true, depthWrite: false }), 1, 1.7));
  gsign.position.set(G.x - 0.11, S + 2.82, (G.z0 + G.z1) / 2);
  gsign.rotation.y = -Math.PI / 2;
  // A cut-out sign: keep the ink outlines behind it from drawing across it
  occlude(gsign, gtex);
  g.add(fx(gsign));
  // String lights along the aisle
  // String lights along the aisle, on a sagging cable from the gantry to a pole at the east end
  const P = MARKET_SITE.pole;
  b.box(P.x - 0.06, S, P.z - 0.06, 0.12, 2.6, 0.12, post);
  const N = 16;
  const at = (k: number) => new THREE.Vector3(G.x + (k / (N - 1)) * (P.x - G.x), S + 2.52 - Math.sin((k / (N - 1)) * Math.PI) * 0.35, P.z);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: N }, (_, k) => at(k))), 32, 0.012, 4), post);
  g.add(cable);
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 4), neon(PAL.warm, 0.4, 2.6), N);
  const m = new THREE.Matrix4();
  for (let k = 0; k < N; k++) {
    const p = at(k);
    bulbs.setMatrixAt(k, m.makeTranslation(p.x, p.y - 0.05, p.z));
  }
  g.add(fx(bulbs));
  b.build(g);

  // Lamps at the corners of the square
  addLamp(MARKET.ox + 0.22, MARKET.oz + 0.22, 0);
  addLamp(MARKET.ox + 0.22, MARKET.oz + 8.78, 0);
  addLamp(MARKET.ox + 8.78, MARKET.oz + 0.22, Math.PI);
  addLamp(MARKET.ox + 8.78, MARKET.oz + 8.78, Math.PI);

  // Your stock: a crate stack per kind of goods, taller the fuller it is
  const stock = new THREE.Group();
  g.add(stock);
  const crateGeo = new THREE.BoxGeometry(0.22, 0.17, 0.26);
  const mats = new Map(GOODS.map((x) => [x.id, toon(x.color)]));
  const mine = MARKET_SITE.stalls[0];
  const front = mine.z + (mine.facing * mine.d) / 2;
  return {
    /** Show your stall's stock on its counter */
    show(slots: Slot[], level: number) {
      stock.clear();
      const cap = stallLevel(level).capacity;
      slots.forEach((s, k) => {
        if (s.qty <= 0) return;
        const n = Math.max(1, Math.round((s.qty / cap) * 3));
        for (let j = 0; j < n; j++) {
          const c = new THREE.Mesh(crateGeo, mats.get(s.good));
          const col = k % 3;
          const row = Math.floor(k / 3);
          c.position.set(mine.x - mine.w / 2 + 0.3 + col * 0.55, S + COUNTER + 0.14 + j * 0.18, front - mine.facing * (0.3 + row * 0.28));
          c.castShadow = true;
          stock.add(c);
        }
      });
    },
  };
}

export type Market = ReturnType<typeof buildMarket>;
