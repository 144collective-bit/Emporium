/*
 * The Outlands drawn and walked (docs/outlands-plan.md, Phase 0): its own
 * chunk, fetched when the hub's "The Outlands" is picked (index.ts, through
 * `lazy()`), never in the city's boot.
 *
 * - **Its own scene, the same renderer**: the city's scene is held as it is
 *   (not drawn, not ticked) while the Outlands draws through the one render
 *   loop (index.ts `frame()` hands it the frame). Its own post chain (the ink
 *   outlines, the bloom) over its own scene, made once and kept, so trips
 *   there and back don't add up.
 * - **The land**: outlands.ts's height map in chunks round Degen, each a
 *   height grid at its level of detail with a skirt hiding the cracks
 *   between levels, coloured per vertex from the Outlands' palette
 *   (palette.ts `OUTLANDS_COVER`), normals from the height map itself so
 *   neighbouring chunks shade (and ink) alike. Built a few a frame nearest
 *   first, let go once out of reach; all let go on leaving.
 * - **Degen on foot**: his own small walker (not walk.ts, which is the
 *   city's): the movement springs (movesim.ts), the planted feet
 *   (locomotion.ts) and the motion capture over them (animator.ts, its
 *   clips fetched as walk mode fetches them), on the height map, walking
 *   stopping at the edge and at the lake.
 * - **Controls**: WASD / arrows, Shift to sprint, Space to jump, the mouse
 *   to look (click to hold it), Esc for the pause card; touch: the left half
 *   a stick, the right half to look, a tap there to jump; a gamepad: the
 *   sticks, A to jump, a held stick click or RT to sprint, Start to pause.
 * - **The save**: where the run is, kept every few seconds and on leaving
 *   (outlands-save.ts, its own key).
 */
import * as THREE from 'three';
import { createPost, type PostOpts } from './post';
import { CHUNK, LODS, SIZE, SPAWN, WATER_Y, chunkX, chunksAround, heightAt, noise, walkable, waterDepth, type ChunkWant, type LodTier } from './outlands';
import { OUTLANDS_KEY, cleanOutlands, keepRun, startRun, type OutlandsSave } from './outlands-save';
import { OUTLANDS_COVER } from './palette';
import { FX, toon } from './kit';
import { createDegen, type Outfit } from './character';
import { FIGURE_SCALE } from './skeleton';
import { copyPose, createLocomotion, placeRoot, type Root } from './locomotion';
import { GAITS, newMove, stepMove } from './movesim';
import { loadMocap } from './mocap-load';
import type { Animator } from './animator';

export interface OutlandsDeps {
  renderer: THREE.WebGLRenderer;
  /** The city's root: the Outlands' layer (`[data-outlands]`) is in it */
  root: HTMLElement;
  /** The post chain's settings, as the city's (without its shadows) */
  post: Omit<PostOpts, 'shadows'>;
  low: boolean;
  reduced: boolean;
  /** Degen's look now (the wardrobe's) */
  look(): Outfit;
  /** The drawing's size now */
  size(): { w: number; h: number };
  toast(text: string, ms?: number): void;
  /** Back to Sector 7 (index.ts switches the worlds back) */
  leave(): void;
  /** Called on any input, so the frame cap knows we're busy */
  touched(): void;
}

const SCALE = FIGURE_SCALE;
/** walk.ts's take-off speed and gravity, so the motion capture's jumps fit */
const JUMP = 3.03;
const GRAVITY = 8.92;
/** Slower wading through water */
const WADING = 0.6;
/** The camera: how far behind, how high it looks, how far it may tip, how fast the mouse and the stick turn it */
const CAM = { dist: 3.1, look: 0.62, shoulder: 0.32, pitch: 0.22, minPitch: -0.35, maxPitch: 1.15, mouse: 0.0024, stick: 2.4, clear: 0.35 };
/** How far the ink outlines reach (they fade out from `near` to `far`) */
const INK = { near: 22, far: 80 };
/** How long between saves of where he is (seconds) */
const SAVE_EVERY = 5;
/** Building chunks: a few milliseconds a frame */
const BUILD_MS = 4;

const C = Object.fromEntries(Object.entries(OUTLANDS_COVER).map(([k, v]) => [k, new THREE.Color(v)])) as Record<keyof typeof OUTLANDS_COVER, THREE.Color>;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** The ground's colour at a point (its height, its slope, a seeded wash so it isn't one flat green) */
function coverAt(x: number, z: number, h: number, slope: number, out: THREE.Color) {
  const m = noise(x / 55, z / 55, 11) * 0.7 + noise(x / 13, z / 13, 12) * 0.3;
  out.copy(C.grass).lerp(C.meadow, smooth(0.05, 0.55, m));
  out.lerp(C.heath, smooth(28, 46, h + m * 6));
  out.lerp(C.earth, smooth(0.32, 0.62, slope));
  out.lerp(C.rock, Math.max(smooth(62, 92, h), smooth(0.62, 0.95, slope)));
  out.lerp(C.shore, 1 - smooth(0.25, 1.3, h - WATER_Y));
  return out;
}

/** One chunk at a level of detail: its height grid, normals from the height map, a skirt round its edge */
function chunkGeometry(i: number, j: number, step: number): THREE.BufferGeometry {
  const n = CHUNK / step;
  const x0 = chunkX(i);
  const z0 = chunkX(j);
  // (heights one step past each edge, for the normals there)
  const w = n + 3;
  const hs = new Float32Array(w * w);
  for (let b = 0; b < w; b++) for (let a = 0; a < w; a++) hs[b * w + a] = heightAt(x0 + (a - 1) * step, z0 + (b - 1) * step);
  const verts = (n + 1) * (n + 1);
  const skirt = 4 * (n + 1);
  const pos = new Float32Array((verts + skirt) * 3);
  const nor = new Float32Array((verts + skirt) * 3);
  const col = new Float32Array((verts + skirt) * 3);
  const c = new THREE.Color();
  for (let b = 0; b <= n; b++)
    for (let a = 0; a <= n; a++) {
      const k = b * (n + 1) + a;
      const x = x0 + a * step;
      const z = z0 + b * step;
      const h = hs[(b + 1) * w + a + 1];
      const dx = (hs[(b + 1) * w + a + 2] - hs[(b + 1) * w + a]) / (2 * step);
      const dz = (hs[(b + 2) * w + a + 1] - hs[b * w + a + 1]) / (2 * step);
      const l = Math.hypot(dx, 1, dz);
      pos.set([x, h, z], k * 3);
      nor.set([-dx / l, 1 / l, -dz / l], k * 3);
      coverAt(x, z, h, Math.hypot(dx, dz), c);
      col.set([c.r, c.g, c.b], k * 3);
    }
  // The skirt: each edge's vertices again, hung down out of sight (deeper for coarser chunks)
  const drop = step * 2 + 2;
  const edges: number[][] = [[], [], [], []];
  for (let t = 0; t <= n; t++) {
    edges[0].push(t);
    edges[1].push(n * (n + 1) + t);
    edges[2].push(t * (n + 1));
    edges[3].push(t * (n + 1) + n);
  }
  let s = verts;
  const index: number[] = [];
  for (let b = 0; b < n; b++)
    for (let a = 0; a < n; a++) {
      const p = b * (n + 1) + a;
      const q = p + n + 1;
      index.push(p, q, p + 1, p + 1, q, q + 1);
    }
  for (const e of edges) {
    const first = s;
    for (const k of e) {
      pos.set([pos[k * 3], pos[k * 3 + 1] - drop, pos[k * 3 + 2]], s * 3);
      nor.set(nor.subarray(k * 3, k * 3 + 3), s * 3);
      col.set(col.subarray(k * 3, k * 3 + 3), s * 3);
      s++;
    }
    // (both windings: the skirt shows from whichever side looks at it)
    for (let t = 0; t < n; t++) {
      const a = e[t];
      const b = e[t + 1];
      const sa = first + t;
      const sb = first + t + 1;
      index.push(a, sa, b, b, sa, sb, a, b, sa, b, sb, sa);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}

export function createOutlands(d: OutlandsDeps) {
  const tier: LodTier = d.low ? 'low' : 'high';
  const far = LODS[tier].within[LODS[tier].within.length - 1];
  const layer = d.root.querySelector<HTMLElement>('[data-outlands]')!;
  const hint = layer.querySelector<HTMLElement>('[data-ol-hint]');
  const pauseCard = layer.querySelector<HTMLElement>('[data-ol-pause]')!;
  const stickEl = layer.querySelector<HTMLElement>('[data-ol-stick]');

  /* ---------- The scene ---------- */
  const scene = new THREE.Scene();
  scene.background = C.sky.clone();
  scene.fog = new THREE.Fog(C.haze.clone(), far * 0.35, far * 0.95);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, far + 50);
  scene.add(new THREE.HemisphereLight('#e4eaee', '#5a5444', 2.1));
  const sun = new THREE.DirectionalLight('#fff1dc', 2.3);
  sun.position.set(0.5, 0.8, 0.3);
  scene.add(sun);
  const ground = toon('#ffffff', { vertexColors: true });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(SIZE + 800, SIZE + 800).rotateX(-Math.PI / 2), toon(OUTLANDS_COVER.water));
  water.position.y = WATER_Y;
  scene.add(water);
  const post = createPost(d.renderer, scene, camera, d.post);
  // (the outlines fade out nearer than the city's: open hills far off take no ink, only what's near)
  post.ink.uniforms.fadeNear.value = INK.near;
  post.ink.uniforms.fadeFar.value = INK.far;

  /* ---------- The land, in chunks ---------- */
  const cells = new Map<string, { lod: number; mesh: THREE.Mesh }>();
  let wants: ChunkWant[] = [];
  let wantedAt = { x: Infinity, z: Infinity };
  let built = 0;
  const cellKey = (i: number, j: number) => `${i},${j}`;
  const place = (c: ChunkWant) => {
    const key = cellKey(c.i, c.j);
    const old = cells.get(key);
    const mesh = new THREE.Mesh(chunkGeometry(c.i, c.j, LODS[tier].steps[c.lod]), ground);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    scene.add(mesh);
    if (old) {
      scene.remove(old.mesh);
      old.mesh.geometry.dispose();
    }
    cells.set(key, { lod: c.lod, mesh });
    built++;
  };
  /** What's wanted round (x, z): built `ms` at a time, nearest first (all of it when `ms` is Infinity); what's out of reach let go */
  function stream(x: number, z: number, ms: number) {
    if (Math.hypot(x - wantedAt.x, z - wantedAt.z) > 12) {
      wants = chunksAround(x, z, tier);
      wantedAt = { x, z };
      const keep = new Set(wants.map((c) => cellKey(c.i, c.j)));
      for (const [k, c] of cells)
        if (!keep.has(k)) {
          scene.remove(c.mesh);
          c.mesh.geometry.dispose();
          cells.delete(k);
        }
    }
    const t0 = performance.now();
    for (const c of wants) {
      if (cells.get(cellKey(c.i, c.j))?.lod === c.lod) continue;
      place(c);
      if (performance.now() - t0 > ms) break;
    }
  }
  function clearLand() {
    for (const c of cells.values()) {
      scene.remove(c.mesh);
      c.mesh.geometry.dispose();
    }
    cells.clear();
    wants = [];
    wantedAt = { x: Infinity, z: Infinity };
  }

  /* ---------- Degen ---------- */
  let hero = createDegen(d.look());
  let worn = d.look();
  hero.g.scale.setScalar(SCALE);
  scene.add(hero.g);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.16, depthWrite: false }));
  blob.layers.set(FX);
  scene.add(blob);
  const loco = createLocomotion();
  const ms = newMove();
  const pos = new THREE.Vector3();
  let vy = 0;
  let grounded = true;
  let runAmt = 0;
  let animator: Animator | null = null;
  let anim: typeof import('./animator') | null = null;
  let animLoading = false;
  let mocapW = 0;
  const root0: Root = { roll: 0, pitch: 0, pivot: 0.45 };
  const groundAt = (x: number, z: number) => heightAt(x, z);
  function loadMotion() {
    if (animator || animLoading) return;
    animLoading = true;
    Promise.all([import('./animator'), loadMocap()]).then(
      ([m, data]) => {
        anim = m;
        animator = m.createAnimator(data);
        animator.need = (pack) =>
          void loadMocap(pack).then(
            (more) => animator?.extend(more),
            () => {},
          );
      },
      () => {
        animLoading = false;
        d.toast('Simple walk for now · reload to retry', 5000);
      },
    );
  }

  /* ---------- Input ---------- */
  const keys = new Set<string>();
  let yaw = SPAWN.yaw;
  let pitch = CAM.pitch;
  let jumpWant = false;
  let paused = false;
  let active = false;
  const touchStick = { id: -1, x0: 0, y0: 0, x: 0, y: 0 };
  const touchLook = { id: -1, x: 0, y: 0, x0: 0, y0: 0, t0: 0 };
  let padPrev: boolean[] = [];
  let padSprint = false;
  let padMove = { x: 0, y: 0 };
  let padFocus = 0;

  const locked = () => document.pointerLockElement === layer;
  function showHint() {
    if (hint) hint.hidden = paused || locked() || matchMedia('(pointer: coarse)').matches;
  }
  function pause(on: boolean) {
    paused = on;
    pauseCard.hidden = !on;
    keys.clear();
    if (on) {
      if (locked()) document.exitPointerLock();
      padFocus = 0;
      pauseCard.querySelector<HTMLButtonElement>('[data-ol-resume]')?.focus({ preventScroll: true });
    }
    showHint();
  }
  const onLockChange = () => showHint();
  const onMouseMove = (e: MouseEvent) => {
    if (!active || paused || !locked()) return;
    yaw -= e.movementX * CAM.mouse;
    pitch = THREE.MathUtils.clamp(pitch + e.movementY * CAM.mouse, CAM.minPitch, CAM.maxPitch);
    d.touched();
  };
  const onPointerDown = (e: PointerEvent) => {
    if (!active || paused || (e.target as HTMLElement).closest('button, [data-ol-pause]')) return;
    d.touched();
    if (e.pointerType === 'mouse') {
      if (!locked()) void layer.requestPointerLock?.()?.catch?.(() => {});
      return;
    }
    const left = e.clientX < innerWidth / 2;
    if (left && touchStick.id < 0) {
      Object.assign(touchStick, { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY });
      if (stickEl) {
        stickEl.hidden = false;
        stickEl.style.transform = `translate(${e.clientX - layer.getBoundingClientRect().left}px, ${e.clientY - layer.getBoundingClientRect().top}px)`;
      }
    } else if (!left && touchLook.id < 0) Object.assign(touchLook, { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now() });
    layer.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerId === touchStick.id) {
      touchStick.x = e.clientX;
      touchStick.y = e.clientY;
    } else if (e.pointerId === touchLook.id) {
      yaw -= (e.clientX - touchLook.x) * 0.006;
      pitch = THREE.MathUtils.clamp(pitch + (e.clientY - touchLook.y) * 0.006, CAM.minPitch, CAM.maxPitch);
      touchLook.x = e.clientX;
      touchLook.y = e.clientY;
    }
  };
  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerId === touchStick.id) {
      touchStick.id = -1;
      if (stickEl) stickEl.hidden = true;
    } else if (e.pointerId === touchLook.id) {
      // (a quick tap on the right half: a jump)
      if (performance.now() - touchLook.t0 < 250 && Math.hypot(e.clientX - touchLook.x0, e.clientY - touchLook.y0) < 12) jumpWant = true;
      touchLook.id = -1;
    }
  };
  layer.addEventListener('pointerdown', onPointerDown);
  layer.addEventListener('pointermove', onPointerMove);
  layer.addEventListener('pointerup', onPointerUp);
  layer.addEventListener('pointercancel', onPointerUp);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('pointerlockchange', onLockChange);
  layer.querySelector('[data-ol-menu]')?.addEventListener('click', () => pause(true));
  pauseCard.querySelector('[data-ol-resume]')?.addEventListener('click', () => pause(false));
  pauseCard.querySelector('[data-ol-close]')?.addEventListener('click', () => pause(false));
  pauseCard.querySelector('[data-ol-leave]')?.addEventListener('click', () => d.leave());

  /** The keyboard (index.ts hands every key to it while the Outlands is showing) */
  function onKey(e: KeyboardEvent, down: boolean) {
    if (!active) return;
    d.touched();
    if (e.key === 'Escape') {
      if (down) pause(!paused);
      return;
    }
    if (paused) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === ' ' && down && !e.repeat) jumpWant = true;
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', ' '].includes(k)) e.preventDefault();
    if (down) keys.add(k);
    else keys.delete(k);
  }

  function pollPad(dt: number) {
    const pad = [...(navigator.getGamepads?.() ?? [])].find((p) => p?.connected);
    if (!pad) return;
    const b = pad.buttons.map((x) => x.pressed);
    const hit = (i: number) => b[i] && !padPrev[i];
    const dz = (v: number) => (Math.abs(v) < 0.15 ? 0 : v);
    if (hit(9)) pause(!paused);
    if (paused) {
      const btns = [...pauseCard.querySelectorAll<HTMLButtonElement>('[data-ol-resume], [data-ol-leave]')];
      if (hit(12) || hit(13)) {
        padFocus = (padFocus + 1) % btns.length;
        btns[padFocus]?.focus({ preventScroll: true });
      }
      if (hit(0)) btns[padFocus]?.click();
      if (hit(1)) pause(false);
    } else {
      padMove = { x: dz(pad.axes[0] ?? 0), y: dz(pad.axes[1] ?? 0) };
      yaw -= dz(pad.axes[2] ?? 0) * CAM.stick * dt;
      pitch = THREE.MathUtils.clamp(pitch + dz(pad.axes[3] ?? 0) * CAM.stick * 0.6 * dt, CAM.minPitch, CAM.maxPitch);
      padSprint = !!b[10] || (pad.buttons[7]?.value ?? 0) > 0.5;
      if (hit(0)) jumpWant = true;
    }
    if (b.some(Boolean) || padMove.x || padMove.y) d.touched();
    padPrev = b;
  }

  /* ---------- The save ---------- */
  let save: OutlandsSave = cleanOutlands(null);
  let saveT = 0;
  const readSave = () => {
    try {
      save = cleanOutlands(JSON.parse(localStorage.getItem(OUTLANDS_KEY) ?? 'null'));
    } catch {
      save = cleanOutlands(null);
    }
  };
  const writeSave = () => {
    keepRun(save, pos.x, pos.z, ms.face, Date.now());
    try {
      localStorage.setItem(OUTLANDS_KEY, JSON.stringify(save));
    } catch {
      /* (private windows, full storage: the run just isn't kept) */
    }
  };

  /* ---------- Each frame ---------- */
  const target = new THREE.Vector3();
  function update(dt: number, t: number) {
    pollPad(dt);
    // What's asked: the keys, the touch stick or the pad, turned by where the camera looks
    let ix = 0;
    let iy = 0;
    if (!paused) {
      ix = (keys.has('d') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('a') || keys.has('ArrowLeft') ? 1 : 0) + padMove.x;
      iy = (keys.has('w') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('s') || keys.has('ArrowDown') ? 1 : 0) - padMove.y;
      if (touchStick.id >= 0) {
        ix += THREE.MathUtils.clamp((touchStick.x - touchStick.x0) / 50, -1, 1);
        iy -= THREE.MathUtils.clamp((touchStick.y - touchStick.y0) / 50, -1, 1);
      }
    }
    const mag = Math.hypot(ix, iy);
    if (mag > 1) {
      ix /= mag;
      iy /= mag;
    }
    const sx = Math.sin(yaw);
    const sz = Math.cos(yaw);
    const sprint = keys.has('Shift') || padSprint;
    const depth = waterDepth(pos.x, pos.z);
    const top = (sprint ? GAITS.sprint : GAITS.run) * (depth > 0.05 ? WADING : 1);
    const gx = (sx * iy - sz * ix) * top;
    const gz = (sz * iy + sx * ix) * top;
    stepMove(ms, gx, gz, grounded, dt);
    // Through the land, never past the edge or into deep water (each axis on its own, so he slides along)
    const nx = pos.x + ms.vx * dt;
    if (walkable(nx, pos.z)) pos.x = nx;
    else ms.vx = 0;
    const nz = pos.z + ms.vz * dt;
    if (walkable(pos.x, nz)) pos.z = nz;
    else ms.vz = 0;
    // Up and down: on the ground (following it down a slope), or a jump and the fall
    const g = heightAt(pos.x, pos.z);
    let fall = 0;
    if (grounded && jumpWant) {
      vy = JUMP;
      grounded = false;
    }
    jumpWant = false;
    if (grounded) {
      if (pos.y - g > 0.6) grounded = false;
      else pos.y = g;
    }
    if (!grounded) {
      vy -= GRAVITY * dt;
      pos.y += vy * dt;
      if (pos.y <= g) {
        fall = vy;
        pos.y = g;
        vy = 0;
        grounded = true;
      }
    }
    const speed = Math.hypot(ms.vx, ms.vz);
    runAmt += (THREE.MathUtils.clamp((speed - GAITS.run) / (GAITS.sprint - GAITS.run), 0, 1) - runAmt) * damp(8, dt);
    const face = ms.face;
    loco.update({ dt, t, x: pos.x, y: pos.y, z: pos.z, vx: ms.vx, vz: ms.vz, face, grounded, vy: grounded ? fall : vy, scale: SCALE, ground: groundAt, armed: false });
    copyPose(loco.pose, hero.pose);
    hero.update();
    loadMotion();
    let drawFace = face;
    if (animator && anim) {
      mocapW = Math.min(1, mocapW + dt / 0.25);
      const w = mocapW * mocapW * (3 - 2 * mocapW);
      animator.update({ dt, x: pos.x, y: pos.y, z: pos.z, move: ms, gx, gz, scale: SCALE, ground: groundAt, feet: groundAt, sprint: runAmt, grounded, vy: grounded ? fall : vy, jump: JUMP, gravity: GRAVITY, crouch: 0 });
      drawFace = face + wrap(animator.face - face) * mocapW;
      anim.applyTo(hero.rig, animator.rot, animator.hips, w, 0, face - drawFace);
      root0.roll = loco.root.roll * (1 - mocapW);
      root0.pitch = loco.root.pitch * (1 - mocapW);
      root0.pivot = loco.root.pivot;
    }
    placeRoot(hero.g, pos.x, pos.y, pos.z, animator ? drawFace : face, SCALE, animator ? root0 : loco.root);
    blob.position.set(pos.x, Math.max(g, WATER_Y) + 0.03, pos.z);

    // The camera: behind and over his shoulder, kept clear of the ground
    // (a narrow screen, a phone upright: less over the shoulder and further back, so he stays in the middle and in shot)
    const narrow = Math.min(1, camera.aspect);
    const shoulder = CAM.shoulder * narrow;
    const dist = CAM.dist * (1 + (1 - narrow) * 0.45);
    target.set(pos.x - sz * shoulder, pos.y + CAM.look, pos.z + sx * shoulder);
    const cp = Math.cos(pitch);
    camera.position.set(target.x - sx * dist * cp, target.y + dist * Math.sin(pitch), target.z - sz * dist * cp);
    const floor = Math.max(heightAt(camera.position.x, camera.position.z), WATER_Y) + CAM.clear;
    if (camera.position.y < floor) camera.position.y = floor;
    camera.lookAt(target);
    stream(pos.x, pos.z, BUILD_MS);
    saveT += dt;
    if (saveT > SAVE_EVERY) {
      saveT = 0;
      writeSave();
    }
  }

  return {
    get active() {
      return active;
    },
    get position() {
      return pos;
    },
    /** Go out: the run carried on (or a new one at the spawn), the land round him built before the first frame */
    enter() {
      readSave();
      const run = startRun(save, SPAWN, Date.now());
      pos.set(run.x, heightAt(run.x, run.z), run.z);
      ms.vx = ms.vz = ms.ax = ms.az = ms.w = 0;
      ms.face = run.yaw;
      yaw = run.yaw;
      pitch = CAM.pitch;
      vy = 0;
      grounded = true;
      mocapW = 0;
      animator?.reset();
      loco.reset(pos.x, pos.y, pos.z, ms.face, SCALE, groundAt);
      // (dressed as he is in the city now)
      const look = d.look();
      if (look !== worn) {
        scene.remove(hero.g);
        hero.dispose();
        hero = createDegen(look);
        hero.g.scale.setScalar(SCALE);
        scene.add(hero.g);
        worn = look;
      }
      stream(pos.x, pos.z, Infinity);
      const { w, h } = d.size();
      this.resize(w, h, d.renderer.getPixelRatio());
      active = true;
      layer.hidden = false;
      pause(false);
      writeSave();
    },
    /** Back to the city: where he is kept, the land let go */
    exit() {
      if (!active) return;
      writeSave();
      active = false;
      paused = false;
      pauseCard.hidden = true;
      layer.hidden = true;
      keys.clear();
      touchStick.id = touchLook.id = -1;
      if (stickEl) stickEl.hidden = true;
      if (locked()) document.exitPointerLock();
      clearLand();
    },
    /** One frame: move, stream the land, draw */
    frame(dt: number, t: number) {
      if (!active) return;
      update(paused ? 0 : dt, d.reduced ? 0 : t);
      post.render();
    },
    onKey,
    resize(w: number, h: number, ratio: number) {
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      post.setSize(w, h, ratio);
    },
    /** For the ?fps readout */
    stats() {
      return { chunks: cells.size, built, x: pos.x, z: pos.z, mocap: animator ? 'on' : animLoading ? 'loading' : 'off' };
    },
  };
}

export type Outlands = ReturnType<typeof createOutlands>;
