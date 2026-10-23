/*
 * The world map (docs/growth-plan.md Phase 8): a full-screen map of the whole
 * city from the ☰ Menu (and M, or the Map tab, while walking), drawn from the
 * street plan's data on a canvas: the roads, the highway, the river and its
 * bridges, the blocks and squares, the airport, the kart park's circuit, the
 * metro line and its stations, every place (places.ts), you, your car and
 * your aircraft, and your waypoint. Drag (or two fingers) to pan, scroll or
 * pinch to zoom. Tapping a place opens a card: open its panel (City view),
 * set a waypoint, take a taxi there, or fast travel (places you've walked
 * to); tapping your car: bring it to you; tapping open ground: drop a
 * waypoint there. It isn't the 2D poster (src/lib/city.ts), which stays
 * downtown's. × or Esc closes it.
 */
import { EXT, RIVER } from './layout';
import { PLAN, type Pt } from './streetplan';
import { PLACES, type Place } from './places';
import { PATHS, WESTLAKE_BLOCKS, lakeLine } from './westlake';
import { TRACKS } from './metro';
import { RUNWAY, SITE } from './airfield';
import { CIRCUIT } from './kartcircuit';
import { KART_PARK } from './kartpark';
import { BX, WALKWAY } from './liberty';
import { HIGHWAY_BOX } from './highway';

export interface WorldMapDeps {
  /** Where you are and which way you face (walking), else where the camera looks */
  you(): { x: number; z: number; yaw: number; walking: boolean };
  car(): { x: number; z: number } | null;
  plane(): { x: number; z: number } | null;
  waypoint(): { x: number; z: number } | null;
  setWaypoint(at: { x: number; z: number } | null, name?: string): void;
  visited(): readonly string[];
  /** Walking on foot (free to take a taxi or travel), walking but busy (driving...), or not walking */
  state(): 'foot' | 'busy' | 'city';
  openSpot(id: string): void;
  /** From the City view: start walking there (places you've been) */
  walkHere(p: Place): void;
  travel(p: Place): void;
  taxi(p: Place): void;
  bringCar(): boolean;
  toast(text: string): void;
}

type Pick = { kind: 'place'; place: Place } | { kind: 'car' } | { kind: 'plane' } | { kind: 'you' } | { kind: 'ground'; x: number; z: number };

/** The map's colours: dark land, neon roads, PulseChain cyan for you and magenta for the metro */
const C = {
  land: '#12222c',
  edge: '#0a0a14',
  river: '#1d4f7c',
  slab: '#262249',
  park: '#1d4e3a',
  path: '#3f6f5a',
  road: '#3a3866',
  highway: '#4d4a86',
  airport: '#202c40',
  runway: '#57537f',
  circuit: '#ff5aa5',
  metro: '#e219e5',
  place: '#00eaff',
  placeDim: '#4f8fa0',
  you: '#00eaff',
  car: '#ffc23d',
  plane: '#a8b2ff',
  waypoint: '#f10e7d',
  label: '#f3f2f7',
};

/** A place's name and a line under it: the copy on its pin (CityMap.astro's directory), or its own */
export function placeName(root: HTMLElement, p: Place) {
  if (p.name) return { name: p.name, sub: p.kind === 'metro' ? 'Metro' : '' };
  const a = root.querySelector(`[data-dir-spot="${p.spot}"]`);
  return { name: a?.querySelector('span')?.textContent?.trim() ?? p.id, sub: a?.querySelector('small')?.textContent?.trim() ?? '' };
}

export function createWorldMap(root: HTMLElement, d: WorldMapDeps) {
  const el = root.querySelector<HTMLElement>('[data-worldmap]')!;
  const canvas = el.querySelector<HTMLCanvasElement>('[data-wm-canvas]')!;
  const card = el.querySelector<HTMLElement>('[data-wm-card]')!;
  const ctx = canvas.getContext('2d')!;
  const nameOf = (p: Place) => placeName(root, p);

  /** The view: the world point at the middle and how many pixels a tile is */
  const view = { x: 30, z: 40, s: 1 };
  let w = 0;
  let h = 0;
  let dpr = 1;
  let open = false;
  let pick: Pick | null = null;
  let raf = 0;
  let refresh = 0;
  let lastFocus: HTMLElement | null = null;

  const toScreen = (x: number, z: number): Pt => [(x - view.x) * view.s + w / 2, (z - view.z) * view.s + h / 2];
  const toWorld = (sx: number, sy: number): Pt => [(sx - w / 2) / view.s + view.x, (sy - h / 2) / view.s + view.z];
  /** Fit the city (the highway and all inside it) on screen */
  const fit = () => {
    const [x0, z0, x1, z1] = HIGHWAY_BOX;
    view.s = Math.min(w / (x1 - x0 + 40), h / (z1 - z0 + 40));
    view.x = (x0 + x1) / 2;
    view.z = (z0 + z1) / 2;
  };
  const clampView = () => {
    view.s = Math.min(24, Math.max(Math.min(w, h) / (EXT[1] - EXT[0]), view.s));
    view.x = Math.min(EXT[1], Math.max(EXT[0], view.x));
    view.z = Math.min(EXT[1], Math.max(EXT[0], view.z));
  };

  /* ---------- Drawing ---------- */
  const poly = (pts: Pt[]) => {
    ctx.beginPath();
    pts.forEach((p, i) => {
      const [x, y] = toScreen(p[0], p[1]);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
  };
  function draw() {
    raf = 0;
    if (!open) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = C.edge;
    ctx.fillRect(0, 0, w, h);
    // The land, edge to edge, and the river across it
    const [ax, ay] = toScreen(EXT[0], EXT[0]);
    const [bx, by] = toScreen(EXT[1], EXT[1]);
    ctx.fillStyle = C.land;
    ctx.fillRect(ax, ay, bx - ax, by - ay);
    const [, r0] = toScreen(0, RIVER[0]);
    const [, r1] = toScreen(0, RIVER[1]);
    ctx.fillStyle = C.river;
    ctx.fillRect(ax, r0, bx - ax, r1 - r0);
    // The airport and the kart park's grounds
    const rect = (r: number[], fill: string) => {
      const [x0, y0] = toScreen(r[0], r[1]);
      const [x1, y1] = toScreen(r[2], r[3]);
      ctx.fillStyle = fill;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    };
    rect(SITE, C.airport);
    rect([RUNWAY.x0, RUNWAY.z - RUNWAY.half, RUNWAY.x1, RUNWAY.z + RUNWAY.half], C.runway);
    rect([KART_PARK.x0, KART_PARK.z0, KART_PARK.x1, KART_PARK.z1], C.airport);
    // The blocks (their slabs) and the squares and parks
    ctx.fillStyle = C.slab;
    for (const s of PLAN.slabs) {
      poly(s);
      ctx.fill();
    }
    ctx.fillStyle = C.park;
    for (const p of PLAN.plazas) {
      poly(p.poly);
      ctx.fill();
    }
    // Westlake Park (westlake.ts): its lawns, the lake and its paths
    for (const b of WESTLAKE_BLOCKS) {
      poly(b.poly);
      ctx.fill();
    }
    ctx.fillStyle = C.river;
    poly(lakeLine(0, 72));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C.path;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const q of PATHS) {
      ctx.lineWidth = Math.max(1, q.half * 2 * view.s);
      poly(q.pts);
      if (q.loop) ctx.closePath();
      ctx.stroke();
    }
    // The roads, the highway widest, their real width (at least a hairline)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of PLAN.streets) {
      if (s.kind === 'alley') continue;
      ctx.strokeStyle = s.kind === 'highway' ? C.highway : C.road;
      ctx.lineWidth = Math.max(s.kind === 'highway' ? 2.5 : 1, s.half * 2 * view.s);
      poly(s.pts);
      ctx.stroke();
    }
    // Liberty Bridge, the kart park's circuit
    ctx.strokeStyle = '#d6b88a';
    ctx.lineWidth = Math.max(1, 1.6 * view.s);
    poly([
      [BX, WALKWAY[0]],
      [BX, WALKWAY[1]],
    ]);
    ctx.stroke();
    ctx.strokeStyle = C.circuit;
    ctx.lineWidth = Math.max(1, 2 * view.s);
    poly(Array.from({ length: Math.ceil(CIRCUIT.x.length / 4) }, (_, i): Pt => [CIRCUIT.x[i * 4], CIRCUIT.z[i * 4]]));
    ctx.closePath();
    ctx.stroke();
    // The metro line and its stations
    ctx.strokeStyle = C.metro;
    ctx.lineWidth = Math.max(2, 1.2 * view.s);
    for (const t of Object.values(TRACKS)) {
      poly(t.pts);
      ctx.stroke();
    }
    // The places: a dot each (bright where you can fast travel), with its name
    const visited = d.visited();
    const foot = d.state() === 'foot';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    const labels: { x: number; y: number; w: number }[] = [];
    for (const p of PLACES) {
      const [x, y] = toScreen(p.at.x, p.at.z);
      if (x < -20 || y < -20 || x > w + 20 || y > h + 20) continue;
      const lit = !foot || visited.includes(p.id);
      const metro = p.kind === 'metro';
      ctx.beginPath();
      ctx.arc(x, y, metro ? 5 : 6, 0, Math.PI * 2);
      ctx.fillStyle = metro ? C.metro : lit ? C.place : C.placeDim;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = C.edge;
      ctx.stroke();
      if (pick?.kind === 'place' && pick.place === p) {
        ctx.beginPath();
        ctx.arc(x, y, 11, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.stroke();
      }
      // Names where they fit (the selected one always)
      const name = nameOf(p).name;
      const tw = ctx.measureText(name).width;
      const lx = x + 10;
      if (!(pick?.kind === 'place' && pick.place === p) && labels.some((o) => Math.abs(o.y - y) < 14 && lx < o.x + o.w + 8 && lx + tw + 8 > o.x)) continue;
      labels.push({ x: lx, y, w: tw });
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#05050acc';
      ctx.strokeText(name, lx, y);
      ctx.fillStyle = C.label;
      ctx.fillText(name, lx, y);
    }
    // Your aircraft, your car, the waypoint, then you on top
    const plane = d.plane();
    if (plane) glyph(plane.x, plane.z, C.plane, 'plane');
    const car = d.car();
    if (car) glyph(car.x, car.z, C.car, 'car');
    const wp = d.waypoint();
    if (wp) {
      const [x, y] = toScreen(wp.x, wp.z);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = C.waypoint;
      ctx.fillRect(-6, -6, 12, 12);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-6, -6, 12, 12);
      ctx.restore();
    }
    const you = d.you();
    {
      const [x, y] = toScreen(you.x, you.z);
      ctx.save();
      ctx.translate(x, y);
      // Facing (-sin yaw, -cos yaw) on the ground, so on screen too
      ctx.rotate(Math.atan2(-Math.cos(you.yaw), -Math.sin(you.yaw)) + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(7, 7);
      ctx.lineTo(0, 3);
      ctx.lineTo(-7, 7);
      ctx.closePath();
      ctx.fillStyle = C.you;
      ctx.fill();
      ctx.strokeStyle = C.edge;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    if (pick?.kind === 'ground') {
      const [x, y] = toScreen(pick.x, pick.z);
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.strokeStyle = C.waypoint;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Keep you and your car moving on the map while it's open, a few times a second
    clearTimeout(refresh);
    refresh = window.setTimeout(redraw, 120);
  }
  function glyph(x: number, z: number, color: string, kind: 'car' | 'plane') {
    const [sx, sy] = toScreen(x, z);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = color;
    ctx.strokeStyle = C.edge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (kind === 'car') ctx.roundRect(-7, -4.5, 14, 9, 3);
    else {
      ctx.moveTo(0, -9);
      ctx.lineTo(2, -2);
      ctx.lineTo(9, 1);
      ctx.lineTo(2, 2);
      ctx.lineTo(1.5, 6);
      ctx.lineTo(4, 8);
      ctx.lineTo(-4, 8);
      ctx.lineTo(-1.5, 6);
      ctx.lineTo(-2, 2);
      ctx.lineTo(-9, 1);
      ctx.lineTo(-2, -2);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  const redraw = () => {
    if (open && !raf) raf = requestAnimationFrame(draw);
  };

  /* ---------- The card for what's picked ---------- */
  function showCard() {
    if (!pick) {
      card.hidden = true;
      return;
    }
    const st = d.state();
    const btn = (act: string, label: string, disabled = false, note = '') =>
      `<button type="button" class="wm-act" data-wm-act="${act}"${disabled ? ' disabled' : ''}>${label}</button>${note ? `<span class="wm-note">${note}</span>` : ''}`;
    let title = '';
    let sub = '';
    let acts = '';
    if (pick.kind === 'place') {
      const p = pick.place;
      ({ name: title, sub } = nameOf(p));
      const been = d.visited().includes(p.id);
      if (st === 'city') {
        if (p.spot) acts += btn('open', 'Open');
        acts += btn('walkhere', 'Walk here', !been, been ? '' : 'Walk there once to start walking from it');
        acts += btn('waypoint', 'Set waypoint');
      } else {
        acts += btn('waypoint', 'Set waypoint');
        acts += btn('taxi', 'Taxi here', st !== 'foot');
        acts += btn('travel', 'Fast travel', st !== 'foot' || !been, st === 'foot' && !been ? 'Walk there once to fast travel' : st === 'busy' ? 'Get out first' : '');
      }
    } else if (pick.kind === 'car') {
      title = 'Your car';
      acts += btn('waypoint', 'Set waypoint');
      if (st !== 'city') acts += btn('bring', 'Bring my car', st !== 'foot');
    } else if (pick.kind === 'plane') {
      title = 'Your aircraft';
      acts += btn('waypoint', 'Set waypoint');
    } else if (pick.kind === 'you') {
      title = 'You';
      sub = st === 'city' ? 'Where the view looks' : 'Where you stand';
      if (st !== 'city') acts += btn('bring', 'Bring my car', st !== 'foot', st === 'busy' ? 'Get out first' : '');
    } else {
      title = 'Here';
      sub = 'Open ground';
      acts += btn('waypoint', 'Drop a waypoint');
    }
    if (d.waypoint()) acts += btn('clear', 'Clear waypoint');
    card.innerHTML = `<div class="wm-card-head"><p class="wm-card-title">${title}</p>${sub ? `<p class="wm-card-sub">${sub}</p>` : ''}</div><div class="wm-acts">${acts}</div>`;
    card.hidden = false;
  }
  card.addEventListener('click', (e) => {
    const act = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-wm-act]')?.dataset.wmAct;
    if (!act || !pick) return;
    const at = pick.kind === 'place' ? { x: pick.place.at.x, z: pick.place.at.z } : pick.kind === 'car' ? d.car() : pick.kind === 'plane' ? d.plane() : pick.kind === 'you' ? null : { x: pick.x, z: pick.z };
    const name = pick.kind === 'place' ? nameOf(pick.place).name : pick.kind === 'car' ? 'Your car' : pick.kind === 'plane' ? 'Your aircraft' : 'Waypoint';
    if (act === 'waypoint' && at) {
      d.setWaypoint({ x: at.x, z: at.z }, name);
      showCard();
    } else if (act === 'clear') {
      d.setWaypoint(null);
      showCard();
    } else if (act === 'open' && pick.kind === 'place' && pick.place.spot) {
      close();
      d.openSpot(pick.place.spot);
    } else if (act === 'walkhere' && pick.kind === 'place') {
      const p = pick.place;
      close();
      d.walkHere(p);
    } else if (act === 'taxi' && pick.kind === 'place') {
      const p = pick.place;
      close();
      d.taxi(p);
    } else if (act === 'travel' && pick.kind === 'place') {
      const p = pick.place;
      close();
      d.travel(p);
    } else if (act === 'bring') {
      if (d.bringCar()) {
        d.toast('Your car is on its way: it’s on the road near you');
        close();
      } else d.toast('No road near enough here: try nearer a street');
    }
    redraw();
  });

  /* ---------- Pan, zoom, tap ---------- */
  const pointers = new Map<number, { x: number; y: number }>();
  let moved = 0;
  let pinch = 0;
  const zoomAt = (sx: number, sy: number, k: number) => {
    const [wx, wz] = toWorld(sx, sy);
    view.s *= k;
    clampView();
    // Keep the point under the finger where it was
    view.x = wx - (sx - w / 2) / view.s;
    view.z = wz - (sy - h / 2) / view.s;
    clampView();
    redraw();
  };
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    moved = 0;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.offsetX - p.x;
    const dy = e.offsetY - p.y;
    moved += Math.abs(dx) + Math.abs(dy);
    p.x = e.offsetX;
    p.y = e.offsetY;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, dist / pinch);
      pinch = dist;
      return;
    }
    view.x -= dx / view.s;
    view.z -= dy / view.s;
    clampView();
    redraw();
  });
  const up = (e: PointerEvent) => {
    if (!pointers.delete(e.pointerId)) return;
    if (pointers.size) return;
    pinch = 0;
    if (moved > 6) return;
    tap(e.offsetX, e.offsetY);
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', (e) => pointers.delete(e.pointerId));
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      zoomAt(e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.0015));
    },
    { passive: false }
  );
  el.querySelectorAll<HTMLButtonElement>('[data-wm-zoom]').forEach((b) =>
    b.addEventListener('click', () => {
      const k = +b.dataset.wmZoom!;
      if (k === 0) {
        fit();
        redraw();
      } else zoomAt(w / 2, h / 2, k > 0 ? 1.6 : 1 / 1.6);
    })
  );
  el.querySelector('[data-wm-you]')?.addEventListener('click', () => {
    const you = d.you();
    view.x = you.x;
    view.z = you.z;
    view.s = Math.max(view.s, 3);
    clampView();
    redraw();
  });
  function tap(sx: number, sy: number) {
    const near = (x: number, z: number, r: number) => {
      const [px, py] = toScreen(x, z);
      return Math.hypot(px - sx, py - sy) < r;
    };
    const car = d.car();
    const plane = d.plane();
    const place = PLACES.map((p) => ({ p, dd: Math.hypot(...((([px, py]) => [px - sx, py - sy])(toScreen(p.at.x, p.at.z)) as [number, number])) }))
      .filter((o) => o.dd < 18)
      .sort((a, b) => a.dd - b.dd)[0]?.p;
    const you = d.you();
    if (car && near(car.x, car.z, 14)) pick = { kind: 'car' };
    else if (you.walking && near(you.x, you.z, 10)) pick = { kind: 'you' };
    else if (place) pick = { kind: 'place', place };
    else if (plane && near(plane.x, plane.z, 14)) pick = { kind: 'plane' };
    else {
      const [x, z] = toWorld(sx, sy);
      pick = x > EXT[0] && x < EXT[1] && z > EXT[0] && z < EXT[1] ? { kind: 'ground', x, z } : null;
    }
    showCard();
    redraw();
  }

  // Find a place (the keyboard's way in too): centre on it and open its card
  const find = el.querySelector<HTMLSelectElement>('[data-wm-find]');
  if (find) {
    for (const p of PLACES) find.add(new Option(nameOf(p).name, p.id));
    find.addEventListener('change', () => {
      const p = PLACES.find((o) => o.id === find.value);
      find.value = '';
      if (!p) return;
      view.x = p.at.x;
      view.z = p.at.z;
      view.s = Math.max(view.s, 3);
      clampView();
      pick = { kind: 'place', place: p };
      showCard();
      redraw();
      card.querySelector<HTMLButtonElement>('.wm-act:not(:disabled)')?.focus({ preventScroll: true });
    });
  }

  /* ---------- Open and close ---------- */
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = r.width;
    h = r.height;
    el.style.setProperty('--wm-head', `${el.querySelector<HTMLElement>('.wm-head')?.offsetHeight ?? 60}px`);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    clampView();
    redraw();
  };
  window.addEventListener('resize', () => open && resize());
  function show() {
    if (open) return;
    open = true;
    lastFocus = document.activeElement as HTMLElement;
    el.hidden = false;
    root.classList.add('has-worldmap');
    pick = null;
    card.hidden = true;
    resize();
    // Round you, near enough to read the streets (or the whole city from City view)
    if (d.state() === 'city') fit();
    else {
      const you = d.you();
      fit();
      view.x = you.x;
      view.z = you.z;
      view.s *= 2.2;
    }
    clampView();
    redraw();
    el.querySelector<HTMLButtonElement>('[data-wm-close]')?.focus({ preventScroll: true });
  }
  function close() {
    if (!open) return false;
    open = false;
    el.hidden = true;
    root.classList.remove('has-worldmap');
    cancelAnimationFrame(raf);
    clearTimeout(refresh);
    raf = 0;
    lastFocus?.focus({ preventScroll: true });
    return true;
  }
  el.querySelector('[data-wm-close]')?.addEventListener('click', () => close());
  return {
    get isOpen() {
      return open;
    },
    show,
    close,
    toggle() {
      if (open) close();
      else show();
    },
  };
}
export type WorldMap = ReturnType<typeof createWorldMap>;
