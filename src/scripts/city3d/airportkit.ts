/*
 * What the airport's two halves draw with (airport.ts at the boot, airportgrounds3d.ts loaded as you
 * approach): the glass curtain wall the hall and the concourses share, and a few small helpers.
 */
import * as THREE from 'three';
import { Batch, canvasTex, lit, neon, rng, siteMat, toon } from './kit';

/** Ground surfaces sit just under the roads' height, markings just over it */
export const G = 0.004;
export const TOP = 0.03;
export const MARK = 0.032;

export const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: THREE.Material) => b.box(x0, y0, z0, x1 - x0, y1 - y0, z1 - z0, mat);
/** A flat marking lying on the ground */
export const mark = (b: Batch, x0: number, z0: number, x1: number, z1: number, mat: THREE.Material, y = MARK) =>
  b.add(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2), mat);
export const cyl = (b: Batch, r: number, h: number, x: number, y: number, z: number, mat: THREE.Material, seg = 10, r0 = r) =>
  b.add(new THREE.CylinderGeometry(r, r0, h, seg).translate(x, y + h / 2, z), mat);

export const INK = toon('#1b1830');
export const STEEL = toon('#4b4766');
export const PALE = toon('#c9c4e6');
export const WHITE = toon('#e6e3f2');
export const YELLOW = toon('#ffd23f');
export const ROOF = toon('#e9e6f5');
/** Runway and taxiway lights: tiny, dim by day, glowing at night (only bulbs this small may bloom) */
export const light = (c: string) => neon(c, 0.25, 2.4);
/** Bigger lit panels glow softer */
export const soft = (c: string) => neon(c, 0.4, 1.3);

/** A glass curtain wall: panes and mullions, lit inside at night (some warm, some cyan) */
export const GLASS = (() => {
  const draw = (on: boolean) => (c: CanvasRenderingContext2D) => {
    const r = rng(9);
    c.fillStyle = on ? '#000' : '#26315f';
    c.fillRect(0, 0, 512, 256);
    for (let x = 0; x < 512; x += 32)
      for (const [y0, y1] of [
        [8, 120],
        [136, 248],
      ]) {
        if (on) {
          const k = r();
          c.fillStyle = k < 0.55 ? '#ffd36b' : k < 0.8 ? '#7fe9ff' : '#000';
          c.fillRect(x + 3, y0, 26, y1 - y0);
          continue;
        }
        const g = c.createLinearGradient(x, y0, x + 32, y1);
        g.addColorStop(0, '#5873b8');
        g.addColorStop(0.5, '#2c3a73');
        g.addColorStop(1, '#1a2150');
        c.fillStyle = g;
        c.fillRect(x + 3, y0, 26, y1 - y0);
      }
    if (!on) {
      c.fillStyle = '#c9c4e6';
      for (let x = 0; x < 512; x += 32) c.fillRect(x, 0, 3, 256);
      c.fillRect(0, 0, 512, 8);
      c.fillRect(0, 120, 512, 16);
      c.fillRect(0, 248, 512, 8);
    }
  };
  const map = canvasTex(512, 256, draw(false));
  const emissiveMap = canvasTex(256, 128, (c) => {
    c.scale(0.5, 0.5);
    draw(true)(c);
  });
  for (const t of [map, emissiveMap]) t.wrapS = THREE.RepeatWrapping;
  return siteMat('airport-glass', lit(toon('#ffffff', { map, emissiveMap, emissive: '#ffffff' }), 0.08, 1.05));
})();

/** A glazed wall from (x0, z0) to (x1, z1), `h` tall from `y`, facing out to the side `side` (+1: left of a→b), its pattern every 8 tiles */
export function glazing(b: Batch, x0: number, z0: number, x1: number, z1: number, y: number, h: number, out: 1 | -1) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const g = new THREE.PlaneGeometry(len, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) * len) / 8);
  // (a plane faces +z: turned so it faces out from the wall's line)
  const ang = Math.atan2(z1 - z0, x1 - x0);
  g.rotateY(-ang + (out === 1 ? Math.PI : 0));
  g.translate((x0 + x1) / 2, y + h / 2, (z0 + z1) / 2);
  b.add(g, GLASS);
}
