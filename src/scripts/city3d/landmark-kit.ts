/*
 * The landmarks' shared helpers (landmarks.ts, emporium.ts, armoury.ts): beams, cylinders, walls, signs,
 * a place's spot (its group, ring and pin), the painted textures (stencils, hazard boards, brick) and particles.
 */
import * as THREE from 'three';
import type { SpotId } from '../../lib/city';
import {
  Batch,
  FONT_MONO,
  PAL,
  canvasTex,
  fx,
  glowMat,
  glowTex,
  lit,
  plane,
  sidesBox,
} from './kit';
import { SLAB as S } from './world';
import type { Spot } from './landmarks';

/* ---------- Helpers ---------- */

export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const unitBox = new THREE.BoxGeometry(1, 1, 1);
export const Z = new THREE.Vector3(0, 0, 1);

/** A square beam between two points (lattice members, legs, braces). */
export function beam(b: Batch, a: THREE.Vector3, c: THREE.Vector3, t: number, mat: THREE.Material) {
  const dir = c.clone().sub(a);
  const len = dir.length();
  const g = unitBox.clone();
  g.applyMatrix4(
    new THREE.Matrix4().compose(
      a.clone().add(c).multiplyScalar(0.5),
      new THREE.Quaternion().setFromUnitVectors(Z, dir.normalize()),
      V(t, t, len)
    )
  );
  b.add(g, mat);
}

export function cylAt(b: Batch, x: number, y: number, z: number, r: number, h: number, mat: THREE.Material, seg = 12, r2 = r) {
  const g = new THREE.CylinderGeometry(r2, r, h, seg);
  g.translate(x, y + h / 2, z);
  b.add(g, mat);
}

/** A box whose four sides share one material and top/bottom another. */
export function walls(x: number, y: number, z: number, w: number, h: number, d: number, side: THREE.Material, top: THREE.Material) {
  const m = new THREE.Mesh(sidesBox(w, h, d), [side, top]);
  m.position.set(x + w / 2, y + h / 2, z + d / 2);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** A sign plane facing +z (front) or +x (side). */
export function sign(mat: THREE.Material, w: number, h: number, x: number, y: number, z: number, face: 'z' | 'x' = 'z', ry = 0) {
  const p = plane(w, h, mat);
  p.position.set(x, y, z);
  p.rotation.y = face === 'x' ? Math.PI / 2 : ry;
  return fx(p);
}

export const signMat = (tex: THREE.Texture, day = 1, night = 2, flicker = 0) =>
  lit(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }), day, night, flicker);
export const paintMat = (tex: THREE.Texture) => new THREE.MeshToonMaterial({ map: tex, transparent: true, alphaTest: 0.05 });

export function spot(scene: THREE.Scene, id: SpotId, focus: THREE.Vector3, size: number, pin: THREE.Vector3): Spot {
  const group = new THREE.Group();
  group.name = id;
  scene.add(group);
  const ring = new THREE.Mesh(new THREE.RingGeometry(size * 0.5, size * 0.5 + 0.14, 72), glowMat(PAL.cyan, 0, null));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(focus.x, S + 0.04, focus.z);
  scene.add(fx(ring));
  return { id, group, focus, size, pin, ring };
}

/* ---------- Textures ---------- */

export function stencil(label: string, wood = '#8a5a2b') {
  return canvasTex(256, 160, (ctx) => {
    ctx.fillStyle = wood;
    ctx.fillRect(0, 0, 256, 160);
    ctx.strokeStyle = '#5b3a1c';
    ctx.lineWidth = 6;
    for (let y = 0; y <= 160; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
    ctx.strokeRect(10, 10, 236, 140);
    ctx.font = `700 34px ${FONT_MONO}`;
    ctx.fillStyle = '#f3e3c3';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 128, 82);
  });
}

export function hazard(label: string | null, w = 1024, h = 128) {
  return canvasTex(w, h, (ctx) => {
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = PAL.ink;
    for (let x = -h; x < w + h; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 32, 0);
      ctx.lineTo(x + 32 - h, h);
      ctx.lineTo(x - h, h);
      ctx.fill();
    }
    if (label) {
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(w * 0.22, 10, w * 0.56, h - 20);
      ctx.fillStyle = PAL.ink;
      ctx.font = `700 ${h * 0.5}px ${FONT_MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '8px';
      ctx.fillText(label, w / 2, h / 2 + 2);
    }
  });
}

export function brick(cols: number, wall: string) {
  const W = cols * 64;
  const H = 256;
  const map = canvasTex(W, H, (ctx) => {
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0,0,0,.28)';
    ctx.lineWidth = 2;
    for (let y = 0; y < H; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      for (let x = (y / 12) % 2 ? 0 : 16; x < W; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 12);
        ctx.stroke();
      }
    }
    // Upper-floor windows
    for (let c = 0; c < cols; c++) {
      const x = c * 64 + 14;
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(x - 3, 22, 42, 66);
      ctx.fillStyle = c % 3 === 1 ? '#1c2246' : PAL.warm;
      ctx.fillRect(x, 25, 36, 60);
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(x + 16, 25, 3, 60);
      ctx.fillStyle = '#e8e4f8';
      ctx.fillRect(x - 6, 88, 48, 6);
    }
  });
  const emissiveMap = canvasTex(W, H, (ctx) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    for (let c = 0; c < cols; c++) {
      if (c % 3 === 1) continue;
      ctx.fillStyle = PAL.warm;
      ctx.fillRect(c * 64 + 14, 25, 36, 60);
    }
  });
  return lit(new THREE.MeshToonMaterial({ map, emissiveMap, emissive: '#ffffff' }), 0.1, 1.3);
}

/* ---------- Animated bits ---------- */

export function particles(n: number, color: string, size: number) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const mat = new THREE.PointsMaterial({ color, size, map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  return fx(new THREE.Points(geo, mat));
}

/* ======================================================================
   Buildings
   ====================================================================== */
export const unitPlane = new THREE.PlaneGeometry(1, 1);
