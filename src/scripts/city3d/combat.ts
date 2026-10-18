/*
 * Guns, in walk mode only: Degen's assault rifle, the training targets round
 * the city and the shooting HUD.
 *
 * - You start unarmed. The weapon rack inside the Armoury gate gears you up
 *   (and refills ammo); G holsters and draws.
 * - Left mouse fires full auto, right mouse aims, R reloads (30 rounds a
 *   magazine, 120 spare). Phones get Fire and Reload buttons and a little aim
 *   assist; gamepads fire on RT and reload on X.
 * - Shots are hitscan from the crosshair. They hit training dummies and target
 *   drones (health bars, knock down, respawn) and spark off the world.
 *   People and cars are never hit.
 */
import * as THREE from 'three';
import { FONT_DISPLAY, PAL, canvasTex, fx, glowTex, neon, toon } from './kit';
import { SLAB, type Tick } from './world';

/* ---------- The rifle ---------- */

const STEEL = '#2b2a33';
const FURNITURE = '#5a6b3a';

/** The assault rifle's parts, barrel along +z, the grip at the origin. */
function rifleParts(): [THREE.BufferGeometry, string][] {
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, rx = 0) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.rotateX(rx);
    return g.translate(x, y, z);
  };
  const barrel = new THREE.CylinderGeometry(0.015, 0.015, 0.22, 8).rotateX(Math.PI / 2).translate(0, 0.045, 0.31);
  return [
    [box(0.062, 0.09, 0.3, 0, 0.035, 0.05), STEEL],
    [barrel, STEEL],
    [box(0.034, 0.034, 0.055, 0, 0.045, 0.44), STEEL],
    [box(0.07, 0.072, 0.17, 0, 0.035, 0.27), FURNITURE],
    [box(0.052, 0.1, 0.2, 0, 0.0, -0.19, 0.12), FURNITURE],
    [box(0.04, 0.095, 0.045, 0, -0.045, -0.005, 0.32), FURNITURE],
    [box(0.04, 0.13, 0.062, 0, -0.07, 0.1, -0.22), STEEL],
    [box(0.03, 0.032, 0.13, 0, 0.096, 0.05), PAL.ink],
    [box(0.012, 0.04, 0.012, 0, 0.08, 0.35), PAL.ink],
  ];
}
export const MUZZLE = new THREE.Vector3(0, 0.045, 0.47);

/** The rifle as one merged shape (for crowds: the soldiers carry the same gun). */
export function rifleGeometry() {
  const geos = rifleParts().map(([g]) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
    return n;
  });
  const out = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv'] as const) {
    const total = geos.reduce((a, g) => a + g.attributes[k].array.length, 0);
    const arr = new Float32Array(total);
    let o = 0;
    for (const g of geos) {
      arr.set(g.attributes[k].array as Float32Array, o);
      o += g.attributes[k].array.length;
    }
    out.setAttribute(k, new THREE.BufferAttribute(arr, k === 'uv' ? 2 : 3));
  }
  return out;
}

function buildRifle() {
  const g = new THREE.Group();
  for (const [geo, color] of rifleParts()) {
    const m = new THREE.Mesh(geo, toon(color));
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

/* ---------- Targets ---------- */

/** Where the training dummies stand: in the park and on a few lots. */
export const DUMMIES: [number, number, number][] = [
  [5.15, 3.0, 0],
  [7.45, 3.0, 0],
  [2.6, 7.6, Math.PI / 2],
  [7.7, 24.1, Math.PI / 4],
  [8.1, 25.6, Math.PI / 4],
  [28.6, 7.0, 0],
  [24.4, 6.4, 0],
];

interface Target {
  kind: 'dummy' | 'drone';
  g: THREE.Group;
  hp: number;
  max: number;
  /** Seconds until it's back after a takedown (0 while up) */
  down: number;
  flash: number;
  bar: THREE.Group;
  fill: THREE.Mesh;
  barShow: number;
  hit(ray: THREE.Ray): number | null;
}

const bodyTex = () =>
  canvasTex(256, 384, (c) => {
    // A cardboard "jeet bot": a cartoon robot cutout with a target on its chest
    c.fillStyle = '#c99a5a';
    c.fillRect(0, 0, 256, 384);
    c.fillStyle = '#d9d4c0';
    c.strokeStyle = PAL.ink;
    c.lineWidth = 8;
    c.beginPath();
    c.roundRect(58, 20, 140, 110, 22);
    c.fill();
    c.stroke();
    c.fillStyle = '#e23b3b';
    c.fillRect(86, 58, 30, 22);
    c.fillRect(140, 58, 30, 22);
    c.fillStyle = PAL.ink;
    c.fillRect(100, 100, 56, 8);
    c.fillRect(124, 0, 8, 22);
    c.fillStyle = '#d9d4c0';
    c.beginPath();
    c.roundRect(38, 140, 180, 200, 26);
    c.fill();
    c.stroke();
    for (const [r, col] of [
      [70, '#e23b3b'],
      [52, '#f3f2f7'],
      [34, '#e23b3b'],
      [16, '#f3f2f7'],
    ] as const) {
      c.fillStyle = col;
      c.beginPath();
      c.arc(128, 236, r, 0, Math.PI * 2);
      c.fill();
    }
    c.font = `900 34px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.fillStyle = PAL.ink;
    c.fillText('JEET BOT', 128, 372);
  });

function healthBar() {
  const bar = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.085), new THREE.MeshBasicMaterial({ color: '#0b0a12', transparent: true, opacity: 0.85, depthTest: false }));
  const fillGeo = new THREE.PlaneGeometry(0.58, 0.05);
  fillGeo.translate(0.29, 0, 0);
  const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color: '#3ce06a', depthTest: false }));
  fill.position.set(-0.29, 0, 0.001);
  bg.renderOrder = 20;
  fill.renderOrder = 21;
  bar.add(bg, fill);
  bar.visible = false;
  return { bar: fx(bar), fill };
}

/* ---------- Effects ---------- */

function particles(n: number, additive: boolean, size: number) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3).fill(-999);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const mat = new THREE.PointsMaterial({
    size,
    map: glowTex,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    fog: false,
  });
  const pts = fx(new THREE.Points(geo, mat));
  pts.frustumCulled = false;
  const vel = new Float32Array(n * 3);
  const life = new Float32Array(n);
  const drag = new Float32Array(n);
  const base = new Float32Array(n * 3);
  let next = 0;
  const col = new THREE.Color();
  return {
    pts,
    emit(p: THREE.Vector3, v: THREE.Vector3, color: string, t: number, dragK = 2) {
      const i = next;
      next = (next + 1) % n;
      pos.set([p.x, p.y, p.z], i * 3);
      vel.set([v.x, v.y, v.z], i * 3);
      col.set(color);
      base.set([col.r, col.g, col.b], i * 3);
      life[i] = t;
      drag[i] = dragK;
    },
    update(dt: number, gravity: number) {
      const c = geo.attributes.color.array as Float32Array;
      for (let i = 0; i < n; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        if (life[i] <= 0) {
          pos[i * 3 + 1] = -999;
          continue;
        }
        const k = Math.exp(-drag[i] * dt);
        vel[i * 3] *= k;
        vel[i * 3 + 2] *= k;
        vel[i * 3 + 1] = vel[i * 3 + 1] * k - gravity * dt;
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        const f = Math.min(1, life[i] * 3);
        c[i * 3] = base[i * 3] * f;
        c[i * 3 + 1] = base[i * 3 + 1] * f;
        c[i * 3 + 2] = base[i * 3 + 2] * f;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}

/* ---------- Combat ---------- */

export type Sfx = 'shot' | 'reload' | 'empty' | 'hit' | 'down' | 'gear';

export interface CombatDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  root: HTMLElement;
  tick: (f: Tick) => void;
  /** Distance along the ray to the first building or the ground */
  rayWorld(from: THREE.Vector3, dir: THREE.Vector3, max: number): number;
  sfx(kind: Sfx): void;
}

const MAG = 30;
const RESERVE = 120;
const RATE = 9.5;
const DAMAGE = 25;
const RELOAD = 1.7;

export function createCombat(d: CombatDeps) {
  const { scene, camera, root } = d;
  const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const hud = {
    cross: $('[data-cross]'),
    hit: $('[data-hitmark]'),
    mag: $('[data-mag]'),
    reserve: $('[data-reserve]'),
    hint: $('[data-reload-hint]'),
    score: $('[data-score]'),
    streak: $('[data-streak]'),
  };

  // The rifle, held in a pivot the walk code parents to Degen's chest
  const pivot = new THREE.Group();
  const rifle = buildRifle();
  pivot.add(rifle);
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshBasicMaterial({ map: glowTex, color: '#ffd36b', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  flash.position.copy(MUZZLE).add(new THREE.Vector3(0, 0, 0.06));
  flash.visible = false;
  rifle.add(fx(flash));
  pivot.visible = false;

  let geared = false;
  let armed = false;
  let mag = MAG;
  let reserve = RESERVE;
  let trigger = false;
  let touchFire = false;
  let cooldown = 0;
  let reloading = 0;
  const touchUi = matchMedia('(pointer: coarse)');
  let spread = 0;
  let kick = 0;
  let flashT = 0;
  let hitT = 0;
  let score = 0;
  let streak = 0;
  let streakT = 0;
  let aiming = false;

  /* ----- Effects ----- */
  const sparks = particles(160, true, 0.09);
  const puffs = particles(220, false, 0.16);
  scene.add(sparks.pts, puffs.pts);
  const tracerMat = new THREE.MeshBasicMaterial({ color: '#ffe9a8', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const tracerGeo = new THREE.BoxGeometry(0.018, 0.018, 1).translate(0, 0, 0.5);
  const tracers = Array.from({ length: 6 }, () => {
    const m = fx(new THREE.Mesh(tracerGeo, tracerMat.clone()));
    m.visible = false;
    scene.add(m);
    return { m, t: 0 };
  });
  let nextTracer = 0;
  const V = new THREE.Vector3();
  const burst = (p: THREE.Vector3, n: number, colors: string[], speed: number, up: number, additive: boolean, life = 0.5) => {
    for (let i = 0; i < n; i++) {
      V.set(Math.random() - 0.5, Math.random() * up, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
      (additive ? sparks : puffs).emit(p, V, colors[i % colors.length], life * (0.6 + Math.random() * 0.6));
    }
  };

  /* ----- Targets ----- */
  const targets: Target[] = [];
  const cardboard = new THREE.MeshToonMaterial({ map: bodyTex() });
  const edge = toon('#a87c44');
  for (const [x, z, ry] of DUMMIES) {
    const g = new THREE.Group();
    g.position.set(x, SLAB, z);
    g.rotation.y = ry;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.06, 16), toon('#3a3466'));
    base.position.y = 0.03;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.06), toon('#6b4a2e'));
    post.position.y = 0.2;
    const hinge = new THREE.Group();
    hinge.position.y = 0.34;
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.93, 0.03), [edge, edge, edge, edge, cardboard, cardboard]);
    card.position.y = 0.465;
    hinge.add(card);
    for (const m of [base, post, card]) m.castShadow = m.receiveShadow = true;
    g.add(base, post, hinge);
    const { bar, fill } = healthBar();
    bar.position.set(x, SLAB + 1.55, z);
    scene.add(g, bar);
    const inv = new THREE.Matrix4();
    const local = new THREE.Ray();
    const lo = new THREE.Vector3(-0.31, 0.34, -0.06);
    const hi = new THREE.Vector3(0.31, 1.27, 0.06);
    const box3 = new THREE.Box3(lo, hi);
    const hitP = new THREE.Vector3();
    targets.push({
      kind: 'dummy',
      g,
      hp: 100,
      max: 100,
      down: 0,
      flash: 0,
      bar,
      fill,
      barShow: 0,
      hit(ray) {
        g.updateMatrixWorld();
        inv.copy(g.matrixWorld).invert();
        local.copy(ray).applyMatrix4(inv);
        const p = local.intersectBox(box3, hitP);
        return p ? p.applyMatrix4(g.matrixWorld).distanceTo(ray.origin) : null;
      },
    });
    (targets[targets.length - 1] as Target & { hinge?: THREE.Group }).hinge = hinge;
  }

  // Target drones on patrol above the streets
  const loops: [number, number, number, number, number][] = [
    [10, 10, 21, 21, 4.4],
    [-1, -1, 32, 32, 5.6],
  ];
  const along = (L: [number, number, number, number, number], s: number) => {
    const [x0, z0, x1, z1] = L;
    const w = x1 - x0;
    const h = z1 - z0;
    const per = 2 * (w + h);
    let u = ((s % per) + per) % per;
    if (u < w) return [x0 + u, z0, Math.PI / 2];
    u -= w;
    if (u < h) return [x1, z0 + u, 0];
    u -= h;
    if (u < w) return [x1 - u, z1, -Math.PI / 2];
    u -= w;
    return [x0, z1 - u, Math.PI];
  };
  const droneOlive = toon('#4f5d31');
  const droneSpecs: { loop: number; phase: number }[] = [
    { loop: 0, phase: 0 },
    { loop: 0, phase: 22 },
    { loop: 1, phase: 0 },
    { loop: 1, phase: 66 },
  ];
  const drones = droneSpecs.map((spec) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.42), droneOlive);
    const pod = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), toon(PAL.ink));
    pod.position.set(0, -0.09, 0.12);
    g.add(body, pod);
    const rotors: THREE.Mesh[] = [];
    for (const [ax, az] of [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.05), toon(STEEL));
      arm.position.set(ax * 0.22, 0.02, az * 0.22);
      arm.rotation.y = Math.atan2(az, ax) * -1;
      const rotor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.01, 0.04), toon('#14121f'));
      rotor.position.set(ax * 0.36, 0.07, az * 0.36);
      rotors.push(rotor);
      g.add(arm, rotor);
    }
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), neon('#ff2a2a', 0.6, 2.2));
    light.position.set(0, 0.09, -0.18);
    g.add(fx(light));
    for (const m of [body, pod]) m.castShadow = true;
    scene.add(g);
    const { bar, fill } = healthBar();
    scene.add(bar);
    const sphere = new THREE.Sphere(new THREE.Vector3(), 0.42);
    const hitP = new THREE.Vector3();
    const t: Target & { spec: typeof spec; rotors: THREE.Mesh[]; light: THREE.Mesh; fall: { vy: number; spin: number } | null } = {
      kind: 'drone',
      g,
      hp: 75,
      max: 75,
      down: 0,
      flash: 0,
      bar,
      fill,
      barShow: 0,
      spec,
      rotors,
      light,
      fall: null,
      hit(ray) {
        if (t.fall) return null;
        sphere.center.copy(g.position);
        const p = ray.intersectSphere(sphere, hitP);
        return p ? p.distanceTo(ray.origin) : null;
      },
    };
    targets.push(t);
    return t;
  });

  /* ----- HUD ----- */
  const paintHud = () => {
    hud.mag.textContent = String(mag);
    hud.reserve.textContent = String(reserve);
    hud.mag.classList.toggle('is-low', mag <= 6);
    hud.hint.hidden = !(mag <= 6 && reserve > 0 && !reloading);
    hud.hint.textContent = mag === 0 && reserve === 0 ? 'Out of ammo: gear up at the Armoury' : touchUi.matches ? 'Tap reload' : 'R to reload';
    if (mag === 0 && reserve === 0) hud.hint.hidden = false;
    hud.score.textContent = String(score);
    hud.streak.hidden = streak < 2;
    hud.streak.textContent = `x${streak} streak`;
  };
  const setArmed = (on: boolean) => {
    armed = on && geared;
    pivot.visible = armed;
    root.classList.toggle('is-armed', armed);
    if (!armed) trigger = touchFire = false;
    paintHud();
  };

  /* ----- Shooting ----- */
  const ray = new THREE.Ray();
  const dir = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const muzzle = new THREE.Vector3();
  const fwd = new THREE.Vector3();

  function startReload() {
    if (!armed || reloading || mag === MAG || reserve === 0) return;
    reloading = RELOAD;
    d.sfx('reload');
    paintHud();
  }

  function damage(t: Target, amount: number, at: THREE.Vector3) {
    t.hp = Math.max(0, t.hp - amount);
    t.flash = 0.12;
    t.barShow = 3;
    score += 10;
    hitT = 0.15;
    d.sfx('hit');
    burst(at, 6, ['#ffe9a8', '#ffd36b'], 2.5, 1, true, 0.25);
    if (t.kind === 'dummy') burst(at, 5, ['#c99a5a', '#a87c44'], 1.6, 1.2, false, 0.6);
    if (t.hp > 0) return;
    // Takedown
    score += t.kind === 'drone' ? 150 : 100;
    streak = streakT > 0 ? streak + 1 : 1;
    streakT = 6;
    d.sfx('down');
    if (t.kind === 'dummy') {
      t.down = 4;
      burst(at, 26, ['#ff2fb9', '#00eaff', '#ffd36b', '#8f3dff', '#14121f'], 3.2, 1.6, false, 1.1);
    } else {
      const dr = t as (typeof drones)[number];
      dr.fall = { vy: 0, spin: (Math.random() - 0.5) * 8 };
      burst(at, 14, ['#ffb347', '#ff6a2f', '#ffe9a8'], 3, 1, true, 0.5);
    }
  }

  function fire(touch: boolean) {
    if (mag === 0) {
      d.sfx('empty');
      cooldown = 0.25;
      if (reserve > 0) startReload();
      return;
    }
    mag--;
    cooldown = Math.max(cooldown, -1 / RATE) + 1 / RATE;
    flashT = 0.05;
    kick += 0.012;
    spread = Math.min(0.04, spread + 0.005);
    d.sfx('shot');

    camera.getWorldDirection(fwd);
    dir.copy(fwd);
    // Phones: a little aim assist towards a target near the crosshair
    if (touch) {
      let best = 0.12;
      for (const t of targets) {
        if (t.down > 0 || (t as { fall?: unknown }).fall) continue;
        tmp.copy(t.g.position);
        if (t.kind === 'dummy') tmp.y += 0.8;
        tmp.sub(camera.position);
        const dist = tmp.length();
        if (dist > 38) continue;
        const ang = tmp.normalize().angleTo(fwd);
        if (ang < best) {
          best = ang;
          dir.copy(tmp);
        }
      }
    }
    const s = spread + (aiming ? 0.003 : 0.012);
    dir.x += (Math.random() - 0.5) * s * 2;
    dir.y += (Math.random() - 0.5) * s * 2;
    dir.z += (Math.random() - 0.5) * s * 2;
    dir.normalize();
    ray.set(camera.position, dir);

    let hitT2 = d.rayWorld(camera.position, dir, 70);
    let hitTarget: Target | null = null;
    for (const t of targets) {
      if (t.down > 0) continue;
      const dt2 = t.hit(ray);
      if (dt2 !== null && dt2 < hitT2 && dt2 > 0.5) {
        hitT2 = dt2;
        hitTarget = t;
      }
    }
    const at = ray.at(hitT2, new THREE.Vector3());
    if (hitTarget) damage(hitTarget, DAMAGE, at);
    else if (hitT2 < 70) {
      burst(at, 5, ['#ffe9a8', '#ffb347'], 2.2, 1, true, 0.22);
      burst(at, 4, ['#9a96b8', '#7a7590', '#b5b2c6'], 0.9, 1.4, false, 0.7);
    }
    // Tracer from the muzzle
    rifle.localToWorld(muzzle.copy(MUZZLE));
    const tr = tracers[nextTracer];
    nextTracer = (nextTracer + 1) % tracers.length;
    tr.m.position.copy(muzzle);
    tr.m.lookAt(at);
    tr.m.scale.set(1, 1, Math.max(0.1, muzzle.distanceTo(at)));
    tr.m.visible = true;
    tr.t = 0.06;
    paintHud();
  }

  /* ----- Targets and effects: stepped by walk mode while walking, by the scene otherwise ----- */
  const camQ = new THREE.Quaternion();
  let steppedAt = -1e9;
  d.tick(({ t, dt }) => {
    if (performance.now() - steppedAt > 100) step(dt, t);
  });
  function step(dt: number, t: number) {
    camera.getWorldQuaternion(camQ);
    for (const tg of targets) {
      if (tg.kind === 'dummy') {
        const hinge = (tg as Target & { hinge: THREE.Group }).hinge;
        if (tg.down > 0) {
          tg.down -= dt;
          hinge.rotation.x += (-1.45 - hinge.rotation.x) * Math.min(1, dt * 12);
          if (tg.down <= 0) {
            tg.hp = tg.max;
            tg.down = 0;
          }
        } else {
          // Spring back up, with a wobble after each hit
          hinge.rotation.x += (Math.sin(t * 30) * tg.flash * 1.2 - hinge.rotation.x) * Math.min(1, dt * 10);
        }
      } else {
        const dr = tg as (typeof drones)[number];
        if (dr.fall) {
          dr.fall.vy -= 9 * dt;
          dr.g.position.y += dr.fall.vy * dt;
          dr.g.rotation.y += dr.fall.spin * dt;
          dr.g.rotation.z = Math.sin(t * 9) * 0.4;
          if (Math.random() < 0.6) puffs.emit(dr.g.position, V.set(0, 0.6, 0), '#3a3a48', 0.9, 1);
          if (dr.g.position.y < SLAB + 0.1) {
            burst(dr.g.position, 18, ['#ffb347', '#ff6a2f', '#ffe9a8'], 3, 1.2, true, 0.6);
            burst(dr.g.position, 10, ['#3a3a48', '#5a5a68'], 1.2, 1.5, false, 1.2);
            dr.fall = null;
            dr.g.visible = false;
            dr.down = 6;
          }
        } else if (dr.down > 0) {
          dr.down -= dt;
          if (dr.down <= 0) {
            dr.down = 0;
            dr.hp = dr.max;
            dr.g.visible = true;
            dr.g.rotation.set(0, 0, 0);
          }
        }
        if (!dr.fall && dr.down === 0) {
          const L = loops[dr.spec.loop];
          const [x, z, heading] = along(L, t * 1.8 + dr.spec.phase);
          dr.g.position.set(x as number, L[4] + Math.sin(t * 1.3 + dr.spec.phase) * 0.25, z as number);
          dr.g.rotation.set(0, heading as number, Math.sin(t * 2 + dr.spec.phase) * 0.05);
          if (tg.flash > 0) dr.g.position.x += Math.sin(t * 80) * 0.04;
        }
        for (const r of dr.rotors) r.rotation.y = t * 40;
        dr.light.visible = Math.sin(t * 6 + dr.spec.phase) > 0;
      }
      tg.flash = Math.max(0, tg.flash - dt);
      // Health bars face the camera, and show for a while after a hit
      tg.barShow = Math.max(0, tg.barShow - dt);
      tg.bar.visible = tg.barShow > 0 && tg.down === 0 && tg.hp > 0;
      if (tg.bar.visible) {
        if (tg.kind === 'drone') tg.bar.position.copy(tg.g.position).add(V.set(0, 0.45, 0));
        tg.bar.quaternion.copy(camQ);
        const f = tg.hp / tg.max;
        tg.fill.scale.x = Math.max(0.001, f);
        (tg.fill.material as THREE.MeshBasicMaterial).color.set(f > 0.5 ? '#3ce06a' : f > 0.25 ? '#ffd23f' : '#ff3b3b');
      }
    }
    sparks.update(dt, 4);
    puffs.update(dt, 1.2);
    for (const tr of tracers) {
      if (!tr.m.visible) continue;
      tr.t -= dt;
      (tr.m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, tr.t / 0.06) * 0.9;
      if (tr.t <= 0) tr.m.visible = false;
    }
  }

  const hitEl = hud.hit;

  return {
    /** The rifle's pivot: parent it to Degen's chest */
    gun: pivot,
    get geared() {
      return geared;
    },
    get armed() {
      return armed;
    },
    get reloading() {
      return reloading > 0 ? 1 - reloading / RELOAD : 0;
    },
    get firing() {
      return trigger || touchFire;
    },
    /** Take a rifle from the Armoury rack (and refill ammo) */
    gearUp() {
      geared = true;
      mag = MAG;
      reserve = RESERVE;
      reloading = 0;
      d.sfx('gear');
      setArmed(true);
    },
    toggleHolster() {
      if (geared) setArmed(!armed);
    },
    trigger(on: boolean, touch = false) {
      if (touch) touchFire = on && armed;
      else trigger = on && armed;
    },
    reload: startReload,
    /** Per frame while walking (t is 0 under reduced motion). Returns the recoil to add to the camera pitch. */
    update(dt: number, t: number, aim: boolean) {
      aiming = aim;
      steppedAt = performance.now();
      step(dt, t);
      cooldown -= dt;
      if (reloading > 0) {
        reloading -= dt;
        if (reloading <= 0) {
          const take = Math.min(MAG - mag, reserve);
          mag += take;
          reserve -= take;
          reloading = 0;
          paintHud();
        }
      }
      // Up to two shots a frame, so the rate holds on slow devices
      for (let i = 0; i < 2 && armed && (trigger || touchFire) && cooldown <= 0 && reloading <= 0; i++) fire(touchFire && !trigger);
      spread = Math.max(0, spread - dt * 0.2);
      flashT -= dt;
      flash.visible = flashT > 0;
      if (flash.visible) flash.rotation.z = Math.random() * Math.PI;
      hitT -= dt;
      hitEl.classList.toggle('is-on', hitT > 0);
      streakT -= dt;
      if (streakT <= 0 && streak) {
        streak = 0;
        paintHud();
      }
      hud.cross.style.setProperty('--spread', `${(spread + (aim ? 0.003 : 0.012)) * 600}px`);
      const k = kick;
      kick = 0;
      return k;
    },
    /** Pose the rifle for this frame: aim 0..1 brings it up to the shoulder */
    poseGun(aim: number, pitchDown: number, lean: number, holdRecoil: number) {
      const rl = reloading > 0 ? Math.sin((1 - reloading / RELOAD) * Math.PI) : 0;
      // On the right shoulder (the rig's -x side)
      pivot.position.set(-0.09 + aim * 0.04, 0.3 + aim * 0.06, 0.13 + aim * 0.03 - holdRecoil * 0.4);
      pivot.rotation.set(THREE.MathUtils.lerp(0.55, pitchDown - lean, aim) + rl * 0.5 - holdRecoil * 2, 0.08 * (1 - aim), -rl * 0.7);
    },
    exit() {
      trigger = touchFire = false;
    },
  };
}

export type Combat = ReturnType<typeof createCombat>;
