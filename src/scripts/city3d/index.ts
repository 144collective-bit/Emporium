/*
 * Degen City in 3D. Boots on top of the 2D map (which stays as the loading
 * poster and the fallback), then takes over: camera fly-in, buildings you can
 * hover and click, glass panels, time of day, weather and sound.
 */
import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { loadImage, loadTex, updateLights } from './kit';
import { createPost } from './post';
import { CENTER, buildGround, buildLamps, buildSkyline, buildTrees, puddleMat, scatterOutskirts, waterMat, type Env, type Tick } from './world';
import { buildLandmarks, type Spot } from './landmarks';
import { buildLife } from './life';
import { createSky, type TimeMode, type WeatherMode } from './sky';
import { createSound } from './sound';

type Tier = 'high' | 'medium' | 'low';

const TIERS = {
  high: { dpr: 2, shadows: 2048, msaa: 4, bloomScale: 0.5, cars: 26, buses: 3, walkers: 80, trees: 340, skyline: 70, rain: 6000, clouds: 12 },
  medium: { dpr: 1.5, shadows: 1024, msaa: 0, bloomScale: 0.5, cars: 18, buses: 2, walkers: 50, trees: 230, skyline: 50, rain: 3500, clouds: 9 },
  low: { dpr: 1.5, shadows: 0, msaa: 0, bloomScale: 0.35, cars: 12, buses: 2, walkers: 30, trees: 150, skyline: 34, rain: 1800, clouds: 6 },
};

function pickTier(): Tier {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(innerWidth, innerHeight) < 700;
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (coarse || small) return 'low';
  if ((nav.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4) return 'medium';
  return 'high';
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(null)));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export async function bootCity(root: HTMLElement) {
  const host = root.querySelector<HTMLElement>('[data-city3d]')!;
  const loader = root.querySelector<HTMLElement>('[data-loader]')!;
  const bar = loader.querySelector<HTMLElement>('[data-loader-bar]')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tier = (root.dataset.tier as Tier) || pickTier();
  const Q = TIERS[tier];
  const progress = (k: number) => bar.style.setProperty('--p', String(k));

  // Renderer first: if WebGL is missing, stay on the 2D map
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', alpha: false });
  } catch {
    return null;
  }
  loader.hidden = false;
  progress(0.05);

  renderer.setPixelRatio(Math.min(devicePixelRatio, Q.dpr));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = Q.shadows > 0;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.prepend(renderer.domElement);

  // Fonts and art for the signs
  await Promise.race([
    Promise.all([document.fonts.load('900 64px "Big Shoulders Display"'), document.fonts.load('700 32px "JetBrains Mono"')]),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
  const [logo, degen] = await Promise.all([loadTex(root.dataset.logo!), loadImage(root.dataset.degen!)]);
  progress(0.2);
  await nextFrame();

  /* ---------- Scene ---------- */
  const scene = new THREE.Scene();
  const ticks: Tick[] = [];
  const tick = (f: Tick) => ticks.push(f);

  buildGround(scene, { '0,11': 'paving', '11,11': 'paving', '22,11': 'concrete', '11,22': 'concrete', '22,22': 'dirt' });
  progress(0.3);
  await nextFrame();
  const { spots, crowd } = buildLandmarks(scene, { degen, logo, tick, low: tier === 'low' });
  progress(0.55);
  await nextFrame();
  scatterOutskirts(Q.trees);
  buildSkyline(scene, Q.skyline, tick);
  buildTrees(scene);
  buildLamps(scene);
  progress(0.7);
  await nextFrame();
  buildLife(scene, { cars: Q.cars, buses: Q.buses, walkers: Q.walkers }, crowd, tick);
  const sky = createSky(scene, { shadows: Q.shadows, rainDrops: Q.rain, clouds: Q.clouds });
  progress(0.85);
  await nextFrame();

  /* ---------- Camera ---------- */
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 440);
  const controls = new MapControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.screenSpacePanning = false;
  controls.minDistance = 7;
  controls.maxDistance = 80;
  controls.minPolarAngle = 0.32;
  controls.maxPolarAngle = 1.18;
  controls.zoomToCursor = true;

  const home = () => {
    const portrait = host.clientWidth < host.clientHeight;
    const k = portrait ? 1.3 : 1;
    return { pos: CENTER.clone().add(new THREE.Vector3(27, 31, 34).multiplyScalar(k)), target: CENTER.clone().add(new THREE.Vector3(0, 2.2, 1)) };
  };

  const post = createPost(renderer, scene, camera, { msaa: Q.msaa, bloomScale: Q.bloomScale, smaa: devicePixelRatio < 1.5 && tier !== 'low' });

  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    post.setSize(w, h, renderer.getPixelRatio());
    dirty = true;
  }
  let dirty = true;
  new ResizeObserver(resize).observe(host);
  resize();

  // Compile shaders before the reveal so the fly-in doesn't stutter
  const h0 = home();
  camera.position.copy(h0.pos);
  controls.target.copy(h0.target);
  controls.update();
  renderer.compile(scene, camera);
  progress(1);

  /* ---------- Fly-to ---------- */
  let flight: { from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3; start: number; dur: number; done?: () => void } | null = null;
  function flyTo(pos: THREE.Vector3, target: THREE.Vector3, dur = 1.6, done?: () => void) {
    if (reduced) dur = 0;
    flight = { from: camera.position.clone(), to: pos.clone(), tFrom: controls.target.clone(), tTo: target.clone(), start: timer.getElapsed(), dur, done };
    controls.enabled = false;
  }
  function spotView(s: Spot) {
    const dist = s.size * 1.55 + 5;
    const dir = new THREE.Vector3(0.95, 0.85, 1.25).normalize();
    return { pos: s.focus.clone().addScaledVector(dir, dist), target: s.focus.clone() };
  }

  /* ---------- Pins, hover and click ---------- */
  const pins = new Map<string, HTMLElement>();
  root.querySelectorAll<HTMLElement>('[data-pin]').forEach((el) => pins.set(el.dataset.pin!, el));
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered: Spot | null = null;
  let active: Spot | null = null;
  let returnView: { pos: THREE.Vector3; target: THREE.Vector3 } | null = null;

  function pickAt(x: number, y: number) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(
      spots.map((s) => s.group),
      true
    )[0];
    if (!hit) return null;
    let o: THREE.Object3D | null = hit.object;
    while (o && !spots.some((s) => s.group === o)) o = o.parent;
    return spots.find((s) => s.group === o) ?? null;
  }
  function setHover(s: Spot | null) {
    if (hovered === s) return;
    if (hovered) pins.get(hovered.id)?.classList.remove('is-hot');
    hovered = s;
    if (s) pins.get(s.id)?.classList.add('is-hot');
    renderer.domElement.style.cursor = s ? 'pointer' : '';
    dirty = true;
  }

  const panel = root.querySelector<HTMLElement>('[data-panel]')!;
  const panelBody = panel.querySelector<HTMLElement>('[data-panel-body]')!;
  const panelClose = panel.querySelector<HTMLButtonElement>('[data-panel-close]')!;
  let lastFocus: HTMLElement | null = null;

  function open(id: string) {
    const s = spots.find((sp) => sp.id === id);
    const tpl = root.querySelector<HTMLTemplateElement>(`template[data-panel-tpl="${id}"]`);
    if (!s || !tpl) return;
    if (!active) returnView = { pos: camera.position.clone(), target: controls.target.clone() };
    active = s;
    lastFocus = document.activeElement as HTMLElement;
    panelBody.replaceChildren(tpl.content.cloneNode(true));
    panel.dataset.spot = id;
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    root.classList.add('has-panel');
    const v = spotView(s);
    flyTo(v.pos, v.target);
    panelClose.focus({ preventScroll: true });
  }
  function close() {
    if (!active) return;
    active = null;
    panel.classList.remove('is-open');
    root.classList.remove('has-panel');
    setTimeout(() => {
      if (!active) panel.hidden = true;
    }, 350);
    if (returnView) flyTo(returnView.pos, returnView.target, 1.3);
    returnView = null;
    lastFocus?.focus({ preventScroll: true });
  }
  panelClose.addEventListener('click', close);
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  const canvas = renderer.domElement;
  let down: { x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY };
    if (flight) {
      flight = null;
      controls.enabled = true;
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 6) return;
    const s = pickAt(e.clientX, e.clientY);
    if (s) open(s.id);
    else if (active) close();
  });
  let hoverQueued = false;
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || e.buttons || hoverQueued) return;
    hoverQueued = true;
    requestAnimationFrame(() => {
      hoverQueued = false;
      setHover(pickAt(e.clientX, e.clientY));
    });
  });
  canvas.addEventListener('pointerleave', () => setHover(null));
  controls.addEventListener('change', () => (dirty = true));
  controls.addEventListener('start', () => root.classList.add('has-moved'));

  pins.forEach((el, id) => {
    el.addEventListener('click', () => open(id));
    el.addEventListener('pointerenter', () => setHover(spots.find((s) => s.id === id) ?? null));
    el.addEventListener('pointerleave', () => setHover(null));
  });
  // The directory opens the same panels while the 3D city is up
  root.querySelectorAll<HTMLAnchorElement>('[data-dir-spot]').forEach((a) =>
    a.addEventListener('click', (e) => {
      if (root.dataset.view !== '3d') return;
      e.preventDefault();
      a.closest('details')?.removeAttribute('open');
      open(a.dataset.dirSpot!);
    })
  );

  /* ---------- Controls: time, weather, sound, view ---------- */
  const sound = createSound();
  const group = (name: string, apply: (v: string) => void) => {
    const btns = root.querySelectorAll<HTMLButtonElement>(`[data-${name}]`);
    btns.forEach((b) =>
      b.addEventListener('click', () => {
        btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        apply(b.getAttribute(`data-${name}`)!);
        dirty = true;
      })
    );
  };
  group('time', (v) => sky.setTime(v as TimeMode));
  group('weather', (v) => sky.setWeather(v as WeatherMode));
  const soundBtn = root.querySelector<HTMLButtonElement>('[data-sound]')!;
  soundBtn.addEventListener('click', async () => {
    const on = await sound.toggle();
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.querySelector('[data-sound-label]')!.textContent = on ? 'Sound on' : 'Sound off';
  });
  root.querySelector('[data-reset]')!.addEventListener('click', () => {
    close();
    const hv = home();
    flyTo(hv.pos, hv.target, 1.4);
  });

  /* ---------- Loop ---------- */
  const timer = new THREE.Timer();
  timer.connect(document);
  const env: Env = { t: 0, dt: 0, night: 1, rain: 0, day: 0 };
  let running = true;
  let frames = 0;
  let slow = 0;
  let measured = 0;
  const pinPos = new THREE.Vector3();

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.1);
    const t = timer.getElapsed();

    // Camera flight
    if (flight) {
      const k = flight.dur ? Math.min(1, (t - flight.start) / flight.dur) : 1;
      const e = ease(k);
      camera.position.lerpVectors(flight.from, flight.to, e);
      controls.target.lerpVectors(flight.tFrom, flight.tTo, e);
      camera.lookAt(controls.target);
      dirty = true;
      if (k >= 1) {
        const done = flight.done;
        flight = null;
        controls.enabled = true;
        controls.update();
        done?.();
      }
    } else if (controls.update()) dirty = true;
    // Keep the view over the city
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -8, 39);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -8, 39);

    const s = sky.update(reduced ? 0 : t, dt, controls.target);
    env.t = reduced ? 0 : t;
    env.dt = reduced ? 0 : dt;
    env.night = s.night;
    env.rain = s.rain;
    env.day = s.day;
    if (!reduced || frames === 0) for (const f of ticks) f(env);
    updateLights(s.night, env.t);
    waterMat.uniforms.time.value = env.t;
    waterMat.uniforms.night.value = s.night;
    waterMat.uniforms.rain.value = s.rain;
    (waterMat.uniforms.sky.value as THREE.Color).copy(scene.background as THREE.Color);
    puddleMat.color.setScalar(s.rain * (0.12 + s.night * 0.6));
    post.bloom.strength = 0.32 + s.night * 0.62 + s.rain * 0.08;
    post.bloom.threshold = 0.9 - s.night * 0.12;
    renderer.toneMappingExposure = 1 + s.night * 0.08;

    // Hover lift and rings
    for (const sp of spots) {
      const on = sp === hovered || sp === active;
      sp.group.position.y += ((on ? 0.22 : 0) - sp.group.position.y) * Math.min(1, dt * 10);
      const m = sp.ring.material as THREE.MeshBasicMaterial;
      m.opacity += ((on ? 0.85 : 0) - m.opacity) * Math.min(1, dt * 8);
      sp.ring.scale.setScalar(1 + (on ? Math.sin(t * 4) * 0.04 : 0));
    }

    // Pins follow their buildings on screen
    const w = host.clientWidth;
    const h = host.clientHeight;
    for (const sp of spots) {
      const el = pins.get(sp.id);
      if (!el) continue;
      pinPos.copy(sp.pin);
      pinPos.y += sp.group.position.y;
      const dist = pinPos.distanceTo(camera.position);
      pinPos.project(camera);
      const visible = pinPos.z < 1 && Math.abs(pinPos.x) < 1.1 && Math.abs(pinPos.y) < 1.1;
      el.style.transform = `translate(${((pinPos.x + 1) / 2) * w}px, ${((1 - pinPos.y) / 2) * h}px)`;
      el.style.opacity = visible ? String(THREE.MathUtils.clamp(2 - dist / 80, 0.6, 1)) : '0';
      el.style.visibility = visible ? 'visible' : 'hidden';
    }

    const dE = controls.target.distanceTo(spots[0].focus) + camera.position.distanceTo(controls.target) * 0.4;
    sound.update(s.rain, s.night, 1 - THREE.MathUtils.smoothstep(dE, 8, 36));

    if (!reduced || dirty || flight) {
      post.render();
      dirty = false;
    }

    // Too slow? Ease off the pixel ratio and shadows once, after things settle
    frames++;
    if (t > 3 && measured < 90) {
      measured++;
      if (dt > 1 / 32) slow++;
      if (measured === 90 && slow > 45) {
        renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - 0.5));
        scene.traverse((o) => {
          if ((o as THREE.DirectionalLight).isDirectionalLight) (o as THREE.DirectionalLight).castShadow = false;
        });
        resize();
      }
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      running = false;
      sound.suspend();
    } else if (root.dataset.view === '3d') {
      running = true;
      sound.resume();
      requestAnimationFrame(frame);
    }
  });

  /* ---------- Reveal ---------- */
  root.dataset.view = '3d';
  loader.classList.add('is-done');
  setTimeout(() => (loader.hidden = true), 600);
  const start = home();
  camera.position.copy(start.pos.clone().add(new THREE.Vector3(40, 46, 40)));
  controls.target.copy(start.target);
  camera.lookAt(controls.target);
  flyTo(start.pos, start.target, 2.8);
  requestAnimationFrame(frame);

  return {
    stop() {
      running = false;
      close();
      if (sound.on) sound.toggle();
    },
    start() {
      if (running) return;
      running = true;
      requestAnimationFrame(frame);
    },
  };
}
