/*
 * The south's underpasses drawn (docs/south-plan.md Phase 4c; underpasses.ts the rules): plainer than the Circus's (the
 * owner's call): the blocks' warm concrete walls, a plain floor and ceiling, strip lights in the ceiling, the ramps'
 * parapets and coping, a headwall over each portal with its SUBWAY plate and a strip light under it, and a step on to
 * the slab at a mouth that comes up on one. No murals or neon lines: the Circus is the showpiece. Registered by
 * south3d.ts (the south's chunk), a site each.
 */
import * as THREE from 'three';
import { Batch, neon, toon } from './kit';
import { site } from './tilework';
import { SLAB } from './world';
import { CONCRETE } from './southblocks';
import { CROSSINGS, MOUTH_ON_SLAB, UNDERPASSES } from './underpasses';
import { floorOf, type Passage } from './underground';
import { ROW, sign } from './tunnel3d';
import { P, acrossDir, along, alongDir, upQuad, wallQuad } from './circus3d';

const CONC = toon(CONCRETE);
const CONC_DARK = toon('#8b8277');
const COPING = toon('#cfc8bd');
const FLOOR_MAT = toon('#7d776f');
const CEIL_MAT = toon('#4a4650');
const TUBE = neon('#eef4ff', 0.6, 1.3);

function drawUnderpass(b: Batch, p: Passage, onSlab: [boolean, boolean]) {
  const h = p.half;
  const [roof0, roof1] = p.roofs[0];
  const [dx, dz] = alongDir(p);
  const n = acrossDir(p);
  // The floor: down the first ramp, level under the road, up the second
  const at = [p.a0, p.ramp0, p.ramp1, p.a1];
  for (let k = 1; k < at.length; k++) {
    const [s0, s1] = [at[k - 1], at[k]];
    const [y0, y1] = [floorOf(p, s0), floorOf(p, s1)];
    const c = [P(p, s0, -h), P(p, s0, h), P(p, s1, h), P(p, s1, -h)];
    upQuad(b, [[c[0][0], y0, c[0][1]], [c[1][0], y0, c[1][1]], [c[2][0], y1, c[2][1]], [c[3][0], y1, c[3][1]]], FLOOR_MAT);
  }
  // Under the road: the walls, the ceiling (facing down) and its strip lights
  for (const side of [-1, 1]) along(b, p, roof0, roof1, side * h, side * (h + p.wall), p.floor, 0, CONC);
  const cs = [P(p, roof0, -h), P(p, roof1, -h), P(p, roof1, h), P(p, roof0, h)];
  const ceil = new THREE.BufferGeometry();
  ceil.setAttribute('position', new THREE.Float32BufferAttribute(cs.flatMap(([x, z]) => [x, p.ceil, z]), 3));
  ceil.setIndex([0, 1, 2, 0, 2, 3]);
  ceil.computeVertexNormals();
  if (ceil.attributes.normal.getY(0) > 0) ceil.setIndex([0, 2, 1, 0, 3, 2]);
  ceil.computeVertexNormals();
  b.add(ceil, CEIL_MAT);
  const yaw = Math.atan2(-dz, dx);
  for (let s = roof0 + 0.9; s < roof1 - 0.5; s += 1.6) {
    const [x, z] = P(p, s, 0);
    b.add(new THREE.BoxGeometry(0.9, 0.04, 0.1).rotateY(yaw).translate(x, p.ceil - 0.03, z), TUBE);
  }
  // Each ramp: its walls up to the parapets and their coping; the headwall over its portal with its plate facing out;
  // a step up on to the slab at its mouth if it comes up on one
  for (const [e, [s0, s1, portal, out]] of ([
    [p.a0, roof0, roof0, -1],
    [roof1, p.a1, roof1, 1],
  ] as const).entries()) {
    for (const side of [-1, 1]) {
      along(b, p, s0, s1, side * h, side * (h + p.wall), p.floor, p.rail, CONC);
      along(b, p, s0, s1, side * (h - 0.04), side * (h + p.wall + 0.04), p.rail, p.rail + 0.05, COPING);
    }
    const [w0, w1] = out < 0 ? [portal, portal + 0.3] : [portal - 0.3, portal];
    along(b, p, w0, w1, -h - p.wall, h + p.wall, p.ceil, p.rail, CONC);
    along(b, p, w0 - 0.02, w1 + 0.02, -h - p.wall - 0.04, h + p.wall + 0.04, p.rail, p.rail + 0.05, COPING);
    const plate = P(p, portal + out * 0.012, 0);
    sign(b, ROW.subway, plate[0], (p.ceil + p.rail) / 2 + 0.05, plate[1], [dx * out, dz * out], 1.6, 0.4);
    const lamp = P(p, portal + out * 0.05, 0);
    b.add(new THREE.BoxGeometry(1.2, 0.05, 0.08).rotateY(Math.atan2(-n[1], n[0])).translate(lamp[0], p.ceil - 0.06, lamp[1]), TUBE);
    const mouth = out < 0 ? p.a0 : p.a1;
    if (onSlab[e]) wallQuad(b, P(p, mouth, -h), P(p, mouth, h), floorOf(p, mouth), SLAB, floorOf(p, mouth), SLAB, [-dx * out, -dz * out], CONC_DARK);
  }
}

/** Each underpass, a site */
export function registerUnderpasses() {
  UNDERPASSES.forEach((p, i) => {
    const pts = [P(p, p.a0 - 1, -3), P(p, p.a0 - 1, 3), P(p, p.a1 + 1, -3), P(p, p.a1 + 1, 3)];
    const xs = pts.map((q) => q[0]);
    const zs = pts.map((q) => q[1]);
    site(`underpass ${CROSSINGS[i].id}`, [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)], (into) => {
      const b = new Batch();
      drawUnderpass(b, p, MOUTH_ON_SLAB[i]);
      b.build(into, { cast: false, receive: true, lift: false });
    });
  });
}
