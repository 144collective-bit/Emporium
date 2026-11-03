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
 *   mouse, a drag or the right stick; it settles back) and the helm from his
 *   own eyes (docs/firstperson-plan.md Phase 5: seateye.ts, his head folded
 *   away, the near plane in; his left hand on the wheel, his right on the
 *   throttle's lever, both moving under them, the gauges' needles, the bow
 *   lifting with speed, the spray beading on the windscreen and running off).
 * - The car's readout (`data-drive-hud`): speed, and F / N / R; its pedals read
 *   Ahead and Astern.
 * - It rises at the bow with speed, leans into its turns and trails a wake.
 * - Its engine is the car's voice (sound.ts), its horn the boats' (H).
 * - It bumps softly off everything (boat-sim.ts), with a knock.
 */
import * as THREE from 'three';
import { createDegen, type Degen, type Outfit } from './character';
import { DRIVER_SCALE, HELM, WHEEL_AXIS, driverRoot, helmPose as poseAtHelm, leverAngle } from './helm';
import { seatEye } from './seateye';
import { fpFov, type FpView } from './fpcam';
import { BOAT, HIRE_VIEW, TUNE, WATER_SOLIDS, aheadOf, leaveAt, moversAt, newBoat, speedOf, sprayOf, stepBoat, wakeShape, type BoatInput, type Circle } from './boat-sim';
import { HIRE } from './riverbus';
import { WATER_Y } from './river';
import { NEEDLE_REST, hireBoat } from './riverlife3d';
import { canvasTex, fx, glowMat, glowTex } from './kit';
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
const NAME = 'Hire boat';
/** The near plane from the helm (the wheel and the lever are under his hands), as the car's seat has it */
const CLOSE = 0.08;

type HireModel = ReturnType<typeof hireBoat>;
/** Sit a Degen at the hire boat's wheel (in the boat's group, on the bench, facing the bow); other players' too (remote.ts) */
export function seatAtHelm(driver: Degen, model: HireModel) {
  const g = driver.g;
  g.rotation.set(0, Math.PI / 2, 0);
  g.scale.setScalar(DRIVER_SCALE);
  g.position.copy(driverRoot());
  if (driver.held) driver.held.visible = false;
  model.group.add(g);
}
/**
 * The driver at the helm (helm.ts): on the bench, his left hand on the wheel (turned with the rudder, `steer` -1..1,
 * the wheel too), his right on the throttle's lever (`power` -1 astern .. 1 ahead, the lever too), his head with the
 * turn and `look` (radians)
 */
export function helmPose(driver: Degen, model: HireModel, steer: number, look = 0, power = 0) {
  poseAtHelm(driver.pose, steer, power, look);
  driver.update();
  model.helm.quaternion.setFromAxisAngle(WHEEL_AXIS, steer * HELM.turn);
  model.throttle.rotation.z = leverAngle(power);
}

/** The spray's drops on the windscreen: beads and short runs, seeded (the same picture every time) */
function dropsTex() {
  return canvasTex(256, 128, (g, w, h) => {
    let n = 7;
    const rnd = () => ((n = (n * 16807) % 2147483647) - 1) / 2147483646;
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const [x, y] = [rnd() * w, rnd() * h];
      const r = 1.2 + rnd() * rnd() * 4.5;
      // (a run down from the bigger ones)
      if (r > 3.4) {
        g.strokeStyle = 'rgba(235,248,255,0.35)';
        g.lineWidth = r * 0.7;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (rnd() - 0.5) * 3, y + r * (2 + rnd() * 3));
        g.stroke();
      }
      const grad = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(0.45, 'rgba(210,236,250,0.35)');
      grad.addColorStop(0.85, 'rgba(160,200,225,0.55)');
      grad.addColorStop(1, 'rgba(160,200,225,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(x, y, r, r * (0.8 + rnd() * 0.3), 0, 0, Math.PI * 2);
      g.fill();
    }
  });
}

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
  // The spray on the windscreen: drops beading on the glass's aft face while the bow throws spray, running down
  // and drying off when it eases (`wet` 0..1; still under reduced motion, which throws none)
  const dropsMap = dropsTex();
  dropsMap.wrapS = dropsMap.wrapT = THREE.RepeatWrapping;
  const dropsMat = new THREE.MeshBasicMaterial({ map: dropsMap, transparent: true, opacity: 0, depthWrite: false, fog: false, name: 'boat-drops' });
  const drops = fx(new THREE.Mesh(model.glass.geometry.clone().translate(-0.005, 0, 0), dropsMat));
  drops.renderOrder = 2;
  boat.add(drops);
  let wet = 0;
  // From the helm: his own eyes (seateye.ts), the near plane in so the wheel and the lever under his hands are in view
  const eye = seatEye('boat');
  const nobody = new THREE.Vector3(HELM.seat.x + 0.05, HELM.seat.y + 0.5, 0);
  let near0 = camera.near;
  let fov0 = camera.fov;
  let fov = fov0;
  /** Back to the camera as walk mode had it */
  function eyesOff() {
    eye.off();
    if (camera.near !== near0 || camera.fov !== fov0) {
      camera.near = near0;
      camera.fov = fov = fov0;
      camera.updateProjectionMatrix();
    }
  }

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

  /** Degen at the wheel: on the bench, knees bent, both hands on the wheel's sides (turned with it, the wheel too) */
  function seat() {
    driver = createDegen(d.outfit());
    seatAtHelm(driver, model);
  }
  const poseDriver = () => driver && helmPose(driver, model, steerNow, lookYaw * 0.3, s.power);
  /** The wheel turned with the rudder (helmPose() turns it too, with a driver aboard) */
  const turnHelm = () => model.helm.quaternion.setFromAxisAngle(WHEEL_AXIS, steerNow * HELM.turn);
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
    if (helm) eyesOff();
    helm = false;
    wet = 0;
    dropsMat.opacity = 0;
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
    // (smaller from the helm: the drops fly past close to his eyes)
    sprayMat.size = helm ? 0.12 : 0.32;
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
      near0 = camera.near;
      fov0 = fov = camera.fov;
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
      // (at the helm the camera is at his eyes, his head folded away: seateye.ts)
      if (!helm) eyesOff();
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
      // The gauges: speed over the water and the engine's revs; the spray beading on the screen and drying off
      const revs = Math.min(1, 0.12 + Math.abs(s.power) * 0.55 + (speedOf(s) / TUNE.top) * 0.3);
      const dial = (k: number) => NEEDLE_REST - Math.min(1, Math.max(0, k)) * 2 * NEEDLE_REST;
      model.needles[0].rotation.z = dial(speedOf(s) / TUNE.top);
      model.needles[1].rotation.z = dial(revs + (d.reduced ? 0 : Math.sin(clock * 37) * 0.006));
      const spray = d.reduced ? 0 : sprayOf(speedOf(s));
      wet = Math.min(1, Math.max(0, wet + (spray * 0.9 - 0.12) * Math.min(dt, 0.1) + (knock > 0.8 && !d.reduced ? Math.min(0.3, knock * 0.06) : 0)));
      dropsMat.opacity = 0.85 * Math.min(1, wet * 1.6);
      // (they run down as they dry, faster in the wind of a fast run; the texture wraps)
      if (!d.reduced) dropsMap.offset.y = (dropsMap.offset.y + dt * (0.015 + spray * 0.05)) % 1;

      // The readout: speed, and whether it's going ahead, astern or idling
      const kmh = String(Math.round(speedOf(s) * KMH));
      if (speedEl.textContent !== kmh) speedEl.textContent = kmh;
      const gear = s.power > 0.05 ? 'F' : s.power < -0.05 ? 'R' : 'N';
      if (gearEl.textContent !== gear) gearEl.textContent = gear;
      d.engine(revs);

      // Cameras: the chase camera swings in behind (the look settles back), or at the helm
      lookIdle += dt;
      if (lookIdle > 1.2) {
        lookYaw += (0 - lookYaw) * damp(2.5, dt);
        lookPitch += (0 - lookPitch) * damp(2.5, dt);
      }
      camYaw += wrap(s.yaw - camYaw) * damp(helm ? 20 : 2.8, dt);
      const yaw = camYaw + lookYaw;
      const [fx0, fz0] = [Math.cos(yaw), -Math.sin(yaw)];
      let fe: FpView | null = null;
      if (helm) {
        // His own eyes, the bow lifting with the speed and the boat leaning under them; looking round with the look
        fe = eye.look(boat, driver, DRIVER_SCALE, nobody, camPos, at, lookYaw, lookPitch, dt, { speed: aheadOf(s), yawRate: s.r }, HELM.view.down);
        camera.position.copy(camPos);
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
      if (fe) {
        camera.rotateY(fe.yaw);
        camera.rotateX(fe.pitch);
        // (the view rolls with the boat's lean)
        camera.rotateZ(-fe.roll - boat.rotation.x);
        camera.position.y += fe.y;
        const want = fpFov(HELM.view.fov, camera.aspect) + (d.reduced ? 0 : (speedOf(s) / TUNE.top) * 6);
        fov += (want - fov) * damp(4, dt);
        if (Math.abs(camera.fov - fov) > 0.05 || camera.near !== CLOSE) {
          camera.fov = fov;
          camera.near = CLOSE;
          camera.updateProjectionMatrix();
        }
      }
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
