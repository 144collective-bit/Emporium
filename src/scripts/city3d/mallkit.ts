/*
 * Starlight Mall's and Palm Court's shared paint and helpers (mall3d.ts outside,
 * mallinside3d.ts inside): the pastels, chrome, neon, the shop windows, the
 * checkered paving, the sign atlases of fixed made-up words, boxes, palms.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, lit, neon, siteMat, toon } from './kit';
import { SLAB } from './world';
import { FILMS } from './uptownsites';
import { ANCHORS, CINEMA, MALL_NAME, SHOP_NAMES } from './mall';

/* ---------- Paint ---------- */

export const CHROME = toon('#d9dee8');
export const WHITE = toon('#f6f3fb');
export const DARK = toon('#2a2740');
export const INK = toon('#1b1830');
export const NAVY = toon('#241a4d');
export const LILAC = toon('#c7a6ff');
export const TEAL = toon('#5fd6c4');
export const PEACH = toon('#ffc48c');
export const CONCRETE = toon('#b9b4c9');
export const ASPHALT = toon('#2c2a44');
export const PAINT = toon('#e8e4f8');
export const YELLOW = toon('#ffd23f');
export const WATER = toon('#62c6ea');
export const SPRAY = toon('#dff6ff');
export const TRUNK = toon('#9a7350');
export const FROND = toon('#2fbf71');
export const POT = toon('#ff9ec7');
export const WOOD = toon('#a8743f');
export const PINK_NEON = neon('#ff4fd8', 0.3, 2.4);
export const CYAN_NEON = neon('#4fe3ff', 0.3, 2.4);
export const YELLOW_NEON = neon('#ffd23f', 0.3, 2.4);
export const PURPLE_NEON = neon('#9d5cff', 0.3, 2.4);
export const NEONS = [PINK_NEON, CYAN_NEON, YELLOW_NEON, PURPLE_NEON];
export const BULB = neon('#ffe9a8', 0.3, 2.4);
export const SKY = lit(toon('#9fd8f0'), 0.15, 1.1);
const pastel = new Map<string, THREE.Material>();
export const wallOf = (c: string) => pastel.get(c) ?? (pastel.set(c, toon(c)), pastel.get(c)!);

/** Shop windows: displays behind glass in a chrome frame, lit warm at night (a pattern every 4 tiles) */
export const FRONT = (() => {
  const draw = (on: boolean) => (c: CanvasRenderingContext2D) => {
    c.fillStyle = on ? '#000' : '#d9dee8';
    c.fillRect(0, 0, 256, 128);
    for (const x of [6, 134]) {
      if (on) {
        c.fillStyle = '#ffd99a';
        c.fillRect(x, 6, 116, 116);
        c.fillStyle = '#ff9ec7';
        c.fillRect(x + 10, 70, 96, 10);
        continue;
      }
      const g = c.createLinearGradient(x, 6, x + 116, 122);
      g.addColorStop(0, '#9fe8ff');
      g.addColorStop(0.6, '#6a7fd0');
      g.addColorStop(1, '#4b3b8f');
      c.fillStyle = g;
      c.fillRect(x, 6, 116, 116);
      // (shelves and goods behind the glass)
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.fillRect(x + 10, 70, 96, 6);
      c.fillRect(x + 10, 100, 96, 6);
      c.fillStyle = 'rgba(255,158,199,0.55)';
      for (let i = 0; i < 5; i++) c.fillRect(x + 14 + i * 19, 56, 12, 14);
    }
  };
  const map = canvasTex(256, 128, draw(false));
  const emissiveMap = canvasTex(128, 64, (c) => {
    c.scale(0.5, 0.5);
    draw(true)(c);
  });
  for (const t of [map, emissiveMap]) t.wrapS = THREE.RepeatWrapping;
  return siteMat('mall-front', lit(toon('#ffffff', { map, emissiveMap, emissive: '#ffffff' }), 0.06, 1.05));
})();
/** The promenade's checkered paving (pink and white, a tile a square) */
export const TILES = (() => {
  const map = canvasTex(128, 128, (c) => {
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        c.fillStyle = (i + j) % 2 ? '#f6f3fb' : '#ffb3d6';
        c.fillRect(i * 64, j * 64, 64, 64);
      }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return siteMat('mall-tiles', toon('#ffffff', { map }));
})();

/** Glass for the balustrades and the vault: pale, see-through, both sides */
export const GLASS = siteMat('mall-glass', lit(toon('#cfefff', { transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false }), 0.05, 0.4));
/** The floors inside: white terrazzo with 80s confetti (laid on in world units by `flat()`), lit a little at night */
export const TERRAZZO = (() => {
  const map = canvasTex(128, 128, (c) => {
    c.fillStyle = '#f6f3fb';
    c.fillRect(0, 0, 128, 128);
    const ink = ['#ff4fd8', '#4fe3ff', '#ffd23f', '#9d5cff', '#5fd6c4'];
    let s = 7;
    const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 34; i++) {
      c.fillStyle = ink[i % ink.length];
      c.save();
      c.translate(r() * 128, r() * 128);
      c.rotate(r() * Math.PI);
      if (i % 3 === 0) c.fillRect(-4, -1, 8, 2);
      else if (i % 3 === 1) {
        c.beginPath();
        c.moveTo(-3, 2);
        c.lineTo(0, -3);
        c.lineTo(3, 2);
        c.fill();
      } else c.fillRect(-1.5, -1.5, 3, 3);
      c.restore();
    }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const m = siteMat('mall-terrazzo', lit(toon('#ffffff', { map, emissiveMap: map, emissive: '#ffffff' }), 0, 0.5));
  m.userData.worldUV = 5;
  return m;
})();
/** Light panels in the ceilings, bright at night */
export const PANEL = siteMat('mall-panel', lit(toon('#fff6e6', { emissive: '#fff1d6' }), 0.15, 1.05));
/** An escalator's steps (grooved steel, a yellow edge each step): `dir` 1 runs up, -1 down (its texture slides that way: mallinside3d.ts) */
export function stepsMat(dir: 1 | -1) {
  const map = canvasTex(64, 64, (c) => {
    c.fillStyle = '#8a8ca0';
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = '#6a6c80';
    for (let x = 2; x < 64; x += 6) c.fillRect(x, 0, 2, 64);
    c.fillStyle = '#ffd23f';
    c.fillRect(0, 0, 64, 5);
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return siteMat(dir === 1 ? 'mall-steps-up' : 'mall-steps-down', toon('#ffffff', { map }));
}

/** The outside's signs: the shops, the anchors, the cinema, the mall, the court, and the rest */
const CELLS = [...SHOP_NAMES.map((s) => s.name), ...ANCHORS.map((a) => a.name), CINEMA.name, 'NOW SHOWING', MALL_NAME, 'PALM COURT', 'TAXI', 'BUS', 'P', 'ENTRANCE'];
const CELL_INK = ['#ff4fd8', '#4fe3ff', '#ffd23f', '#9dffb0', '#c7a6ff'];
export type Sign = (b: Batch, text: string, x: number, y: number, z: number, w: number, h: number, ry: number) => void;
/** A sign atlas for fixed made-up words (4 x 8 cells of 256 x 64), and how to lay one of them on: w x h, its middle at (x, y, z), facing the way `ry` turns +z */
export function signAtlas(key: string, cells: string[]): Sign {
  const mat = siteMat(
    key,
    lit(
      new THREE.MeshBasicMaterial({
        map: canvasTex(1024, 512, (c) => {
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          cells.forEach((text, k) => {
            const [x, y] = [(k % 4) * 256, Math.floor(k / 4) * 64];
            const taxi = text === 'TAXI';
            c.fillStyle = taxi ? '#ffc23d' : text === 'P' ? '#2a62d8' : '#160f2e';
            c.fillRect(x + 2, y + 2, 252, 60);
            const ink = taxi ? '#1b1830' : text === 'P' ? '#ffffff' : CELL_INK[k % CELL_INK.length];
            c.font = `800 ${text.length > 12 ? 30 : 38}px ${FONT_DISPLAY}`;
            c.shadowColor = ink;
            c.shadowBlur = taxi || text === 'P' ? 0 : 12;
            c.fillStyle = ink;
            c.fillText(text, x + 128, y + 34);
            c.shadowBlur = 0;
            c.fillStyle = '#ffffff';
            c.globalAlpha = taxi || text === 'P' ? 0 : 0.55;
            c.fillText(text, x + 128, y + 34);
            c.globalAlpha = 1;
          });
        }),
      }),
      0.95,
      1.4
    )
  );
  return (b, text, x, y, z, w, h, ry) => {
    const k = cells.indexOf(text);
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv;
    const [u0, v1] = [(k % 4) / 4 + 0.003, 1 - Math.floor(k / 4) / 8 - 0.004];
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (0.25 - 0.006), v1 - (1 - uv.getY(i)) * (0.125 - 0.008));
    b.add(g.rotateY(ry).translate(x, y, z), mat);
  };
}
export const sign = signAtlas('mall-signs', CELLS);
/** The cinema's posters for made-up films, four to a row, two rows */
export const POSTERS = siteMat(
  'mall-posters',
  lit(
    new THREE.MeshBasicMaterial({
      map: canvasTex(512, 512, (c) => {
        const tops = ['#ff4fd8', '#4fe3ff', '#ffd23f', '#9d5cff', '#ff8a3d', '#5fd6c4'];
        FILMS.forEach((name, k) => {
          const [x, y] = [(k % 4) * 128, Math.floor(k / 4) * 256];
          const g = c.createLinearGradient(0, y, 0, y + 256);
          g.addColorStop(0, tops[k % tops.length]);
          g.addColorStop(1, '#160f2e');
          c.fillStyle = g;
          c.fillRect(x + 4, y + 4, 120, 248);
          // (a sun over a horizon, the 80s way)
          c.fillStyle = '#ffd23f';
          c.beginPath();
          c.arc(x + 64, y + 120, 30, Math.PI, 0);
          c.fill();
          c.fillStyle = '#160f2e';
          for (let i = 0; i < 4; i++) c.fillRect(x + 30, y + 100 + i * 6, 68, 2);
          c.fillStyle = '#ffffff';
          c.textAlign = 'center';
          c.font = `800 17px ${FONT_DISPLAY}`;
          const [a, ...rest] = name.split(' ');
          c.fillText(a, x + 64, y + 186);
          c.fillText(rest.join(' '), x + 64, y + 208);
        });
      }),
    }),
    0.95,
    1.2
  )
);
export function poster(b: Batch, k: number, x: number, y: number, z: number, ry: number) {
  const g = new THREE.PlaneGeometry(1.1, 2.2);
  const uv = g.attributes.uv;
  const [u0, v1] = [(k % 4) / 4 + 0.004, 1 - Math.floor(k / 4) / 2 - 0.004];
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (0.25 - 0.008), v1 - (1 - uv.getY(i)) * (0.5 - 0.008));
  b.add(g.rotateY(ry).translate(x, y, z), POSTERS);
}
/** The pylon's faces: STARLIGHT MALL down its length */
export const PYLON_FACE = siteMat(
  'mall-pylon',
  lit(
    new THREE.MeshBasicMaterial({
      map: canvasTex(128, 512, (c) => {
        c.fillStyle = '#160f2e';
        c.fillRect(0, 0, 128, 512);
        c.strokeStyle = '#4fe3ff';
        c.lineWidth = 6;
        c.strokeRect(6, 6, 116, 500);
        c.save();
        c.translate(64, 256);
        c.rotate(-Math.PI / 2);
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = `800 64px ${FONT_DISPLAY}`;
        c.shadowColor = '#ff4fd8';
        c.shadowBlur = 16;
        c.fillStyle = '#ff4fd8';
        c.fillText(MALL_NAME, 0, 4);
        c.shadowBlur = 0;
        c.fillStyle = '#ffffff';
        c.globalAlpha = 0.55;
        c.fillText(MALL_NAME, 0, 4);
        c.restore();
      }),
    }),
    0.95,
    1.4
  )
);

/* ---------- Helpers ---------- */

export const Y = SLAB;
export const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: THREE.Material) => b.box(x0, y0, z0, x1 - x0, y1 - y0, z1 - z0, mat);
export const cyl = (b: Batch, r: number, h: number, x: number, y: number, z: number, mat: THREE.Material, seg = 10, r0 = r, open = false) => b.add(new THREE.CylinderGeometry(r, r0, h, seg, 1, open).translate(x, y + h / 2, z), mat);
/** A flat rectangle at y, in pieces no longer than `len` */
export function flat(b: Batch, x0: number, z0: number, x1: number, z1: number, y: number, mat: THREE.Material, len = 14) {
  const nx = Math.max(1, Math.ceil((x1 - x0) / len));
  const nz = Math.max(1, Math.ceil((z1 - z0) / len));
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const [a0, a1] = [x0 + ((x1 - x0) * i) / nx, x0 + ((x1 - x0) * (i + 1)) / nx];
      const [c0, c1] = [z0 + ((z1 - z0) * j) / nz, z0 + ((z1 - z0) * (j + 1)) / nz];
      const g = new THREE.PlaneGeometry(a1 - a0, c1 - c0).rotateX(-Math.PI / 2).translate((a0 + a1) / 2, y, (c0 + c1) / 2);
      // (the paving laid on in world units: a square a tile, or `worldUV` tiles to a repeat)
      const rep = mat === TILES ? 2 : (mat.userData.worldUV as number | undefined);
      if (rep) {
        const uv = g.attributes.uv;
        const pos = g.attributes.position;
        for (let k = 0; k < uv.count; k++) uv.setXY(k, pos.getX(k) / rep, pos.getZ(k) / rep);
      }
      b.add(g, mat);
    }
}
/** A shopfront's glass on a wall facing +x (face 1) or -x at x, from z0 to z1, y0 to y1 */
export function glassX(b: Batch, x: number, face: 1 | -1, z0: number, z1: number, y0: number, y1: number) {
  const g = new THREE.PlaneGeometry(z1 - z0, y1 - y0);
  const uv = g.attributes.uv;
  for (let k = 0; k < uv.count; k++) uv.setX(k, (uv.getX(k) * (z1 - z0)) / 4);
  b.add(g.rotateY(face * (Math.PI / 2)).translate(x + face * 0.012, (y0 + y1) / 2, (z0 + z1) / 2), FRONT);
}
/** The same facing +z (face 1) or -z */
export function glassZ(b: Batch, z: number, face: 1 | -1, x0: number, x1: number, y0: number, y1: number) {
  const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
  const uv = g.attributes.uv;
  for (let k = 0; k < uv.count; k++) uv.setX(k, (uv.getX(k) * (x1 - x0)) / 4);
  b.add(g.rotateY(face === 1 ? 0 : Math.PI).translate((x0 + x1) / 2, (y0 + y1) / 2, z + face * 0.012), FRONT);
}
/** A palm in its planter */
export function palm(b: Batch, x: number, z: number, y = Y, s = 1) {
  cyl(b, 0.42 * s, 0.5, x, y, z, POT, 8, 0.5 * s);
  // (the trunk in three leaning pieces)
  let [px, py] = [x, y + 0.45];
  for (let i = 0; i < 3; i++) {
    const nx = px + 0.08 * s;
    cyl(b, 0.09 * s, 1.15 * s, (px + nx) / 2, py, z, TRUNK, 6, 0.12 * s, true);
    [px, py] = [nx, py + 1.12 * s];
  }
  // (fronds drooping all round)
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    const g = new THREE.ConeGeometry(0.22 * s, 1.7 * s, 4).scale(1, 1, 0.25).rotateZ(-Math.PI / 2 - 0.45).rotateY(a).translate(px + Math.cos(a) * 0.7 * s, py - 0.25 * s, z - Math.sin(a) * 0.7 * s);
    b.add(g, FROND);
  }
}

