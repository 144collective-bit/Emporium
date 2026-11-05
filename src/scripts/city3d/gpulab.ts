/*
 * The GPU lab (`?gpu` in the address; docs/bigworld-plan.md Phase 4, step 1):
 * does this device have WebGPU, and how does three.js's WebGPU renderer do
 * here against the WebGL renderer the city draws with today? Over the page,
 * with no city behind it, like the animation lab.
 *
 * - The device: whether the browser has WebGPU and what adapter it gives
 *   (vendor, architecture, a fallback adapter or not), and WebGL 2's GPU.
 * - The test: one made-up city (`labCity()`: buildings on a grid in eight
 *   toon colours, the ground, instanced trees, cars moving on the streets,
 *   the sun with shadows but on phones), the same for every run, drawn two
 *   ways: `batched`, the buildings merged per colour (a few draws, as the
 *   city's tiles are), and `many`, each building a draw of its own (what
 *   costs the CPU, where WebGPU should help most).
 * - The renderers: `webgl` (THREE.WebGLRenderer, the city's), `webgpu`
 *   (WebGPURenderer on WebGPU, where there is one) and `webgpu-gl`
 *   (WebGPURenderer on its WebGL 2 backend: the fallback a port to node
 *   materials would run on where WebGPU isn't there).
 * - Each run: built, compiled, 1.5 s to settle, then 4 s measured (and at
 *   least `MIN_FRAMES` frames, at most `CAP` seconds), the GPU caught up
 *   (`sync()`) before and after, so frames a renderer queued without drawing
 *   count: fps and the average frame from that, the 95th-percentile and
 *   slowest frame between frames, the CPU's time a frame and draw calls. No
 *   post effects: the renderers only.
 * - Results in a card (Copy results, with the device, to paste back),
 *   the console and `window.__gpulab`. `?gpu=quick` runs shorter, `only=`
 *   (`webgl`, `webgpu`, `webgpu-gl`, comma-separated) runs just those.
 *
 * three's WebGPU build is a chunk of its own (astro.config.mjs), fetched
 * only here; nothing in the city reads it yet.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type LabRenderer = 'webgl' | 'webgpu' | 'webgpu-gl';
export type LabLoad = 'batched' | 'many';

export interface LabRun {
  renderer: LabRenderer;
  load: LabLoad;
  /** Drawn at all (false: it couldn't start here, `error` says why) */
  ok: boolean;
  error?: string;
  fps: number;
  /** Frame times (ms) */
  avg: number;
  p95: number;
  worst: number;
  /** The CPU's time a frame: moving the cars and the renderer's own work */
  cpu: number;
  draws: number;
  /** Seconds from the renderer made to the first frame drawn (its start-up and the shaders) */
  start: number;
}

export interface LabDevice {
  webgpu: boolean;
  adapter?: string;
  fallback?: boolean;
  webgl?: string;
  ua: string;
  screen: string;
}

const PALETTE = [0xd9a066, 0x8a6f5c, 0xc94f4f, 0x6c8ebf, 0xe6d7b8, 0x7d9b76, 0x9a8fc7, 0x5a5f6b];
const STREET = 9;
const LOT = 7;

/** A seeded generator, so every run draws the same city */
function rand(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The toon ramp the city's paint uses: three flat steps */
function ramp() {
  const t = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

export interface LabCity {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Moves the cars and the camera to time `t` (seconds) */
  step(t: number): void;
  dispose(): void;
}

/** The test city: `n` x `n` buildings, drawn `batched` or one draw each (`many`) */
export function labCity(load: LabLoad, low: boolean, still: boolean): LabCity {
  const n = low ? 26 : 36;
  const r = rand(7);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fc7e8);
  const gradientMap = ramp();
  const mats = PALETTE.map((color) => new THREE.MeshToonMaterial({ color, gradientMap }));
  const span = n * (LOT + STREET);
  const half = span / 2;

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(span + 80, span + 80), new THREE.MeshToonMaterial({ color: 0x55605a, gradientMap }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // The buildings: a box each, its height and colour from the seed
  const box = new THREE.BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);
  const byColour: THREE.BufferGeometry[][] = PALETTE.map(() => []);
  const disposable: THREE.BufferGeometry[] = [box, ground.geometry];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const w = LOT * (0.6 + 0.4 * r());
      const d = LOT * (0.6 + 0.4 * r());
      const h = 4 + Math.pow(r(), 2.2) * 40;
      const c = Math.floor(r() * PALETTE.length);
      const x = -half + i * (LOT + STREET) + STREET / 2 + LOT / 2;
      const z = -half + j * (LOT + STREET) + STREET / 2 + LOT / 2;
      if (load === 'many') {
        const m = new THREE.Mesh(box, mats[c]);
        m.position.set(x, 0, z);
        m.scale.set(w, h, d);
        m.castShadow = m.receiveShadow = true;
        scene.add(m);
      } else byColour[c].push(box.clone().scale(w, h, d).translate(x, 0, z));
    }
  if (load === 'batched')
    byColour.forEach((parts, c) => {
      if (!parts.length) return;
      const g = mergeGeometries(parts)!;
      parts.forEach((p) => p.dispose());
      disposable.push(g);
      const m = new THREE.Mesh(g, mats[c]);
      m.castShadow = m.receiveShadow = true;
      scene.add(m);
    });

  // Trees along the streets (one instanced draw)
  const trees = low ? 1200 : 2400;
  const cone = new THREE.ConeGeometry(1.4, 4.5, 6);
  cone.translate(0, 2.25, 0);
  disposable.push(cone);
  const treeMesh = new THREE.InstancedMesh(cone, new THREE.MeshToonMaterial({ color: 0x3f7a4a, gradientMap }), trees);
  const m4 = new THREE.Matrix4();
  for (let k = 0; k < trees; k++) {
    // (on a street's verge, along x or along z)
    const along = -half + r() * span;
    const line = Math.floor(r() * (n + 1)) * (LOT + STREET) - half + (r() < 0.5 ? 1.2 : STREET - 1.2);
    const s = 0.7 + 0.6 * r();
    const alongX = r() < 0.5;
    m4.makeScale(s, s, s).setPosition(alongX ? along : line, 0, alongX ? line : along);
    treeMesh.setMatrixAt(k, m4);
  }
  treeMesh.castShadow = true;
  scene.add(treeMesh);

  // Cars round the streets (one instanced draw, moved every frame)
  const cars = low ? 160 : 320;
  const carBox = new THREE.BoxGeometry(3.4, 1.4, 1.7);
  carBox.translate(0, 0.7, 0);
  disposable.push(carBox);
  const carMesh = new THREE.InstancedMesh(carBox, new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap }), cars);
  carMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const carCol = new THREE.Color();
  const lanes = Array.from({ length: cars }, (_, k) => {
    carMesh.setColorAt(k, carCol.setHex(PALETTE[k % PALETTE.length]));
    return { x: r() < 0.5, line: Math.floor(r() * (n + 1)) * (LOT + STREET) - half + STREET / 2 + (r() < 0.5 ? -2 : 2), at: r() * span, v: (r() < 0.5 ? -1 : 1) * (8 + 8 * r()) };
  });
  carMesh.castShadow = true;
  scene.add(carMesh);

  scene.add(new THREE.HemisphereLight(0xdfeeff, 0x4a5040, 1.4));
  const sun = new THREE.DirectionalLight(0xfff2dd, 2.2);
  sun.position.set(-120, 200, 80);
  if (!low) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const c = sun.shadow.camera;
    c.left = c.bottom = -half - 20;
    c.right = c.top = half + 20;
    c.near = 10;
    c.far = 600;
    sun.shadow.bias = -0.0006;
  }
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 2000);
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3(1, 1, 1);
  return {
    scene,
    camera,
    step(t) {
      // The camera round the city once every 60 s, low over it so the far side's buildings are in view too
      const a = still ? 0.6 : 0.6 + (t / 60) * Math.PI * 2;
      camera.position.set(Math.cos(a) * half * 0.75, half * 0.32, Math.sin(a) * half * 0.75);
      camera.lookAt(0, 6, 0);
      lanes.forEach((c, k) => {
        const s = (((c.at + c.v * (still ? 0 : t)) % span) + span) % span - half;
        pos.set(c.x ? s : c.line, 0, c.x ? c.line : s);
        q.setFromAxisAngle(up, c.x ? (c.v > 0 ? 0 : Math.PI) : c.v > 0 ? -Math.PI / 2 : Math.PI / 2);
        carMesh.setMatrixAt(k, m4.compose(pos, q, scl));
      });
      carMesh.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      disposable.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      (ground.material as THREE.Material).dispose();
      (treeMesh.material as THREE.Material).dispose();
      (carMesh.material as THREE.Material).dispose();
      gradientMap.dispose();
      treeMesh.dispose();
      carMesh.dispose();
    },
  };
}

/** The 95th percentile of a list */
const pct = (xs: number[], p: number) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
};
const round = (x: number, k = 10) => Math.round(x * k) / k;

/** What the browser says about its GPUs (WebGPU asked politely: no device made) */
export async function probeDevice(): Promise<LabDevice> {
  const out: LabDevice = { webgpu: false, ua: navigator.userAgent, screen: `${screen.width} x ${screen.height} @ ${devicePixelRatio}x` };
  // (typed loosely: older browsers' adapters have no `info`, newer ones keep `isFallbackAdapter` in it)
  type Adapter = { info?: Record<string, string>; isFallbackAdapter?: boolean };
  const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<Adapter | null> } }).gpu;
  if (gpu)
    try {
      const a = await gpu.requestAdapter();
      if (a) {
        out.webgpu = true;
        const info = a.info ?? {};
        out.adapter = [info.vendor, info.architecture, info.description].filter(Boolean).join(' · ') || 'unnamed';
        out.fallback = !!(a.isFallbackAdapter ?? (info as { isFallbackAdapter?: boolean }).isFallbackAdapter);
      }
    } catch {
      // (no adapter: WebGPU is there but switched off, or blocked)
    }
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (gl) {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      out.webgl = String(gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {}
  return out;
}

/** The renderer the lab is drawing with: either kind, through what both have in common */
interface Drawer {
  canvas: HTMLCanvasElement;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  draws(): number;
  setSize(w: number, h: number): void;
  compile(scene: THREE.Scene, camera: THREE.Camera): Promise<unknown>;
  /** Waits until the GPU has done everything asked of it (a frame queued and not drawn yet would flatter it) */
  sync(): Promise<void>;
  /** Why the GPU device was lost, if it was (frames drawn after are nothing: the run doesn't count) */
  lost(): string | null;
  dispose(): void;
}

/** Reading one pixel back makes WebGL finish what it was asked (gl.finish() needn't) */
const glSync = (gl: WebGL2RenderingContext) => {
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  return Promise.resolve();
};

async function makeDrawer(kind: LabRenderer, low: boolean): Promise<Drawer> {
  const dpr = Math.min(devicePixelRatio, low ? 1.25 : 2);
  if (kind === 'webgl') {
    const r = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    r.setPixelRatio(dpr);
    r.toneMapping = THREE.NeutralToneMapping;
    r.shadowMap.enabled = !low;
    r.shadowMap.type = THREE.PCFShadowMap;
    return { canvas: r.domElement, render: (s, c) => r.render(s, c), draws: () => r.info.render.calls, setSize: (w, h) => r.setSize(w, h, false), compile: (s, c) => r.compileAsync(s, c), sync: () => glSync(r.getContext() as WebGL2RenderingContext), lost: () => (r.getContext().isContextLost() ? 'the WebGL context was lost' : null), dispose: () => r.dispose() };
  }
  const { WebGPURenderer } = await import('three/webgpu');
  const r = new WebGPURenderer({ antialias: false, powerPreference: 'high-performance', forceWebGL: kind === 'webgpu-gl' });
  let lost: string | null = null;
  r.onDeviceLost = (info: { message?: string }) => {
    lost = `the GPU device was lost (${info.message || 'no reason given'})`;
  };
  await r.init();
  const backend = (r as unknown as { backend: { isWebGPUBackend?: boolean; device?: { queue: { onSubmittedWorkDone(): Promise<void> } }; gl?: WebGL2RenderingContext } }).backend;
  if (kind === 'webgpu' && !backend.isWebGPUBackend) {
    r.dispose();
    throw new Error('no WebGPU here (the renderer fell back to WebGL)');
  }
  r.setPixelRatio(dpr);
  r.toneMapping = THREE.NeutralToneMapping;
  r.shadowMap.enabled = !low;
  r.shadowMap.type = THREE.PCFShadowMap;
  // (a lost device's wait fails: that's the run lost, said by `lost()`)
  const sync = () =>
    (backend.device ? backend.device.queue.onSubmittedWorkDone() : backend.gl ? glSync(backend.gl) : Promise.resolve()).catch((e: Error) => {
      lost ??= `the GPU device was lost (${e.message})`;
    });
  return { canvas: r.domElement, render: (s, c) => r.render(s, c), draws: () => r.info.render.drawCalls, setSize: (w, h) => r.setSize(w, h, false), compile: (s, c) => r.compileAsync(s, c), sync, lost: () => lost, dispose: () => r.dispose() };
}

const frame = () => new Promise<number>((res) => requestAnimationFrame(res));
/** A run's fewest frames measured, and the longest it may take (a slow device still gets a number) */
const MIN_FRAMES = 20;
const CAP = 40;

/** One run: `warm` seconds to settle, `measure` seconds measured */
async function runOne(kind: LabRenderer, load: LabLoad, d: { low: boolean; still: boolean; warm: number; measure: number; view: HTMLElement; stop: () => boolean }): Promise<LabRun> {
  const run: LabRun = { renderer: kind, load, ok: false, fps: 0, avg: 0, p95: 0, worst: 0, cpu: 0, draws: 0, start: 0 };
  let drawer: Drawer | null = null;
  const city = labCity(load, d.low, d.still);
  try {
    const t0 = performance.now();
    drawer = await makeDrawer(kind, d.low);
    drawer.canvas.className = 'gpu-lab-view';
    drawer.canvas.setAttribute('aria-hidden', 'true');
    d.view.replaceChildren(drawer.canvas);
    const w = d.view.clientWidth || innerWidth;
    const h = d.view.clientHeight || innerHeight;
    drawer.setSize(w, h);
    city.camera.aspect = w / h;
    city.camera.updateProjectionMatrix();
    city.step(0);
    await drawer.compile(city.scene, city.camera);
    drawer.render(city.scene, city.camera);
    await frame();
    run.start = round((performance.now() - t0) / 1000, 100);
    const begin = performance.now();
    const draw = (now: number) => {
      const c0 = performance.now();
      city.step((now - begin) / 1000);
      drawer!.render(city.scene, city.camera);
      return performance.now() - c0;
    };
    // Settling: the shaders' last compiles, the caches warm; then the GPU caught up before the clock starts
    const check = () => {
      if (d.stop()) throw new Error('stopped');
      const why = drawer!.lost();
      if (why) throw new Error(why);
    };
    while ((await frame()) - begin < d.warm * 1000) {
      check();
      draw(performance.now());
    }
    await drawer.sync();
    // Measured: `measure` seconds and at least `MIN_FRAMES` frames (never past `CAP`), then the GPU caught up
    // again, so what it had still queued counts too
    const times: number[] = [];
    const cpus: number[] = [];
    let draws = 0;
    const m0 = performance.now();
    let last = m0;
    for (;;) {
      check();
      const now = await frame();
      if ((now - m0 >= d.measure * 1000 && times.length >= MIN_FRAMES) || now - m0 > CAP * 1000) break;
      times.push(now - last);
      cpus.push(draw(now));
      draws = Math.max(draws, drawer.draws());
      last = now;
    }
    await drawer.sync();
    check();
    if (!times.length) throw new Error('too slow to measure here');
    const avg = (performance.now() - m0) / times.length;
    Object.assign(run, { ok: true, fps: round(1000 / avg), avg: round(avg), p95: round(pct(times, 0.95)), worst: round(Math.max(...times)), cpu: round(cpus.reduce((s, x) => s + x, 0) / cpus.length, 100), draws });
  } catch (err) {
    run.error = err instanceof Error ? err.message : String(err);
  } finally {
    // (the GPU done with it before it goes: disposing mid-frame trips WebGPU's error scopes)
    await drawer?.sync().catch(() => {});
    drawer?.dispose();
    city.dispose();
  }
  return run;
}

const NAMES: Record<LabRenderer, string> = { webgl: 'WebGL (today)', webgpu: 'WebGPU', 'webgpu-gl': 'New renderer on WebGL' };

/** The lab's card: the device, then a line a run */
export function report(dev: LabDevice, runs: LabRun[], done: boolean) {
  const lines = [
    'GPU lab (?gpu)',
    `WebGPU: ${dev.webgpu ? `yes · ${dev.adapter}${dev.fallback ? ' (software fallback)' : ''}` : 'not in this browser'}`,
    `WebGL 2: ${dev.webgl ?? 'not here'}`,
    '',
    'renderer               load      fps frame  p95  worst  cpu   draws',
  ];
  for (const r of runs)
    lines.push(
      r.ok
        ? `${NAMES[r.renderer].padEnd(22)} ${r.load.padEnd(8)} ${String(r.fps).padStart(5)} ${String(r.avg).padStart(5)} ${String(r.p95).padStart(4)} ${String(r.worst).padStart(6)} ${String(r.cpu).padStart(5)} ${String(r.draws).padStart(6)}`
        : `${NAMES[r.renderer].padEnd(22)} ${r.load.padEnd(8)} couldn't run: ${r.error}`,
    );
  lines.push(
    '',
    'frame: ms a frame, the GPU caught up · p95, worst: ms between frames',
    "cpu: ms of the frame's own work · draws: the GPU's draw calls a frame",
    '',
    done ? verdict(dev, runs) : 'Measuring… keep this tab in front.',
  );
  return lines.join('\n');
}

/** One line on what the numbers say */
export function verdict(dev: LabDevice, runs: LabRun[]) {
  const get = (k: LabRenderer, l: LabLoad) => runs.find((r) => r.renderer === k && r.load === l && r.ok);
  if (!dev.webgpu) return 'No WebGPU on this device yet: the city would stay on WebGL here.';
  if (!get('webgpu', 'many')) return "WebGPU is here but couldn't draw the test: the city would stay on WebGL here for now.";
  const a = get('webgl', 'many');
  const b = get('webgpu', 'many');
  if (!a || !b) return 'Done.';
  const k = a.avg / b.avg;
  return k > 1.1 ? `WebGPU drew the many-draws city ${round(k)}x as fast here.` : k < 0.9 ? `WebGL was faster here (WebGPU at ${round(k, 100)}x).` : 'About the same here.';
}

/** Opens the lab over the page (index.ts, for `?gpu`) */
export async function openGpuLab(root: HTMLElement, d: { reduced: boolean; low: boolean }) {
  const q = new URLSearchParams(location.search);
  const quick = q.get('gpu') === 'quick';
  // (`only=webgpu,webgpu-gl`: just those renderers)
  const only = q.get('only')?.split(',');
  const ui = document.createElement('div');
  ui.className = 'anim-lab gpu-lab';
  ui.innerHTML = `
    <div class="gpu-lab-stage" data-view></div>
    <div class="anim-lab-panel gpu-lab-panel">
      <div class="anim-lab-head"><span class="anim-lab-title">GPU lab</span><span class="anim-lab-note">?gpu · WebGL and WebGPU</span><button class="anim-lab-close" type="button" aria-label="Close the lab">×</button></div>
      <pre class="gpu-lab-text" data-text>Looking at this device's GPU…</pre>
      <button class="anim-lab-btn" type="button" data-copy hidden>Copy results</button>
    </div>`;
  root.append(ui);
  const view = ui.querySelector<HTMLElement>('[data-view]')!;
  const text = ui.querySelector<HTMLElement>('[data-text]')!;
  const copy = ui.querySelector<HTMLButtonElement>('[data-copy]')!;
  let stopped = false;
  ui.querySelector('.anim-lab-close')!.addEventListener('click', () => {
    stopped = true;
    ui.remove();
    const u = new URL(location.href);
    u.searchParams.delete('gpu');
    location.href = u.toString();
  });

  const dev = await probeDevice();
  const runs: LabRun[] = [];
  const out = { done: false, device: dev, runs };
  (window as unknown as { __gpulab: typeof out }).__gpulab = out;
  text.textContent = report(dev, runs, false);
  const plan: [LabRenderer, LabLoad][] = [];
  for (const k of ['webgl', ...(dev.webgpu ? (['webgpu'] as const) : []), 'webgpu-gl'] as LabRenderer[])
    if (!only || only.includes(k)) for (const l of ['batched', 'many'] as LabLoad[]) plan.push([k, l]);
  for (const [k, l] of plan) {
    if (stopped) return;
    runs.push(await runOne(k, l, { low: d.low, still: d.reduced, warm: quick ? 0.5 : 1.5, measure: quick ? 1.5 : 4, view, stop: () => stopped }));
    text.textContent = report(dev, runs, false);
  }
  out.done = true;
  text.textContent = report(dev, runs, true);
  console.log('GPU lab', out);
  copy.hidden = false;
  copy.addEventListener('click', async () => {
    const all = [text.textContent, '', `Device: ${dev.ua}`, `Screen: ${dev.screen}`, '', JSON.stringify(out)].join('\n');
    try {
      await navigator.clipboard.writeText(all);
      copy.textContent = 'Copied';
    } catch {
      text.textContent = all;
      getSelection()?.selectAllChildren(text);
      copy.textContent = 'Selected: copy it';
    }
  });
}
