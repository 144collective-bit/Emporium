/*
 * The stage (docs/cities-plan.md, Phase 1): a city that's a map file (citymap.ts) drawn in 3D, in the city's own
 * look (kit.ts's toon materials and batches, post.ts's ink outlines and bloom, palette.ts's colours). Its own chunk,
 * fetched only when the address asks for another city (`?city=`, cities.ts): it reads nothing of Sector 7's.
 *
 * Phase 1 draws the map as a plan in 3D (the ground with its tile grid, the edge wall, water, streets as ribbons,
 * zones as tinted land, places and the spawn as markers) with a camera to look round. It's drawn only when something
 * changes (no render loop of its own), so it stands still under reduced motion as it is.
 */
import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { Batch, liveTex, neon, setGroundLift, toon } from './kit';
import { createPost } from './post';
import { COVER, KERB, ROAD } from './palette';
import { DECK_Y, STREET_WIDTH, census, curveOf, groundAt, halfOf, isBlank, lengthOf, shoreOf, type CityMap, type MapPlace, type MapStreet, type Pt, type ZoneUse } from './citymap';

/** One square of the ground's grid, in tiles, and the bolder line every so many squares */
export const GRID = { cell: 10, bold: 5 } as const;
/** The wall round the level: how high and how thick */
const EDGE = { h: 7, t: 3 } as const;
/** How far the ground runs on past the wall, into the haze */
const APRON = 600;
/** The sky by day, and the haze the far ground fades into */
const SKY = '#8fc7e8';
const WATER = '#2f7fb0';
/** A zone's land by its use, from the ground palette */
const ZONE_COVER: Record<ZoneUse, string> = { homes: COVER.garden, shops: COVER.concrete, towers: COVER.paving, works: COVER.gravel, park: COVER.lawn, plaza: COVER.paving };
/** Heights over the ground, each layer clear of the next (nothing flush) */
const LIFT = { zone: 0.02, water: 0.03, street: 0.05, pad: 0.07, mark: 0.09 } as const;

export interface Stage {
  stop(): void;
  start(): void;
  /** The camera back where it started */
  home(): void;
  /** Takes the stage down (the map creator rebuilds it on a changed map) */
  dispose(): void;
  readonly map: CityMap;
  /** What the last frame cost (the review shots and `?fps` read it) */
  info(): { calls: number; triangles: number };
}

/** The ground's texture: one bold square of the grid (GRID.bold cells a side), repeating over the level */
function gridTex(renderer: THREE.WebGLRenderer) {
  const tex = liveTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = COVER.rough;
    ctx.fillRect(0, 0, w, h);
    const step = w / GRID.bold;
    ctx.strokeStyle = COVER.meadow;
    ctx.lineWidth = 1.5;
    for (let i = 1; i < GRID.bold; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, h);
      ctx.moveTo(0, i * step);
      ctx.lineTo(w, i * step);
      ctx.stroke();
    }
    ctx.strokeStyle = COVER.pad;
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, w, h);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  tex.needsUpdate = true;
  return tex;
}

/** A flat outline as geometry lying on the ground at height `y` (the map's z is the world's z) */
function polyGeo(poly: readonly Pt[], y: number) {
  const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

/** A street's centre line as a ribbon `width` wide at height `y`, mitred at its bends */
function ribbonGeo(pts: readonly Pt[], width: number, y: number) {
  const half = width / 2;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    // (the normal to the way the line runs through this point)
    const nx = -(b[1] - a[1]) / len;
    const nz = (b[0] - a[0]) / len;
    pos.push(pts[i][0] + nx * half, y, pts[i][1] + nz * half, pts[i][0] - nx * half, y, pts[i][1] - nz * half);
    if (i) idx.push(2 * i - 2, 2 * i, 2 * i - 1, 2 * i - 1, 2 * i, 2 * i + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** How far apart a raised street's piers stand, and how thick its deck is */
const DECK = { piers: 16, slab: 0.5, pier: 0.9 } as const;

/** A street: a ribbon on the ground, or raised on its deck (the slab, its dark underside's edge and piers under it) */
function addStreet(b: Batch, s: MapStreet) {
  const line = curveOf(s.pts);
  const w = STREET_WIDTH[s.kind];
  const top = toon(s.kind === 'path' ? COVER.cartPath : ROAD.asphalt);
  if (!s.level) {
    b.add(ribbonGeo(line, w, LIFT.street), top);
    return;
  }
  b.add(ribbonGeo(line, w, DECK_Y), top);
  // The deck's sides: a kerb-coloured band a little wider, just under the roadway (never flush with it)
  b.add(ribbonGeo(line, w + 0.5, DECK_Y - DECK.slab), toon(KERB.grit));
  const total = lengthOf(line);
  let next = DECK.piers / 2;
  let run = 0;
  for (let i = 1; i < line.length && next < total; i++) {
    const seg = Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
    while (next <= run + seg && next < total) {
      const t = seg ? (next - run) / seg : 0;
      stand(b, line[i - 1][0] + (line[i][0] - line[i - 1][0]) * t, 0, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t, DECK.pier, DECK_Y - DECK.slab, DECK.pier, toon(KERB.grit));
      next += DECK.piers;
    }
    run += seg;
  }
}

/** The ground: flat where the map is, a mesh following its hills where it has any */
function buildGround(map: CityMap, renderer: THREE.WebGLRenderer) {
  const [w, d] = map.size;
  const seg = (n: number) => (map.hills.length ? Math.min(220, Math.ceil(n / 4)) : 1);
  const g = new THREE.PlaneGeometry(w, d, seg(w), seg(d));
  g.rotateX(-Math.PI / 2);
  if (map.hills.length) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, groundAt(map, p.getX(i), p.getZ(i)));
    g.computeVertexNormals();
  }
  const tex = gridTex(renderer);
  const span = GRID.cell * GRID.bold;
  tex.repeat.set(w / span, d / span);
  const mesh = new THREE.Mesh(g, toon('#ffffff', { map: tex }));
  mesh.matrixAutoUpdate = false;
  return mesh;
}

/** A box standing on height `y`, centred on x, z (the kit's own takes its min corner) */
const stand = (b: Batch, x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material) => b.box(x - w / 2, y, z - d / 2, w, h, d, mat);

/** A place's marker: the arrivals airport's pad with its beacon, or a landmark's post */
function addPlace(b: Batch, lights: Batch, p: MapPlace) {
  const [x, z] = p.at;
  if (p.kind === 'airport') {
    stand(b, x, 0, z, 40, LIFT.pad, 24, toon(COVER.concrete));
    // (the apron's centre line, pointing the way the place fronts)
    const g = new THREE.BoxGeometry(0.5, 0.02, 18);
    g.rotateY(p.yaw);
    g.translate(x, LIFT.mark, z);
    b.add(g, toon(ROAD.yellow));
    stand(b, x - 17, 0, z, 0.6, 6, 0.6, toon(KERB.grit));
    stand(lights, x - 17, 6, z, 1.2, 0.8, 1.2, neon('#ff5a36'));
  } else {
    stand(b, x, 0, z, 0.5, 4, 0.5, toon(KERB.grit));
    stand(lights, x, 4, z, 1, 0.6, 1, neon('#ffc531'));
  }
}

/** The stage's bar and its hint (stage.css, the arcade kit): the city's name, what it holds, the way back */
function buildBar(root: HTMLElement, map: CityMap, test: boolean, home: () => void) {
  const edit = location.search.replace(/[?&]edit\b[^&]*/, '');
  const bar = document.createElement('header');
  bar.className = 'stage-bar mk-skin';
  bar.dataset.stageBar = '';
  const c = census(map);
  const title = document.createElement('div');
  title.className = 'stage-id';
  const name = document.createElement('h1');
  name.className = 'stage-name';
  name.textContent = map.name;
  const sub = document.createElement('p');
  sub.className = 'stage-sub';
  sub.textContent = `${test ? 'Test level · ' : ''}${map.size[0]} x ${map.size[1]} tiles${isBlank(map) ? ' · Nothing built' : ` · ${c.streets} streets · ${c.zones} zones`}`;
  title.append(name, sub);
  const acts = document.createElement('div');
  acts.className = 'stage-acts';
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'mk-btn is-small';
  reset.textContent = 'Reset view';
  reset.addEventListener('click', home);
  const back = document.createElement('a');
  back.className = 'mk-btn is-small';
  back.href = location.pathname;
  back.textContent = 'Sector 7';
  // (the map creator, docs/cities-plan.md Phase 2: the same address with `edit`)
  const draw = document.createElement('a');
  draw.className = 'mk-btn is-small is-main';
  draw.href = `${location.pathname}${edit}${edit ? '&' : '?'}edit`;
  draw.textContent = 'Edit map';
  acts.append(draw, reset, back);
  bar.append(title, acts);

  const hint = document.createElement('div');
  hint.className = 'stage-hint mk-skin';
  hint.setAttribute('role', 'note');
  const text = document.createElement('p');
  // Draft copy
  text.textContent = matchMedia('(pointer: coarse)').matches ? 'Drag to move. Two fingers to turn and zoom.' : 'Drag to move. Right-drag to turn. Wheel to zoom.';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'stage-hint-x';
  close.setAttribute('aria-label', 'Close');
  close.textContent = '×';
  close.addEventListener('click', () => hint.remove());
  hint.append(text, close);
  root.append(bar, hint);
  return () => {
    bar.remove();
    hint.remove();
  };
}

/**
 * Starts the stage on a map: null where there's no 3D to be had (the page then says so). `test` marks a test level
 * on its bar; `bar: false` leaves the bar and hint out (the map creator has its own, mapeditor.ts).
 */
export function bootStage(root: HTMLElement, map: CityMap, opts: { test?: boolean; bar?: boolean } = {}): Stage | null {
  const host = root.querySelector<HTMLElement>('[data-city3d]')!;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', alpha: false });
  } catch {
    return null;
  }
  // Phones (a touch screen no wider than a small tablet): fewer pixels, thin ink, FXAA, a smaller bloom
  const low = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
  const dpr = Math.min(devicePixelRatio, low ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', `${map.name}, seen from above`);
  host.append(canvas);

  const [hx, hz] = halfOf(map.size);
  const reach = Math.hypot(hx, hz);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, reach * 1.2, reach * 2 + APRON);
  scene.add(new THREE.HemisphereLight('#dff1ff', '#3a4a40', 1.5));
  const sun = new THREE.DirectionalLight('#fff3da', 1.3);
  sun.position.set(-0.5, 1, 0.35);
  scene.add(sun);

  // What stands on the ground follows its hills (kit.ts lifts each batch as it's built)
  if (map.hills.length) setGroundLift((x, z) => groundAt(map, x, z), [-hx, -hz, hx, hz]);
  scene.add(buildGround(map, renderer));
  // The land past the wall, into the haze
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(map.size[0] + APRON * 2, map.size[1] + APRON * 2).rotateX(-Math.PI / 2).translate(0, -0.05, 0), toon(COVER.rough));
  apron.matrixAutoUpdate = false;
  scene.add(apron);

  const land = new Batch();
  const lights = new Batch();
  // The wall: four runs, their corners lapped
  const wall = toon(KERB.grit);
  stand(land, 0, 0, -hz - EDGE.t / 2, map.size[0] + EDGE.t * 2, EDGE.h, EDGE.t, wall);
  stand(land, 0, 0, hz + EDGE.t / 2, map.size[0] + EDGE.t * 2, EDGE.h, EDGE.t, wall);
  stand(land, -hx - EDGE.t / 2, 0, 0, EDGE.t, EDGE.h, map.size[1], wall);
  stand(land, hx + EDGE.t / 2, 0, 0, EDGE.t, EDGE.h, map.size[1], wall);
  for (const z of map.zones) land.add(polyGeo(z.poly, LIFT.zone), toon(ZONE_COVER[z.use]));
  for (const w of map.water) land.add(polyGeo(shoreOf(w.poly), LIFT.water), toon(WATER));
  for (const s of map.streets) addStreet(land, s);
  for (const p of map.places) addPlace(land, lights, p);
  // Where Degen arrives: a lit ring, and a bar pointing the way he faces
  const [sx, sz] = map.spawn.at;
  lights.add(new THREE.RingGeometry(1.4, 1.9, 24).rotateX(-Math.PI / 2).translate(sx, LIFT.mark, sz), neon('#7bd88f'));
  lights.add(new THREE.BoxGeometry(0.4, 0.02, 2.4).translate(0, 0, 1.2).rotateY(map.spawn.yaw).translate(sx, LIFT.mark, sz), neon('#7bd88f'));
  land.build(scene, { cast: false });
  lights.build(scene, { cast: false });

  const camera = new THREE.PerspectiveCamera(45, 1, 1, reach * 2 + APRON * 2);
  const post = createPost(renderer, scene, camera, { msaa: low ? 0 : 4, bloomScale: 0.5, smaa: false, bloomMips: low ? 3 : 5, thinInk: low, fxaa: low });

  const controls = new MapControls(camera, canvas);
  controls.enableDamping = false;
  controls.minDistance = 12;
  controls.maxDistance = reach * 2.4;
  controls.maxPolarAngle = Math.PI / 2 - 0.12;
  controls.zoomToCursor = true;
  controls.listenToKeyEvents(canvas);
  controls.keyPanSpeed = 24;
  function home() {
    // Over the spawn's shoulder, looking the way Degen faces, the level laid out beyond
    const back = Math.min(90, reach * 0.3);
    controls.target.set(sx, 0, sz);
    camera.position.set(sx - Math.sin(map.spawn.yaw) * back, back * 0.42, sz - Math.cos(map.spawn.yaw) * back);
    controls.update();
    ask();
  }

  let running = true;
  let asked = 0;
  /** Draws a frame at the next chance (once, however often it's asked) */
  function ask() {
    if (!running || asked) return;
    asked = requestAnimationFrame(() => {
      asked = 0;
      post.render();
    });
  }
  controls.addEventListener('change', () => {
    // (the camera's target stays on the level)
    controls.target.x = Math.min(hx, Math.max(-hx, controls.target.x));
    controls.target.z = Math.min(hz, Math.max(-hz, controls.target.z));
    ask();
  });

  function resize() {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    post.setSize(w, h, dpr);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    ask();
  }
  const watch = new ResizeObserver(resize);
  watch.observe(host);

  const unbar = opts.bar === false ? () => {} : buildBar(root, map, !!opts.test, home);
  root.classList.remove('has-start');
  root.dataset.view = 'stage';
  resize();
  home();
  // (the lit signs' fonts and the bloom's chunks come in after the first frame: one more once they have)
  setTimeout(ask, 400);

  let disposed = false;
  canvas.addEventListener('webglcontextlost', (e) => {
    // (its own taking down gives the context back on purpose)
    if (disposed) return;
    e.preventDefault();
    running = false;
    root.dataset.view = 'none';
    root.querySelector<HTMLElement>('[data-no3d]')!.hidden = false;
    const reload = root.querySelector<HTMLElement>('[data-no3d-reload]');
    if (reload) reload.hidden = false;
  });

  return {
    map,
    home,
    stop() {
      running = false;
      if (asked) cancelAnimationFrame(asked);
      asked = 0;
    },
    start() {
      running = true;
      ask();
    },
    info: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }),
    dispose() {
      this.stop();
      watch.disconnect();
      controls.dispose();
      unbar();
      disposed = true;
      scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      renderer.dispose();
      // (the browser keeps only so many 3D contexts: the map creator makes a stage each time 3D is opened)
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
