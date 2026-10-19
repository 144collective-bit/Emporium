/*
 * First person: Degen's hands on his gun (black suit sleeves, white cuffs),
 * bottom-right from the hip and up to the sight when aiming (red-dot, iron
 * sights, or the scope, which then hands over to a full-screen scope view).
 *
 * It moves like it has weight: it lags behind the mouse (sway), bobs with
 * each step, tips down to sprint, kicks back on every shot, drops away when
 * holstered, and the left hand swaps the magazine on a reload.
 *
 * Drawing it: the city camera's near plane is 0.5 m, too far for hands. Scaling
 * everything about the eye doesn't change the picture, so the hands are built
 * K times bigger and K times further out, then drawn into the front sliver of
 * the depth buffer so walls never cut through them. They still get ink lines.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, fx } from './kit';
import { buildGun, gunSpec, type Gun, type SkinId, type Tintable } from './guns';
import type { WeaponId } from './combat-sim';

const K = 8;
/** The gun and hands are drawn a little smaller than life, so they don't swamp the screen */
const S = 0.78;
const SKIN = '#e8c39e';
const SLEEVE = '#16141f';

/** Where the gun sits, in metres from the eye (x right, y up, -z ahead) */
const HIP = { x: 0.1, y: -0.112, z: -0.27, ry: 0.05, rz: -0.04 };
/** Aimed: the gun's sight sits on the line of sight, `ads` metres ahead */
const adsPose = (id: WeaponId) => {
  const { at, ads } = gunSpec(id).sight;
  return { x: 0, y: -at.y * S, z: -(ads - at.z * S), ry: 0, rz: 0 };
};

const rbox = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 2, r);

/**
 * Flat cartoon shading lit from a fixed key light over the left shoulder. The
 * hands sit K times further out than they look, so the city's lamps would light
 * them as if they were metres ahead; this keeps them steady, dimmed at night.
 */
const level = { value: 1 };
function flat(color: string): Tintable {
  const m = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, emissive: { value: new THREE.Color(0) }, level },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      void main() {
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform vec3 emissive;
      uniform float level;
      varying vec3 vN;
      void main() {
        float d = dot(normalize(vN), normalize(vec3(-0.4, 0.8, 0.45)));
        float band = d > 0.42 ? 1.0 : d > -0.12 ? 0.74 : 0.52;
        gl_FragColor = vec4(color * band * level + emissive, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  return Object.assign(m, { color: m.uniforms.color.value as THREE.Color, emissive: m.uniforms.emissive.value as THREE.Color });
}
const flats = new Map<string, Tintable>();
const shared = (c: string) => flats.get(c) ?? flats.set(c, flat(c)).get(c)!;
const UP = new THREE.Vector3(0, 1, 0);

/** A forearm in a suit sleeve, ending in a hand at the origin, reaching off along `dir` */
function arm(dir: THREE.Vector3, hand: THREE.BufferGeometry) {
  const g = new THREE.Group();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  const along = (geo: THREE.BufferGeometry, from: number) => {
    geo.translate(0, from, 0);
    geo.applyQuaternion(q);
    return geo;
  };
  const sleeve = new THREE.Mesh(along(new THREE.CapsuleGeometry(0.036, 0.42, 3, 12), 0.27), shared(SLEEVE));
  const cuff = new THREE.Mesh(along(new THREE.CylinderGeometry(0.039, 0.039, 0.02, 14), 0.05), shared('#d4d1de'));
  const palm = new THREE.Mesh(hand, shared(SKIN));
  g.add(sleeve, cuff, palm);
  return g;
}

const flashTex = canvasTex(128, 128, (c) => {
  // A cartoon muzzle flash: a hot core with five spikes
  c.translate(64, 64);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 62);
  g.addColorStop(0, 'rgba(255,255,240,1)');
  g.addColorStop(0.35, 'rgba(255,214,107,.95)');
  g.addColorStop(1, 'rgba(255,106,47,0)');
  c.fillStyle = g;
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = i % 2 ? 18 : 62;
    c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
  c.fill();
});

export interface ViewState {
  armed: boolean;
  /** Aiming down the sight */
  aim: boolean;
  /** 0..1 of walking speed, and the step cycle */
  move: number;
  phase: number;
  /** 0..1 sprinting */
  run: number;
  /** 0..1 off the ground */
  air: number;
  /** 0..1 through a reload (0 when not reloading) */
  reload: number;
}

export function createViewmodel(scene: THREE.Scene, skin: SkinId, weapon: WeaponId = 'rifle') {
  const root = new THREE.Group();
  const scaler = new THREE.Group();
  scaler.scale.setScalar(K);
  const holder = new THREE.Group();
  root.add(scaler);
  scaler.add(holder);

  // Hands, in the gun's own frame (barrel along +z, the gun's +x is the camera's left)
  const rightHand = rbox(0.05, 0.088, 0.072, 0.02).rotateX(0.3).translate(-0.006, -0.05, -0.02);
  const right = arm(new THREE.Vector3(-0.36, -0.72, -0.58), rightHand);
  const thumb = new THREE.Mesh(rbox(0.016, 0.016, 0.05, 0.007).rotateY(0.2).translate(-0.024, 0.012, 0.0), shared(SKIN));
  right.add(thumb);
  const leftPalm = rbox(0.07, 0.036, 0.09, 0.016).translate(0, -0.03, 0);
  const left = arm(new THREE.Vector3(0.6, -0.68, -0.42), leftPalm);
  const fingers = new THREE.Mesh(rbox(0.014, 0.05, 0.08, 0.006).translate(-0.038, -0.006, 0), shared(SKIN));
  left.add(fingers);

  // Muzzle flash: two crossed cut-outs and a soft glow
  const flashMat = new THREE.MeshBasicMaterial({ map: flashTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const flash = new THREE.Group();
  for (const rz of [0, Math.PI / 2]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1).rotateY(Math.PI / 2), flashMat);
    p.rotation.z = rz;
    flash.add(p);
  }
  const front = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.11), flashMat);
  flash.add(front);
  flash.visible = false;
  fx(flash);

  // Draw in front of everything (see the note at the top), never cast shadows
  const front0 = (r: THREE.WebGLRenderer) => r.getContext().depthRange(0, 0.06);
  const back = (r: THREE.WebGLRenderer) => r.getContext().depthRange(0, 1);
  const upFront = (o: THREE.Object3D) =>
    o.traverse((c) => {
      c.frustumCulled = false;
      if ((c as THREE.Mesh).isMesh) {
        c.castShadow = c.receiveShadow = false;
        c.onBeforeRender = front0;
        c.onAfterRender = back;
      }
    });

  // The gun in hand: swapped when Degen takes another from the store
  let gun: Gun = null!;
  let spec = gunSpec(weapon);
  let ADS = adsPose(weapon);
  let skinNow = skin;
  function mount(id: WeaponId) {
    if (gun) {
      holder.remove(gun.group);
      gun.dispose();
    }
    spec = gunSpec(id);
    ADS = adsPose(id);
    gun = buildGun(id, skinNow, { sight: true, mat: flat });
    gun.group.rotation.y = Math.PI;
    gun.group.scale.setScalar(S);
    left.position.copy(spec.fore);
    flash.position.copy(spec.muzzle).add(new THREE.Vector3(0, 0, 0.07));
    gun.group.add(right, left, flash);
    upFront(gun.group);
    holder.add(gun.group);
  }
  mount(weapon);
  upFront(root);
  root.visible = false;
  scene.add(root);

  // Motion state
  let draw = 0;
  let ads = 0;
  let swayX = 0;
  let swayY = 0;
  let kickZ = 0;
  let kickX = 0;
  let kickRoll = 0;
  let flashT = 0;
  let idle = 0;
  let glowing = false;
  const lastDir = new THREE.Vector3();
  const dirNow = new THREE.Vector3();
  let haveDir = false;
  const L = THREE.MathUtils.lerp;
  const ease = (x: number) => x * x * (3 - 2 * x);
  const seg = (r: number, a: number, b: number) => ease(THREE.MathUtils.clamp((r - a) / (b - a), 0, 1));

  // Reload: where the left hand goes (offsets from where it holds the front), and the magazine with it
  const handOff = new THREE.Vector3();
  const magOff = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  function reloadPose(r: number) {
    handOff.set(0, 0, 0);
    magOff.set(0, 0, 0);
    gun.mag.visible = true;
    if (r <= 0) return;
    // To the magazine, pull it out and away, come back with a fresh one, seat it, back to the handguard
    const toMag = seg(r, 0.04, 0.14) * (1 - seg(r, 0.72, 0.86));
    const out = seg(r, 0.14, 0.24) * (1 - seg(r, 0.6, 0.7));
    const away = seg(r, 0.24, 0.4) * (1 - seg(r, 0.44, 0.6));
    handOff.copy(spec.magAt).multiplyScalar(toMag);
    tmp.set(0.03, -0.11, 0.02).multiplyScalar(out);
    handOff.add(tmp);
    magOff.copy(tmp);
    tmp.set(0.18, -0.34, 0.05).multiplyScalar(away);
    handOff.add(tmp);
    magOff.add(tmp);
    gun.mag.visible = !(r > 0.38 && r < 0.46);
  }

  return {
    root,
    setSkin(id: SkinId) {
      skinNow = id;
      gun.setSkin(id);
    },
    /** Take another gun in hand */
    setWeapon(id: WeaponId) {
      if (id === gun.id) return;
      mount(id);
      // The new gun comes up from below
      draw = 0;
    },
    /** How dark it is (0 day .. 1 night), for the hands' shading */
    setNight(night: number) {
      level.value = 1.28 - night * 0.55;
    },
    /** A shot: kick back (harder for bigger guns) and flash */
    kick(power = 1) {
      kickZ += 0.028 * power;
      kickX += 0.055 * power;
      kickRoll += (Math.random() - 0.5) * 0.05;
      flashT = 0.045;
      flash.rotation.z = Math.random() * Math.PI;
      flash.scale.setScalar(0.8 + Math.random() * 0.5);
    },
    /** Where shots leave the barrel, in world space (K times out along the line of sight) */
    muzzle(out: THREE.Vector3) {
      return gun.group.localToWorld(out.copy(spec.muzzle));
    },
    scale: K,
    get aimed() {
      return ads;
    },
    /** Each frame after the camera has moved */
    update(camera: THREE.Camera, dt: number, t: number, s: ViewState, firstPerson: boolean) {
      draw += ((s.armed && firstPerson ? 1 : 0) - draw) * Math.min(1, dt * (s.armed ? 9 : 12));
      ads += ((s.aim && !s.reload && s.armed ? 1 : 0) - ads) * Math.min(1, dt * 14);
      // Fully down a scope the full-screen scope view takes over (see combat.ts)
      root.visible = firstPerson && draw > 0.02 && !(spec.sight.kind === 'scope' && ads > 0.92);
      if (!root.visible) {
        haveDir = false;
        flash.visible = false;
        return;
      }
      root.position.copy(camera.position);
      root.quaternion.copy(camera.quaternion);

      const sprint = s.run * (1 - ads);

      // Sway: lag behind the look direction, then settle
      camera.getWorldDirection(dirNow);
      if (haveDir) {
        const dyaw = Math.atan2(dirNow.x, dirNow.z) - Math.atan2(lastDir.x, lastDir.z);
        const yawStep = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
        const pitchStep = dirNow.y - lastDir.y;
        // Positive swayX: the gun trails to the left (you turned right); positive swayY: it trails low
        swayX = THREE.MathUtils.clamp(swayX - yawStep * 0.9, -0.12, 0.12);
        swayY = THREE.MathUtils.clamp(swayY - pitchStep * 0.9, -0.1, 0.1);
      }
      lastDir.copy(dirNow);
      haveDir = true;
      const settle = Math.exp(-dt * 9);
      swayX *= settle;
      swayY *= settle;
      const kd = Math.exp(-dt * 16);
      kickZ *= kd;
      kickX *= kd;
      kickRoll *= kd;

      // Step bob and breathing; much smaller down the sight
      const bobK = (1 - ads * 0.8) * s.move * (1 - s.air);
      const bx = Math.sin(s.phase) * 0.011 * bobK * (1 + sprint);
      const by = -Math.abs(Math.cos(s.phase)) * 0.012 * bobK * (1 + sprint * 0.8);
      idle += dt;
      const breathe = Math.sin(idle * 1.5) * 0.0025 * (1 - ads * 0.7);

      // Narrow (portrait) screens see less to the side: tuck the gun in and hold it further off
      const aspect = (camera as THREE.PerspectiveCamera).aspect || 1.6;
      const wide = Math.min(1, aspect / 1.6);
      const off = Math.pow(THREE.MathUtils.clamp(aspect, 0.45, 1), -0.7);
      const m = off;
      const P = { x: L(HIP.x * wide, ADS.x, ads), y: L(HIP.y, ADS.y, ads), z: L(HIP.z, ADS.z, ads), ry: L(HIP.ry, ADS.ry, ads), rz: L(HIP.rz, ADS.rz, ads) };
      const swayK = 1 - ads * 0.65;
      const r = s.reload;
      const tilt = r > 0 ? seg(r, 0.02, 0.12) * (1 - seg(r, 0.86, 0.98)) : 0;
      const bolt = r > 0 ? Math.sin(seg(r, 0.84, 0.92) * Math.PI) : 0;
      const down = 1 - draw;
      holder.position.set(
        P.x + bx - swayX * 0.05 * swayK - sprint * 0.03 + tilt * 0.01,
        P.y + by + breathe - swayY * 0.04 * swayK - down * 0.22 - sprint * 0.035 - s.air * 0.015 + tilt * 0.02,
        P.z + kickZ * (1 - ads * 0.4) + sprint * 0.02 + bolt * 0.012
      );
      // Scaling the whole gun about the eye keeps the sight on the line of sight
      holder.position.multiplyScalar(m);
      holder.scale.setScalar(m);
      holder.rotation.set(
        kickX * (1 - ads * 0.5) - down * 0.7 - sprint * 0.32 - swayY * 0.6 * swayK + tilt * 0.18 + bolt * 0.05,
        P.ry + swayX * 0.6 * swayK + sprint * 0.55 + tilt * 0.1,
        P.rz + kickRoll + swayX * 0.3 * swayK + tilt * 0.5 - sprint * 0.12,
        'YXZ'
      );

      reloadPose(r);
      left.position.copy(spec.fore).add(handOff);
      gun.mag.position.copy(magOff);

      flashT -= dt;
      flash.visible = flashT > 0;
      if (flash.visible !== glowing) {
        gun.setGlow(flash.visible ? 0.6 : 0);
        glowing = flash.visible;
      }
      // `t` keeps the flash flicker in step with the scene's clock
      if (flash.visible) flash.rotation.x = Math.sin(t * 90) * 0.1;
    },
  };
}

export type Viewmodel = ReturnType<typeof createViewmodel>;
