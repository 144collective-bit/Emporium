/*
 * Boating yourself (river plan step 4c; boat-sim.ts holds the rules): the
 * view, loaded the first time you take a boat. At the top of the ladder by
 * Downtown's landing ("Take a boat", F or a tap) you're down in the hire boat
 * (riverlife3d.ts `hireBoat()`), Degen at the wheel; drive it anywhere on the
 * river between the ring highway's bridges, and step off ("Get out") when
 * it lies stopped alongside a river bus landing, or back at its mooring: the
 * boat goes home. Leaving walk mode on the water sends it home too.
 *
 * - Cameras (V): a chase camera that swings in behind (look round with the
 *   mouse, a drag or the right stick; it settles back) and one at the helm.
 * - The car's readout (`data-drive-hud`): speed, and F / N / R; its pedals read
 *   Ahead and Astern.
 * - It rises at the bow with speed, leans into its turns and trails a wake.
 * - Its engine is the car's voice (sound.ts), its horn the boats' (H).
 * - It bumps softly off everything (boat-sim.ts), with a knock.
 */
import * as THREE from 'three';
import { HIP_HEIGHT, createDegen, reachArm, torsoFrame, type Degen, type Outfit } from './character';
import { BOAT, HIRE_VIEW, TUNE, WATER_SOLIDS, aheadOf, leaveAt, moversAt, newBoat, speedOf, sprayOf, stepBoat, wakeShape, type BoatInput, type Circle } from './boat-sim';
import { HIRE } from './riverbus';
import { WATER_Y } from './river';
import { hireBoat } from './riverlife3d';
import { fx, glowMat, glowTex } from './kit';
import type { Sfx } from './combat';

export interface BoatDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  root: HTMLElement;
  /** What Degen wears (he's at the wheel in it) */
  outfit(): Outfit;
  /** How far the camera can sit from a point along a direction before something's in the way */
  cameraRoom(from: THREE.Vector3, dir: THREE.Vector3, want: number): number;
  /** The traffic's boats in the lanes about (life.ts `bodies.boats`) */
  lanes(): { x: number; z: number; yaw: number; len: number; beam: number }[];
  sfx(kind: Sfx, gain?: number): void;
  /** The engine's voice: revs 0..1, negative for off */
  engine(revs: number): void;
  reduced: boolean;
}

const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** Tiles per second to km/h (a tile is about 1.8 m) */
const KMH = 1.8 * 3.6;
/** Degen's size (walk.ts's) */
const SCALE = 0.85;
const NAME = 'Hire boat';

export function createBoat(d: BoatDeps) {
  const { camera, root } = d;
  const hud = root.querySelector<HTMLElement>('[data-drive-hud]')!;
  const speedEl = hud.querySelector<HTMLElement>('[data-drive-speed]')!;
  const gearEl = hud.querySelector<HTMLElement>('[data-drive-gear]')!;
  const model = hireBoat();
  const boat = model.group;
  boat.visible = false;
  d.scene.add(boat);
  // The wake: a soft streak of foam straight behind it and two arms spreading at the Kelvin angle, longer and
  // brighter with speed (boat-sim.ts `wakeShape()`; the FX layer, like the lane boats'); they lie flat on the water
  // in the boat's own frame, so they're kept level as it pitches (`wakeRoot`)
  const wakeMat = glowMat('#dff4ff', 0);
  const flatQuad = () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(-0.5, 0, 0);
  const wake = fx(new THREE.Mesh(flatQuad(), wakeMat));
  const arms = [1, -1].map((side) => {
    const arm = fx(new THREE.Mesh(flatQuad(), wakeMat));
    arm.userData.side = side;
    return arm;
  });
  const wakeRoot = new THREE.Group();
  wakeRoot.add(wake, ...arms);
  wakeRoot.visible = false;
  d.scene.add(wakeRoot);
  // The spray off the bow: droplets thrown out and up either side, falling back to the water (none under reduced
  // motion); in the boat's frame, as many as `SPRAY_N`
  const SPRAY_N = 48;
  const sprayPos = new Float32Array(SPRAY_N * 3);
  const sprayVel = new Float32Array(SPRAY_N * 3);
  const sprayLife = new Float32Array(SPRAY_N);
  const sprayGeo = new THREE.BufferGeometry();
  sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
  const sprayMat = new THREE.PointsMaterial({ color: '#eef8ff', map: glowTex, size: 0.32, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const spray = fx(new THREE.Points(sprayGeo, sprayMat));
  spray.frustumCulled = false;
  boat.add(spray);
  let sprayNext = 0;

  let s = newBoat();
  let active = false;
  let driver: Degen | null = null;
  let helm = false;
  let camYaw = 0;
  let lookYaw = 0;
  let lookPitch = 0;
  let lookIdle = 0;
  let camReady = false;
  let clock = 0;
  let shake = 0;
  let steerNow = 0;
  const camPos = new THREE.Vector3();
  const pivot = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const at = new THREE.Vector3();
  const goal = new THREE.Vector3();
  const M = new THREE.Matrix4();
  const inv = new THREE.Matrix4();
  const chest = new THREE.Matrix4();
  const grip = new THREE.Vector3();

  /** Degen at the wheel: on the bench, knees bent, both hands on the wheel's sides (turned with it, the wheel too) */
  function seat() {
    driver = createDegen(d.outfit());
    const g = driver.g;
    g.rotation.set(0, Math.PI / 2, 0);
    g.scale.setScalar(SCALE);
    g.position.set(model.seat.x, model.seat.y - HIP_HEIGHT * SCALE + 0.02, 0);
    if (driver.held) driver.held.visible = false;
    boat.add(g);
  }
  function poseDriver() {
    if (!driver) return;
    const p = driver.pose;
    p.bob = 0;
    p.lean = 0.12;
    p.twist = 0;
    p.side = -steerNow * 0.08;
    p.headYaw = -steerNow * 0.25 + lookYaw * 0.3;
    p.headPitch = 0.04;
    for (const l of p.legs) {
      l.fwd = 1.45;
      l.out = 0.12;
      l.bend = 1.3;
      l.twist = 0;
    }
    const g = driver.g;
    chest.compose(g.position, g.quaternion, g.scale);
    chest.multiply(torsoFrame(p, M));
    inv.copy(chest).invert();
    // The wheel's sides (it stands tilted on the console's face, turned with the rudder)
    for (const i of [0, 1] as const) {
      const a = (i === 0 ? 1 : -1) * (Math.PI / 2) - steerNow * 0.8;
      grip.set(model.wheel.x - Math.sin(0.5) * Math.sin(a) * 0.11, model.wheel.y + Math.cos(0.5) * Math.sin(a) * 0.11, Math.cos(a) * 0.11);
      grip.applyMatrix4(inv);
      reachArm(p, i, grip);
    }
    driver.update();
  }
  /** The wheel turned with the rudder: about its own tilted axis, as far as the hands on it go */
  const helmAxis = new THREE.Vector3(Math.cos(0.5), Math.sin(0.5), 0);
  const turnHelm = () => model.helm.quaternion.setFromAxisAngle(helmAxis, steerNow * 0.8);
  const gas = root.querySelector<HTMLElement>('[data-drive-gas]');
  const brake = root.querySelector<HTMLElement>('[data-drive-brake]');
  /** The car's pedals read Ahead and Astern on the water */
  function setPedals(on: boolean) {
    if (gas) {
      gas.textContent = on ? 'Ahead' : 'Gas';
      gas.setAttribute('aria-label', on ? 'Ahead' : 'Gas');
    }
    if (brake) {
      brake.textContent = on ? 'Astern' : 'Brake';
      brake.setAttribute('aria-label', on ? 'Astern' : 'Brake and reverse');
    }
  }
  function setHud(on: boolean) {
    setPedals(on);
    hud.hidden = !on;
    root.classList.toggle('is-driving', on);
    root.classList.toggle('is-boating', on);
    if (on) root.dataset.boat = NAME;
    else delete root.dataset.boat;
  }
  /** Out of it: the boat goes home to its mooring */
  function home() {
    active = false;
    setHud(false);
    d.engine(-1);
    boat.visible = false;
    wakeRoot.visible = false;
    HIRE_VIEW.out = false;
    if (driver) {
      driver.g.removeFromParent();
      driver.dispose();
      driver = null;
    }
    s = newBoat();
  }
  /** The boat on the water as the sim has it: lifting at the bow with speed, leaning into the turn, on the swell */
  function place() {
    const ahead = aheadOf(s);
    const swell = d.reduced ? 0 : Math.sin(clock * 1.6) * 0.03;
    boat.position.set(s.x, WATER_Y + 0.02 + swell + Math.max(0, ahead) * 0.012, s.z);
    boat.rotation.set(-s.r * 0.12 + (d.reduced ? 0 : Math.sin(clock * 1.1) * 0.015), s.yaw, Math.min(0.11, Math.max(-0.03, (ahead / TUNE.top) * 0.11)), 'YXZ');
    const w = wakeShape(speedOf(s));
    const k = Math.min(1, speedOf(s) / TUNE.top);
    // (level on the water at the boat's stern, turned with it)
    wakeRoot.position.set(s.x, WATER_Y + 0.04, s.z);
    wakeRoot.rotation.set(0, s.yaw, 0);
    wakeRoot.visible = w.opacity > 0;
    wake.scale.set(w.len, 1, 0.8 + k * 1.2);
    wake.position.x = -BOAT.len / 2 + 0.2;
    for (const arm of arms) {
      const side = arm.userData.side as number;
      arm.scale.set(w.arms, 1, 0.35 + k * 0.4);
      arm.rotation.y = -side * w.spread;
      arm.position.set(BOAT.len * 0.2, 0, side * BOAT.beam * 0.45);
    }
    wakeMat.opacity = w.opacity;
  }
  /** The spray off the bow: new droplets by how hard it's going, each flung out, up and back, falling to the water */
  function stepSpray(dt: number) {
    const amt = d.reduced ? 0 : sprayOf(speedOf(s));
    sprayMat.opacity = 0.75 * Math.min(1, amt * 2);
    sprayNext += amt * dt * 90;
    for (let i = 0; i < SPRAY_N; i++) {
      if (sprayLife[i] <= 0 && sprayNext >= 1) {
        sprayNext -= 1;
        const side = i % 2 ? 1 : -1;
        sprayPos.set([BOAT.len / 2 - 0.55 + Math.random() * 0.3, 0.1, side * BOAT.beam * 0.42], i * 3);
        sprayVel.set([-1.5 - Math.random() * 2, 1.4 + Math.random() * 1.2 * amt, side * (1.2 + Math.random() * 1.4)], i * 3);
        sprayLife[i] = 0.5 + Math.random() * 0.35;
      }
      if (sprayLife[i] > 0) {
        sprayLife[i] -= dt;
        sprayVel[i * 3 + 1] -= 9.8 / 1.8 * dt;
        for (let c = 0; c < 3; c++) sprayPos[i * 3 + c] += sprayVel[i * 3 + c] * dt;
        // (back under the water, it's gone)
        if (sprayPos[i * 3 + 1] < -0.05 || sprayLife[i] <= 0) {
          sprayLife[i] = 0;
          sprayPos[i * 3 + 1] = -5;
        }
      } else sprayPos[i * 3 + 1] = -5;
    }
    sprayNext = Math.min(sprayNext, 4);
    sprayGeo.attributes.position.needsUpdate = true;
  }

  /** The other boats about as circles: the lane boats (two each, the length of them) and everything else on the water */
  const others: Circle[] = [];
  function gather() {
    others.length = 0;
    for (const b of d.lanes()) {
      if (Math.abs(b.x - s.x) > 30 || Math.abs(b.z - s.z) > 30) continue;
      const [c, sn] = [Math.cos(b.yaw), -Math.sin(b.yaw)];
      for (const k of [-0.6, 0.6]) others.push({ x: b.x + c * k, z: b.z + sn * k, r: b.beam / 2 + 0.05 });
    }
    others.push(...moversAt(Date.now() / 1000, s.x, s.z));
    return others;
  }

  return {
    get active() {
      return active;
    },
    get state() {
      return s;
    },
    get name() {
      return NAME;
    },
    /** Alongside a landing (or at the mooring) and stopped: you can step off */
    get canLeave() {
      return active && !!leaveAt(s);
    },
    /** Down the ladder and into it, at its mooring */
    enter() {
      if (active) return false;
      active = true;
      s = newBoat();
      HIRE_VIEW.out = true;
      boat.visible = true;
      seat();
      camYaw = s.yaw;
      lookYaw = lookPitch = 0;
      camReady = false;
      helm = false;
      setHud(true);
      place();
      d.sfx('door');
      return true;
    },
    /** Step off (alongside a landing or at the mooring, stopped): where Degen stands, facing the river; the boat goes home */
    exit() {
      const at = active ? leaveAt(s) : null;
      if (!at) return null;
      home();
      d.sfx('door');
      // (a heading, 0 east: facing the water from the bank he's on)
      const north = (at.stop?.bank ?? HIRE.bank) === 'north';
      // (`from`: where it lies, for the climb up, moments.ts)
      return { x: at.at.x, z: at.at.z, yaw: north ? -Math.PI / 2 : Math.PI / 2, from: { x: s.x, z: s.z } };
    },
    /** Walk mode ended on the water: the boat goes home */
    abandon() {
      if (active) home();
    },
    toggleView() {
      helm = !helm;
      camReady = false;
      // (at the helm the camera is where his head is)
      if (driver) driver.g.visible = !helm;
    },
    look(dx: number, dy: number) {
      lookYaw = THREE.MathUtils.clamp(lookYaw - dx, -2.6, 2.6);
      lookPitch = THREE.MathUtils.clamp(lookPitch + dy, -0.35, 0.7);
      lookIdle = 0;
    },
    horn() {
      if (active) d.sfx('boatHorn', 0.8);
    },
    /** One frame on the water; returns how far it went (tiles) */
    update(dt: number, inp: BoatInput) {
      if (!active) return 0;
      clock += dt;
      const [px, pz] = [s.x, s.z];
      const knock = stepBoat(s, inp, Math.min(dt, 0.1), WATER_SOLIDS, gather());
      if (knock > 0.8) {
        d.sfx('bump', Math.min(1, knock / 5));
        shake = d.reduced ? 0 : Math.min(0.25, knock * 0.04);
      }
      steerNow += (inp.steer - steerNow) * damp(8, dt);
      place();
      turnHelm();
      poseDriver();
      stepSpray(Math.min(dt, 0.1));

      // The readout: speed, and whether it's going ahead, astern or idling
      const kmh = String(Math.round(speedOf(s) * KMH));
      if (speedEl.textContent !== kmh) speedEl.textContent = kmh;
      const gear = s.power > 0.05 ? 'F' : s.power < -0.05 ? 'R' : 'N';
      if (gearEl.textContent !== gear) gearEl.textContent = gear;
      d.engine(Math.min(1, 0.12 + Math.abs(s.power) * 0.55 + (speedOf(s) / TUNE.top) * 0.3));

      // Cameras: the chase camera swings in behind (the look settles back), or at the helm
      lookIdle += dt;
      if (lookIdle > 1.2) {
        lookYaw += (0 - lookYaw) * damp(2.5, dt);
        lookPitch += (0 - lookPitch) * damp(2.5, dt);
      }
      camYaw += wrap(s.yaw - camYaw) * damp(helm ? 20 : 2.8, dt);
      const yaw = camYaw + lookYaw;
      const [fx0, fz0] = [Math.cos(yaw), -Math.sin(yaw)];
      if (helm) {
        const [hx, hz] = [Math.cos(s.yaw), -Math.sin(s.yaw)];
        camera.position.set(s.x + hx * (model.seat.x + 0.15), WATER_Y + 1.42, s.z + hz * (model.seat.x + 0.15));
        at.set(camera.position.x + fx0 * 10, camera.position.y - 0.5 + lookPitch * 6, camera.position.z + fz0 * 10);
      } else {
        const pitch = 0.26 + lookPitch;
        pivot.set(s.x, WATER_Y + 1.0, s.z);
        dir.set(-fx0 * Math.cos(pitch), Math.sin(pitch), -fz0 * Math.cos(pitch));
        const want = 5 + Math.min(4, speedOf(s) * 0.45);
        goal.copy(pivot).addScaledVector(dir, d.cameraRoom(pivot, dir, want));
        if (!camReady) camPos.copy(goal);
        camPos.lerp(goal, damp(9, dt));
        camera.position.copy(camPos);
        at.set(s.x + Math.cos(s.yaw) * 2.5, WATER_Y + 0.9, s.z - Math.sin(s.yaw) * 2.5);
      }
      camReady = true;
      camera.up.set(0, 1, 0);
      camera.lookAt(at);
      if (shake > 0) {
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake;
        shake = Math.max(0, shake - dt * 1.2);
      }
      return Math.hypot(s.x - px, s.z - pz);
    },
  };
}
export type Boat = ReturnType<typeof createBoat>;
