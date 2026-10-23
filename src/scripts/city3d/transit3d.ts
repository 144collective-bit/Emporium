/*
 * The bus shelters (city life plan, Phase 4): one at every bus stop
 * (transit.ts), on the sidewalk facing the road: two posts and a roof, a
 * back panel, a bench, and a sign post with a lit panel. A few dozen
 * triangles each, through a Batch, near only; each a site of its own
 * (tilework.ts), built in the worker too (sitework.ts). Not solid: it's
 * open, and you walk through it.
 */
import * as THREE from 'three';
import { Batch, PAL, neon, toon } from './kit';
import { SLAB, placed } from './world';
import { site } from './tilework';
import { PROMENADE } from './outer';
import { BUS_STOPS, SHELTER_HALF } from './transit';
import type { Rect } from './tiles';

/** A lamp post this close to the shelter's middle is in its way */
const LAMP_CLEAR = SHELTER_HALF + 0.4;

export function buildBusStops(low = false) {
  const dark = toon('#1b1830');
  const roof = toon('#2b2550');
  const panel = toon('#3a3466');
  const seat = toon('#6e6a8c');
  // (a lit panel bigger than a tube: the softer glow, never the bulbs' brightness)
  const sign = neon(PAL.cyan, 0.45, 1.3);
  const up = new THREE.Vector3(0, 1, 0);
  const lamps = placed().lamps;
  for (const b of BUS_STOPS) {
    // Along the kerb a little if a lamp post stands where the shelter goes (the lamps aren't in the stop's data)
    let [x, z] = b.kerb;
    for (const shift of [0, 1.5, -1.5, 3, -3]) {
      const [px, pz] = [b.kerb[0] + b.dir[0] * shift, b.kerb[1] + b.dir[1] * shift];
      if (!lamps.some((l) => Math.hypot(l.x - px, l.z - pz) < LAMP_CLEAR)) {
        [x, z] = [px, pz];
        break;
      }
    }
    // On a block's slab, or the promenade's lower paving along the river
    const onPromenade = (z > PROMENADE.north[0] && z < PROMENADE.north[1]) || (z > PROMENADE.south[0] && z < PROMENADE.south[1]);
    const y = onPromenade ? 0.05 : SLAB;
    // Its own frame: x along the kerb, z away from the road (the road is -z)
    const X = new THREE.Vector3(b.dir[0], 0, b.dir[1]);
    const Z = new THREE.Vector3(-b.face[0], 0, -b.face[1]);
    const M = new THREE.Matrix4().makeBasis(X, up, Z).setPosition(x, y, z);
    const rect: Rect = [x - 2, z - 2, x + 2, z + 2];
    site(`bus stop ${b.id}`, rect, (into) => {
      const k = new Batch();
      k.lod = 'near';
      const box = (cx: number, y0: number, cz: number, w: number, h: number, d: number, mat: THREE.Material) => k.add(new THREE.BoxGeometry(w, h, d).translate(cx, y0 + h / 2, cz).applyMatrix4(M), mat);
      // Two posts at the back and the roof over them, reaching out towards the kerb (Degen is about 1.3 tall)
      for (const px of [-1.0, 1.0]) box(px, 0, 0.3, 0.06, 1.75, 0.06, dark);
      box(0, 1.75, 0.0, 2.6, 0.06, 0.9, roof);
      box(0, 1.81, 0.0, 2.64, 0.04, 0.94, dark);
      // The back panel (phones leave it out), the bench and its legs
      if (!low) box(0, 0.5, 0.34, 2.4, 1.2, 0.03, panel);
      box(0, 0.45, 0.16, 1.5, 0.06, 0.38, seat);
      for (const px of [-0.6, 0.6]) box(px, 0, 0.16, 0.05, 0.45, 0.3, dark);
      // The sign post at the kerb end, its lit panel facing along the street (a flag, read coming up to it)
      box(-1.3, 0, -0.12, 0.05, 2.1, 0.05, dark);
      box(-1.3, 1.6, -0.12, 0.04, 0.45, 0.36, sign);
      k.build(into, { cast: true, receive: true });
    });
  }
}
