/*
 * The map creator (docs/cities-plan.md, Phase 2; the owner's tool, `?city=<id>&edit`): a top-down plan of a map
 * city (citymap.ts) to draw on, and the stage (citystage.ts) to look at the result in 3D. Its own chunk; the rules
 * of every tool are mapedit.ts (DOM-free, tested), this file is the screen: the plan's canvas, the tools' strip,
 * the bar, and the draft kept in this browser.
 *
 * On the plan a drag always moves the view and a click (or tap) always uses the tool, so it works the same with a
 * mouse and a finger; two fingers pinch. Nothing here animates: the plan is drawn when something changes.
 */
import { COVER, ROAD } from './palette';
import { STREET_KINDS, STREET_WIDTH, census, cleanMap, curveOf, halfOf, mapText, shoreOf, type CityMap, type Pt, type StreetKind } from './citymap';
import { MAPS_KEY, TOOLS, TOOL_NAMES, addHill, addStreet, addWater, commit, fileName, fitView, hit, moveSpawn, newEdit, panBy, readFile, readStore, redo, remove, snap, toMap, toScreen, undo, withDraft, zoomAt, type Edit, type Tool, type View } from './mapedit';
import { bootStage, type Stage } from './citystage';

/** A hill's sizes on the strip: its radius and height in tiles */
const HILL_SIZES = { Small: [24, 6], Medium: [50, 14], Large: [95, 30] } as const;
type HillSize = keyof typeof HILL_SIZES;
const STREET_NAMES: Record<StreetKind, string> = { avenue: 'Avenue', street: 'Street', lane: 'Lane', path: 'Path' };
/** How near, in pixels, a point being drawn is pulled onto a street, and how near the eraser picks one up */
const REACH_PX = 12;
/** How far a pointer may move, in pixels, and still be a click */
const CLICK_PX = 6;
/** What each tool's line says (draft copy) */
const TIPS: Record<Tool, string> = {
  move: 'Drag to move. Wheel or pinch to zoom.',
  street: 'Click to lay points. Finish when done.',
  water: 'Click round the shore. Finish to fill.',
  hill: 'Click to raise a hill.',
  spawn: 'Click where Degen arrives.',
  erase: 'Click a street, water or hill.',
};
const PLAN = { off: '#0c1512', water: '#2f7fb0', shore: '#9fd3ee', hill: '#8a7a4a', deck: '#ffc531', draft: '#ff5a36', spawn: '#7bd88f', text: '#f1efe6' } as const;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const btn = (text: string, cls = '') => {
  const b = el('button', `mk-btn is-small ${cls}`.trim(), text);
  b.type = 'button';
  return b;
};

/** Starts the map creator on a city's map (its draft from this browser if there is one). */
export function bootEditor(root: HTMLElement, base: CityMap, test = false): Pick<Stage, 'stop' | 'start'> | null {
  const read = () => {
    try {
      return readStore(localStorage.getItem(MAPS_KEY));
    } catch {
      return readStore(null);
    }
  };
  let ed: Edit = newEdit(read().maps[base.id] ?? base);
  let tool: Tool = 'move';
  let kind: StreetKind = 'street';
  let raised = false;
  let hillSize: HillSize = 'Medium';
  /** The points of the street or the shore being drawn */
  let draft: Pt[] = [];
  /** Where the pointer is on the map, snapped (the draft's next point), or null off the plan */
  let cursor: { at: Pt; snapped: boolean } | null = null;
  let stage: Stage | null = null;
  let note = '';

  /* ---------- The screen ---------- */
  const wrap = el('div', 'ed mk-skin');
  const plan = el('canvas', 'ed-plan');
  plan.tabIndex = 0;
  plan.setAttribute('aria-label', `${base.name}: the plan, seen from above`);
  const ctx = plan.getContext('2d')!;

  const bar = el('header', 'ed-bar');
  const id = el('div', 'stage-id');
  const count = el('p', 'stage-sub');
  id.append(el('h1', 'stage-name', `${base.name}${test ? ' · Test' : ''}`), count);
  const acts = el('div', 'ed-acts');
  const bView = btn('3D', 'is-main');
  const bUndo = btn('Undo');
  const bRedo = btn('Redo');
  const file = el('details', 'ed-pop');
  const fileSum = el('summary', 'mk-btn is-small', 'File');
  const fileMenu = el('div', 'ed-menu');
  const bExport = btn('Export');
  const bImport = btn('Import');
  const bClear = btn('Clear map');
  const leave = el('a', 'mk-btn is-small', 'Leave');
  leave.href = `${location.pathname}?city=${encodeURIComponent(base.id)}`;
  const pick = el('input');
  pick.type = 'file';
  pick.accept = '.json,application/json';
  pick.hidden = true;
  fileMenu.append(bExport, bImport, bClear, leave, pick);
  file.append(fileSum, fileMenu);
  acts.append(bView, bUndo, bRedo, file);
  bar.append(id, acts);

  const foot = el('div', 'ed-foot');
  const tip = el('p', 'ed-tip');
  tip.setAttribute('role', 'status');
  const opts = el('div', 'ed-opts');
  const strip = el('div', 'ed-tools');
  strip.setAttribute('role', 'toolbar');
  strip.setAttribute('aria-label', 'Tools');
  const toolBtns = new Map<Tool, HTMLButtonElement>();
  for (const t of TOOLS) {
    const b = btn(TOOL_NAMES[t]);
    b.addEventListener('click', () => setTool(t));
    toolBtns.set(t, b);
    strip.append(b);
  }
  foot.append(tip, opts, strip);
  wrap.append(plan, bar, foot);
  root.append(wrap);
  root.classList.remove('has-start');
  root.dataset.view = 'stage';

  /* ---------- The plan ---------- */
  let view: View = { x: 0, z: 0, scale: 1 };
  let W = 1;
  let H = 1;
  let asked = 0;
  const ask = () => {
    if (!asked && !stage) asked = requestAnimationFrame(draw);
  };
  const trace = (pts: readonly Pt[], close = false) => {
    ctx.beginPath();
    pts.forEach((p, i) => {
      const [x, y] = toScreen(view, W, H, p);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    if (close) ctx.closePath();
  };
  function draw() {
    asked = 0;
    const map = ed.map;
    const dpr = Math.min(devicePixelRatio, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PLAN.off;
    ctx.fillRect(0, 0, W, H);
    const [hx, hz] = halfOf(map.size);
    const [x0, y0] = toScreen(view, W, H, [-hx, -hz]);
    const [x1, y1] = toScreen(view, W, H, [hx, hz]);
    ctx.fillStyle = COVER.rough;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // The grid: 10-tile squares once they're wide enough to read, a bolder line every 50
    for (const [step, colour, min] of [[10, COVER.meadow, 9], [50, COVER.pad, 4]] as const) {
      if (step * view.scale < min) continue;
      ctx.strokeStyle = colour;
      ctx.lineWidth = step === 50 ? 1.5 : 0.75;
      ctx.beginPath();
      for (let x = Math.ceil(-hx / step) * step; x <= hx; x += step) {
        const sx = toScreen(view, W, H, [x, 0])[0];
        ctx.moveTo(sx, y0);
        ctx.lineTo(sx, y1);
      }
      for (let z = Math.ceil(-hz / step) * step; z <= hz; z += step) {
        const sy = toScreen(view, W, H, [0, z])[1];
        ctx.moveTo(x0, sy);
        ctx.lineTo(x1, sy);
      }
      ctx.stroke();
    }
    // Hills: a soft dome and its foot's ring
    for (const h of map.hills) {
      const [cx, cy] = toScreen(view, W, H, h.at);
      const r = h.radius * view.scale;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `${PLAN.hill}${Math.round(Math.min(0.9, 0.25 + h.height / 50) * 255).toString(16).padStart(2, '0')}`);
      g.addColorStop(1, `${PLAN.hill}00`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `${PLAN.hill}aa`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const w of map.water) {
      trace(shoreOf(w.poly), true);
      ctx.fillStyle = PLAN.water;
      ctx.fill();
      ctx.strokeStyle = PLAN.shore;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.lineJoin = ctx.lineCap = 'round';
    // Streets: the ground's first, the raised ones over them with a lit edge
    for (const level of [0, 1] as const)
      for (const s of map.streets) {
        if (s.level !== level) continue;
        const w = Math.max(1.5, STREET_WIDTH[s.kind] * view.scale);
        trace(curveOf(s.pts));
        if (level) {
          ctx.strokeStyle = PLAN.deck;
          ctx.lineWidth = w + 3;
          ctx.stroke();
        }
        ctx.strokeStyle = s.kind === 'path' ? COVER.cartPath : ROAD.asphalt;
        ctx.lineWidth = w;
        ctx.stroke();
      }
    // Places and where Degen arrives
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    for (const p of map.places) {
      const [cx, cy] = toScreen(view, W, H, p.at);
      const [pw, pd] = p.kind === 'airport' ? [40, 24] : [4, 4];
      ctx.fillStyle = COVER.concrete;
      ctx.fillRect(cx - (pw / 2) * view.scale, cy - (pd / 2) * view.scale, pw * view.scale, pd * view.scale);
      ctx.fillStyle = PLAN.text;
      ctx.fillText(p.name, cx, cy - (pd / 2) * view.scale - 5);
    }
    const [sx, sy] = toScreen(view, W, H, map.spawn.at);
    ctx.strokeStyle = PLAN.spawn;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.sin(map.spawn.yaw) * 14, sy + Math.cos(map.spawn.yaw) * 14);
    ctx.stroke();
    // What's being drawn, with the next point under the pointer
    if (draft.length || (cursor && (tool === 'street' || tool === 'water'))) {
      const pts = cursor ? [...draft, cursor.at] : draft;
      if (pts.length > 1) {
        trace(curveOf(pts, tool === 'water' && pts.length > 2), tool === 'water' && pts.length > 2);
        ctx.strokeStyle = PLAN.draft;
        ctx.lineWidth = tool === 'street' ? Math.max(2, STREET_WIDTH[kind] * view.scale) : 2;
        ctx.globalAlpha = 0.75;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = PLAN.draft;
      for (const p of draft) {
        const [px, py] = toScreen(view, W, H, p);
        ctx.fillRect(px - 3, py - 3, 6, 6);
      }
      if (cursor) {
        const [px, py] = toScreen(view, W, H, cursor.at);
        ctx.strokeStyle = cursor.snapped ? PLAN.deck : PLAN.text;
        ctx.lineWidth = 2;
        ctx.strokeRect(px - 5, py - 5, 10, 10);
      }
    }
    // North, and the scale: what 50 tiles measure
    ctx.fillStyle = PLAN.text;
    ctx.textAlign = 'left';
    const top = bar.offsetHeight + 16;
    ctx.fillText('N ↑', 12, top);
    const len = 50 * view.scale;
    if (len > 16 && len < W / 2) {
      ctx.fillRect(12, top + 8, len, 2);
      ctx.fillText('50 tiles', 12, top + 24);
    }
  }
  function resize() {
    const dpr = Math.min(devicePixelRatio, 2);
    const first = W === 1;
    W = wrap.clientWidth || 1;
    H = wrap.clientHeight || 1;
    plan.width = Math.round(W * dpr);
    plan.height = Math.round(H * dpr);
    if (first) {
      // The whole level, in the middle of what the bar and the tools leave free
      view = fitView(ed.map.size, W, H - bar.offsetHeight - foot.offsetHeight);
      view.z = (foot.offsetHeight - bar.offsetHeight) / (2 * view.scale);
    }
    ask();
  }

  /* ---------- Changes ---------- */
  function keep() {
    try {
      localStorage.setItem(MAPS_KEY, JSON.stringify(withDraft(read(), ed.map)));
    } catch {
      note = "This browser won't keep drafts. Export to save.";
    }
  }
  function change(next: CityMap | null, failed = '') {
    const was = ed;
    ed = commit(ed, next);
    if (ed === was) note = failed;
    else {
      note = '';
      keep();
    }
    paint();
  }
  function step(to: Edit) {
    if (to === ed) return;
    ed = to;
    draft = [];
    keep();
    paint();
  }
  /** The draft made into a street or water */
  function finish() {
    if (tool === 'street') change(addStreet(ed.map, kind, draft, raised ? 1 : 0), 'A street needs two points.');
    else if (tool === 'water') change(addWater(ed.map, 'lake', draft), 'Water needs three points.');
    draft = [];
    paint();
  }
  function setTool(t: Tool) {
    tool = t;
    draft = [];
    note = '';
    paint();
  }

  /** The strip, the options and the status line as they stand */
  function paint() {
    for (const [t, b] of toolBtns) b.setAttribute('aria-pressed', String(t === tool));
    bUndo.disabled = !ed.past.length;
    bRedo.disabled = !ed.future.length;
    bView.textContent = stage ? 'Plan' : '3D';
    const c = census(ed.map);
    tip.textContent = note || (stage ? 'Drag to move. Right-drag or two fingers to turn.' : TIPS[tool]);
    count.textContent = `${c.streets} streets · ${c.water} water · ${c.hills} hills`;
    opts.replaceChildren();
    foot.dataset.three = stage ? '1' : '0';
    if (!stage) {
      const choice = <T extends string>(all: readonly T[], on: T, name: (v: T) => string, set: (v: T) => void) => {
        for (const v of all) {
          const b = btn(name(v));
          b.setAttribute('aria-pressed', String(v === on));
          b.addEventListener('click', () => (set(v), paint()));
          opts.append(b);
        }
      };
      if (tool === 'street') {
        choice(STREET_KINDS, kind, (k) => STREET_NAMES[k], (k) => (kind = k));
        const up = btn('Raised');
        up.setAttribute('aria-pressed', String(raised));
        up.addEventListener('click', () => ((raised = !raised), paint()));
        opts.append(up);
      }
      if (tool === 'hill') choice(Object.keys(HILL_SIZES) as HillSize[], hillSize, (k) => k, (k) => (hillSize = k));
      if (draft.length) {
        const done = btn('Finish', 'is-main');
        done.addEventListener('click', finish);
        const drop = btn('Cancel');
        drop.addEventListener('click', () => ((draft = []), paint()));
        opts.append(done, drop);
      }
    }
    opts.hidden = !opts.children.length;
    ask();
  }

  /** A click on the plan at a screen point: the tool's work */
  function click(sx: number, sy: number) {
    const p = toMap(view, W, H, sx, sy);
    const reach = REACH_PX / view.scale;
    if (tool === 'street') draft = [...draft, snap(ed.map, p, reach).at];
    else if (tool === 'water') draft = [...draft, p];
    else if (tool === 'hill') return change(addHill(ed.map, p, HILL_SIZES[hillSize][0], HILL_SIZES[hillSize][1]), 'No room for a hill there.');
    else if (tool === 'spawn') return change(moveSpawn(ed.map, p), 'Off the level.');
    else if (tool === 'erase') {
      const h = hit(ed.map, p, reach);
      return change(h ? remove(ed.map, h) : null, 'Nothing there.');
    }
    note = '';
    paint();
  }

  /* ---------- The pointer: a drag moves the view, a click uses the tool, two fingers pinch ---------- */
  const down = new Map<number, { x: number; y: number; x0: number; y0: number; moved: boolean }>();
  const local = (e: PointerEvent | WheelEvent | MouseEvent): [number, number] => {
    const r = plan.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  plan.addEventListener('pointerdown', (e) => {
    plan.setPointerCapture(e.pointerId);
    const [x, y] = local(e);
    down.set(e.pointerId, { x, y, x0: x, y0: y, moved: down.size > 0 });
    if (down.size > 1) for (const d of down.values()) d.moved = true;
  });
  plan.addEventListener('pointermove', (e) => {
    const [x, y] = local(e);
    const d = down.get(e.pointerId);
    if (!d) {
      // (the next point follows the pointer, pulled onto a street where it's near one)
      const p = toMap(view, W, H, x, y);
      cursor = tool === 'street' ? snap(ed.map, p, REACH_PX / view.scale) : tool === 'water' ? { at: p, snapped: false } : null;
      if (cursor) ask();
      return;
    }
    if (down.size === 2) {
      const other = [...down.entries()].find(([k]) => k !== e.pointerId)![1];
      const before = Math.hypot(d.x - other.x, d.y - other.y) || 1;
      const after = Math.hypot(x - other.x, y - other.y) || 1;
      view = zoomAt(view, W, H, (x + other.x) / 2, (y + other.y) / 2, after / before);
      view = panBy(view, ed.map.size, (x - d.x) / 2, (y - d.y) / 2);
    } else if (d.moved || Math.hypot(x - d.x0, y - d.y0) > CLICK_PX) {
      d.moved = true;
      view = panBy(view, ed.map.size, x - d.x, y - d.y);
    }
    d.x = x;
    d.y = y;
    ask();
  });
  const up = (e: PointerEvent, act: boolean) => {
    const d = down.get(e.pointerId);
    down.delete(e.pointerId);
    if (d && act && !d.moved && e.button === 0) click(d.x, d.y);
  };
  plan.addEventListener('pointerup', (e) => up(e, true));
  plan.addEventListener('pointercancel', (e) => up(e, false));
  plan.addEventListener('pointerleave', () => {
    cursor = null;
    ask();
  });
  plan.addEventListener('dblclick', () => {
    // (the second click of the pair laid the same point again: cleanMap drops it)
    if (draft.length) finish();
  });
  plan.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const [x, y] = local(e);
      view = zoomAt(view, W, H, x, y, Math.exp(-e.deltaY * 0.0015));
      ask();
    },
    { passive: false },
  );
  plan.addEventListener('contextmenu', (e) => e.preventDefault());

  /* ---------- Keys ---------- */
  const onKey = (e: KeyboardEvent) => {
    if (stage || (e.target as HTMLElement).closest?.('input, summary, a')) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (mod && k === 'z') step(e.shiftKey ? redo(ed) : undo(ed));
    else if (mod && k === 'y') step(redo(ed));
    else if (mod) return;
    else if (k === 'enter' && draft.length) finish();
    else if (k === 'escape' && draft.length) (draft = []), paint();
    else if (k === 'backspace' && draft.length) (draft = draft.slice(0, -1)), paint();
    else if (/^[1-6]$/.test(k)) setTool(TOOLS[Number(k) - 1]);
    else if (k.startsWith('arrow')) {
      const s = 60;
      view = panBy(view, ed.map.size, k === 'arrowleft' ? s : k === 'arrowright' ? -s : 0, k === 'arrowup' ? s : k === 'arrowdown' ? -s : 0);
      ask();
    } else if (k === '+' || k === '=' || k === '-') {
      view = zoomAt(view, W, H, W / 2, H / 2, k === '-' ? 0.8 : 1.25);
      ask();
    } else return;
    e.preventDefault();
  };
  document.addEventListener('keydown', onKey);

  /* ---------- The bar ---------- */
  bUndo.addEventListener('click', () => step(undo(ed)));
  bRedo.addEventListener('click', () => step(redo(ed)));
  bView.addEventListener('click', () => {
    if (stage) {
      stage.dispose();
      stage = null;
      plan.hidden = false;
    } else {
      draft = [];
      stage = bootStage(root, ed.map, { bar: false });
      if (stage) plan.hidden = true;
      else note = "3D won't start here.";
    }
    paint();
  });
  bExport.addEventListener('click', () => {
    const a = el('a');
    a.href = URL.createObjectURL(new Blob([mapText(ed.map)], { type: 'application/json' }));
    a.download = fileName(ed.map);
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    file.open = false;
    note = `Saved ${a.download}`;
    paint();
  });
  bImport.addEventListener('click', () => pick.click());
  pick.addEventListener('change', async () => {
    const f = pick.files?.[0];
    pick.value = '';
    file.open = false;
    if (!f) return;
    const m = readFile(await f.text(), base);
    draft = [];
    change(m, m ? 'That file is the same map.' : "That file isn't a map.");
  });
  let sure = 0;
  bClear.addEventListener('click', () => {
    // (two clicks within a few seconds: the first asks)
    if (Date.now() - sure > 4000) {
      sure = Date.now();
      bClear.textContent = 'Sure?';
      setTimeout(() => (bClear.textContent = 'Clear map'), 4000);
      return;
    }
    sure = 0;
    bClear.textContent = 'Clear map';
    file.open = false;
    draft = [];
    change(cleanMap({ ...ed.map, hills: [], water: [], streets: [], zones: [] }), 'Already clear.');
  });
  document.addEventListener('pointerdown', (e) => {
    if (file.open && !file.contains(e.target as Node)) file.open = false;
  });

  const watch = new ResizeObserver(resize);
  watch.observe(wrap);
  resize();
  paint();
  plan.focus({ preventScroll: true });

  return {
    stop: () => stage?.stop(),
    start: () => (stage ? stage.start() : ask()),
  };
}
