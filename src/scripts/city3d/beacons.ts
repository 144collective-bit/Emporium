/*
 * Beams of light over the drop-offs of the contracts you've taken (the
 * Signal tower's board): a tall neon column and a ring on the ground at the
 * building's door, so you can find it from anywhere in the city, walking,
 * driving or from the City view. Under reduced motion they don't pulse.
 */
import * as THREE from 'three';
import { PAL, fx, glowMat, neon } from './kit';
import { SLAB as S, type Tick } from './world';

const MAX = 3;

export function buildBeacons(scene: THREE.Scene, tick: (f: Tick) => void, reduced: boolean) {
  const beams = Array.from({ length: MAX }, () => {
    const g = new THREE.Group();
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 40, 16, 1, true), glowMat(PAL.warm, 0.35, null));
    column.position.y = 20;
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 40, 8, 1, true), glowMat('#ffffff', 0.55, null));
    core.position.y = 20;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 40), neon(PAL.warm, 0.9, 2.4));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = S + 0.03;
    g.add(column, core, ring);
    g.visible = false;
    scene.add(fx(g));
    return { g, column, ring };
  });
  tick((env) => {
    if (reduced) return;
    const k = 1 + Math.sin(env.t * 3) * 0.08;
    for (const b of beams) if (b.g.visible) b.ring.scale.setScalar(k);
  });
  return {
    /** Light the drop-offs (up to three) */
    show(at: { x: number; z: number }[]) {
      beams.forEach((b, i) => {
        const p = at[i];
        b.g.visible = !!p;
        if (p) b.g.position.set(p.x, 0, p.z);
      });
    },
  };
}
