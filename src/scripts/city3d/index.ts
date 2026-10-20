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
import { buildLife, walker } from './life';
import { createWalk } from './walk';
import { buildGarage } from './garage';
import { WORLD_BOUNDS } from './layout';
import { loadCar } from './garage-ui';
import { createProfileUI } from './profile-ui';
import { createMultiplayer } from './multiplayer';
import { createSky, type TimeMode, type WeatherMode } from './sky';
import { createSound } from './sound';
import { createPlots, type Plot } from './plots';
import { createDemoStore, createSwitchStore } from './store';
import { createOnlineSwitch } from './online';
import type { Account } from './account';
import type { AccountHooks, AccountUI } from './account-ui';
import { createLandStore } from './land';
import { createBuilderUI } from './builder-ui';
import { createFitting, type Fitting } from './fitting';
import { createCityHead } from './head';

type Tier = 'high' | 'medium' | 'low';

const TIERS = {
  high: { dpr: 2, shadows: 2048, msaa: 4, bloomScale: 0.5, cars: 38, buses: 3, walkers: 100, trees: 340, skyline: 70, rain: 6000, clouds: 12 },
  medium: { dpr: 1.5, shadows: 1024, msaa: 0, bloomScale: 0.5, cars: 27, buses: 2, walkers: 62, trees: 230, skyline: 50, rain: 3500, clouds: 9 },
  low: { dpr: 1.25, shadows: 0, msaa: 0, bloomScale: 0.3, cars: 16, buses: 2, walkers: 30, trees: 120, skyline: 26, rain: 1200, clouds: 4 },
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

/** `wallet`: Connect wallet and the profile card, made with the page (CityMap.astro); the city plugs its parts into `hooks` */
export async function bootCity(root: HTMLElement, wallet?: { account: Account; hooks: AccountHooks; ui: AccountUI } | null) {
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

  buildGround(scene, { '0,14': 'paving', '14,14': 'paving', '28,14': 'concrete', '14,28': 'concrete', '28,28': 'concrete' });
  progress(0.3);
  await nextFrame();
  const { spots, crowd } = buildLandmarks(scene, { degen, logo, tick, low: tier === 'low' });
  // The garage on the south bank, your saved car on its turntable
  const garage = buildGarage(scene, { tick, reduced, car: loadCar() });
  const plots = createPlots(scene, { degen, tick, reduced });
  progress(0.55);
  await nextFrame();
  scatterOutskirts(Q.trees);
  buildSkyline(scene, Q.skyline, tick);
  buildTrees(scene);
  buildLamps(scene);
  progress(0.7);
  await nextFrame();
  buildLife(scene, { cars: Q.cars, buses: Q.buses, walkers: Q.walkers, light: tier === 'low' }, crowd, tick);
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
  controls.maxDistance = 150;
  controls.minPolarAngle = 0.32;
  controls.maxPolarAngle = 1.18;
  controls.zoomToCursor = true;

  const home = () => {
    const portrait = host.clientWidth < host.clientHeight;
    const k = portrait ? 1.3 : 1;
    return { pos: CENTER.clone().add(new THREE.Vector3(27, 31, 34).multiplyScalar(k)), target: CENTER.clone().add(new THREE.Vector3(0, 3.4, 1)) };
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
    // Portrait screens are narrow and the panel is a bottom sheet there: pull back
    // and aim below the building so it sits in the top half of the screen
    const portrait = camera.aspect < 1;
    const dist = (s.size * 1.55 + 5) * (portrait ? Math.min(1.7, 0.8 / camera.aspect) : 1);
    const dir = new THREE.Vector3(0.95, 0.85, 1.25).normalize();
    const target = s.focus.clone();
    if (portrait) target.y -= s.size * 0.55;
    return { pos: s.focus.clone().addScaledVector(dir, dist), target };
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
  // Drop 001's panel has the fitting room (made once the profile exists, further down)
  let fitting: Fitting | null = null;

  let walking = false;
  /** `toFitting`: scroll Drop 001's panel to its fitting room (from the Profile panel) */
  function open(id: string, toFitting = false) {
    const s = spots.find((sp) => sp.id === id);
    const tpl = root.querySelector<HTMLTemplateElement>(`template[data-panel-tpl="${id}"]`);
    if (!s || !tpl) return;
    // Walking: the panel opens where you stand, the camera stays with Degen
    if (!active && !walking) returnView = { pos: camera.position.clone(), target: controls.target.clone() };
    active = s;
    lastFocus = document.activeElement as HTMLElement;
    panelBody.replaceChildren(tpl.content.cloneNode(true));
    if (id === 'shop') fitting?.mount(panelBody, toFitting);
    else fitting?.unmount();
    panel.dataset.spot = id;
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    root.classList.add('has-panel');
    if (!walking) {
      const v = spotView(s);
      flyTo(v.pos, v.target);
    }
    panelClose.focus({ preventScroll: true });
  }
  function close() {
    if (!active) return;
    active = null;
    fitting?.unmount();
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
  /* ---------- Build mode ---------- */
  function plotAtPointer(x: number, y: number) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return plots.pick(raycaster.ray);
  }
  function plotView(p: Plot) {
    const portrait = camera.aspect < 1;
    // Large plots carry buildings three times the size: stand well back
    const k = 2.3;
    const dir = new THREE.Vector3(0.95, 0.85, 1.25).normalize();
    const target = new THREE.Vector3(p.cx, portrait ? -0.4 * k : 1.6 * k, p.cz);
    return { pos: new THREE.Vector3(p.cx, 1.6 * k, p.cz).addScaledVector(dir, (portrait ? 17 : 13) * k), target };
  }
  // A game server adds the Online / Offline switch: online, real sales (land.ts); offline or without one, the labelled demo
  const server = import.meta.env.PUBLIC_GAME_SERVER as string | undefined;
  const onlineSwitch = server ? createOnlineSwitch(root) : null;
  // Logging in with a wallet (account.ts): the player's profile, and building on their plots
  const account = wallet?.account ?? null;
  const sales = server && onlineSwitch && account ? createSwitchStore(() => createLandStore(server, account), onlineSwitch.on) : null;
  const builder = createBuilderUI(root, {
    store: sales?.store ?? createDemoStore(),
    plots,
    focus(p) {
      const v = plotView(p);
      flyTo(v.pos, v.target, 1.2);
    },
    overview() {
      // Every district, the south row across the river included
      const k = camera.aspect < 1 ? 1.5 : 1.62;
      const target = new THREE.Vector3(20, 0, 34);
      flyTo(target.clone().add(new THREE.Vector3(34, 50, 44).multiplyScalar(k)), target, 1.6);
    },
    onMode(on) {
      if (on && walking) stopWalking(false);
      close();
      setHover(null);
      canvas.style.cursor = '';
      dirty = true;
      if (on) root.classList.add('has-moved');
    },
  });

  const canvas = renderer.domElement;

  /* ---------- Walk mode ---------- */
  const walk = createWalk({
    scene,
    camera,
    canvas,
    root,
    plotSolids: () => plots.solids(),
    openSpot: (id) => open(id),
    touched: () => touched(),
    tick,
    // The sound engine is made further down; shots only happen once it exists
    sfx: (kind, gain) => sound.sfx(kind, gain),
    garage,
    // Made further down too, like sfx
    engine: (revs) => sound.engine(revs),
  });
  // The Profile panel (wardrobe, finish, rank) works offline; multiplayer only when the site has a game server
  const profileUI = createProfileUI(root, {
    setLook: (o) => walk.setLook(o),
    onLifetime: (fn) => walk.combat.onLifetime(fn),
    openFitting: () => open('shop', true),
  });
  fitting = createFitting({
    look: () => profileUI.look,
    apply: (l) => profileUI.wear(l),
    onChange: (fn) => profileUI.onChange(fn),
    reduced,
    low: tier === 'low',
  });
  const mp =
    server && onlineSwitch
      ? createMultiplayer({
          url: server,
          root,
          scene,
          camera,
          walk,
          combat: walk.combat,
          profile: profileUI,
          enabled: onlineSwitch.on,
          setSwitch: (on) => onlineSwitch.set(on),
          changed: (s) => onlineSwitch.status(s),
          account: account!,
        })
      : null;
  const accountUI = wallet && onlineSwitch ? wallet.ui : null;
  if (wallet && onlineSwitch && account)
    Object.assign(wallet.hooks, {
      online: () => onlineSwitch.on,
      goOnline: () => onlineSwitch.set(true),
      rename: () => (mp?.rename() ? undefined : account.rename()),
      showPlot(id: string) {
        builder.setBuild(true);
        builder.select(id);
      },
      opened: () => walking && walk.releaseMouse(),
    } satisfies AccountHooks);
  onlineSwitch?.onChange((on) => {
    sales?.setOnline(on);
    mp?.setEnabled(on);
    accountUI?.refresh();
  });
  const walkBtn = root.querySelector<HTMLButtonElement>('[data-walk-toggle]')!;
  let beforeWalk: { pos: THREE.Vector3; target: THREE.Vector3 } | null = null;
  function startWalking() {
    if (walking) return;
    if (builder.active) builder.setBuild(false);
    close();
    setHover(null);
    beforeWalk = { pos: camera.position.clone(), target: controls.target.clone() };
    flight = null;
    controls.enabled = false;
    walking = true;
    walker.on = true;
    walk.enter();
    mp?.walkChanged(true);
    // The site header steps aside so the city and its mode header fill the screen (global.css)
    document.body.classList.add('is-walking');
    walkBtn.setAttribute('aria-pressed', 'true');
    root.classList.add('has-moved');
    canvas.focus({ preventScroll: true });
  }
  function stopWalking(flyBack = true) {
    if (!walking) return;
    walking = false;
    walker.on = false;
    walk.exit();
    mp?.walkChanged(false);
    document.body.classList.remove('is-walking');
    close();
    controls.enabled = true;
    walkBtn.setAttribute('aria-pressed', 'false');
    if (beforeWalk && flyBack) {
      controls.target.copy(walk.position);
      flyTo(beforeWalk.pos, beforeWalk.target, 1.4);
    }
    beforeWalk = null;
  }
  walkBtn.addEventListener('click', () => startWalking());
  walkBtn.hidden = false;
  // The mode header's City button: back to the city view from walking or building
  const head = createCityHead(root);
  head.city.addEventListener('click', () => {
    if (walking) stopWalking();
    if (builder.active) builder.setBuild(false);
  });
  head.city.hidden = false;
  root.querySelector('[data-walk-exit]')?.addEventListener('click', () => stopWalking());

  // Esc closes an open drop-open menu (walk panels, City settings, Directory) before it closes
  // a panel or leaves a mode
  const closePop = () => {
    const open = root.querySelector<HTMLDetailsElement>('[data-pop][open], .head-pop[open]');
    if (!open) return false;
    open.open = false;
    open.querySelector('summary')?.focus({ preventScroll: true });
    return true;
  };
  // On the document, not the city: re-rendered panels drop focus back to <body>
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && accountUI?.close()) return;
    if (root.dataset.view !== '3d') return;
    if (accountUI?.isOpen) return;
    if (walking) {
      if (e.key === 'Escape') {
        if (walk.closeShop() || walk.releaseMouse() || closePop()) return;
        active ? close() : stopWalking();
      }
      else if (!active) walk.onKey(e, true);
      return;
    }
    if (e.key === 'Escape' && closePop()) return;
    if (builder.key(e)) return;
    if (e.key === 'Escape') close();
  });
  document.addEventListener('keyup', (e) => walking && walk.onKey(e, false));
  let down: { x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY };
    if (flight && !walking) {
      flight = null;
      controls.enabled = true;
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 6 || walking) return;
    if (builder.active) {
      builder.select(plotAtPointer(e.clientX, e.clientY)?.id ?? null);
      return;
    }
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
      if (builder.active) {
        const p = plotAtPointer(e.clientX, e.clientY);
        plots.setHover(p?.id ?? null);
        canvas.style.cursor = p ? 'pointer' : '';
        dirty = true;
        return;
      }
      setHover(walking ? null : pickAt(e.clientX, e.clientY));
    });
  });
  canvas.addEventListener('pointerleave', () => {
    setHover(null);
    plots.setHover(null);
  });
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
    stopWalking(false);
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
  // Phones run the city at a steady 30fps while nobody is touching it, and at
  // full rate during a drag, a pinch or a fly-in, so moving still feels smooth
  const idleFps = tier === 'low' ? 30 : 0;
  let lastT = 0;
  // Exactly one loop. A hidden tab holds back the frame that was already asked
  // for; without cancelling it, coming back would start a second loop beside it
  // (and each trip away another), each drawing the whole city.
  let raf = 0;
  const loop = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  };
  // Fast screens (120 / 144 Hz) draw every other refresh: a steady 60-72fps
  // rather than an uneven, hotter 120. The refresh rate is read from the
  // browser's own frame timing, which doesn't depend on how long we take.
  let refresh = 1 / 60;
  let lastRaf = 0;
  let tickN = 0;
  // ?fps in the address: a small readout for checking performance on real devices
  // (frames a second, the slowest frame, draw calls and triangles per frame)
  const statsEl = new URLSearchParams(location.search).has('fps') ? document.createElement('pre') : null;
  const stat = { frames: 0, draws: 0, tris: 0, worst: 0, last: 0, since: performance.now() };
  if (statsEl) {
    statsEl.className = 'city-stats';
    statsEl.setAttribute('aria-hidden', 'true');
    host.append(statsEl);
    renderer.info.autoReset = false;
  }
  // Nothing to draw while the city is scrolled out of view
  let onScreen = true;
  new IntersectionObserver(([e]) => (onScreen = e.isIntersecting)).observe(host);
  let lastInput = -10;
  const touched = () => (lastInput = timer.getElapsed());
  canvas.addEventListener('pointerdown', touched);
  canvas.addEventListener('pointermove', touched);
  canvas.addEventListener('wheel', touched, { passive: true });
  // Too slow? Step quality down in stages, checking again after each
  let windowFrames = 0;
  let windowSlow = 0;
  const pinPos = new THREE.Vector3();
  const pinState: { id: string; el: HTMLElement; x: number; y: number; scale: number; rank: number }[] = [];
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  // Label sizes, measured once fonts are in and again on resize
  const pinSize = new Map<string, [number, number]>();
  const measurePins = () =>
    pins.forEach((el, id) => {
      const card = el.firstElementChild as HTMLElement;
      pinSize.set(id, [card.offsetWidth, card.offsetHeight]);
    });
  measurePins();
  new ResizeObserver(measurePins).observe(host);
  // The city's own buttons and cards: a label under one folds to a dot, so the
  // Walk / Build pills never sit on top of a building's name. Re-read a few
  // times a second (they open, close and move with the layout)
  // The header, its open drop-downs (settings, menu) and the welcome card
  const chrome = [...root.querySelectorAll<HTMLElement>('.city-head, .head-panel, .city-card')];
  const chromeRects: { x: number; y: number; w: number; h: number }[] = [];
  const readChrome = () => {
    const o = host.getBoundingClientRect();
    chromeRects.length = 0;
    for (const el of chrome) {
      const r = el.getBoundingClientRect();
      if (r.width && r.height && el.offsetParent) chromeRects.push({ x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height });
    }
  };

  function frame(now: number) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const gap = (now - lastRaf) / 1000;
    lastRaf = now;
    if (gap > 0.002 && gap < 0.05) refresh += (gap - refresh) * 0.05;
    const skip = refresh < 1 / 100 ? Math.round(1 / 60 / refresh) : 1;
    if (++tickN % skip) return;
    if (!onScreen && !walking) return;
    timer.update();
    const t = timer.getElapsed();
    const busy = !!flight || walking || t - lastInput < 1;
    if (idleFps && !busy && t - lastT < 1 / idleFps - 0.004) return;
    const dt = Math.min(t - lastT, 0.1);
    lastT = t;

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
    } else if (walking) {
      walk.update(dt, reduced ? 0 : t);
      walker.x = walk.position.x;
      walker.z = walk.position.z;
      // A car reaches further than someone on foot
      walker.r = walk.driving ? 0.8 : 0;
      mp?.update(dt, t);
      dirty = true;
    } else if (controls.update()) dirty = true;
    // Keep the view over the world (it reaches past the city, room to build)
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, WORLD_BOUNDS[0] + 10, WORLD_BOUNDS[2] - 10);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, WORLD_BOUNDS[1] + 10, WORLD_BOUNDS[3] - 10);

    const s = sky.update(reduced ? 0 : t, dt, controls.target, camera.position);
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
    // Night glow is kept in proportion to the scene: enough bloom for the neon,
    // not so much that it washes over the buildings. Bloom grows with how much
    // of the screen is lit, so close up (zoomed in, flown to a building, walking)
    // it gets tighter, softer and pickier, or the lit facades haze the view over
    const near = walking ? 1 : 1 - THREE.MathUtils.smoothstep(camera.position.distanceTo(controls.target), 12, 48);
    post.bloom.strength = (0.3 + s.night * 0.4 + s.rain * 0.06) * (1 - near * 0.4);
    post.bloom.radius = 0.55 - near * 0.4;
    post.bloom.threshold = 0.9 - s.night * 0.06 + near * 0.07;
    renderer.toneMappingExposure = 1 + s.night * 0.03;

    // Hover lift and rings (never lifted while walking: Degen walks on the same ground as the building)
    for (const sp of spots) {
      const on = sp === hovered || sp === active;
      sp.group.position.y += ((on && !walking ? 0.22 : 0) - sp.group.position.y) * Math.min(1, dt * 10);
      const m = sp.ring.material as THREE.MeshBasicMaterial;
      m.opacity += ((on ? 0.85 : 0) - m.opacity) * Math.min(1, dt * 8);
      sp.ring.scale.setScalar(1 + (on ? Math.sin(t * 4) * 0.04 : 0));
    }

    // Pins follow their buildings on screen; far ones shrink
    const w = host.clientWidth;
    const h = host.clientHeight;
    pinState.length = 0;
    for (const sp of spots) {
      const el = pins.get(sp.id);
      if (!el) continue;
      pinPos.copy(sp.pin);
      pinPos.y += sp.group.position.y;
      const dist = pinPos.distanceTo(camera.position);
      pinPos.project(camera);
      const visible = pinPos.z < 1 && Math.abs(pinPos.x) < 1.1 && Math.abs(pinPos.y) < 1.1;
      const x = ((pinPos.x + 1) / 2) * w;
      const y = ((1 - pinPos.y) / 2) * h;
      const scale = THREE.MathUtils.clamp(1.3 - dist / 85, 0.72, 1);
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      el.style.setProperty('--s', scale.toFixed(3));
      el.style.visibility = visible ? 'visible' : 'hidden';
      if (visible) pinState.push({ id: sp.id, el, x, y, scale, rank: sp === hovered || sp === active ? -1 : dist });
    }
    // Declutter: the hovered pin and nearer pins win; a label that would
    // overlap one already placed folds to a dot (still tappable)
    pinState.sort((a, b) => a.rank - b.rank);
    if (frames % 20 === 0) readChrome();
    placed.length = 0;
    for (const p of pinState) {
      const [pw, ph] = pinSize.get(p.id) ?? [120, 40];
      const r = { x: p.x - (pw * p.scale) / 2, y: p.y - 12 - ph * p.scale, w: pw * p.scale, h: ph * p.scale };
      // Labels near the edge slide back on screen; the stem still points at the building
      const room = Math.max(0, r.w / 2 - 12);
      const dx = THREE.MathUtils.clamp(Math.max(0, 8 - r.x) - Math.max(0, r.x + r.w - (w - 8)), -room, room);
      r.x += dx;
      p.el.style.setProperty('--dx', `${dx.toFixed(1)}px`);
      const hit = (o: { x: number; y: number; w: number; h: number }) => r.x < o.x + o.w + 6 && r.x + r.w + 6 > o.x && r.y < o.y + o.h + 4 && r.y + r.h + 4 > o.y;
      const clash = p.rank >= 0 && (placed.some(hit) || chromeRects.some(hit));
      p.el.classList.toggle('is-dot', clash);
      if (!clash) placed.push(r);
    }

    const dE = controls.target.distanceTo(spots[0].focus) + camera.position.distanceTo(controls.target) * 0.4;
    sound.update(s.rain, s.night, 1 - THREE.MathUtils.smoothstep(dE, 8, 36));

    if (!reduced || dirty || flight) {
      if (statsEl) renderer.info.reset();
      post.render();
      dirty = false;
      if (statsEl) {
        stat.draws += renderer.info.render.calls;
        stat.tris += renderer.info.render.triangles;
      }
    }
    if (statsEl) {
      const now = performance.now();
      if (stat.last) stat.worst = Math.max(stat.worst, now - stat.last);
      stat.last = now;
      stat.frames++;
      if (now - stat.since >= 1000) {
        const n = Math.max(1, stat.frames);
        const lost = Object.entries(lowered).filter(([, v]) => v).map(([k]) => k);
        statsEl.textContent = [
          `${Math.round((stat.frames * 1000) / (now - stat.since))} fps · slowest ${Math.round(stat.worst)} ms`,
          `${Math.round(stat.draws / n)} draws · ${(stat.tris / n / 1e6).toFixed(2)}M tris`,
          `${tier} · px ${renderer.getPixelRatio().toFixed(2)}${lost.length ? ` · lowered: ${lost.join(', ')}` : ''}`,
        ].join('\n');
        Object.assign(stat, { frames: 0, draws: 0, tris: 0, worst: 0, since: now });
      }
    }

    frames++;
    if (t > 4) {
      windowFrames++;
      // "Slow" is relative to the rate we're aiming for (30fps on phones when idle)
      const budget = idleFps && !busy ? 1 / idleFps : 1 / 60;
      if (dt > budget * 1.7) windowSlow++;
      if (windowFrames === 90) {
        if (windowSlow > 45 && canDegrade()) {
          degrade();
          fastWindows = 0;
        } else if (windowSlow < 4) {
          // Fast again for a while (a busy moment has passed): win quality back
          if (++fastWindows >= 4) {
            restore();
            fastWindows = 0;
          }
        } else fastWindows = 0;
        windowFrames = windowSlow = 0;
      }
    }
  }

  // Too slow: fewer pixels, then no shadows, then no bloom. The ink outlines always stay.
  const fullPixels = renderer.getPixelRatio();
  const lowered = { pixels: false, shadows: false, bloom: false };
  let fastWindows = 0;
  // A stage put back and then lost again stays off (no see-sawing)
  const settled = new Set<keyof typeof lowered>();
  const canDegrade = () => !lowered.pixels || !lowered.shadows || !lowered.bloom;
  function degrade() {
    if (!lowered.pixels) {
      lowered.pixels = true;
      renderer.setPixelRatio(Math.max(1, fullPixels - 0.5));
      resize();
    } else if (!lowered.shadows) {
      lowered.shadows = true;
      renderer.shadowMap.enabled = false;
      scene.traverse((o) => {
        if ((o as THREE.DirectionalLight).isDirectionalLight) (o as THREE.DirectionalLight).castShadow = false;
      });
    } else lowered.bloom = true;
    post.bloom.enabled = !lowered.bloom;
  }
  // Fast again for a while: bloom, then pixels, come back. Shadows don't
  // (turning them back on recompiles every material, a visible hitch).
  function restore() {
    if (lowered.bloom && !settled.has('bloom')) {
      lowered.bloom = false;
      settled.add('bloom');
      post.bloom.enabled = true;
    } else if (lowered.pixels && !settled.has('pixels')) {
      lowered.pixels = false;
      settled.add('pixels');
      renderer.setPixelRatio(fullPixels);
      resize();
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      running = false;
      sound.suspend();
    } else if (root.dataset.view === '3d') {
      running = true;
      sound.resume();
      loop();
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
  loop();

  return {
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      close();
      if (sound.on) sound.toggle();
    },
    start() {
      if (running) return;
      running = true;
      loop();
    },
  };
}
