/*
 * Target practice, in walk mode only: what you see and hear. The rules (ammo,
 * hits, health, score) live in combat-sim.ts; this file feeds it the local
 * player's input and turns its events into the rifle, the targets, effects,
 * sound and the HUD.
 *
 * - You start unarmed. The Armoury's store hands out the guns at its counter
 *   and refills ammo; G holsters and draws. The starters unlock with lifetime
 *   score; the rest are bought there with Dorras (the save, through `game`),
 *   and a gun you don't own can't be taken or swapped to.
 * - The Armoury's mods on your guns (the save again) are handed to the rules
 *   (`sim.setMods`) whenever they're stale: on the first frame, after going
 *   online or offline, and when the workbench calls `setMods()`. The HUD's
 *   magazine numbers follow the modded gun.
 * - Left mouse fires full auto, one shot a pull or a burst a pull (the gun
 *   decides), right mouse aims (the holo red-dot in first person), R reloads.
 *   Phones get Fire, Aim and Reload buttons and a little aim assist; gamepads
 *   fire on RT and reload on X.
 * - Targets: cardboard dummies, patrol drones and the rival crew on the south
 *   bank (drawn by crew.ts). People and cars are never hit. Each of your
 *   takedowns is handed to the city's game (`onTakedown`: XP and counters).
 * - The crew shoves you when it gets close: a sound, a flash round the screen
 *   (`is-shoved` on the city root) and a push walk mode reads from `shove`.
 * - Finishes unlock with your lifetime score, saved in this browser (or in
 *   your player profile when online).
 */
import * as THREE from 'three';
import { FONT_DISPLAY, PAL, canvasTex, fx, glowTex, mergeMeshes, neon, sidesBox, toon } from './kit';
import { type Tick } from './world';
import { CREW_SPOTS, DRONES, DUMMIES, WEAPONS, WEAPON_IDS, createSim, dronePose, weaponUnlocked, type SimEvent, type TargetKind, type WeaponId } from './combat-sim';
import { createCrew } from './crew';
import type { ClientMsg, MeRow, NetEvent } from '../net/protocol';
import { SKINS, buildGun, gunSpec, type Gun, type SkinId } from './guns';
import { holdGun, newStance } from './stance';
import type { Outfit, Pose } from './character';
import { createViewmodel, type ViewState } from './viewmodel';
import { gunMods, ownsGun } from './tycoon';
import type { GameDeps } from './ui';

export { DUMMIES };

export type Sfx =
  | 'shot' | 'shotSmg' | 'shotShotgun' | 'shotDmr' | 'shotRevolver' | 'shotBurst' | 'shotLmg'
  | 'empty' | 'magout' | 'magin' | 'bolt' | 'hit' | 'hitMetal' | 'down' | 'boom' | 'gear' | 'draw' | 'holster' | 'unlock' | 'bump' | 'door'
  /** The city's game: buying, upgrading, levelling up, missions, races, the crew */
  | 'buy' | 'denied' | 'upgrade' | 'levelup' | 'mission' | 'countdown' | 'go' | 'checkpoint' | 'finish' | 'shove' | 'goonDown'
  /** The kart park: boosts, hits taken and landed, the shield, the item roulette and a throw, drifts and their sparks, the jump, the shortcut's gravel, beating your ghost */
  | 'kartBoost' | 'kartHit' | 'kartHitLanded' | 'kartShield' | 'kartItem' | 'kartUse' | 'kartDrift' | 'kartSpark' | 'kartJump' | 'kartLand' | 'kartShortcut' | 'kartGhost';

export interface CombatDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  root: HTMLElement;
  tick: (f: Tick) => void;
  /** Height of the ground the dummies stand on */
  ground: number;
  /** Distance along the ray to the first building or the ground */
  rayWorld(from: THREE.Vector3, dir: THREE.Vector3, max: number): number;
  /** `gain` 0..1 for sounds from further away (other players) */
  sfx(kind: Sfx, gain?: number): void;
  /** The city's game: the save says which guns are bought and what mods they carry (made after walk mode; only read once walking) */
  game: GameDeps;
  /** One of your takedowns (XP and counters for the city's game) */
  onTakedown(kind: TargetKind): void;
}

const ME = 'me';
/** Seconds a goon's shove pushes you, and how long the screen flashes */
const SHOVE_TIME = 0.45;
const SHOVE_FLASH = 0.3;
const SHOT_SOUND: Record<WeaponId, Sfx> = { rifle: 'shot', smg: 'shotSmg', shotgun: 'shotShotgun', dmr: 'shotDmr', revolver: 'shotRevolver', burst: 'shotBurst', lmg: 'shotLmg' };
const PROFILE_KEY = 'degen-city-combat-v1';

/* ---------- Target looks ---------- */

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

/** A pool of glowing points with simple physics; skips all work while none are alive */
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
  pts.visible = false;
  const vel = new Float32Array(n * 3);
  const life = new Float32Array(n);
  const drag = new Float32Array(n);
  const base = new Float32Array(n * 3);
  let next = 0;
  let alive = 0;
  const col = new THREE.Color();
  return {
    pts,
    emit(p: THREE.Vector3, v: THREE.Vector3, color: string, t: number, dragK = 2) {
      const i = next;
      next = (next + 1) % n;
      if (life[i] <= 0) alive++;
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
      vel[i * 3] = v.x;
      vel[i * 3 + 1] = v.y;
      vel[i * 3 + 2] = v.z;
      col.set(color);
      base[i * 3] = col.r;
      base[i * 3 + 1] = col.g;
      base[i * 3 + 2] = col.b;
      life[i] = t;
      drag[i] = dragK;
      pts.visible = true;
    },
    update(dt: number, gravity: number) {
      if (!alive) return;
      const c = geo.attributes.color.array as Float32Array;
      alive = 0;
      for (let i = 0; i < n; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        if (life[i] <= 0) {
          pos[i * 3 + 1] = -999;
          continue;
        }
        alive++;
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
      pts.visible = alive > 0;
    },
  };
}

/* ---------- Saved progress: lifetime score and the chosen finish ---------- */

interface Profile {
  total: number;
  skin: SkinId;
  /** The gun taken last time at the store */
  weapon: WeaponId;
}
function loadProfile(): Profile {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
    const total = Number.isFinite(p.total) ? Math.max(0, p.total) : 0;
    const skin = SKINS.some((s) => s.id === p.skin && total >= s.need) ? p.skin : 'olive';
    const weapon = weaponUnlocked(p.weapon, total) ? p.weapon : 'rifle';
    return { total, skin, weapon };
  } catch {
    return { total: 0, skin: 'olive', weapon: 'rifle' };
  }
}

/* ---------- Combat ---------- */

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
    dmg: $('[data-dmg]'),
    pops: $('[data-pops]'),
    skins: $('[data-skins]'),
    lifetime: $('[data-lifetime]'),
    gun: $('[data-gun]'),
    swapName: $('[data-swap-name]'),
  };
  const touchUi = matchMedia('(pointer: coarse)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Solo, the sim here decides everything; in multiplayer it only predicts our own shots (see setNet)
  let sim = createSim({ ground: d.ground, rayWorld: d.rayWorld });
  let me = sim.addPlayer(ME);
  let net: { send(m: ClientMsg): void } | null = null;
  /**
   * Online: after we gear up, swap or holster, snapshots the server sent
   * before it heard us still show the old gun. Keep our own state until a
   * snapshot agrees (or a second passes and the server's word wins).
   */
  let held: { until: number; weapon: WeaponId; armed: boolean } | null = null;
  /** Online: the server's drone clock at the last snapshot */
  let serverPose: { pt: number; at: number } | null = null;
  const hold = () => {
    if (net) held = { until: performance.now() + 1000, weapon: me.weapon, armed: me.armed };
  };
  /** Multiplayer: the profile on the server (lifetime score and finish) instead of this browser's */
  let netProfile: { total: number; skin: SkinId; weapon: WeaponId } | null = null;
  let requestSkin: ((id: SkinId) => void) | null = null;
  const lifetimeFns: ((total: number) => void)[] = [];

  const profile = loadProfile();
  const saveProfile = () => {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      /* fine: progress just won't stick */
    }
  };

  me.weapon = profile.weapon;
  /** The gun's rules (rate, spread, kick...) for whatever Degen is carrying, with its mods on */
  const W = () => sim.weaponOf(ME);
  /** May Degen have this gun: a starter his score unlocked, or a gun he bought at the Armoury */
  const owns = (id: WeaponId) => weaponUnlocked(id, (netProfile ?? profile).total) && ownsGun(d.game.save(), id);
  /** The save's mods are handed to the sim lazily: the economy is made after walk mode */
  let modsFresh = false;
  const applyMods = () => {
    if (modsFresh) return;
    modsFresh = true;
    const save = d.game.save();
    for (const id of WEAPON_IDS) sim.setMods(ME, id, gunMods(save, id));
    // The gun remembered from last time may have been bought on another save
    if (!me.geared && !owns(me.weapon)) me.weapon = 'rifle';
  };

  // Third person: the gun on Degen's shoulder, in a pivot the walk code parents to his chest
  const pivot = new THREE.Group();
  const stance = newStance();
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshBasicMaterial({ map: glowTex, color: '#ffd36b', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  flash.visible = false;
  fx(flash);
  let gun: Gun = null!;
  /** The gun shown in Degen's hands (follows the sim, which the server can change too) */
  let shownWeapon: WeaponId = me.weapon;
  const mountGun = (id: WeaponId) => {
    if (gun) {
      pivot.remove(gun.group);
      gun.dispose();
    }
    gun = buildGun(id, (netProfile ?? profile).skin, { shadows: true });
    flash.position.copy(gunSpec(id).muzzle).add(new THREE.Vector3(0, 0, 0.06));
    gun.group.add(flash);
    pivot.add(gun.group);
    shownWeapon = id;
  };
  mountGun(me.weapon);
  pivot.visible = false;

  // First person: Degen's hands on the gun
  const vm = createViewmodel(scene, profile.skin, me.weapon);
  const showWeapon = (id: WeaponId) => {
    if (id === shownWeapon) return;
    mountGun(id);
    vm.setWeapon(id);
  };

  let trigger = false;
  let touchFire = false;
  /** Online: a trigger pull since the last controls message (a quick tap can fit between two) */
  let pulled = false;
  let aiming = false;
  let firstPerson = false;
  let kick = 0;
  let flashT = 0;
  let hitT = 0;
  let killT = 0;
  let lastReload = 0;
  let motion = true;

  /* ----- Effects ----- */
  const sparks = particles(160, true, 0.09);
  const puffs = particles(220, false, 0.16);
  scene.add(sparks.pts, puffs.pts);
  const tracerGeo = new THREE.BoxGeometry(0.018, 0.018, 1).translate(0, 0, 0.5);
  const tracers = Array.from({ length: 12 }, () => {
    const m = fx(new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color: '#ffe9a8', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
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

  /* ----- Targets: what the sim's targets look like ----- */
  interface Look {
    /** The target's scene group (for a goon, an empty anchor: the crew draws him) */
    g: THREE.Group;
    bar: THREE.Group;
    fill: THREE.Mesh;
    barShow: number;
    flash: number;
    hinge?: THREE.Group;
    light?: THREE.Mesh;
    fall?: { vy: number; spin: number } | null;
    /** A goon's number in the crew */
    goon?: number;
  }
  const looks: Look[] = [];
  const cardboard = new THREE.MeshToonMaterial({ map: bodyTex() });
  const edge = toon('#a87c44');
  const standGeo = new THREE.CylinderGeometry(0.26, 0.3, 0.06, 16).translate(0, 0.03, 0);
  const postGeo = new THREE.BoxGeometry(0.06, 0.32, 0.06).translate(0, 0.2, 0);
  // The card's printed faces (front and back) in one group, its edges in the other: two draw calls
  const cardGeo = sidesBox(0.62, 0.93, 0.03, [4, 5]).translate(0, 0.465, 0);
  for (const [x, z, ry] of DUMMIES) {
    const g = new THREE.Group();
    g.position.set(x, d.ground, z);
    g.rotation.y = ry;
    // The stand and post are one mesh; the card swings on its hinge
    const base = mergeMeshes([new THREE.Mesh(standGeo, toon('#3a3466')), new THREE.Mesh(postGeo, toon('#6b4a2e'))], { cast: true, receive: true });
    const hinge = new THREE.Group();
    hinge.position.y = 0.34;
    const card = new THREE.Mesh(cardGeo, [cardboard, edge]);
    hinge.add(card);
    card.castShadow = card.receiveShadow = true;
    g.add(base, hinge);
    const { bar, fill } = healthBar();
    bar.position.set(x, d.ground + 1.55, z);
    scene.add(g, bar);
    looks.push({ g, bar, fill, barShow: 0, flash: 0, hinge });
  }
  const droneBody = new THREE.BoxGeometry(0.42, 0.14, 0.42);
  const dronePod = new THREE.SphereGeometry(0.08, 10, 8).translate(0, -0.09, 0.12);
  const droneArm = new THREE.BoxGeometry(0.34, 0.04, 0.05);
  const droneRotor = new THREE.BoxGeometry(0.34, 0.01, 0.04);
  const droneDisc = new THREE.CircleGeometry(0.17, 16).rotateX(-Math.PI / 2);
  // Spinning rotors read as blurred discs, all four one see-through mesh
  const blur = new THREE.MeshBasicMaterial({ color: '#14121f', transparent: true, opacity: 0.5, depthWrite: false });
  for (let i = 0; i < DRONES.length; i++) {
    const g = new THREE.Group();
    // The body, pod, arms and rotor hubs are one mesh
    const parts = [new THREE.Mesh(droneBody, toon('#4f5d31')), new THREE.Mesh(dronePod, toon(PAL.ink))];
    const discs: THREE.Mesh[] = [];
    for (const [ax, az] of [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ]) {
      const arm = new THREE.Mesh(droneArm, toon('#2b2a33'));
      arm.position.set(ax * 0.22, 0.02, az * 0.22);
      arm.rotation.y = -Math.atan2(az, ax);
      const hub = new THREE.Mesh(droneRotor, toon('#14121f'));
      hub.position.set(ax * 0.36, 0.07, az * 0.36);
      hub.scale.set(0.2, 1, 1);
      const disc = new THREE.Mesh(droneDisc, blur);
      disc.position.set(ax * 0.36, 0.075, az * 0.36);
      parts.push(arm, hub);
      discs.push(disc);
    }
    g.add(mergeMeshes(parts, { cast: true, receive: false }), fx(mergeMeshes(discs, { cast: false, receive: false })));
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), neon('#ff2a2a', 0.6, 2.2));
    light.position.set(0, 0.09, -0.18);
    g.add(fx(light));
    const { bar, fill } = healthBar();
    scene.add(g, bar);
    looks.push({ g, bar, fill, barShow: 0, flash: 0, light, fall: null });
  }
  // The crew: one instanced crowd (crew.ts); each goon's look here is only his health bar
  const crew = createCrew(scene, CREW_SPOTS.length);
  for (let i = 0; i < CREW_SPOTS.length; i++) {
    const { bar, fill } = healthBar();
    scene.add(bar);
    looks.push({ g: new THREE.Group(), bar, fill, barShow: 0, flash: 0, goon: i });
  }
  /** A goon's shove on you, while it pushes: the direction and how much is left (1 down to 0) */
  let shove: { dx: number; dz: number; t: number } | null = null;
  let shoveFlash = 0;

  /* ----- HUD ----- */
  let shown = { mag: -1, reserve: -1, score: -1, streak: -1, reload: false, hint: '', gun: '' };
  const paintHud = () => {
    const reloading = me.reload > 0;
    if (me.mag !== shown.mag) hud.mag.textContent = String(me.mag);
    if (me.reserve !== shown.reserve) hud.reserve.textContent = String(me.reserve);
    // Low means the last fifth of this gun's magazine
    const low = me.mag < W().mag && me.mag <= Math.max(1, Math.floor(W().mag / 5));
    hud.mag.classList.toggle('is-low', low);
    const out = me.mag === 0 && me.reserve === 0;
    // Out: another gun with rounds left is a swap away
    const spare = out && guns().some((id) => id !== me.weapon && (me.stash[id]?.some((n) => n > 0) ?? true));
    const hint = out ? (spare ? `Out of ammo: ${touchUi.matches ? 'tap Swap' : 'Q to swap'}` : 'Out of ammo: refill at the Armoury') : reloading ? 'Reloading' : low && me.reserve > 0 ? (touchUi.matches ? 'Tap reload' : 'R to reload') : '';
    if (hint !== shown.hint) {
      hud.hint.textContent = hint;
      hud.hint.hidden = !hint;
    }
    if (me.score !== shown.score) hud.score.textContent = me.score.toLocaleString('en');
    if (me.streak !== shown.streak) {
      hud.streak.hidden = me.streak < 2;
      hud.streak.textContent = `x${me.streak} streak`;
    }
    if (me.weapon !== shown.gun) {
      hud.gun.textContent = W().name;
      hud.swapName.textContent = W().short;
    }
    shown = { mag: me.mag, reserve: me.reserve, score: me.score, streak: me.streak, reload: reloading, hint, gun: me.weapon };
  };
  let crossShown = '';
  let hitShown = '';

  // Floating damage numbers (a small pool of spans, placed over the canvas each frame)
  const nums = Array.from({ length: 14 }, () => {
    const el = document.createElement('span');
    el.className = 'combat-num';
    el.hidden = true;
    hud.dmg.append(el);
    return { el, at: new THREE.Vector3(), t: 0, dx: 0 };
  });
  let nextNum = 0;
  const showNumber = (at: THREE.Vector3, n: number, kill: boolean) => {
    const num = nums[nextNum];
    nextNum = (nextNum + 1) % nums.length;
    num.at.copy(at);
    num.t = 0.8;
    num.dx = (Math.random() - 0.5) * 24;
    num.el.textContent = String(Math.round(n));
    num.el.classList.toggle('is-kill', kill);
    num.el.hidden = false;
  };
  const P = new THREE.Vector3();
  const placeNumbers = (dt: number) => {
    let w = 0;
    let h = 0;
    for (const num of nums) {
      if (num.t <= 0) continue;
      num.t -= dt;
      if (num.t <= 0) {
        num.el.hidden = true;
        continue;
      }
      if (!w) {
        w = hud.dmg.clientWidth;
        h = hud.dmg.clientHeight;
      }
      P.copy(num.at).project(camera);
      if (P.z > 1) {
        num.el.style.opacity = '0';
        continue;
      }
      const age = 0.8 - num.t;
      const rise = reduced ? 0 : age * 46;
      const x = (P.x * 0.5 + 0.5) * w + num.dx * Math.min(1, age * 4);
      const y = (-P.y * 0.5 + 0.5) * h - rise;
      num.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      num.el.style.opacity = String(Math.min(1, num.t * 3));
    }
  };

  // Takedown and streak call-outs near the crosshair
  const pops: { el: HTMLElement; t: number }[] = [];
  const STREAKS = ['', '', 'Double', 'Triple', 'Quad', 'Rampage'];
  /** The guns this player may carry (score-unlocked starters and bought guns), in store order */
  const guns = () => WEAPON_IDS.filter(owns);
  const popup = (big: string, label: string, kind = '') => {
    const el = document.createElement('div');
    el.className = `combat-pop ${kind}`;
    el.innerHTML = `<b></b><span></span>`;
    el.querySelector('b')!.textContent = big;
    el.querySelector('span')!.textContent = label;
    hud.pops.prepend(el);
    pops.push({ el, t: 1.3 });
    while (pops.length > 3) pops.shift()!.el.remove();
  };

  // Rifle finishes: buttons in the Controls panel, unlocked by lifetime score
  const paintSkins = () => {
    const src = netProfile ?? profile;
    hud.lifetime.textContent = Math.floor(src.total).toLocaleString('en');
    for (const b of hud.skins.querySelectorAll<HTMLButtonElement>('[data-skin]')) {
      const s = SKINS.find((k) => k.id === b.dataset.skin)!;
      const open = src.total >= s.need;
      b.disabled = !open;
      b.setAttribute('aria-pressed', String(src.skin === s.id));
      b.querySelector('small')!.textContent = open ? (src.skin === s.id ? 'Equipped' : 'Unlocked') : `${s.need.toLocaleString('en')} pts`;
    }
    for (const f of lifetimeFns) f(src.total);
  };
  const setSkin = (id: SkinId) => {
    profile.skin = id;
    gun.setSkin(id);
    vm.setSkin(id);
    saveProfile();
    paintSkins();
  };
  hud.skins.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-skin]');
    if (!b || b.disabled) return;
    if (netProfile && requestSkin) requestSkin(b.dataset.skin as SkinId);
    else setSkin(b.dataset.skin as SkinId);
  });
  paintSkins();
  /** Pop-ups for finishes and guns the score just unlocked */
  const unlocked = (before: number, after: number) => {
    const crossed = (need: number) => need > 0 && before < need && after >= need;
    for (const s of SKINS) if (crossed(s.need)) popup('Unlocked', `${s.name} finish`, 'is-unlock');
    for (const id of WEAPON_IDS) if (crossed(WEAPONS[id].need)) popup('Unlocked', `${WEAPONS[id].name} at the store`, 'is-unlock');
    if (SKINS.some((s) => crossed(s.need)) || WEAPON_IDS.some((id) => crossed(WEAPONS[id].need))) d.sfx('unlock');
  };
  const addLifetime = (n: number) => {
    const before = profile.total;
    profile.total += n;
    unlocked(before, profile.total);
  };

  const setArmedLook = (on: boolean) => {
    pivot.visible = on;
    root.classList.toggle('is-armed', on);
    if (!on) trigger = touchFire = false;
    paintHud();
  };

  /* ----- Turning sim events into things you see and hear ----- */
  const fwd = new THREE.Vector3();
  const from = new THREE.Vector3();
  function tracer(to: THREE.Vector3, dist: number, start?: THREE.Vector3 | null) {
    if (start) from.copy(start);
    else if (firstPerson && vm.root.visible) {
      // Start on the line from the eye through the hands' muzzle, nearer than the hands are drawn
      vm.muzzle(from).sub(camera.position).normalize();
      from.multiplyScalar(THREE.MathUtils.clamp(dist * 0.5, 0.6, 1.4)).add(camera.position);
    } else gun.group.localToWorld(from.copy(gunSpec(gun.id).muzzle));
    const tr = tracers[nextTracer];
    nextTracer = (nextTracer + 1) % tracers.length;
    tr.m.position.copy(from);
    tr.m.lookAt(to);
    tr.m.scale.set(1, 1, Math.max(0.1, from.distanceTo(to)));
    tr.m.visible = true;
    tr.t = 0.06;
  }

  function onEvent(e: SimEvent) {
    switch (e.type) {
      case 'shot': {
        if (e.player !== ME) break;
        const w = WEAPONS[e.weapon];
        // One bang and one kick per pull; every pellet gets its tracer and its puff
        if (e.pellet === 0) {
          d.sfx(SHOT_SOUND[e.weapon]);
          kick += aiming ? w.kick * 0.7 : w.kick;
          flashT = 0.05;
          vm.kick(Math.min(2.4, 0.7 + w.kick * 30));
        }
        tracer(e.to, e.dist);
        if (e.target === null && e.dist < w.range) {
          const few = w.pellets > 1;
          burst(e.to, few ? 2 : 5, ['#ffe9a8', '#ffb347'], 2.2, 1, true, 0.22);
          burst(e.to, few ? 1 : 4, ['#9a96b8', '#7a7590', '#b5b2c6'], 0.9, 1.4, false, 0.7);
        }
        break;
      }
      case 'hit': {
        const L = looks[e.target];
        const t = sim.targets[e.target];
        L.flash = 0.12;
        L.barShow = 3;
        burst(e.at, 6, ['#ffe9a8', '#ffd36b'], 2.5, 1, true, 0.25);
        if (t.kind === 'dummy') burst(e.at, 5, ['#c99a5a', '#a87c44'], 1.6, 1.2, false, 0.6);
        else if (t.kind === 'goon') burst(e.at, 5, ['#8f3dff', '#00eaff', '#f3f2f7'], 1.6, 1.2, false, 0.5);
        if (e.player === ME) {
          hitT = 0.15;
          d.sfx(t.kind === 'drone' ? 'hitMetal' : 'hit');
          showNumber(e.at, e.damage, e.hp === 0);
          if (!net) addLifetime(10);
        }
        break;
      }
      case 'takedown': {
        const L = looks[e.target];
        const t = sim.targets[e.target];
        if (t.kind === 'dummy') burst(e.at, 26, ['#ff2fb9', '#00eaff', '#ffd36b', '#8f3dff', '#14121f'], 3.2, 1.6, false, 1.1);
        else if (t.kind === 'goon') burst(e.at, 18, ['#8f3dff', '#00eaff', '#ff2fb9', '#f3f2f7'], 2.6, 1.4, false, 0.9);
        else {
          L.fall = { vy: 0, spin: (Math.random() - 0.5) * 8 };
          burst(e.at, 14, ['#ffb347', '#ff6a2f', '#ffe9a8'], 3, 1, true, 0.5);
        }
        if (e.player === ME) {
          killT = 0.3;
          d.sfx(t.kind === 'goon' ? 'goonDown' : 'down');
          if (!net) {
            addLifetime(e.points);
            saveProfile();
          }
          d.onTakedown(t.kind);
          popup(`+${e.points}`, t.kind === 'drone' ? 'Drone down' : t.kind === 'goon' ? 'Goon down' : 'Takedown');
          if (e.streak >= 2) popup(STREAKS[Math.min(e.streak, 5)] || `x${e.streak}`, `x${e.streak} streak`, 'is-streak');
          paintSkins();
        }
        break;
      }
      case 'empty':
        if (e.player === ME) d.sfx('empty');
        break;
      case 'reload':
        lastReload = 0;
        break;
      case 'armed':
        if (e.player === ME) {
          setArmedLook(e.on);
          d.sfx(e.on ? 'draw' : 'holster');
        }
        break;
      case 'gear':
        if (e.player === ME) {
          d.sfx('gear');
          showWeapon(e.weapon);
        }
        break;
      case 'swap':
        if (e.player === ME) {
          d.sfx('draw');
          showWeapon(e.weapon);
          paintHud();
        }
        break;
      case 'respawn': {
        const L = looks[e.target];
        L.g.visible = true;
        L.fall = null;
        L.g.rotation.set(0, sim.targets[e.target].kind === 'dummy' ? sim.targets[e.target].heading : 0, 0);
        break;
      }
      case 'streak-end':
        break;
      case 'shove':
        // One of the crew got you: a thump, a flash round the edges, and walk mode pushes you back
        if (e.player === ME) {
          d.sfx('shove');
          shove = { dx: e.dx, dz: e.dz, t: 1 };
          shoveFlash = SHOVE_FLASH;
          root.classList.add('is-shoved');
        }
        break;
    }
  }

  /* ----- Targets and effects: stepped by walk mode while walking, by the scene otherwise ----- */
  const camQ = new THREE.Quaternion();
  const pose = { x: 0, y: 0, z: 0, heading: 0 };
  let steppedAt = -1e9;
  d.tick(({ t, dt, night }) => {
    vm.setNight(night);
    if (performance.now() - steppedAt > 100) {
      motion = dt > 0;
      sim.advance(dt, motion);
      for (const e of sim.drain()) onEvent(e);
      step(dt, t);
    }
  });
  function step(dt: number, t: number) {
    camera.getWorldQuaternion(camQ);
    const now = sim.poseNow;
    for (let i = 0; i < looks.length; i++) {
      const L = looks[i];
      const tg = sim.targets[i];
      if (L.hinge) {
        if (tg.down > 0) L.hinge.rotation.x += (-1.45 - L.hinge.rotation.x) * Math.min(1, dt * 12);
        // Spring back up, with a wobble after each hit
        else L.hinge.rotation.x += (Math.sin(t * 30) * L.flash * 1.2 - L.hinge.rotation.x) * Math.min(1, dt * 10);
      } else if (L.goon !== undefined) {
        // The crew is drawn below; the anchor only carries the health bar
        L.g.position.set(tg.x, tg.y, tg.z);
      } else {
        const g = L.g;
        if (L.fall) {
          L.fall.vy -= 9 * dt;
          g.position.y += L.fall.vy * dt;
          g.rotation.y += L.fall.spin * dt;
          g.rotation.z = Math.sin(t * 9) * 0.4;
          if (Math.random() < 0.6) puffs.emit(g.position, V.set(0, 0.6, 0), '#3a3a48', 0.9, 1);
          if (g.position.y < d.ground + 0.1) {
            burst(g.position, 18, ['#ffb347', '#ff6a2f', '#ffe9a8'], 3, 1.2, true, 0.6);
            burst(g.position, 10, ['#3a3a48', '#5a5a68'], 1.2, 1.5, false, 1.2);
            if (camera.position.distanceTo(g.position) < 30) d.sfx('boom');
            L.fall = null;
            g.visible = false;
          }
        } else if (tg.down === 0) {
          dronePose(i - DUMMIES.length, now, pose);
          g.position.set(pose.x, pose.y, pose.z);
          g.rotation.set(0, pose.heading, Math.sin(now * 2 + i) * 0.05);
          if (L.flash > 0) g.position.x += Math.sin(t * 80) * 0.04;
        } else g.visible = false; // already down when we joined (no fall to show)
        L.light!.visible = Math.sin(t * 6 + i) > 0;
      }
      L.flash = Math.max(0, L.flash - dt);
      // Health bars face the camera, and show for a while after a hit
      L.barShow = Math.max(0, L.barShow - dt);
      L.bar.visible = L.barShow > 0 && tg.down === 0 && tg.hp > 0;
      if (L.bar.visible) {
        if (!L.hinge) L.bar.position.copy(L.g.position).add(V.set(0, L.goon !== undefined ? crew.height + 0.2 : 0.45, 0));
        L.bar.quaternion.copy(camQ);
        const f = tg.hp / tg.max;
        L.fill.scale.x = Math.max(0.001, f);
        (L.fill.material as THREE.MeshBasicMaterial).color.set(f > 0.5 ? '#3ce06a' : f > 0.25 ? '#ffd23f' : '#ff3b3b');
      }
    }
    crew.update(dt, t, sim.targets, sim.goons, sim.firstGoon);
    if (shove) {
      shove.t -= dt / SHOVE_TIME;
      if (shove.t <= 0) shove = null;
    }
    if (shoveFlash > 0) {
      shoveFlash -= dt;
      if (shoveFlash <= 0) root.classList.remove('is-shoved');
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

  return {
    /** The third-person rifle's pivot: parent it to Degen's chest */
    gun: pivot,
    /** Dress the first-person hands in the outfit's sleeves */
    setOutfit(o: Outfit) {
      vm.setOutfit(o);
    },
    /** Where Degen stands, each frame while walking (the crew comes for him there); anything not finite means away (in a car) */
    setPlayerPos(x: number, z: number) {
      sim.setPlayerPos(ME, x, z);
    },
    /**
     * A goon's shove on you while it lasts: the direction to push (unit length)
     * and how much of the push is left, 1 down to 0 over SHOVE_TIME; null otherwise.
     * Walk mode reads it each frame and pushes Degen's velocity that way.
     */
    get shove() {
      return shove;
    },
    get geared() {
      return me.geared;
    },
    get armed() {
      return me.armed;
    },
    /** 0..1 through a reload (0 when not reloading) */
    get reloading() {
      return me.reload > 0 ? 1 - me.reload / W().reload : 0;
    },
    /** The gun Degen carries (or will get at the store) */
    get weapon() {
      return me.weapon;
    },
    /** First person: degrees the view narrows when aiming with this gun */
    get adsZoom() {
      return W().zoom;
    },
    /** May Degen take this gun yet (a starter his score unlocked, or one he bought)? */
    canTake(id: WeaponId) {
      return owns(id);
    },
    /**
     * The Armoury's mods changed in the save (the workbench): the rules read them again.
     * Without `id`, every gun's are read on the next frame.
     */
    setMods(id?: WeaponId) {
      if (id && modsFresh) sim.setMods(ME, id, gunMods(d.game.save(), id));
      else modsFresh = false;
    },
    get firing() {
      return trigger || touchFire;
    },
    /** The on-screen Fire button is held */
    get touchFiring() {
      return touchFire;
    },
    /** Firing from a touch screen (aim assist applies) */
    get assisted() {
      return touchFire && !trigger;
    },
    /** The drone clock as this browser sees it (sent with shots so the server can rewind) */
    get poseNow() {
      // Reduced motion online: our drones stand still, so tell the server its own clock
      if (net && !motion && serverPose) return serverPose.pt + (performance.now() - serverPose.at) / 1000;
      return sim.poseNow;
    },
    /** How far the first-person rifle is up at the sight (0..1) */
    get aimed() {
      return vm.aimed;
    },
    /** Take a gun at the store counter (the same one again refills its ammo) */
    equip(id: WeaponId) {
      if (!owns(id)) return false;
      applyMods();
      sim.equip(ME, id);
      net?.send({ t: 'equip', w: id });
      hold();
      profile.weapon = id;
      saveProfile();
      return true;
    },
    /** The guns Degen can swap between (score-unlocked starters and bought guns) */
    get guns() {
      return guns();
    },
    /**
     * Swap to another of his guns, anywhere once geared up: `to` is a gun, or a step
     * through them (1 next, -1 previous). Each gun keeps its own ammo.
     */
    swap(to: WeaponId | 1 | -1 = 1) {
      if (!me.geared) return false;
      const list = guns();
      let id: WeaponId | undefined;
      if (typeof to === 'string') id = list.includes(to) ? to : undefined;
      else if (list.length > 1) id = list[(list.indexOf(me.weapon) + to + list.length) % list.length];
      if (!id || id === me.weapon) {
        // Only one gun so far: say what unlocks the next starter, or where the rest are sold
        const next = WEAPON_IDS.find((w) => !list.includes(w) && WEAPONS[w].need > 0);
        if (typeof to !== 'string') popup(WEAPONS[me.weapon].short, next ? `${WEAPONS[next].need.toLocaleString('en')} score unlocks the ${WEAPONS[next].name}` : 'More guns are for sale at the Armoury');
        return false;
      }
      applyMods();
      sim.swap(ME, id);
      net?.send({ t: 'swap', w: id });
      hold();
      profile.weapon = id;
      saveProfile();
      return true;
    },
    toggleHolster() {
      if (!me.geared) return;
      sim.setArmed(ME, !me.armed);
      net?.send({ t: 'arm', on: me.armed });
      hold();
    },
    trigger(on: boolean, touch = false) {
      if (touch) touchFire = on && me.armed;
      else trigger = on && me.armed;
      if (on && me.armed) pulled = true;
    },
    /** Online: was the trigger down at any point since the last call? */
    takePull() {
      const was = pulled || trigger || touchFire;
      pulled = false;
      return was;
    },
    reload() {
      sim.reload(ME);
      net?.send({ t: 'reload' });
    },
    /** Per frame while walking, before the camera moves (t is 0 under reduced motion). Returns the recoil to add to the camera pitch. */
    update(dt: number, t: number, aim: boolean) {
      aiming = aim;
      motion = t > 0;
      steppedAt = performance.now();
      applyMods();
      camera.getWorldDirection(fwd);
      sim.setInput(ME, { fire: me.armed && (trigger || touchFire), aim, assist: touchFire && !trigger, origin: camera.position, dir: fwd });
      sim.advance(dt, motion);
      for (const e of sim.drain()) onEvent(e);
      step(dt, t);

      showWeapon(me.weapon);
      // Reload sounds, in step with the hands
      const r = me.reload > 0 ? 1 - me.reload / W().reload : 0;
      if (r > 0) {
        if (lastReload < 0.15 && r >= 0.15) d.sfx('magout');
        if (lastReload < 0.68 && r >= 0.68) d.sfx('magin');
        if (lastReload < 0.87 && r >= 0.87) d.sfx('bolt');
      }
      lastReload = r;
      paintHud();

      flashT -= dt;
      flash.visible = flashT > 0 && !firstPerson;
      if (flash.visible) flash.rotation.z = Math.random() * Math.PI;
      hitT -= dt;
      killT -= dt;
      const hitNow = killT > 0 ? 'kill' : hitT > 0 ? 'hit' : '';
      if (hitNow !== hitShown) {
        hud.hit.classList.toggle('is-on', !!hitNow);
        hud.hit.classList.toggle('is-kill', hitNow === 'kill');
        hitShown = hitNow;
      }
      const spread = `${Math.round(Math.min(0.08, me.spread + (aim ? W().spreadAim : W().spreadHip)) * 600)}px`;
      if (spread !== crossShown) {
        hud.cross.style.setProperty('--spread', spread);
        crossShown = spread;
      }
      placeNumbers(dt);
      for (let i = pops.length - 1; i >= 0; i--) {
        pops[i].t -= dt;
        if (pops[i].t <= 0) {
          pops[i].el.remove();
          pops.splice(i, 1);
        }
      }
      const k = kick;
      kick = 0;
      return k;
    },
    /** Per frame while walking, after the camera has moved: the first-person hands */
    view(dt: number, t: number, s: Omit<ViewState, 'armed' | 'reload'> & { firstPerson: boolean }) {
      firstPerson = s.firstPerson;
      vm.update(camera, dt, t, { ...s, armed: me.armed, reload: me.reload > 0 ? 1 - me.reload / W().reload : 0 }, s.firstPerson);
      root.classList.toggle('is-ads', s.firstPerson && vm.aimed > 0.6);
      // All the way down the Long Shot's scope: a full-screen scope view (global.css)
      root.classList.toggle('is-scoped', s.firstPerson && me.armed && gunSpec(me.weapon).sight.kind === 'scope' && vm.aimed > 0.92);
    },
    /** Third person, per frame: the gun in Degen's hands (`aim` 0..1 brings it up to aim) */
    poseGun(pose: Pose, aim: number, pitch: number, holdRecoil: number, dt: number) {
      holdGun(pose, stance, pivot, gun, { aim, pitch, recoil: holdRecoil, reload: me.reload > 0 ? 1 - me.reload / W().reload : 0, dt });
    },
    /** Every rifle finish change and lifetime score update (for the profile panel) */
    onLifetime(fn: (total: number) => void) {
      lifetimeFns.push(fn);
      fn((netProfile ?? profile).total);
    },
    get lifetime() {
      return (netProfile ?? profile).total;
    },
    get skin() {
      return (netProfile ?? profile).skin;
    },
    /**
     * Multiplayer on (a link to the server) or off (null). Online, the server
     * decides hits, health, ammo and score; this browser predicts its own shots.
     */
    setNet(link: { send(m: ClientMsg): void } | null, onSkin: ((id: SkinId) => void) | null = null) {
      net = link;
      held = null;
      serverPose = null;
      requestSkin = onSkin;
      sim = createSim({ ground: d.ground, rayWorld: d.rayWorld, authority: !link });
      me = sim.addPlayer(ME);
      me.weapon = profile.weapon;
      // A fresh sim knows no mods: the save's are read again on the next frame
      modsFresh = false;
      for (const L of looks) {
        L.g.visible = true;
        L.fall = null;
        L.barShow = 0;
      }
      setArmedLook(false);
      if (!link) {
        netProfile = null;
        gun.setSkin(profile.skin);
        vm.setSkin(profile.skin);
        paintSkins();
      }
    },
    /** Multiplayer: our profile from the server */
    setNetProfile(p: { total: number; skin: SkinId; weapon: WeaponId }) {
      const first = !netProfile;
      if (netProfile) unlocked(netProfile.total, p.total);
      if (p.skin !== (netProfile ?? profile).skin) {
        gun.setSkin(p.skin);
        vm.setSkin(p.skin);
      }
      netProfile = { total: p.total, skin: p.skin, weapon: p.weapon };
      // Joining: carry the gun the profile picked last time (once geared up at the store)
      if (first && !me.geared) me.weapon = p.weapon;
      paintSkins();
    },
    /** Multiplayer: positions of targets and our own ammo and score */
    netSnap(pt: number, tg: [number, number, number][], mine: MeRow) {
      serverPose = { pt, at: performance.now() };
      // Under reduced motion the drones hover where they are instead of jumping to the server's clock
      if (motion && Math.abs(sim.poseNow - pt) > 0.15) sim.setPoseTime(pt);
      sim.applyTargets(tg);
      const [mag, reserve, reloading, score, streak, armed, w] = mine;
      const weapon = WEAPON_IDS[w] ?? me.weapon;
      if (held && (performance.now() > held.until || (weapon === held.weapon && !!armed === held.armed))) held = null;
      // Still waiting for the server to catch up: take its score, keep our gun and ammo
      if (held) sim.syncPlayer(ME, { mag: me.mag, reserve: me.reserve, reloading: false, score, streak, armed: me.armed, weapon: me.weapon });
      else sim.syncPlayer(ME, { mag, reserve, reloading: !!reloading, score, streak, armed: !!armed, weapon });
    },
    /** Multiplayer: combat events from the server; `muzzle` finds another player's rifle */
    netEvents(events: NetEvent[], myId: number, muzzle: (id: number, out: THREE.Vector3) => THREE.Vector3 | null) {
      for (const e of events) {
        const who = e[1] === myId ? ME : `p${e[1]}`;
        if (e[0] === 's') {
          // Our own shots were already drawn when we fired
          if (who === ME) continue;
          const to = new THREE.Vector3(e[5], e[6], e[7]);
          const start = muzzle(e[1], new THREE.Vector3()) ?? new THREE.Vector3(e[2], e[3], e[4]);
          const dist = start.distanceTo(camera.position);
          const weapon = WEAPON_IDS[e[9]] ?? 'rifle';
          tracer(to, 0, start);
          if (e[8] === -1 && to.distanceTo(camera.position) < 40) burst(to, e[10] ? 1 : 4, ['#ffe9a8', '#ffb347'], 2.2, 1, true, 0.22);
          if (e[10] === 0 && dist < 45) d.sfx(SHOT_SOUND[weapon], Math.max(0.08, 1 - dist / 45) * 0.7);
        } else if (e[0] === 'h') {
          onEvent({ type: 'hit', player: who, target: e[2], damage: e[3], at: new THREE.Vector3(e[4], e[5], e[6]), hp: e[7] });
        } else if (e[0] === 'k') {
          sim.applyTargets([[e[2], 0, 1]]);
          onEvent({ type: 'takedown', player: who, target: e[2], at: new THREE.Vector3(e[3], e[4], e[5]), points: e[6], streak: e[7] });
        }
      }
    },
    /** Send a command to the server too when online (gear up, holster, reload) */
    get online() {
      return !!net;
    },
    exit() {
      trigger = touchFire = false;
      sim.setInput(ME, { fire: false });
      sim.setPlayerPos(ME, NaN, NaN);
      shove = null;
      shoveFlash = 0;
      vm.root.visible = false;
      root.classList.remove('is-ads', 'is-scoped', 'is-shoved');
      saveProfile();
    },
  };
}

export type Combat = ReturnType<typeof createCombat>;
