/*
 * Crestmont's gateway drawn (crestgate.ts; the premium upgrade's Phase 1), one site: the two limestone pylons, their
 * plinths, capstones and iron lanterns; the wing walls with a gilded CRESTMONT on a dark stone plaque facing the
 * avenue; the fountain on the median's nose, its basin lit under the water at night and a spray from its bowl (near
 * only). Floodlit at night: the stone warms a little (an emissive well under the bloom's threshold), the lanterns and
 * the small uplights at the pylons' feet are the only bright things.
 */
import * as THREE from 'three';
import { Batch, canvasTex, lit, neon, siteMat, toon } from './kit';
import { site } from './tilework';
import { BASIN, GATE_NAME, PLAQUE, PYLON, PYLONS, WING, WINGS } from './crestgate';
import { SLAB_Y } from './estates';
import { SPRAY } from './mallkit';

/** The limestone, floodlit at night (warm and faint, well under the bloom's threshold: visual-rules.md) */
const STONE = siteMat('crest-gate-stone', lit(toon('#e3d8c2', { emissive: '#ffcf96' }), 0, 0.32));
const STONE_SHADE = siteMat('crest-gate-shade', lit(toon('#cbbfa6', { emissive: '#ffcf96' }), 0, 0.26));
const CAP = siteMat('crest-gate-cap', lit(toon('#f1ebdd', { emissive: '#ffd9a8' }), 0, 0.3));
const IRON = toon('#1e1d22');
/** The lanterns' glass and the uplights: small, the only things bright enough to bloom */
const GLASS = neon('#ffe2a8', 0.25, 1.3);
const UPLIGHT = neon('#fff0d0', 0.1, 1.5);
/** The fountain's water, lit from under it at night, and the lights round its floor */
const WATER = siteMat('crest-gate-water', lit(toon('#4fb8dc', { emissive: '#3fdcff' }), 0.05, 0.62));
const POOL_LED = neon('#c8f8ff', 0.1, 1.4);

/** The name, gilded on dark polished stone */
const PLAQUE_MAT = siteMat(
  'crest-gate-plaque',
  lit(
    new THREE.MeshBasicMaterial({
      map: canvasTex(512, 104, (c) => {
        c.fillStyle = '#27332f';
        c.fillRect(0, 0, 512, 104);
        c.strokeStyle = '#c9a75a';
        c.lineWidth = 3;
        c.strokeRect(7, 7, 498, 90);
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = '600 60px "Trajan Pro", "Cinzel", Georgia, "Times New Roman", serif';
        // (letter-spaced by hand: a little shadow under, then the gold)
        const letters = GATE_NAME.split('');
        const gap = 46;
        const x0 = 256 - ((letters.length - 1) * gap) / 2;
        letters.forEach((l, i) => {
          c.fillStyle = '#141b19';
          c.fillText(l, x0 + i * gap + 2, 56);
          c.fillStyle = '#e6c47a';
          c.fillText(l, x0 + i * gap, 54);
        });
      }),
    }),
    1,
    0.85
  )
);

export function registerGate(low: boolean) {
  const xs = [...PYLONS.map((p) => p.x), ...WINGS.flatMap((w) => [w[0], w[2]]), BASIN.x - BASIN.r, BASIN.x + BASIN.r];
  const zs = [...PYLONS.map((p) => p.z), BASIN.z - BASIN.r, BASIN.z + BASIN.r];
  const rect: [number, number, number, number] = [Math.min(...xs) - 1, Math.min(...zs) - 1, Math.max(...xs) + 1, Math.max(...zs) + 1];
  site('crestmont gateway', rect, (into) => {
    const b = new Batch();
    const y0 = SLAB_Y;
    const box = (x0: number, a: number, z0: number, x1: number, c: number, z1: number, m: THREE.Material) => b.box(Math.min(x0, x1), a, Math.min(z0, z1), Math.abs(x1 - x0), c - a, Math.abs(z1 - z0), m);

    /* ---------- The pylons ---------- */
    for (const p of PYLONS) {
      const h = PYLON.half;
      const top = y0 + PYLON.h;
      // A plinth, the shaft (a shade band a third of the way up), the capstone stepped out, a small cornice over it
      box(p.x - h - 0.06, y0, p.z - h - 0.06, p.x + h + 0.06, y0 + 0.32, p.z + h + 0.06, STONE_SHADE);
      box(p.x - h, y0 + 0.32, p.z - h, p.x + h, top - PYLON.capH, p.z + h, STONE);
      box(p.x - h - 0.025, y0 + 0.95, p.z - h - 0.025, p.x + h + 0.025, y0 + 1.03, p.z + h + 0.025, STONE_SHADE);
      box(p.x - h - PYLON.cap, top - PYLON.capH, p.z - h - PYLON.cap, p.x + h + PYLON.cap, top, p.z + h + PYLON.cap, CAP);
      box(p.x - h + 0.06, top, p.z - h + 0.06, p.x + h - 0.06, top + 0.06, p.z + h - 0.06, STONE_SHADE);
      // The lantern: an iron base, the glass, an iron hood and finial
      const l = PYLON.lantern;
      const ly = top + 0.06;
      box(p.x - l - 0.03, ly, p.z - l - 0.03, p.x + l + 0.03, ly + 0.07, p.z + l + 0.03, IRON);
      box(p.x - l, ly + 0.07, p.z - l, p.x + l, ly + PYLON.lanternH - 0.08, p.z + l, GLASS);
      b.add(new THREE.ConeGeometry(l * 1.45, 0.16, 4).rotateY(Math.PI / 4).translate(p.x, ly + PYLON.lanternH, p.z), IRON);
      b.detail(() => {
        // (its glass's corner bars, and a finial)
        for (const [sx, sz] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ])
          box(p.x + sx * l - 0.015, ly + 0.07, p.z + sz * l - 0.015, p.x + sx * l + 0.015, ly + PYLON.lanternH - 0.08, p.z + sz * l + 0.015, IRON);
        b.add(new THREE.SphereGeometry(0.045, 6, 4).translate(p.x, ly + PYLON.lanternH + 0.1, p.z), IRON);
      });
      // The uplights at its foot on the avenue's side, aimed up its face
      for (const dx of [-0.22, 0.22]) box(p.x + dx - 0.05, y0, p.z + h + 0.1, p.x + dx + 0.05, y0 + 0.05, p.z + h + 0.18, UPLIGHT);
    }

    /* ---------- The wing walls and their plaques ---------- */
    for (const w of WINGS) {
      const [x0, z0, x1, z1] = w;
      box(x0, y0, z0 - 0.04, x1, y0 + 0.16, z1 + 0.04, STONE_SHADE);
      box(x0, y0 + 0.16, z0, x1, y0 + WING.h - 0.1, z1, STONE);
      box(x0 - 0.04, y0 + WING.h - 0.1, z0 - 0.06, x1 + 0.04, y0 + WING.h, z1 + 0.06, CAP);
      // (the plaque on its face to the avenue, in the wall's middle, in a thin stone frame)
      const mx = (x0 + x1) / 2;
      box(mx - PLAQUE.w / 2 - 0.05, y0 + PLAQUE.y - 0.05, z1, mx + PLAQUE.w / 2 + 0.05, y0 + PLAQUE.y + PLAQUE.h + 0.05, z1 + 0.02, CAP);
      b.add(new THREE.PlaneGeometry(PLAQUE.w, PLAQUE.h).translate(mx, y0 + PLAQUE.y + PLAQUE.h / 2, z1 + 0.026), PLAQUE_MAT);
    }

    /* ---------- The fountain on the median's nose ---------- */
    const { x, z, r, rim, bowl, bowlY } = BASIN;
    const cyl = (r1: number, h: number, y: number, m: THREE.Material, r0 = r1, open = false, seg = 24) => b.add(new THREE.CylinderGeometry(r1, r0, h, seg, 1, open).translate(x, y + h / 2, z), m);
    // The basin's wall (open, its inside too), its coping, the water lit from under
    cyl(r, rim, y0, STONE, r, true);
    b.add(new THREE.CylinderGeometry(r - 0.12, r - 0.12, rim - 0.02, 24, 1, true).scale(-1, 1, 1).translate(x, y0 + (rim - 0.02) / 2, z), STONE_SHADE);
    b.add(new THREE.RingGeometry(r - 0.13, r + 0.04, 24).rotateX(-Math.PI / 2).translate(x, y0 + rim + 0.005, z), CAP);
    b.add(new THREE.CircleGeometry(r - 0.12, 24).rotateX(-Math.PI / 2).translate(x, y0 + rim - 0.1, z), WATER);
    // (the lights round its floor, showing through as small bright points at the water)
    const n = low ? 4 : 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      b.add(new THREE.CircleGeometry(0.055, 8).rotateX(-Math.PI / 2).translate(x + Math.cos(a) * (r - 0.24), y0 + rim - 0.095, z + Math.sin(a) * (r - 0.24)), POOL_LED);
    }
    // The pedestal, the bowl with its water, a finial and the spray
    cyl(0.14, bowlY - rim + 0.1, y0 + rim - 0.1, STONE_SHADE, 0.2, false, 10);
    cyl(bowl, 0.14, y0 + bowlY, STONE, 0.16, false, 16);
    b.add(new THREE.CircleGeometry(bowl - 0.05, 16).rotateX(-Math.PI / 2).translate(x, y0 + bowlY + 0.135, z), WATER);
    cyl(0.05, 0.3, y0 + bowlY + 0.14, STONE_SHADE, 0.08, false, 8);
    b.detail(() => {
      b.add(new THREE.ConeGeometry(0.09, 0.45, 6, 1, true).translate(x, y0 + bowlY + 0.66, z), SPRAY);
      b.add(new THREE.ConeGeometry(bowl - 0.04, 0.32, 12, 1, true).rotateX(Math.PI).translate(x, y0 + bowlY - 0.02, z), SPRAY);
    });
    b.build(into, { cast: true, receive: true });
  });
}
