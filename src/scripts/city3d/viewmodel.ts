/*
 * First person: Degen's hands on his gun, in the sleeves of what he's wearing
 * (a suit with shirt cuffs, a hoodie or track top with ribbed cuffs, the
 * track top's stripes),
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
import { fx, liveTex } from './kit';
import { buildGun, gunSpec, type Gun, type SkinId, type Tintable } from './guns';
import { newReloadFrame, reloadAt } from './gunfit';
import type { WeaponId } from './combat-sim';
import { PLAYER, type Outfit } from './character';
import { bakedHand } from './body';

const K = 8;
/** The gun and hands are drawn a little smaller than life, so they don't swamp the screen */
const S = 0.78;
const SKIN = '#e8c39e';
/** The hands' size against the body's (they're held up close, so a touch bigger reads better) */
const FP_HAND = 1.15;
/** The shirt cuff and the track top's stripes (a shade under white, like the body's) */
const SHIRT = '#d4d1de';

/** Where the gun sits, in metres from the eye (x right, y up, -z ahead) */
const HIP = { x: 0.1, y: -0.112, z: -0.27, ry: 0.05, rz: -0.04 };
/** Aimed: the gun's sight sits on the line of sight, `ads` metres ahead */
const adsPose = (id: WeaponId) => {
  const { at, ads } = gunSpec(id).sight;
  return { x: 0, y: -at.y * S, z: -(ads - at.z * S), ry: 0, rz: 0 };
};

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

const shade = (c: string, k: number) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString();

/**
 * One of Degen's own hands (body.ts: palm, fingers and thumb), closed to
 * `grip` and turned so its wrist runs back up the forearm `dir` into the
 * sleeve and its knuckles lie along `along` (the pistol grip, the
 * handguard). `side` is the rig's: -1 his right hand, 1 his left.
 */
function fpHand(side: -1 | 1, grip: number, dir: THREE.Vector3, along: THREE.Vector3, size: number, at: THREE.Vector3) {
  const z = along.clone().normalize();
  const y = dir.clone().addScaledVector(z, -dir.dot(z)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  return bakedHand(side, grip).applyMatrix4(new THREE.Matrix4().makeBasis(x, y, z).scale(new THREE.Vector3(size, size, size)).setPosition(at));
}

/** A forearm ending in a hand at the origin, reaching off along `dir`; `dress()` puts it in the outfit's sleeve */
function arm(dir: THREE.Vector3, hand: THREE.BufferGeometry) {
  const g = new THREE.Group();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  const along = (geo: THREE.BufferGeometry, from: number) => {
    geo.translate(0, from, 0);
    geo.applyQuaternion(q);
    return geo;
  };
  const clothes = new THREE.Group();
  g.add(clothes, new THREE.Mesh(hand, shared(SKIN)));
  return {
    g,
    dress(o: Outfit) {
      clothes.traverse((m) => (m as THREE.Mesh).geometry?.dispose());
      clothes.clear();
      const top = o.top;
      if (o.kind === 'suit') {
        // A tailored sleeve and a shirt cuff showing past it
        clothes.add(new THREE.Mesh(along(new THREE.CapsuleGeometry(0.036, 0.42, 3, 12), 0.27), shared(top)));
        clothes.add(new THREE.Mesh(along(new THREE.CylinderGeometry(0.035, 0.037, 0.03, 14), 0.045), shared(SHIRT)));
      } else {
        // A looser sleeve gathered into a ribbed cuff
        clothes.add(new THREE.Mesh(along(new THREE.CapsuleGeometry(0.042, 0.4, 3, 12), 0.29), shared(top)));
        clothes.add(new THREE.Mesh(along(new THREE.CylinderGeometry(0.038, 0.04, 0.05, 14), 0.06), shared(shade(top, 0.8))));
        if (o.kind === 'track')
          for (const x of [-0.042, 0.042])
            for (const z of [-0.008, 0.008]) clothes.add(new THREE.Mesh(along(new THREE.BoxGeometry(0.006, 0.36, 0.005).translate(x, 0, z), 0.3), shared(SHIRT)));
      }
    },
  };
}

const flashTex = liveTex(128, 128, (c) => {
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

  // Hands, in the gun's own frame (barrel along +z, the gun's +x is the camera's left): his
  // right closed round the pistol grip (raked back), his left under the front, fingers up its side
  const rightDir = new THREE.Vector3(-0.36, -0.72, -0.58);
  const rightHand = fpHand(-1, 0.9, rightDir, new THREE.Vector3(0, Math.cos(0.3), Math.sin(0.3)), FP_HAND, new THREE.Vector3(-0.016, -0.045, -0.024));
  const rightArm = arm(rightDir, rightHand);
  const right = rightArm.g;
  const leftDir = new THREE.Vector3(0.6, -0.68, -0.42);
  const leftHand = fpHand(1, 0.55, leftDir, new THREE.Vector3(0, 0, 1), FP_HAND, new THREE.Vector3(0.014, -0.036, 0));
  const leftArm = arm(leftDir, leftHand);
  const left = leftArm.g;
  rightArm.dress(PLAYER);
  leftArm.dress(PLAYER);

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

  // Reload: the same clip as the third-person hands (gunfit.ts). The left hand
  // leaves the front for the magazine, the pouch (down by his belt) and back;
  // the magazine rides in it while it's carried
  const rf = newReloadFrame();
  const POUCH = new THREE.Vector3(0.18, -0.34, 0.05);
  const tmp = new THREE.Vector3();
  function reloadPose(r: number) {
    reloadAt(gun.id, r, rf);
    tmp.copy(spec.fore);
    tmp.z += rf.slide;
    left.position.lerpVectors(tmp, tmp.copy(rf.at).add(rf.mag), rf.hand);
    left.position.addScaledVector(POUCH, rf.away);
    if (rf.carried) gun.mag.position.copy(left.position).sub(spec.fore).sub(spec.magAt);
    else gun.mag.position.copy(rf.mag);
    gun.mag.rotation.z = rf.magRoll;
    gun.mag.visible = rf.magShown;
  }

  return {
    root,
    /** Put the hands in the sleeves of Degen's outfit (the wardrobe) */
    setOutfit(o: Outfit) {
      rightArm.dress(o);
      leftArm.dress(o);
      upFront(right);
      upFront(left);
    },
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
      reloadPose(r);
      const tilt = rf.roll;
      const bolt = rf.bolt;
      const down = 1 - draw;
      holder.position.set(
        P.x + bx - swayX * 0.05 * swayK - sprint * 0.03 + tilt * 0.02,
        P.y + by + breathe - swayY * 0.04 * swayK - down * 0.22 - sprint * 0.035 - s.air * 0.015 + tilt * 0.04 - rf.pull * 0.3,
        P.z + kickZ * (1 - ads * 0.4) + sprint * 0.02 + bolt * 0.012
      );
      // Scaling the whole gun about the eye keeps the sight on the line of sight
      holder.position.multiplyScalar(m);
      holder.scale.setScalar(m);
      holder.rotation.set(
        kickX * (1 - ads * 0.5) - down * 0.7 - sprint * 0.32 - swayY * 0.6 * swayK + rf.pitch + bolt * 0.05,
        P.ry + swayX * 0.6 * swayK + sprint * 0.55 + tilt * 0.2,
        P.rz + kickRoll + swayX * 0.3 * swayK + tilt - sprint * 0.12,
        'YXZ'
      );


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
