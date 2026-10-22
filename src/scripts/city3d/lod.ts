/*
 * Near and far forms for whole things (growth plan Phase 2): a parked lot of
 * cars, a landmark. Each switch has its near objects, its far stand-ins and
 * a box round it; every frame (`updateLods()`, from index.ts) the camera's
 * distance from the box picks which are shown, by the same rule as the tile
 * pieces (`isNear()` in tiles.ts: near within the tier's `far`, and once near
 * it stays near a little past it, so nothing flickers on the line).
 *
 * Only for objects nothing else shows or hides (a crowd's meshes, the kart
 * park's cones, anything a tick toggles stay out of a switch).
 */
import * as THREE from 'three';
import { boxDistance, isNear } from './tiles';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { litOf, nightU, toon } from './kit';

interface Switch {
  /** Show the near form (true) or the far one */
  apply(near: boolean): void;
  box: THREE.Box3;
  isNear: boolean;
}
const SWITCHES: Switch[] = [];

/** Call `apply(near)` whenever the camera crosses the swap distance from `box` (world numbers); it starts near */
export function addLodSwitch(apply: (near: boolean) => void, box: THREE.Box3) {
  const s: Switch = { apply, box: box.clone(), isNear: true };
  apply(true);
  SWITCHES.push(s);
  return s;
}

/** Show `near` close to the camera and `far` beyond, by the camera's distance from `box` (world numbers) */
export function addLod(near: THREE.Object3D[], far: THREE.Object3D[], box: THREE.Box3) {
  return addLodSwitch((on) => {
    for (const o of near) o.visible = on;
    for (const o of far) o.visible = !on;
  }, box);
}

/** Swap every switch for a camera at x, y, z (near within `far`) */
export function updateLods(x: number, y: number, z: number, far: number) {
  for (const s of SWITCHES) {
    const { min, max } = s.box;
    const near = isNear(boxDistance(x, y, z, min.x, min.y, min.z, max.x, max.y, max.z), far, s.isNear);
    if (near === s.isNear) continue;
    s.isNear = near;
    s.apply(near);
  }
}

/** How many switches are showing their far form (the ?fps readout) */
export const farLods = () => SWITCHES.filter((s) => !s.isNear).length;

/* ---------- A place's far form ---------- */

/**
 * The far forms' one material: toon shading coloured per vertex, plus a
 * glow per vertex (lit windows, neon, unlit signs) that follows the time of
 * day between its day and night brightness (`glowLit`), like the shared
 * neon. So every far form in the city shares one program, and a place far
 * away is a couple of draw calls however many materials it has up close.
 */
let farMaterial: THREE.MeshToonMaterial | null = null;
export function farFormMaterial() {
  if (farMaterial) return farMaterial;
  const m = toon('#ffffff', { vertexColors: true, name: 'far-form' });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = nightU;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 glow;\nattribute vec2 glowLit;\nuniform float uNight;\nvarying vec3 vGlow;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = glow * mix(glowLit.x, glowLit.y, uNight);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGlow;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vGlow;');
  };
  m.customProgramCacheKey = () => 'far-form';
  return (farMaterial = m);
}

/** A texture's average colour and cover (alpha), from a few pixels of it; white if it can't be read */
const averages = new WeakMap<THREE.Texture, { color: THREE.Color; alpha: number }>();
let avgCtx: CanvasRenderingContext2D | null = null;
function average(tex: THREE.Texture | null | undefined) {
  if (!tex) return null;
  const hit = averages.get(tex);
  if (hit) return hit;
  let out = { color: new THREE.Color(1, 1, 1), alpha: 1 };
  const img = tex.image as CanvasImageSource & { width?: number; height?: number; complete?: boolean };
  try {
    if (img && (img.width ?? 0) > 0 && img.complete !== false) {
      if (!avgCtx) {
        const c = document.createElement('canvas');
        c.width = c.height = 8;
        avgCtx = c.getContext('2d', { willReadFrequently: true })!;
      }
      const ctx = avgCtx;
      ctx.clearRect(0, 0, 8, 8);
      ctx.drawImage(img, 0, 0, 8, 8);
      const d = ctx.getImageData(0, 0, 8, 8).data;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let i = 0; i < d.length; i += 4) {
        const w = d[i + 3] / 255;
        r += d[i] * w;
        g += d[i + 1] * w;
        b += d[i + 2] * w;
        a += w;
      }
      const n = Math.max(a, 1e-3) * 255;
      out = { color: new THREE.Color().setRGB(r / n, g / n, b / n, tex.colorSpace === THREE.SRGBColorSpace ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace), alpha: a / 64 };
    }
  } catch {
    // (a texture from another origin can't be read: white)
  }
  averages.set(tex, out);
  return out;
}

/** What a material looks like from far away: its diffuse colour, its glow and how that follows the time of day; null to leave it out */
function lookOf(mat: THREE.Material) {
  const m = mat as THREE.MeshStandardMaterial & THREE.MeshBasicMaterial;
  if ((mat as THREE.ShaderMaterial).isShaderMaterial || mat.blending === THREE.AdditiveBlending || (mat.transparent && mat.opacity < 0.95)) return null;
  const tex = average(m.map);
  // A cut-out mostly see-through (a sign's letters): left out
  if (tex && (m.alphaTest > 0 || mat.transparent) && tex.alpha < 0.35) return null;
  const l = litOf(mat);
  const unlit = (m as THREE.MeshBasicMaterial).isMeshBasicMaterial;
  const color = (l?.base ?? m.color ?? new THREE.Color(1, 1, 1)).clone();
  if (tex) color.multiply(tex.color);
  const diffuse = new THREE.Color(0, 0, 0);
  const glow = new THREE.Color(0, 0, 0);
  let day = 1;
  let night = 1;
  if (unlit) {
    // Lights itself: all glow
    glow.copy(color);
    if (l) [day, night] = [l.day, l.night];
  } else {
    diffuse.copy(color);
    if (m.emissive && (m.emissive.r || m.emissive.g || m.emissive.b)) {
      glow.copy(m.emissive).multiply(average(m.emissiveMap)?.color ?? new THREE.Color(1, 1, 1));
      if (l) [day, night] = [l.day, l.night];
      else day = night = m.emissiveIntensity ?? 1;
    }
  }
  return { diffuse, glow, day, night, vertex: !!m.vertexColors, unlit };
}

/** Triangles smaller than this (tiles²) are left out of a far form: bolts, rivets, a handle */
const TINY = 0.0025;
/** Textured parts smaller than this (tiles²) too: signs and plaques */
const SMALL_SIGN = 1.5;

/** Every opaque mesh under `root` (not those `skip` names), in `inv`'s frame, coloured from its material, small triangles left out */
function flatten(root: THREE.Object3D, inv: THREE.Matrix4, skip: Set<THREE.Object3D>) {
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const glo: number[] = [];
  const lit: number[] = [];
  const m4 = new THREE.Matrix4();
  const nm = new THREE.Matrix3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  const e = new THREE.Vector3();
  const vc = new THREE.Color();
  const vx = new THREE.Color();
  const add = (geo: THREE.BufferGeometry, world: THREE.Matrix4, look: NonNullable<ReturnType<typeof lookOf>>, tint: THREE.Color | null, range: { start: number; count: number } | null) => {
    m4.multiplyMatrices(inv, world);
    nm.getNormalMatrix(m4);
    const p = geo.attributes.position;
    const no = geo.attributes.normal;
    const cc = look.vertex ? geo.attributes.color : undefined;
    // The shared neon carries each vertex's own day and night brightness (kit.ts)
    const dl = look.unlit ? (geo.attributes.lit as THREE.BufferAttribute | undefined) : undefined;
    const idx = geo.index;
    const start = range?.start ?? 0;
    const end = Math.min(idx ? idx.count : p.count, range ? start + range.count : Infinity);
    const ids = [0, 0, 0];
    for (let i = start; i + 2 < end; i += 3) {
      for (let k = 0; k < 3; k++) ids[k] = idx ? idx.getX(i + k) : i + k;
      a.fromBufferAttribute(p, ids[0]).applyMatrix4(m4);
      b.fromBufferAttribute(p, ids[1]).applyMatrix4(m4);
      c.fromBufferAttribute(p, ids[2]).applyMatrix4(m4);
      if (n.subVectors(b, a).cross(e.subVectors(c, a)).length() / 2 < TINY) continue;
      for (let k = 0; k < 3; k++) {
        const v = ids[k];
        const q = k === 0 ? a : k === 1 ? b : c;
        pos.push(q.x, q.y, q.z);
        if (no) n.fromBufferAttribute(no, v).applyMatrix3(nm).normalize();
        else n.set(0, 1, 0);
        nor.push(n.x, n.y, n.z);
        if (cc) vx.setRGB(cc.getX(v), cc.getY(v), cc.getZ(v));
        vc.copy(look.diffuse);
        if (cc) vc.multiply(vx);
        if (tint) vc.multiply(tint);
        col.push(vc.r, vc.g, vc.b);
        vc.copy(look.glow);
        if (cc && look.unlit) vc.multiply(vx);
        if (tint && look.unlit) vc.multiply(tint);
        glo.push(vc.r, vc.g, vc.b);
        if (dl) lit.push(dl.getX(v), dl.getY(v));
        else lit.push(look.day, look.night);
      }
    }
  };
  const world = new THREE.Matrix4();
  const tint = new THREE.Color();
  root.traverse((o) => {
    if (skip.has(o)) return;
    const mesh = o as THREE.Mesh & Partial<THREE.InstancedMesh>;
    if (!mesh.isMesh || (mesh as unknown as THREE.SkinnedMesh).isSkinnedMesh) return;
    // Hidden right now (a beacon off by day, a ghost): not part of the far form
    for (let p: THREE.Object3D | null = o; p && p !== root; p = p.parent) if (!p.visible) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    // A small textured part (a sign): a few pixels far away, left out
    if (!mesh.isInstancedMesh && mats.some((x) => (x as THREE.MeshBasicMaterial).map) && areaOf(mesh) < SMALL_SIGN) return;
    const groups = Array.isArray(mesh.material) && mesh.geometry.groups.length ? mesh.geometry.groups : [{ start: 0, count: Infinity, materialIndex: 0 }];
    for (const g of groups) {
      const look = lookOf(mats[g.materialIndex ?? 0]);
      if (!look) continue;
      if (mesh.isInstancedMesh) {
        // Fixed copies only (moving ones are drawn as they are)
        if (mesh.instanceMatrix!.usage !== THREE.StaticDrawUsage || mesh.count! > 2000) continue;
        for (let i = 0; i < mesh.count!; i++) {
          const im = mesh as THREE.InstancedMesh;
          im.getMatrixAt(i, world);
          world.premultiply(im.matrixWorld);
          if (im.instanceColor) im.getColorAt(i, tint);
          add(mesh.geometry, world, look, mesh.instanceColor ? tint : null, g.count === Infinity ? null : g);
        }
      } else add(mesh.geometry, mesh.matrixWorld, look, null, g.count === Infinity ? null : g);
    }
  });
  if (!pos.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('glow', new THREE.Float32BufferAttribute(glo, 3));
  geo.setAttribute('glowLit', new THREE.Float32BufferAttribute(lit, 2));
  return geo;
}

/** Whether a part must stay as it is at any distance: meant to be seen from far (the hologram, beams, a lit LED wall), see-through (glass), or moving */
function keeps(o: THREE.Object3D) {
  let keep = false;
  o.traverse((c) => {
    if (keep) return;
    if (c.userData.keep || (c as THREE.SkinnedMesh).isSkinnedMesh || (c as THREE.Points).isPoints || (c as THREE.Line).isLine) keep = true;
    const m = (c as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    // Shaders, glows and glass (see-through: what's behind it shows) stay as they are
    for (const mat of m ? (Array.isArray(m) ? m : [m]) : [])
      if ((mat as THREE.ShaderMaterial).isShaderMaterial || mat.blending === THREE.AdditiveBlending || (mat.transparent && mat.opacity < 0.95)) keep = true;
    if ((c as THREE.InstancedMesh).isInstancedMesh && (c as THREE.InstancedMesh).instanceMatrix.usage !== THREE.StaticDrawUsage) keep = true;
    // Inside a group, a big textured surface stays too (a facade of windows: flattened it would lose them)
    if (c !== o && isFacade(c)) keep = true;
  });
  return keep;
}

/** A big textured surface (a facade of windows, lit at night): far away it keeps its texture, merged with the place's others */
function isFacade(c: THREE.Object3D) {
  const m = c as THREE.Mesh;
  if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh) return false;
  const mats = (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshBasicMaterial[];
  return mats.some((x) => x.map && !(x.alphaTest > 0)) && areaOf(m) > FACADE;
}

/** A place's facades for its far form: their geometry in `inv`'s frame, merged per material (one draw each) */
function mergeFacades(list: THREE.Mesh[], inv: THREE.Matrix4) {
  const per = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const m4 = new THREE.Matrix4();
  for (const m of list) {
    m4.multiplyMatrices(inv, m.matrixWorld);
    const src = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const groups = Array.isArray(m.material) && m.geometry.groups.length ? m.geometry.groups : [{ start: 0, count: src.attributes.position.count, materialIndex: 0 }];
    for (const g of groups) {
      const part = new THREE.BufferGeometry();
      for (const name of ['position', 'normal', 'uv']) {
        const a = src.attributes[name] as THREE.BufferAttribute | undefined;
        const size = name === 'uv' ? 2 : 3;
        const arr = new Float32Array(Math.min(g.count, src.attributes.position.count - g.start) * size);
        if (a) arr.set((a.array as Float32Array).subarray(g.start * size, g.start * size + arr.length));
        part.setAttribute(name, new THREE.BufferAttribute(arr, size));
      }
      part.applyMatrix4(m4);
      const mat = mats[g.materialIndex ?? 0];
      if (!per.has(mat)) per.set(mat, []);
      per.get(mat)!.push(part);
    }
    src.dispose();
  }
  return [...per].map(([mat, geos]) => {
    const mesh = new THREE.Mesh(mergeGeometries(geos)!, mat);
    for (const g of geos) g.dispose();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  });
}

/** A textured surface bigger than this (tiles²) stays as it is far away (facades); smaller ones (signs) are flattened */
const FACADE = 6;
/** A mesh's surface area in the world (its triangles, scaled as it's placed) */
function areaOf(m: THREE.Mesh) {
  const p = m.geometry.attributes.position;
  const idx = m.geometry.index;
  const n = idx ? idx.count : p.count;
  const s = new THREE.Vector3();
  m.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), s);
  const k = Math.abs(s.x * s.y * s.z) ** (2 / 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let area = 0;
  for (let i = 0; i + 2 < n; i += 3) {
    a.fromBufferAttribute(p, idx ? idx.getX(i) : i);
    b.fromBufferAttribute(p, idx ? idx.getX(i + 1) : i + 1);
    c.fromBufferAttribute(p, idx ? idx.getX(i + 2) : i + 2);
    area += b.sub(a).cross(c.sub(a)).length() / 2;
  }
  return area * k;
}

/**
 * Give a place (a landmark's group, the garage...) a far form: everything in
 * it flattened into one mesh coloured per vertex (`farFormMaterial()`),
 * small triangles left out; the parts that must stay as they are (`keeps()`:
 * the hologram, beams, glows, anything moving) stay, at every distance. The
 * rest moves into a group of its own that's shown near the camera and hidden
 * far away, when the far form is shown instead (`addLod()`). Code that shows
 * or hides a part of it still can: the swap only touches the two groups.
 */
export function farForm(group: THREE.Object3D) {
  group.updateMatrixWorld(true);
  const parts = [...group.children].filter((c) => !keeps(c));
  if (!parts.length) return null;
  const nearRoot = new THREE.Group();
  nearRoot.name = `${group.name || 'place'}-near`;
  for (const c of parts) nearRoot.add(c);
  group.add(nearRoot);
  nearRoot.updateMatrixWorld(true);
  const inv = group.matrixWorld.clone().invert();
  // The facades keep their textures (merged per material); everything else is flattened
  const facades = parts.filter(isFacade) as THREE.Mesh[];
  const geo = flatten(nearRoot, inv, new Set(facades));
  const farRoot = new THREE.Group();
  farRoot.name = `${group.name || 'place'}-far`;
  if (geo) {
    const flat = new THREE.Mesh(geo, farFormMaterial());
    flat.castShadow = true;
    flat.receiveShadow = true;
    farRoot.add(flat);
  }
  for (const m of mergeFacades(facades, inv)) farRoot.add(m);
  if (!farRoot.children.length) return null;
  group.add(farRoot);
  const box = new THREE.Box3().setFromObject(nearRoot);
  return addLod([nearRoot], [farRoot], box);
}
