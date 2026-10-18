/*
 * First person: Degen's hands on the rifle (black suit sleeves, white cuffs),
 * bottom-right from the hip and up to the holo red-dot when aiming.
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
import { MUZZLE, SIGHT, buildRifle, type SkinId, type Tintable } from './rifle';

const K = 8;
/** The rifle and hands are drawn a little smaller than life, so they don't swamp the screen */
const S = 0.78;
const SKIN = '#e8c39e';
const SLEEVE = '#16141f';

/** Where the rifle sits, in metres from the eye (x right, y up, -z ahead) */
const HIP = { x: 0.1, y: -0.112, z: -0.27, ry: 0.05, rz: -0.04 };
/** Aimed: the red-dot sits on the line of sight, this far ahead */
const ADS_DIST = 0.36;
const ADS = { x: 0, y: -SIGHT.y * S, z: -(ADS_DIST - SIGHT.z * S), ry: 0, rz: 0 };

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

export function createViewmodel(scene: THREE.Scene, skin: SkinId) {
  const root = new THREE.Group();
  const scaler = new THREE.Group();
  scaler.scale.setScalar(K);
  const holder = new THREE.Group();
  root.add(scaler);
  scaler.add(holder);

  const rifle = buildRifle(skin, { sight: true, mat: flat });
  rifle.group.rotation.y = Math.PI;
  rifle.group.scale.setScalar(S);
  holder.add(rifle.group);

  // Hands, in the rifle's own frame (barrel along +z, the rifle's +x is the camera's left)
  const rightHand = rbox(0.05, 0.088, 0.072, 0.02).rotateX(0.3).translate(-0.006, -0.05, -0.02);
  const right = arm(new THREE.Vector3(-0.36, -0.72, -0.58), rightHand);
  const thumb = new THREE.Mesh(rbox(0.016, 0.016, 0.05, 0.007).rotateY(0.2).translate(-0.024, 0.012, 0.0), shared(SKIN));
  right.add(thumb);
  const leftPalm = rbox(0.07, 0.036, 0.09, 0.016).translate(0, -0.03, 0);
  const left = arm(new THREE.Vector3(0.6, -0.68, -0.42), leftPalm);
  const fingers = new THREE.Mesh(rbox(0.014, 0.05, 0.08, 0.006).translate(-0.038, -0.006, 0), shared(SKIN));
  left.add(fingers);
  const LEFT_REST = new THREE.Vector3(0.008, 0.016, 0.28);
  left.position.copy(LEFT_REST);
  rifle.group.add(right, left);

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
  flash.position.copy(MUZZLE).add(new THREE.Vector3(0, 0, 0.07));
  flash.visible = false;
  rifle.group.add(fx(flash));

  // Draw in front of everything (see the note at the top), never cast shadows
  const front0 = (r: THREE.WebGLRenderer) => r.getContext().depthRange(0, 0.06);
  const back = (r: THREE.WebGLRenderer) => r.getContext().depthRange(0, 1);
  root.traverse((o) => {
    o.frustumCulled = false;
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = o.receiveShadow = false;
      o.onBeforeRender = front0;
      o.onAfterRender = back;
    }
  });
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

  // Reload: where the left hand goes (offsets from its rest on the handguard), and the magazine with it
  const MAG_AT = new THREE.Vector3(-0.008, -0.075, -0.15);
  const handOff = new THREE.Vector3();
  const magOff = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  function reloadPose(r: number) {
    handOff.set(0, 0, 0);
    magOff.set(0, 0, 0);
    rifle.mag.visible = true;
    if (r <= 0) return;
    // To the magazine, pull it out and away, come back with a fresh one, seat it, back to the handguard
    const toMag = seg(r, 0.04, 0.14) * (1 - seg(r, 0.72, 0.86));
    const out = seg(r, 0.14, 0.24) * (1 - seg(r, 0.6, 0.7));
    const away = seg(r, 0.24, 0.4) * (1 - seg(r, 0.44, 0.6));
    handOff.copy(MAG_AT).multiplyScalar(toMag);
    tmp.set(0.03, -0.11, 0.02).multiplyScalar(out);
    handOff.add(tmp);
    magOff.copy(tmp);
    tmp.set(0.18, -0.34, 0.05).multiplyScalar(away);
    handOff.add(tmp);
    magOff.add(tmp);
    rifle.mag.visible = !(r > 0.38 && r < 0.46);
  }

  return {
    root,
    setSkin: (id: SkinId) => rifle.setSkin(id),
    /** How dark it is (0 day .. 1 night), for the hands' shading */
    setNight(night: number) {
      level.value = 1.28 - night * 0.55;
    },
    /** A shot: kick back and flash */
    kick() {
      kickZ += 0.028;
      kickX += 0.055;
      kickRoll += (Math.random() - 0.5) * 0.05;
      flashT = 0.045;
      flash.rotation.z = Math.random() * Math.PI;
      flash.scale.setScalar(0.8 + Math.random() * 0.5);
    },
    /** Where shots leave the barrel, in world space (K times out along the line of sight) */
    muzzle(out: THREE.Vector3) {
      return rifle.group.localToWorld(out.copy(MUZZLE));
    },
    scale: K,
    get aimed() {
      return ads;
    },
    /** Each frame after the camera has moved */
    update(camera: THREE.Camera, dt: number, t: number, s: ViewState, firstPerson: boolean) {
      draw += ((s.armed && firstPerson ? 1 : 0) - draw) * Math.min(1, dt * (s.armed ? 9 : 12));
      root.visible = firstPerson && draw > 0.02;
      if (!root.visible) {
        haveDir = false;
        flash.visible = false;
        return;
      }
      root.position.copy(camera.position);
      root.quaternion.copy(camera.quaternion);

      ads += ((s.aim && !s.reload ? 1 : 0) - ads) * Math.min(1, dt * 14);
      const sprint = s.run * (1 - ads);

      // Sway: lag behind the look direction, then settle
      camera.getWorldDirection(dirNow);
      if (haveDir) {
        const dyaw = Math.atan2(dirNow.x, dirNow.z) - Math.atan2(lastDir.x, lastDir.z);
        const yawStep = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
        const pitchStep = dirNow.y - lastDir.y;
        // Positive swayX: the rifle trails to the left (you turned right); positive swayY: it trails low
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

      // Narrow (portrait) screens see less to the side: tuck the rifle in and hold it further off
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
      // Scaling the whole rifle about the eye keeps the red dot on the line of sight
      holder.position.multiplyScalar(m);
      holder.scale.setScalar(m);
      holder.rotation.set(
        kickX * (1 - ads * 0.5) - down * 0.7 - sprint * 0.32 - swayY * 0.6 * swayK + tilt * 0.18 + bolt * 0.05,
        P.ry + swayX * 0.6 * swayK + sprint * 0.55 + tilt * 0.1,
        P.rz + kickRoll + swayX * 0.3 * swayK + tilt * 0.5 - sprint * 0.12,
        'YXZ'
      );

      reloadPose(r);
      left.position.copy(LEFT_REST).add(handOff);
      rifle.mag.position.copy(magOff);

      flashT -= dt;
      flash.visible = flashT > 0;
      if (flash.visible !== glowing) {
        rifle.setGlow(flash.visible ? 0.6 : 0);
        glowing = flash.visible;
      }
      // `t` keeps the flash flicker in step with the scene's clock
      if (flash.visible) flash.rotation.x = Math.sin(t * 90) * 0.1;
    },
  };
}

export type Viewmodel = ReturnType<typeof createViewmodel>;
