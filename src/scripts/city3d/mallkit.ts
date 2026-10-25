/*
 * Starlight Mall's and Palm Court's shared paint and helpers (mall3d.ts
 * outside, mallinside3d.ts inside): a modern mall (the owner's call): white
 * and grey cladding, glass curtain walls in black steel, timber, stone paving,
 * warm white light; the sign atlases of fixed made-up words; walls laid on in
 * world units, boxes, trees in planters.
 */
import * as THREE from 'three';
import { Batch, canvasTex, lit, neon, siteMat, toon } from './kit';
import { SLAB } from './world';

/* ---------- Paint ---------- */

export const WHITE = toon('#f1f1ee');
export const LIGHT = toon('#dcdfe2');
export const GREY = toon('#a7abb1');
export const MID = toon('#6c7178');
export const CHARCOAL = toon('#34373c');
export const STEEL = toon('#1f2125');
export const STONE = toon('#d2cbbd');
export const CONCRETE = toon('#bdb9b0');
export const ASPHALT = toon('#3a3c42');
export const PAINT = toon('#ecebe6');
export const YELLOW = toon('#f2c12e');
export const WATER = toon('#5aa3c4');
export const SPRAY = toon('#e4f4fb');
export const TRUNK = toon('#6f5238');
export const LEAF = toon('#4f8a3c');
export const LEAF_LIGHT = toon('#6aa24c');
export const SHRUB = toon('#3f7434');
export const SOIL = toon('#4e3d2f');
export const WOOD = toon('#a8743f');
export const GOLD = toon('#d9a94a');
export const DARK = toon('#141518');
/** The mall's one brand colour: deep teal */
export const TEAL = toon('#1f8f8a');
/** Warm white light: LED strips along canopies and slab edges, bulbs, the lit letters' glow */
export const LED = neon('#fff0d0', 0.25, 1.6);
export const BULB = neon('#ffe2a8', 0.3, 2.4);
export const TEAL_LED = neon('#3fd0c8', 0.25, 1.6);
/** Glass for balustrades, the vault, canopies and shelters: pale, see-through, both sides */
export const GLASS = siteMat('mall-glass', lit(toon('#cfe3ee', { transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }), 0.05, 0.35));
/** Light panels in ceilings and soffits, bright at night */
export const PANEL = siteMat('mall-panel', lit(toon('#fff6e6', { emissive: '#fff1d6' }), 0.15, 1.05));

/* ---------- Surfaces laid on in world units (`worldUV`: the size of a repeat, u and v) ---------- */

const seeded = (seed: number) => {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};
const shade = (hex: string, k: number) => {
  const c = new THREE.Color(hex).multiplyScalar(k);
  return `#${c.getHexString()}`;
};
/** A textured material laid on in world units (`rep`: world size of one repeat, u then v) */
function surface(key: string, w: number, h: number, rep: [number, number], draw: (c: CanvasRenderingContext2D) => void, night?: { draw: (c: CanvasRenderingContext2D) => void; day: number; lit: number }) {
  const map = canvasTex(w, h, draw);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  let m: THREE.Material;
  if (night) {
    const emissiveMap = canvasTex(w, h, night.draw);
    emissiveMap.wrapS = emissiveMap.wrapT = THREE.RepeatWrapping;
    m = lit(toon('#ffffff', { map, emissiveMap, emissive: '#ffffff' }), night.day, night.lit);
  } else m = toon('#ffffff', { map });
  m.userData.worldUV = rep;
  return siteMat(key, m);
}

/** Glass curtain wall in black steel mullions, a panel 1.6 square; warm light behind it at night */
export const CURTAIN = (() => {
  const panes = (c: CanvasRenderingContext2D, night: boolean) => {
    const r = seeded(31);
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        const [x, y] = [i * 128, j * 128];
        if (night) {
          const on = r() > 0.2;
          c.fillStyle = on ? '#ffd9a0' : '#3a2f22';
          c.fillRect(x, y, 128, 128);
          if (on) {
            c.fillStyle = '#ffe9c4';
            c.fillRect(x, y + 80, 128, 48);
          }
        } else {
          const g = c.createLinearGradient(x, y, x, y + 128);
          g.addColorStop(0, '#b4cad8');
          g.addColorStop(1, '#6a8398');
          c.fillStyle = g;
          c.fillRect(x, y, 128, 128);
          // (a reflection across it, and a shadowy interior low down)
          c.fillStyle = 'rgba(255,255,255,0.16)';
          c.beginPath();
          c.moveTo(x + 20 + r() * 30, y);
          c.lineTo(x + 70 + r() * 30, y);
          c.lineTo(x + 30, y + 128);
          c.lineTo(x, y + 128);
          c.fill();
          c.fillStyle = 'rgba(30,40,55,0.22)';
          c.fillRect(x, y + 92, 128, 36);
        }
      }
    c.fillStyle = night ? '#000000' : '#1f2125';
    for (const p of [0, 128, 256]) {
      c.fillRect(p - 3, 0, 6, 256);
      c.fillRect(0, p - 3, 256, 6);
    }
    // (a transom bar across each pane)
    c.fillRect(0, 88, 256, 3);
    c.fillRect(0, 216, 256, 3);
  };
  return surface('mall-curtain', 256, 256, [3.2, 3.2], (c) => panes(c, false), { draw: (c) => panes(c, true), day: 0.04, lit: 0.95 });
})();
/** Large-format cladding panels (2.4 x 1.2) with fine joints: light, and dark */
function cladding(key: string, base: string, joint: string) {
  return surface(key, 256, 128, [4.8, 2.4], (c) => {
    const r = seeded(key.length * 97);
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        c.fillStyle = shade(base, 0.96 + r() * 0.08);
        c.fillRect(i * 128, j * 64, 128, 64);
      }
    c.fillStyle = joint;
    for (const x of [0, 128, 256]) c.fillRect(x - 1, 0, 2, 128);
    for (const y of [0, 64, 128]) c.fillRect(0, y - 1, 256, 2);
  });
}
export const CLAD = cladding('mall-clad', '#e3e5e7', '#b4b8bd');
export const CLAD_DARK = cladding('mall-clad-dark', '#3d4147', '#232528');
/** White render, a faint trowel texture */
export const RENDER = surface('mall-render', 64, 64, [2.4, 2.4], (c) => {
  const r = seeded(5);
  c.fillStyle = '#f2f1ec';
  c.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 90; i++) {
    c.fillStyle = r() > 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.4)';
    c.fillRect(r() * 64, r() * 64, 2 + r() * 5, 1 + r() * 2);
  }
});
/** Vertical timber slats with dark gaps */
export const TIMBER = surface('mall-timber', 128, 64, [0.96, 1.2], (c) => {
  const r = seeded(11);
  for (let i = 0; i < 8; i++) {
    c.fillStyle = shade('#b07a47', 0.88 + r() * 0.22);
    c.fillRect(i * 16, 0, 13, 64);
    c.fillStyle = 'rgba(80,45,20,0.25)';
    for (let k = 0; k < 4; k++) c.fillRect(i * 16 + 2 + r() * 9, 0, 1, 64);
  }
  c.fillStyle = '#3b2716';
  for (let i = 0; i < 8; i++) c.fillRect(i * 16 + 13, 0, 3, 64);
});
/** Stone pavers outside, 1.2 x 0.6 in running bond */
export const PAVING = surface('mall-paving', 256, 256, [4.8, 4.8], (c) => {
  const r = seeded(23);
  const tones = ['#d8d2c6', '#cfc8ba', '#ddd8cd', '#d3ccbf'];
  c.fillStyle = '#b3ab9c';
  c.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++)
    for (let col = -1; col < 4; col++) {
      const x = col * 64 + (row % 2 ? 32 : 0);
      c.fillStyle = tones[Math.floor(r() * tones.length)];
      c.fillRect(x + 1, row * 32 + 1, 62, 30);
    }
});
/** The floors inside: polished pale stone tiles 1.2 square, a soft speckle, lit a little at night */
export const FLOOR = (() => {
  const draw = (c: CanvasRenderingContext2D) => {
    const r = seeded(41);
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        c.fillStyle = shade('#e7e6e2', 0.97 + r() * 0.05);
        c.fillRect(i * 64, j * 64, 64, 64);
      }
    for (let k = 0; k < 160; k++) {
      c.fillStyle = r() > 0.5 ? 'rgba(90,90,90,0.12)' : 'rgba(255,255,255,0.5)';
      c.fillRect(r() * 128, r() * 128, 1.5, 1.5);
    }
    c.fillStyle = '#c8c7c2';
    for (const p of [0, 64, 128]) {
      c.fillRect(p - 0.5, 0, 1, 128);
      c.fillRect(0, p - 0.5, 128, 1);
    }
  };
  return surface('mall-floor', 128, 128, [2.4, 2.4], draw, { draw, day: 0, lit: 0.4 });
})();
/** Perforated metal screen panels (the multi-storey): grey with rows of slots */
export const PERF = surface('mall-perf', 128, 128, [2.4, 2.4], (c) => {
  c.fillStyle = '#9aa0a6';
  c.fillRect(0, 0, 128, 128);
  c.fillStyle = '#4a4f55';
  for (let y = 4; y < 128; y += 10) for (let x = (y / 10) % 2 ? 2 : 8; x < 128; x += 12) c.fillRect(x, y, 4, 6);
  c.fillStyle = '#7d838a';
  for (const p of [0, 64, 128]) c.fillRect(p - 1, 0, 2, 128);
});

/** Shop windows: a warm-lit shop behind the glass (rails, shelves, goods, a mannequin), a black frame; lit at night */
export const FRONT = (() => {
  const draw = (night: boolean) => (c: CanvasRenderingContext2D) => {
    const r = seeded(17);
    c.fillStyle = night ? '#ffe7c2' : '#e9e2d6';
    c.fillRect(0, 0, 256, 128);
    const goods = ['#2f5d7c', '#b5523b', '#e8c24a', '#3f7a54', '#7a4a8c', '#2b2d33', '#d98a6c'];
    for (const x0 of [8, 136]) {
      // a rail of clothes, a shelf of goods, a mannequin
      c.fillStyle = '#5a5a5a';
      c.fillRect(x0 + 6, 30, 70, 3);
      for (let i = 0; i < 8; i++) {
        c.fillStyle = goods[Math.floor(r() * goods.length)];
        c.fillRect(x0 + 8 + i * 8.5, 33, 7, 34 + r() * 12);
      }
      c.fillStyle = '#c9c1b3';
      c.fillRect(x0 + 84, 70, 30, 3);
      for (let i = 0; i < 4; i++) {
        c.fillStyle = goods[Math.floor(r() * goods.length)];
        c.fillRect(x0 + 85 + i * 7, 58, 5, 12);
      }
      c.fillStyle = '#d6cfc3';
      c.fillRect(x0 + 92, 22, 10, 10);
      c.fillStyle = goods[Math.floor(r() * goods.length)];
      c.fillRect(x0 + 88, 32, 18, 34);
      c.fillStyle = '#9a9387';
      c.fillRect(x0, 104, 120, 24);
    }
    if (!night) {
      // the glass's reflection
      const g = c.createLinearGradient(0, 0, 256, 128);
      g.addColorStop(0, 'rgba(180,205,225,0.35)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.05)');
      g.addColorStop(1, 'rgba(160,185,210,0.3)');
      c.fillStyle = g;
      c.fillRect(0, 0, 256, 128);
    }
    c.fillStyle = night ? '#000000' : '#1f2125';
    c.fillRect(0, 0, 4, 128);
    c.fillRect(126, 0, 4, 128);
    c.fillRect(252, 0, 4, 128);
  };
  const map = canvasTex(256, 128, draw(false));
  const emissiveMap = canvasTex(256, 128, draw(true));
  for (const t of [map, emissiveMap]) t.wrapS = THREE.RepeatWrapping;
  return siteMat('mall-front', lit(toon('#ffffff', { map, emissiveMap, emissive: '#ffffff' }), 0.05, 1.0));
})();

/** An escalator's steps (grooved steel, a yellow edge each step): `dir` 1 runs up, -1 down (its texture slides that way: mallinside3d.ts) */
export function stepsMat(dir: 1 | -1) {
  const map = canvasTex(64, 64, (c) => {
    c.fillStyle = '#9a9ca4';
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = '#74767e';
    for (let x = 2; x < 64; x += 6) c.fillRect(x, 0, 2, 64);
    c.fillStyle = '#f2c12e';
    c.fillRect(0, 0, 64, 4);
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return siteMat(dir === 1 ? 'mall-steps-up' : 'mall-steps-down', toon('#ffffff', { map }));
}

/* ---------- Signs ---------- */

/** The sign lettering: a clean sans in caps, spaced */
const SIGN_FONT = 'Inter, "Helvetica Neue", Arial, sans-serif';
export type Sign = (b: Batch, text: string, x: number, y: number, z: number, w: number, h: number, ry: number) => void;
/**
 * A sign atlas for fixed made-up words (4 x 8 cells of 256 x 64), and how to lay one of them on: w x h, its
 * middle at (x, y, z), facing the way `ry` turns +z. Most are warm white letters on a charcoal panel; `light`
 * ones charcoal letters on white; TAXI and P the road signs' own colours.
 */
export function signAtlas(key: string, cells: string[], light: Set<string> = new Set()): Sign {
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
            const park = text === 'P';
            const pale = light.has(text);
            c.fillStyle = taxi ? '#f2c12e' : park ? '#2a5fc8' : pale ? '#f1f1ee' : '#26282c';
            c.fillRect(x + 2, y + 2, 252, 60);
            const ink = taxi ? '#1b1c20' : park ? '#ffffff' : pale ? '#26282c' : '#fff3df';
            let size = park ? 44 : 30;
            c.font = `600 ${size}px ${SIGN_FONT}`;
            (c as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = park ? '0px' : '3px';
            while (c.measureText(text).width > 226 && size > 14) c.font = `600 ${(size -= 1)}px ${SIGN_FONT}`;
            if (!pale && !taxi && !park) {
              c.shadowColor = 'rgba(255,220,160,0.6)';
              c.shadowBlur = 6;
            }
            c.fillStyle = ink;
            c.fillText(text, x + 128, y + 33);
            c.shadowBlur = 0;
          });
        }),
      }),
      0.95,
      1.25
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

/* ---------- Helpers ---------- */

export const Y = SLAB;
export const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: THREE.Material) => b.box(x0, y0, z0, x1 - x0, y1 - y0, z1 - z0, mat);
export const cyl = (b: Batch, r: number, h: number, x: number, y: number, z: number, mat: THREE.Material, seg = 10, r0 = r, open = false) => b.add(new THREE.CylinderGeometry(r, r0, h, seg, 1, open).translate(x, y + h / 2, z), mat);
/** A flat rectangle at y, in pieces no longer than `len` (a surface laid on in world units keeps its pattern across them) */
export function flat(b: Batch, x0: number, z0: number, x1: number, z1: number, y: number, mat: THREE.Material, len = 14) {
  const rep = mat.userData.worldUV as [number, number] | undefined;
  const nx = Math.max(1, Math.ceil((x1 - x0) / len));
  const nz = Math.max(1, Math.ceil((z1 - z0) / len));
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const [a0, a1] = [x0 + ((x1 - x0) * i) / nx, x0 + ((x1 - x0) * (i + 1)) / nx];
      const [c0, c1] = [z0 + ((z1 - z0) * j) / nz, z0 + ((z1 - z0) * (j + 1)) / nz];
      const g = new THREE.PlaneGeometry(a1 - a0, c1 - c0).rotateX(-Math.PI / 2).translate((a0 + a1) / 2, y, (c0 + c1) / 2);
      if (rep) {
        const uv = g.attributes.uv;
        const pos = g.attributes.position;
        for (let k = 0; k < uv.count; k++) uv.setXY(k, pos.getX(k) / rep[0], -pos.getZ(k) / rep[1]);
      }
      b.add(g, mat);
    }
}
/**
 * A wall face laid on in world units, from (ax, az) to (bx, bz), y0 to y1, facing `n` (a unit [x, z]), set `off`
 * out from the line; in pieces no longer than `len`, its pattern continuing across them (and from wall to wall
 * at the same heights)
 */
export function face(b: Batch, mat: THREE.Material, ax: number, az: number, bx: number, bz: number, y0: number, y1: number, n: [number, number], off = 0.012, len = 12) {
  const rep = (mat.userData.worldUV as [number, number] | undefined) ?? [1, y1 - y0];
  const L = Math.hypot(bx - ax, bz - az);
  const k = Math.max(1, Math.ceil(L / len));
  for (let i = 0; i < k; i++) {
    const [t0, t1] = [i / k, (i + 1) / k];
    const [p0x, p0z, p1x, p1z] = [ax + (bx - ax) * t0 + n[0] * off, az + (bz - az) * t0 + n[1] * off, ax + (bx - ax) * t1 + n[0] * off, az + (bz - az) * t1 + n[1] * off];
    // (u runs along the wall in world units, measured along its line, so pieces and walls in line match up)
    const [tx, tz] = [(bx - ax) / L, (bz - az) / L];
    const [u0, u1] = [(p0x * tx + p0z * tz) / rep[0], (p1x * tx + p1z * tz) / rep[0]];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([p0x, y0, p0z, p1x, y0, p1z, p1x, y1, p1z, p0x, y1, p0z], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, y0 / rep[1], u1, y0 / rep[1], u1, y1 / rep[1], u0, y1 / rep[1]], 2));
    // (wound to face `n`)
    const cross = (p1x - p0x) * n[1] - (p1z - p0z) * n[0];
    g.setIndex(cross > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
    g.computeVertexNormals();
    b.add(g, mat);
  }
}
/** A shop window on a wall facing +x (f 1) or -x at x, from z0 to z1, y0 to y1 (a window a 4 tiles of its texture) */
export function glassX(b: Batch, x: number, f: 1 | -1, z0: number, z1: number, y0: number, y1: number, mat: THREE.Material = FRONT) {
  const g = new THREE.PlaneGeometry(z1 - z0, y1 - y0);
  const uv = g.attributes.uv;
  for (let k = 0; k < uv.count; k++) uv.setX(k, (uv.getX(k) * (z1 - z0)) / 4);
  b.add(g.rotateY(f * (Math.PI / 2)).translate(x + f * 0.012, (y0 + y1) / 2, (z0 + z1) / 2), mat);
}
/** The same facing +z (f 1) or -z */
export function glassZ(b: Batch, z: number, f: 1 | -1, x0: number, x1: number, y0: number, y1: number, mat: THREE.Material = FRONT) {
  const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
  const uv = g.attributes.uv;
  for (let k = 0; k < uv.count; k++) uv.setX(k, (uv.getX(k) * (x1 - x0)) / 4);
  b.add(g.rotateY(f === 1 ? 0 : Math.PI).translate((x0 + x1) / 2, (y0 + y1) / 2, z + f * 0.012), mat);
}
/** A tree indoors or in a site's own planter (drawn in the site, not one of the city's): a trunk and a few rounded clumps of leaves */
export function tree(b: Batch, x: number, z: number, y: number, s = 1) {
  cyl(b, 0.07 * s, 1.5 * s, x, y, z, TRUNK, 6, 0.1 * s, true);
  for (const [dx, dy, dz, r, m] of [
    [0, 1.9, 0, 0.75, LEAF],
    [0.4, 1.6, 0.2, 0.5, LEAF_LIGHT],
    [-0.35, 1.65, -0.25, 0.5, LEAF],
    [0.05, 2.3, -0.1, 0.45, LEAF_LIGHT],
  ] as const)
    b.add(new THREE.IcosahedronGeometry(r * s, 0).translate(x + dx * s, y + dy * s, z + dz * s), m);
}
/** A square planter (stone, a timber bench lip on top, soil and low planting) of side `w`, its top at y0 + h */
export function planter(b: Batch, x: number, z: number, y0: number, w: number, h = 0.5) {
  box(b, x - w / 2, y0, z - w / 2, x + w / 2, y0 + h - 0.06, z + w / 2, STONE);
  box(b, x - w / 2 - 0.04, y0 + h - 0.06, z - w / 2 - 0.04, x + w / 2 + 0.04, y0 + h, z + w / 2 + 0.04, WOOD);
  b.add(new THREE.PlaneGeometry(w - 0.24, w - 0.24).rotateX(-Math.PI / 2).translate(x, y0 + h - 0.04, z), SOIL);
  b.detail(() => {
    for (const [dx, dz] of [
      [-0.28, -0.28],
      [0.3, -0.22],
      [-0.25, 0.3],
      [0.28, 0.26],
    ])
      b.add(new THREE.IcosahedronGeometry(0.2 * (w / 1.4), 0).scale(1, 0.7, 1).translate(x + dx * (w / 1.4), y0 + h + 0.02, z + dz * (w / 1.4)), SHRUB);
  });
}
