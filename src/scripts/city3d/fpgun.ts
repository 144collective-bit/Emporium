/*
 * The gun hands, polished (docs/firstperson-plan.md, Phase 3): a chunk of its own, fetched the first time the
 * first-person gun hands show (viewmodel.ts's `fine`); until it's in, the hands wear the plain sleeves and flash.
 * The rules and shapes are fpgunkit.ts's (DOM-free, tested). This draws them:
 * - the sleeve of every top round the wrist, the watch, the fatigues' gloves (`dress()`);
 * - each gun's own flash (`flash()`: the star or the round burst, its length and width, a brake's side jets);
 * - spent cases out of the port, flung right and up and falling away, the shotgun's red hull on the pump
 *   (`shot()`, one instanced mesh), and smoke curling off the barrel after a string (one more), both in a group
 *   that stands at the eye with the world's turn, so they hang in the world as he looks round, and both left out
 *   under reduced motion;
 * - the light on the hands (`update()`): the moon's cool cast at night and the nearest street lamp's colour,
 *   white or sodium (world.ts `lampTone()`), into the viewmodel's shared `tint`.
 * Like the hands, the cases and the smoke are built K times out and drawn in the depth buffer's front sliver.
 */
import * as THREE from 'three';
import { fx, liveTex } from './kit';
import type { WeaponId } from './combat-sim';
import type { Outfit } from './wardrobe';
import { lampTone, placed } from './world';
import { CASE, EJECT, FLASH, SMOKE, byColour, handColor, lampLight, sleeveParts, smokeFor } from './fpgunkit';

export interface FpGunDeps {
  scene: THREE.Scene;
  /** How many times out the viewmodel is built (its K) */
  K: number;
  /** The viewmodel's own flat paint for a colour (shared, lit by `level` and `tint`) */
  paint: (color: string) => THREE.Material;
  /** Into the depth buffer's front sliver, never culled, no shadows */
  upFront: (o: THREE.Object3D) => void;
  /** The shading's night level and the light's colour (the viewmodel's uniforms) */
  level: { value: number };
  tint: { value: THREE.Color };
}

const BRASS = new THREE.Color('#d9a73c');
const HULL = new THREE.Color('#b8322a');

/** A round burst: a hot core and a ring of short, even spikes (the shotgun's, the revolver's) */
const burstTex = liveTex(128, 128, (c) => {
  c.translate(64, 64);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 62);
  g.addColorStop(0, 'rgba(255,255,240,1)');
  g.addColorStop(0.45, 'rgba(255,206,96,.95)');
  g.addColorStop(1, 'rgba(255,96,40,0)');
  c.fillStyle = g;
  c.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 ? 40 : 62;
    c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
  c.fill();
});
/** A soft puff of smoke */
const smokeTex = liveTex(64, 64, (c) => {
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 31);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);
});

export function createFpGun(d: FpGunDeps) {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The cases and the smoke: at the eye, the world's way up, K times out
  const fxRoot = new THREE.Group();
  fxRoot.scale.setScalar(d.K);
  d.scene.add(fxRoot);

  /* ----- Spent cases ----- */
  const caseMat = new THREE.ShaderMaterial({
    uniforms: { level: d.level, tint: d.tint },
    vertexShader: /* glsl */ `
      attribute vec3 aCol;
      varying vec3 vN;
      varying vec3 vC;
      void main() {
        vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
        vC = aCol;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float level;
      uniform vec3 tint;
      varying vec3 vN;
      varying vec3 vC;
      void main() {
        float d = dot(normalize(vN), normalize(vec3(-0.4, 0.8, 0.45)));
        float band = d > 0.42 ? 1.0 : d > -0.12 ? 0.74 : 0.52;
        // (brass catches a glint)
        float glint = d > 0.9 ? 0.35 : 0.0;
        gl_FragColor = vec4((vC * band + glint) * level * tint, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  // (each case's colour its own attribute: a shader material isn't handed three's instance colours)
  const caseGeo = new THREE.CylinderGeometry(1, 1, 1, 8).deleteAttribute('uv');
  const caseCol = new THREE.InstancedBufferAttribute(new Float32Array(CASE.max * 3), 3).setUsage(THREE.DynamicDrawUsage);
  caseGeo.setAttribute('aCol', caseCol);
  const cases = new THREE.InstancedMesh(caseGeo, caseMat, CASE.max);
  cases.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  cases.count = 0;
  fxRoot.add(cases);
  d.upFront(cases);
  const live: { p: THREE.Vector3; v: THREE.Vector3; q: THREE.Quaternion; spin: THREE.Quaternion; s: THREE.Vector3; age: number; hull: boolean }[] = [];
  const pending: { id: WeaponId; at: number }[] = [];

  /* ----- Smoke ----- */
  const smokeMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: smokeTex }, level: d.level, tint: d.tint },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      attribute vec2 aPuff;
      varying vec2 vUv;
      varying vec2 vC;
      void main() {
        vUv = uv;
        vC = aPuff;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform float level;
      uniform vec3 tint;
      varying vec2 vUv;
      varying vec2 vC;
      void main() {
        float a = texture2D(map, vUv).a * vC.x;
        gl_FragColor = vec4(vec3(vC.y) * level * tint, a);
        #include <colorspace_fragment>
      }
    `,
  });
  // (each puff's alpha and grey)
  const puffGeo = new THREE.PlaneGeometry(1, 1);
  const puffAttr = new THREE.InstancedBufferAttribute(new Float32Array(SMOKE.count * 2), 2).setUsage(THREE.DynamicDrawUsage);
  puffGeo.setAttribute('aPuff', puffAttr);
  const smoke = new THREE.InstancedMesh(puffGeo, smokeMat, SMOKE.count);
  smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  smoke.count = 0;
  smoke.renderOrder = 2;
  fx(smoke);
  fxRoot.add(smoke);
  d.upFront(smoke);
  const puffs: { p: THREE.Vector3; v: THREE.Vector3; age: number; spin: number }[] = [];
  let string = 0;
  let sinceShot = 1e9;
  let smoking = 0;
  let puffT = 0;
  let smokeId: WeaponId = 'rifle';

  /* ----- The light ----- */
  const tones: string[] = [];
  const want = new THREE.Color(1, 1, 1);
  let lookT = 0;

  const v = new THREE.Vector3();
  const w = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const m4 = new THREE.Matrix4();
  const ACROSS = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
  let t = 0;

  /** The eye's offset of a point on the gun (its frame), true size (the viewmodel is K out) */
  const fromEye = (gun: THREE.Object3D, camera: THREE.Camera, p: THREE.Vector3, out: THREE.Vector3) => gun.localToWorld(out.copy(p)).sub(camera.position).divideScalar(d.K);

  function eject(id: WeaponId, gun: THREE.Object3D, camera: THREE.Camera) {
    const e = EJECT[id];
    if (!e) return;
    if (live.length >= CASE.max) live.shift();
    const p = fromEye(gun, camera, v.set(...e.port), new THREE.Vector3());
    const dir = w.set(...e.dir).transformDirection(gun.matrixWorld);
    const vel = dir.multiplyScalar(e.speed * (0.85 + Math.random() * 0.3));
    vel.y += Math.random() * 0.35;
    gun.getWorldQuaternion(q);
    const axis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    live.push({ p, v: vel.clone(), q: q.clone().multiply(ACROSS), spin: new THREE.Quaternion().setFromAxisAngle(axis, CASE.spin / 60), s: new THREE.Vector3(e.r, e.len, e.r), age: 0, hull: !!e.hull });
  }

  return {
    /** Dress one arm: its sleeve's parts (a mesh a colour) round the wrist `at` up `dir`, the hand's colour */
    dress(clothes: THREE.Group, hand: THREE.Mesh, o: Outfit, side: -1 | 1, at: THREE.Vector3, dir: THREE.Vector3) {
      clothes.traverse((c) => (c as THREE.Mesh).geometry?.dispose());
      clothes.clear();
      for (const p of byColour(sleeveParts(o, side, at, dir))) clothes.add(new THREE.Mesh(p.geo, d.paint(p.color)));
      hand.material = d.paint(handColor(o));
    },
    /** Shape the flash for the gun in hand: the planes along the barrel, the face-on one, a brake's jets */
    flash(id: WeaponId, flash: THREE.Group, mat: THREE.MeshBasicMaterial, star: THREE.Texture) {
      const f = FLASH[id];
      const m = mat.clone();
      m.map = f.shape === 'burst' ? burstTex : star;
      flash.traverse((c) => (c as THREE.Mesh).geometry?.dispose());
      flash.clear();
      for (const rz of [0, Math.PI / 2]) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(0.2 * f.len, 0.1 * f.wide).rotateY(Math.PI / 2), m);
        p.rotation.z = rz;
        flash.add(p);
      }
      flash.add(new THREE.Mesh(new THREE.PlaneGeometry(0.11 * f.front, 0.11 * f.front), m));
      if (f.brake)
        for (const s of [-1, 1]) {
          // (the brake's ports throw the flash out to either side, just behind the muzzle)
          const jet = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.045), m);
          jet.position.set(s * 0.05, 0, -0.06);
          flash.add(jet);
        }
      fx(flash);
      return f.life;
    },
    /** A shot from `id`: its case out of the port (or on the pump), and the string that smokes after */
    shot(id: WeaponId, gun: THREE.Object3D, camera: THREE.Camera) {
      string++;
      sinceShot = 0;
      smokeId = id;
      smoking = 0;
      if (reduced) return;
      const e = EJECT[id];
      if (!e) return;
      if (e.delay > 0) pending.push({ id, at: t + e.delay });
      else eject(id, gun, camera);
    },
    /** Each frame the hands show, after they're placed: the cases, the smoke and the light */
    update(dt: number, camera: THREE.Camera, gun: THREE.Object3D, id: WeaponId, muzzle: THREE.Vector3, night: number) {
      t += dt;
      fxRoot.visible = true;
      fxRoot.position.copy(camera.position);
      fxRoot.updateMatrixWorld();
      // The shotgun's hull on the pump
      for (let i = pending.length - 1; i >= 0; i--)
        if (t >= pending[i].at) {
          if (pending[i].id === id) eject(id, gun, camera);
          pending.splice(i, 1);
        }
      // The cases' flight
      for (let i = live.length - 1; i >= 0; i--) {
        const c = live[i];
        c.age += dt;
        if (c.age > CASE.life) {
          live.splice(i, 1);
          continue;
        }
        c.v.y -= CASE.gravity * dt;
        c.p.addScaledVector(c.v, dt);
        c.q.multiply(c.spin);
      }
      cases.count = live.length;
      live.forEach((c, i) => {
        // (shrinking away at the end of its life, long out of view by then)
        const k = Math.min(1, (CASE.life - c.age) / 0.08);
        cases.setMatrixAt(i, m4.compose(c.p, c.q, v.copy(c.s).multiplyScalar(k)));
        const cc = c.hull ? HULL : BRASS;
        caseCol.setXYZ(i, cc.r, cc.g, cc.b);
      });
      cases.instanceMatrix.needsUpdate = true;
      caseCol.needsUpdate = true;
      // The smoke: once the string's over, puffs off the muzzle for a while, rising and spreading as they fade
      sinceShot += dt;
      if (string > 0 && sinceShot > SMOKE.gap) {
        smoking = reduced ? 0 : smokeFor(smokeId, string);
        string = 0;
      }
      if (smoking > 0 && id === smokeId) {
        smoking -= dt;
        puffT -= dt;
        if (puffT <= 0 && puffs.length < SMOKE.count) {
          puffT = SMOKE.puff;
          const p = fromEye(gun, camera, muzzle, new THREE.Vector3());
          puffs.push({ p, v: new THREE.Vector3((Math.random() - 0.5) * 0.04, SMOKE.rise * (0.7 + Math.random() * 0.6), (Math.random() - 0.5) * 0.04), age: 0, spin: Math.random() * Math.PI * 2 });
        }
      }
      camera.getWorldQuaternion(q);
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.age += dt;
        if (p.age > SMOKE.life) puffs.splice(i, 1);
        else p.p.addScaledVector(p.v, dt);
      }
      smoke.count = puffs.length;
      puffs.forEach((p, i) => {
        const u = p.age / SMOKE.life;
        const size = 0.028 + 0.11 * u;
        smoke.setMatrixAt(i, m4.compose(p.p, q, v.set(size, size, size)));
        // (in quick, out slowly)
        puffAttr.setXY(i, 0.55 * Math.min(1, u * 5) * (1 - u) ** 1.3, 0.42);
      });
      smoke.instanceMatrix.needsUpdate = true;
      puffAttr.needsUpdate = true;
      // The light: the nearest lit street lamp (or lamp pool), looked for a few times a second
      lookT -= dt;
      if (lookT <= 0) {
        lookT = 0.2;
        const { lamps, pools } = placed();
        for (let i = tones.length; i < lamps.length; i++) tones.push(lampTone(lamps[i].x, lamps[i].z));
        let best = Infinity;
        let sodium = false;
        const x = camera.position.x;
        const z = camera.position.z;
        if (night > 0.05) {
          for (let i = 0; i < lamps.length; i++) {
            if (tones[i] === 'dead') continue;
            const dd = Math.hypot(lamps[i].x - x, lamps[i].z - z);
            if (dd < best) (best = dd), (sodium = tones[i] !== 'white');
          }
          for (const p of pools) {
            const dd = Math.hypot(p.x - x, p.z - z);
            if (dd < best) (best = dd), (sodium = p.sodium);
          }
        }
        lampLight(night, best, sodium, want);
      }
      d.tint.value.lerp(want, 1 - Math.exp(-dt * 4));
    },
    /** The hands are away (holstered, over the shoulder): the cases and the smoke go with them */
    hide() {
      fxRoot.visible = false;
      live.length = puffs.length = pending.length = 0;
      string = 0;
      smoking = 0;
    },
    dispose() {
      d.scene.remove(fxRoot);
      cases.geometry.dispose();
      smoke.geometry.dispose();
      caseMat.dispose();
      smokeMat.dispose();
    },
  };
}
export type FpGun = ReturnType<typeof createFpGun>;
