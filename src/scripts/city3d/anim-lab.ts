/*
 * The animation lab (`?anim` in the address; docs/animation-plan.md): Degen
 * on an open floor with the city's ink outlines, for reviewing his
 * movement. The new animation (animator.ts, from motion capture) and, to
 * compare, the old procedural one (locomotion.ts) side by side, both fed
 * the same movement (movesim.ts).
 *
 * - Moves: scripted programs (run and stop, turning back, weaving, a
 *   circle, starts and stops at a sprint...) or by hand (W A S D across
 *   the floor, Shift sprints, Caps Lock walks).
 * - Time: full speed, a quarter, a tenth; P pauses, . steps a frame.
 * - Cameras: side on, front, behind, free (drag to orbit, wheel to zoom).
 * - Foot traces (where each ball of the foot was held), and readouts:
 *   speed, the clip and frame playing, its rate, the match's cost, the
 *   blend left, jumps a second, the foot slide (how far a held foot has
 *   moved over the ground: now and the worst lately).
 * - The address can set it all up for recordings: `prog`, `gait`, `cam`,
 *   `speed`, `compare=0`, `traces=0`.
 */
import * as THREE from 'three';
import { PLAYER, createDegen, type Degen } from './character';
import { applyTo, createAnimator, type Animator } from './animator';
import { copyPose, createLocomotion, placeRoot } from './locomotion';
import { loadMocap } from './mocap-load';
import { GAITS, newMove, stepMove, type MoveState } from './movesim';
import { toon } from './kit';
import { createPost } from './post';

const SCALE = 0.85;
/** One tile in centimetres, for the readouts */
const CM = 180;
type Prog = 'manual' | 'runstop' | 'turnback' | 'weave' | 'circle' | 'startstop' | 'idle';
type Gait = 'walk' | 'run' | 'sprint';
type Cam = 'side' | 'front' | 'back' | 'free';
const PROGS: [Prog, string][] = [
  ['runstop', 'Run & stop'],
  ['turnback', 'Turn back'],
  ['weave', 'Weave'],
  ['circle', 'Circle'],
  ['startstop', 'Start / stop'],
  ['idle', 'Stand'],
  ['manual', 'By hand'],
];

/** The goal velocity a program asks for at time `t` (tiles a second), and whether it's sprinting */
function program(p: Prog, t: number, speed: number): [number, number] {
  const cycle = (len: number) => t % len;
  switch (p) {
    case 'idle':
      return [0, 0];
    case 'runstop': {
      const u = cycle(6);
      return u < 1 ? [0, 0] : u < 4 ? [0, speed] : [0, 0];
    }
    case 'turnback': {
      const u = cycle(6);
      return u < 3 ? [0, speed] : [0, -speed];
    }
    case 'weave': {
      const a = Math.sin(t * 1.4) * 0.9;
      return [Math.sin(a) * speed, Math.cos(a) * speed];
    }
    case 'circle': {
      const a = t * (speed / 4);
      return [Math.sin(a) * speed, Math.cos(a) * speed];
    }
    case 'startstop': {
      const u = cycle(3);
      return u < 1.6 ? [0, speed] : [0, 0];
    }
    default:
      return [0, 0];
  }
}

export async function openLab(root: HTMLElement, d: { reduced: boolean; low: boolean }) {
  const q = new URLSearchParams(location.search);
  const ui = document.createElement('div');
  ui.className = 'anim-lab';
  ui.innerHTML = `
    <canvas class="anim-lab-view" aria-hidden="true"></canvas>
    <div class="anim-lab-panel">
      <div class="anim-lab-head"><span class="anim-lab-title">Animation lab</span><span class="anim-lab-note">?anim · Phase 1</span><button class="anim-lab-close" type="button" aria-label="Close the lab">×</button></div>
      <div class="anim-lab-row" data-progs></div>
      <div class="anim-lab-row" data-gaits></div>
      <div class="anim-lab-row" data-time></div>
      <div class="anim-lab-row" data-cams></div>
      <div class="anim-lab-row" data-toggles></div>
      <dl class="anim-lab-read" data-read></dl>
      <p class="anim-lab-hint">By hand: W A S D, Shift sprints, Caps Lock walks. P pauses, . steps.</p>
    </div>`;
  root.append(ui);
  const canvas = ui.querySelector<HTMLCanvasElement>('canvas')!;
  const read = ui.querySelector<HTMLElement>('[data-read]')!;

  let prog: Prog = (PROGS.find(([p]) => p === q.get('prog'))?.[0] as Prog) ?? 'runstop';
  let gait: Gait = (['walk', 'run', 'sprint'] as Gait[]).find((g) => g === q.get('gait')) ?? 'run';
  let cam: Cam = (['side', 'front', 'back', 'free'] as Cam[]).find((c) => c === q.get('cam')) ?? 'side';
  let speed = Number(q.get('speed')) || 1;
  // (recordings: closer in, and the cheaper drawing)
  const near = Number(q.get('zoom')) || 1;
  if (q.has('low')) d = { ...d, low: true };
  // (`rec`: recordings draw a frame only when asked, with the outlines but none of the costly finish)
  const rec = q.has('rec');
  let compare = q.get('compare') !== '0';
  let traces = q.get('traces') !== '0';
  let paused = false;
  let stepOnce = false;

  const button = (row: string, label: string, on: () => boolean, act: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'anim-lab-btn';
    b.textContent = label;
    b.addEventListener('click', () => {
      act();
      paint();
    });
    ui.querySelector(`[data-${row}]`)!.append(b);
    return () => b.classList.toggle('is-on', on());
  };
  const paints: (() => void)[] = [];
  const paint = () => paints.forEach((p) => p());
  for (const [p, label] of PROGS)
    paints.push(
      button('progs', label, () => prog === p, () => {
        prog = p;
        clock = 0;
      }),
    );
  for (const g of ['walk', 'run', 'sprint'] as Gait[]) paints.push(button('gaits', g[0].toUpperCase() + g.slice(1), () => gait === g, () => (gait = g)));
  for (const [s, label] of [
    [1, '1×'],
    [0.25, '¼×'],
    [0.1, '1/10×'],
  ] as const)
    paints.push(button('time', label, () => speed === s && !paused, () => ((speed = s), (paused = false))));
  paints.push(button('time', 'Pause', () => paused, () => (paused = !paused)));
  paints.push(button('time', 'Step', () => false, () => ((paused = true), (stepOnce = true))));
  for (const c of ['side', 'front', 'back', 'free'] as Cam[]) paints.push(button('cams', c[0].toUpperCase() + c.slice(1), () => cam === c, () => (cam = c)));
  paints.push(button('toggles', 'Old beside', () => compare, () => (compare = !compare)));
  paints.push(button('toggles', 'Foot traces', () => traces, () => (traces = !traces)));
  paint();

  // The scene
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#2a2350');
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
  const post = createPost(renderer, scene, camera, { msaa: d.low || rec ? 0 : 4, bloomScale: 0.5, smaa: d.low && !rec });
  post.bloom.enabled = !rec;
  post.bloom.strength = 0.2;
  post.bloom.threshold = 1.05;
  post.ink.uniforms.fadeNear.value = 40;
  scene.add(new THREE.HemisphereLight('#d6e2ff', '#3a2f6a', 1.9));
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(3, 6, 2);
  scene.add(key);
  // The floor: tiles a metre and a bit (one city tile) with every fifth darker, so speed reads
  const floorTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    g.fillStyle = '#7a72b8';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#5a5298';
    g.lineWidth = 3;
    for (let i = 0; i <= 5; i++) {
      g.beginPath();
      g.moveTo(i * 51.2, 0);
      g.lineTo(i * 51.2, 256);
      g.moveTo(0, i * 51.2);
      g.lineTo(256, i * 51.2);
      g.stroke();
    }
    g.strokeStyle = '#4a4290';
    g.lineWidth = 4;
    g.strokeRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(40, 40);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  })();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), toon('#ffffff', { map: floorTex }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const hero: Degen = createDegen(PLAYER);
  const old: Degen = createDegen(PLAYER);
  scene.add(hero.g, old.g);
  const loco = createLocomotion();

  // Foot traces: a dot where each ball of the foot was held
  const dots = new THREE.InstancedMesh(new THREE.CircleGeometry(0.035, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#00eaff' }), 80);
  dots.count = 0;
  dots.frustumCulled = false;
  scene.add(dots);
  let dotAt = 0;
  const m4 = new THREE.Matrix4();
  const addDot = (x: number, z: number) => {
    m4.makeTranslation(x, 0.006, z);
    dots.setMatrixAt(dotAt % 80, m4);
    dotAt++;
    dots.count = Math.min(80, dotAt);
    dots.instanceMatrix.needsUpdate = true;
  };

  read.innerHTML = '<dt>Loading</dt><dd>the motion capture…</dd>';
  const data = await loadMocap();
  const anim: Animator = createAnimator(data);
  const move: MoveState = newMove(0);
  let x = 0;
  let z = 0;
  let clock = 0;
  const wasLocked = [false, false];
  let worst = 0;
  let worstAt = 0;
  const jumpTimes: number[] = [];
  let lastJumps = 0;

  // By hand
  const keys = new Set<string>();
  let walkLock = false;
  const onKey = (e: KeyboardEvent) => {
    if (e.type === 'keydown') {
      if (e.code === 'KeyP') paused = !paused;
      else if (e.code === 'Period') (paused = true), (stepOnce = true);
      else if (e.code === 'CapsLock') walkLock = !walkLock;
      else if (e.code === 'Escape') close();
      keys.add(e.code);
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code) && prog !== 'manual') prog = 'manual';
      paint();
    } else keys.delete(e.code);
  };
  addEventListener('keydown', onKey);
  addEventListener('keyup', onKey);

  // The free camera
  let orbit = { yaw: 0.9, pitch: 0.25, dist: 5 };
  let drag: { x: number; y: number; yaw: number; pitch: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, yaw: orbit.yaw, pitch: orbit.pitch };
    canvas.setPointerCapture(e.pointerId);
    if (cam !== 'free') (cam = 'free'), paint();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    orbit.yaw = drag.yaw - (e.clientX - drag.x) * 0.008;
    orbit.pitch = THREE.MathUtils.clamp(drag.pitch + (e.clientY - drag.y) * 0.006, -0.1, 1.3);
  });
  canvas.addEventListener('pointerup', () => (drag = null));
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      orbit.dist = THREE.MathUtils.clamp(orbit.dist * (1 + e.deltaY * 0.001), 1.5, 20);
    },
    { passive: false },
  );

  const size = () => {
    const w = innerWidth;
    const h = innerHeight;
    const pr = Math.min(devicePixelRatio, d.low ? 1.5 : 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    post.setSize(w, h, pr);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', size);
  size();

  const ground = () => 0;
  const beside = (): [number, number] => (cam === 'side' ? [0, -2.2] : [1.6, 0]);
  const look = new THREE.Vector3();
  const step = (dt: number) => {
    clock += dt;
    const top = GAITS[gait];
    let [gx, gz] = program(prog, clock, top);
    if (prog === 'manual') {
      const ix = (keys.has('KeyA') ? 1 : 0) - (keys.has('KeyD') ? 1 : 0);
      const iz = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
      const n = Math.hypot(ix, iz) || 1;
      const s = keys.has('ShiftLeft') || keys.has('ShiftRight') ? GAITS.sprint : walkLock ? GAITS.walk : GAITS.run;
      gx = (ix / n) * s;
      gz = (iz / n) * s;
    }
    stepMove(move, gx, gz, true, dt);
    x += move.vx * dt;
    z += move.vz * dt;
    const v = Math.hypot(move.vx, move.vz);
    const sprint = THREE.MathUtils.clamp((v - GAITS.run) / (GAITS.sprint - GAITS.run), 0, 1);
    anim.update({ dt, x, y: 0, z, move, gx, gz, scale: SCALE, ground, sprint });
    hero.update();
    applyTo(hero.rig, anim.rot, anim.hips);
    hero.g.position.set(x, 0, z);
    hero.g.rotation.set(0, move.face, 0);
    hero.g.scale.setScalar(SCALE);
    // The old walk beside him, on the same movement (across the picture from him, whichever the camera)
    const [dx, dz] = beside();
    loco.update({ dt, t: clock, x: x + dx, y: 0, z: z + dz, vx: move.vx, vz: move.vz, face: move.face, grounded: true, vy: 0, scale: SCALE, ground, armed: false });
    copyPose(loco.pose, old.pose);
    old.update();
    placeRoot(old.g, x + dx, 0, z + dz, move.face, SCALE, loco.root);
    old.g.visible = compare;
    // Traces and the slide
    anim.feet.forEach((f, i) => {
      if (f.locked && !wasLocked[i] && traces) addDot(f.lock.x, f.lock.z);
      wasLocked[i] = f.locked;
      if (f.drift > worst || clock - worstAt > 5) {
        worst = Math.max(0, f.drift);
        worstAt = clock;
      }
    });
    dots.visible = traces;
    const dbg = anim.debug;
    if (dbg.jumps !== lastJumps) {
      jumpTimes.push(clock);
      lastJumps = dbg.jumps;
    }
    while (jumpTimes.length && clock - jumpTimes[0] > 2) jumpTimes.shift();
  };

  /** What the camera looks at: between the two figures, and side on, on a wide screen, right of the panel (both clear of it) */
  const target = (out: THREE.Vector3) => {
    const [dx, dz] = compare ? beside() : [0, 0];
    const clear = cam === 'side' && innerWidth > 600 ? 1.3 / near : 0;
    return out.set(x + dx / 2, 0.62, z + dz / 2 + clear);
  };
  const want = new THREE.Vector3();
  const view = (dt: number) => {
    look.lerp(target(want), Math.min(1, dt * 6) || 1);
    if (cam === 'free') camera.position.set(look.x + Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * orbit.dist, look.y + Math.sin(orbit.pitch) * orbit.dist, look.z + Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * orbit.dist);
    else if (cam === 'side') camera.position.set(look.x + (compare ? 6 : 4.5) / near, look.y + 0.3, look.z);
    else if (cam === 'front') camera.position.set(look.x, look.y + 0.5, look.z + 5.5 / near);
    else camera.position.set(look.x, look.y + 0.9, look.z - 5 / near);
    camera.lookAt(look);
  };

  const paintRead = () => {
    const dbg = anim.debug;
    const v = Math.hypot(move.vx, move.vz);
    const slideNow = Math.max(0, ...anim.feet.map((f) => f.drift));
    const rows: [string, string][] = [
      ...(compare ? ([['Beside', cam === 'back' ? 'new right · old left' : cam === 'free' ? 'the old walk is the other one' : 'new left · old right']] as [string, string][]) : []),
      ['Speed', `${v.toFixed(2)} tiles/s · ${(v * 1.8).toFixed(1)} m/s`],
      ['Clip', `${dbg.clip} @ ${dbg.frame.toFixed(1)}`],
      ['Rate', dbg.rate.toFixed(2)],
      ['Match cost', dbg.cost.toFixed(2)],
      ['Blend left', `${((dbg.blend * 180) / Math.PI).toFixed(0)}°`],
      ['Jumps', `${(jumpTimes.length / 2).toFixed(1)} a second`],
      ['Foot slide', `${(slideNow * CM).toFixed(1)} cm (worst lately ${(worst * CM).toFixed(1)} cm)`],
      ['Hips down', `${(dbg.drop * SCALE * CM).toFixed(1)} cm`],
      ['Feet', anim.feet.map((f) => (f.locked ? 'held' : 'free')).join(' · ')],
    ];
    read.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  };

  let raf = 0;
  let last = performance.now();
  let readIn = 0;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const real = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!paused || stepOnce) {
      // Fixed steps, so slow motion is the same motion
      const dt = stepOnce ? 1 / 60 : real * speed;
      stepOnce = false;
      let left = dt;
      while (left > 1e-6) {
        const h = Math.min(left, 1 / 60);
        step(h);
        left -= h;
      }
    }
    view(real);
    post.render();
    readIn -= real;
    if (readIn <= 0) {
      readIn = 0.1;
      paintRead();
    }
  };
  const close = () => {
    cancelAnimationFrame(raf);
    removeEventListener('keydown', onKey);
    removeEventListener('keyup', onKey);
    removeEventListener('resize', size);
    ui.remove();
    renderer.dispose();
    const u = new URL(location.href);
    u.searchParams.delete('anim');
    location.href = u.toString();
  };
  ui.querySelector('.anim-lab-close')!.addEventListener('click', close);
  // (for recordings and checks)
  (window as unknown as { __animLab: unknown }).__animLab = {
    anim,
    move,
    get worst() {
      return worst;
    },
    pause(on: boolean) {
      paused = on;
      paint();
    },
    steps(n: number) {
      for (let i = 0; i < n; i++) step(1 / 60);
      // (a skip ahead: the camera's there too)
      look.copy(target(want));
    },
    get where() {
      return { x, z, look: look.toArray(), eye: camera.position.toArray() };
    },
    /** Step on `n` frames and draw (recordings) */
    shoot(n: number) {
      for (let i = 0; i < n; i++) step(1 / 60);
      view(n / 60);
      post.render();
      paintRead();
    },
  };
  if (rec) return;
  raf = requestAnimationFrame(frame);
}
