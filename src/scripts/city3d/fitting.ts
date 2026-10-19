/*
 * The fitting room in Drop 001's panel: pick what your Degen wears (fit,
 * headwear, bag, extras, kicks) and see it on him, turning on a podium.
 * Everything is free and only for your Degen in the city: nothing is sold
 * here and nothing is tied to the real store.
 *
 * The look itself lives in profile-ui.ts (saved in the browser, and on the
 * player profile when online); this is the menu and the preview.
 *
 * The preview is a small second renderer with the city's own ink outlines,
 * drawing only while the panel is open. Under reduced motion he stands
 * still (drag still turns him).
 */
import * as THREE from 'three';
import { DEFAULT_LOOK, PALETTE, type Look } from '../net/profile-data';
import { createDegen, emotePose, idlePose, lookOutfit, type Degen } from './character';
import { canvasTex, lit, toon } from './kit';
import { createPost } from './post';

type ColorKey = 'top' | 'bottom' | 'tie' | 'cap' | 'beanie' | 'shoes' | 'headphones' | 'backpack' | 'crossbody';
interface Colors {
  key: ColorKey;
  label: string;
  list: string[];
}
interface Item {
  id: string;
  name: string;
  /** 24 x 24 line icon */
  icon: string;
  /** Wearing it now? */
  on(l: Look): boolean;
  /** Put it on (or, in a tab of toggles, take it off again) */
  wear(l: Look): Look;
  /** Colours to pick once it's on */
  colors?: Colors[];
  /** Only offered with some outfits (the hood needs the hoodie) */
  only?(l: Look): boolean;
}
interface Tab {
  id: string;
  label: string;
  items: Item[];
  /** Items here switch on and off independently (otherwise it's one of them) */
  toggles?: boolean;
  /** Colours that belong to the tab rather than an item (kicks) */
  colors?: Colors[];
}

/** The last colour picked for each optional piece, so taking it off and on again keeps it */
const memory: Partial<Record<ColorKey, string>> = {};
const remember = (k: ColorKey, l: Look, fallback: string) => (l[k] as string | null) ?? memory[k] ?? fallback;

const TABS: Tab[] = [
  {
    id: 'fit',
    label: 'Fit',
    items: [
      {
        id: 'suit',
        name: 'Classic Suit',
        icon: 'M8 3l4 4 4-4 4 3-2 5h-2v10H8V11H6L4 6z M12 7v7',
        on: (l) => l.kind === 'suit',
        wear: (l) => ({ ...l, kind: 'suit', hood: false }),
        colors: [
          { key: 'top', label: 'Jacket', list: PALETTE.top },
          { key: 'bottom', label: 'Trousers', list: PALETTE.bottom },
          { key: 'tie', label: 'Tie', list: PALETTE.tie },
        ],
      },
      {
        id: 'hoodie',
        name: 'Drop Hoodie',
        icon: 'M8 4c0 2 2 3 4 3s4-1 4-3l4 3-2 5h-2v9H8v-9H6L4 7z M10 15h4',
        on: (l) => l.kind === 'hoodie',
        wear: (l) => ({ ...l, kind: 'hoodie' }),
        colors: [
          { key: 'top', label: 'Hoodie', list: PALETTE.top },
          { key: 'bottom', label: 'Joggers', list: PALETTE.bottom },
        ],
      },
    ],
  },
  {
    id: 'head',
    label: 'Head',
    items: [
      {
        id: 'cap',
        name: 'Diamond Cap',
        icon: 'M5 15a7 7 0 0 1 14 0z M12 15h9 M10 11l2-2 2 2-2 2z',
        on: (l) => !!l.cap && !l.beanie && !l.hood,
        wear: (l) => ({ ...l, cap: remember('cap', l, DEFAULT_LOOK.cap!), beanie: null, hood: false }),
        colors: [{ key: 'cap', label: 'Cap', list: PALETTE.cap }],
      },
      {
        id: 'beanie',
        name: 'Street Beanie',
        icon: 'M6 15a6 7 0 0 1 12 0z M5 15h14v3H5z M12 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
        on: (l) => !!l.beanie && !l.hood,
        wear: (l) => ({ ...l, beanie: remember('beanie', l, PALETTE.cap[1]), cap: null, hood: false }),
        colors: [{ key: 'beanie', label: 'Beanie', list: PALETTE.cap }],
      },
      {
        id: 'hood',
        name: 'Hood Up',
        icon: 'M5 20c0-8 3-14 7-14s7 6 7 14 M9 20c0-5 1.3-8 3-8s3 3 3 8',
        only: (l) => l.kind === 'hoodie',
        on: (l) => l.hood,
        wear: (l) => ({ ...l, hood: true, cap: null, beanie: null }),
      },
      {
        id: 'bare',
        name: 'Nothing',
        icon: 'M12 3a9 9 0 1 0 0.01 0z M6 6l12 12',
        on: (l) => !l.cap && !l.beanie && !l.hood,
        wear: (l) => ({ ...l, cap: null, beanie: null, hood: false }),
      },
    ],
  },
  {
    id: 'bag',
    label: 'Bags',
    items: [
      {
        id: 'backpack',
        name: 'Backpack',
        icon: 'M7 9a5 5 0 0 1 10 0v11H7z M9 15h6 M10 4.5a2 2 0 0 1 4 0',
        on: (l) => !!l.backpack,
        wear: (l) => ({ ...l, backpack: remember('backpack', l, PALETTE.extra[3]), crossbody: null }),
        colors: [{ key: 'backpack', label: 'Backpack', list: PALETTE.extra }],
      },
      {
        id: 'crossbody',
        name: 'Crossbody',
        icon: 'M5 3l12 11 M13 13h7v7h-7z',
        on: (l) => !!l.crossbody && !l.backpack,
        wear: (l) => ({ ...l, crossbody: remember('crossbody', l, PALETTE.extra[2]), backpack: null }),
        colors: [{ key: 'crossbody', label: 'Crossbody', list: PALETTE.extra }],
      },
      {
        id: 'nobag',
        name: 'No bag',
        icon: 'M12 3a9 9 0 1 0 0.01 0z M6 6l12 12',
        on: (l) => !l.backpack && !l.crossbody,
        wear: (l) => ({ ...l, backpack: null, crossbody: null }),
      },
    ],
  },
  {
    id: 'extras',
    label: 'Extras',
    toggles: true,
    items: [
      {
        id: 'headphones',
        name: 'Headphones',
        icon: 'M4 15v-3a8 8 0 0 1 16 0v3 M4 14h3v6H4z M17 14h3v6h-3z',
        on: (l) => !!l.headphones,
        wear: (l) => ({ ...l, headphones: l.headphones ? null : remember('headphones', l, PALETTE.extra[1]) }),
        colors: [{ key: 'headphones', label: 'Headphones', list: PALETTE.extra }],
      },
      {
        id: 'chain',
        name: 'Shades Chain',
        icon: 'M3 7h7v4H3z M14 7h7v4h-7z M10 9h4 M4 11c0 6 4 9 8 9s8-3 8-9',
        on: (l) => l.chain,
        wear: (l) => ({ ...l, chain: !l.chain }),
      },
      {
        id: 'gummy',
        name: 'Gummy Bag',
        icon: 'M7 7h10l-1 13H8z M9.5 7V4.5h5V7 M10 12h4',
        on: (l) => l.gummy,
        wear: (l) => ({ ...l, gummy: !l.gummy }),
      },
    ],
  },
  {
    id: 'kicks',
    label: 'Kicks',
    items: [],
    colors: [{ key: 'shoes', label: 'Kicks', list: PALETTE.shoes }],
  },
];

const svg = (d: string) =>
  `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

export interface FittingDeps {
  /** The look Degen wears now */
  look(): Look;
  /** Wear a new look (saves it, dresses the walker, tells the server) */
  apply(l: Look): void;
  /** Called whenever the look changes, from here or anywhere else (the server) */
  onChange(fn: (l: Look) => void): void;
  reduced: boolean;
  /** Phones: fewer pixels and no multisampling in the preview */
  low: boolean;
}

export function createFitting(d: FittingDeps) {
  let el: HTMLElement | null = null;
  let tab = TABS[0];
  let preview: Preview | null = null;

  function paint() {
    if (!el) return;
    const l = d.look();
    for (const b of el.querySelectorAll<HTMLButtonElement>('[data-fit-tab]')) b.setAttribute('aria-selected', String(b.dataset.fitTab === tab.id));
    const items = el.querySelector<HTMLElement>('[data-fit-items]')!;
    items.replaceChildren();
    for (const it of tab.items) {
      if (it.only && !it.only(l)) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'fit-item';
      b.dataset.item = it.id;
      b.setAttribute('aria-pressed', String(it.on(l)));
      b.innerHTML = `${svg(it.icon)}<b></b><small></small>`;
      b.querySelector('b')!.textContent = it.name;
      b.querySelector('small')!.textContent = it.on(l) ? 'Wearing' : tab.toggles ? 'Add' : 'Wear';
      items.append(b);
    }
    items.hidden = !tab.items.length;
    // Colours for what's on in this tab
    const rows = el.querySelector<HTMLElement>('[data-fit-colors]')!;
    rows.replaceChildren();
    const sets = [...(tab.colors ?? []), ...tab.items.filter((it) => it.on(l) && (!it.only || it.only(l))).flatMap((it) => it.colors ?? [])];
    for (const c of sets) {
      if (c.key === 'tie' && l.kind !== 'suit') continue;
      const row = document.createElement('div');
      row.className = 'fit-row';
      row.innerHTML = `<span></span><div class="sw-row" role="group"></div>`;
      row.querySelector('span')!.textContent = c.label;
      const sw = row.querySelector('.sw-row')!;
      sw.setAttribute('aria-label', `${c.label} colour`);
      c.list.forEach((col, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'sw-btn';
        b.style.setProperty('--c', col);
        b.dataset.key = c.key;
        b.dataset.value = col;
        b.setAttribute('aria-label', `${c.label} colour ${i + 1}`);
        b.setAttribute('aria-pressed', String(l[c.key] === col));
        sw.append(b);
      });
      rows.append(row);
    }
  }

  function wear(next: Look, showOff = true) {
    for (const k of ['cap', 'beanie', 'headphones', 'backpack', 'crossbody'] as const) if (next[k]) memory[k] = next[k]!;
    d.apply(next);
    if (showOff) preview?.showOff();
  }

  function onClick(e: Event) {
    const t = e.target as HTMLElement;
    const tb = t.closest<HTMLButtonElement>('[data-fit-tab]');
    if (tb) {
      tab = TABS.find((x) => x.id === tb.dataset.fitTab) ?? tab;
      paint();
      return;
    }
    const ib = t.closest<HTMLButtonElement>('[data-item]');
    if (ib) {
      const it = tab.items.find((x) => x.id === ib.dataset.item);
      if (!it) return;
      // In a one-of tab, picking what you already wear does nothing
      if (!tab.toggles && it.on(d.look())) return;
      wear(it.wear(d.look()));
      el?.querySelector<HTMLButtonElement>(`[data-item="${it.id}"]`)?.focus({ preventScroll: true });
      return;
    }
    const sb = t.closest<HTMLButtonElement>('.sw-btn[data-key]');
    if (sb) {
      wear({ ...d.look(), [sb.dataset.key as ColorKey]: sb.dataset.value }, false);
      el?.querySelector<HTMLButtonElement>(`.sw-btn[data-key="${sb.dataset.key}"][data-value="${sb.dataset.value}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (t.closest('[data-fit-reset]')) wear({ ...DEFAULT_LOOK });
  }

  // Arrow keys move between the tabs
  function onKey(e: KeyboardEvent) {
    const tb = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-fit-tab]');
    if (!tb || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    const i = TABS.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : -1);
    tab = TABS[(i + TABS.length) % TABS.length];
    paint();
    el?.querySelector<HTMLButtonElement>(`[data-fit-tab="${tab.id}"]`)?.focus();
    e.preventDefault();
  }

  d.onChange((l) => {
    paint();
    preview?.dress(l);
  });

  return {
    /** The Drop 001 panel just opened: wire up its fitting room. `focus` scrolls to it (from Profile). */
    mount(body: HTMLElement, focus = false) {
      this.unmount();
      el = body.querySelector<HTMLElement>('[data-fit]');
      if (!el) return;
      const tabs = el.querySelector<HTMLElement>('[data-fit-tabs]')!;
      for (const t of TABS) {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.dataset.fitTab = t.id;
        b.textContent = t.label;
        tabs.append(b);
      }
      el.addEventListener('click', onClick);
      el.addEventListener('keydown', onKey);
      paint();
      const canvas = el.querySelector<HTMLCanvasElement>('[data-fit-canvas]')!;
      preview ??= createPreview(d);
      preview.attach(canvas, d.look());
      if (focus) {
        el.scrollIntoView({ block: 'start', behavior: d.reduced ? 'auto' : 'smooth' });
        el.querySelector<HTMLButtonElement>('[data-fit-tab]')?.focus({ preventScroll: true });
      }
    },
    /** The panel closed (or changed): stop drawing */
    unmount() {
      preview?.detach();
      el = null;
    },
  };
}

/* ---------- The turning preview ---------- */

interface Preview {
  attach(canvas: HTMLCanvasElement, l: Look): void;
  detach(): void;
  dress(l: Look): void;
  showOff(): void;
}

function createPreview(d: { reduced: boolean; low: boolean }): Preview {
  // One renderer for the page, moved to whichever canvas the panel has now
  let renderer: THREE.WebGLRenderer | null = null;
  let post: ReturnType<typeof createPost> | null = null;
  const scene = new THREE.Scene();
  // A lit backdrop, light enough that his black ink outline (and a black suit) reads against it
  scene.background = canvasTex(256, 256, (c) => {
    const g = c.createRadialGradient(128, 96, 10, 128, 128, 190);
    g.addColorStop(0, '#6a5cc4');
    g.addColorStop(0.55, '#3a2f7a');
    g.addColorStop(1, '#17122e');
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
  });
  const camera = new THREE.PerspectiveCamera(26, 1, 0.5, 30);
  camera.position.set(0, 1.05, 3.6);
  camera.lookAt(0, 0.66, 0);
  scene.add(new THREE.HemisphereLight('#d6e2ff', '#3a2f6a', 1.8));
  const key = new THREE.DirectionalLight('#ffffff', 2.4);
  key.position.set(2, 4, 3);
  scene.add(key);
  // Neon rims either side pick out dark clothes
  const rimL = new THREE.DirectionalLight('#ff6ad5', 1.6);
  rimL.position.set(-3, 2, -2);
  const rimR = new THREE.DirectionalLight('#00eaff', 1.4);
  rimR.position.set(3, 1.5, -2.5);
  scene.add(rimL, rimR);

  // The podium: a dark drum with a neon ring
  const podium = new THREE.Group();
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.14, 40), toon('#2e2752'));
  drum.position.y = -0.07;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.016, 8, 64), lit(new THREE.MeshBasicMaterial({ color: '#00eaff', toneMapped: true }), 1.6, 1.6));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.005;
  podium.add(drum, ring);
  scene.add(podium);

  const turn = new THREE.Group();
  scene.add(turn);
  let fig: Degen | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let raf = 0;
  let last = 0;
  let t = 0;
  let spin = 0.5;
  let yaw = 0.35;
  let cheer = -1;
  let drag: { x: number; yaw: number } | null = null;
  let ro: ResizeObserver | null = null;

  function dress(l: Look) {
    if (fig) {
      turn.remove(fig.g);
      fig.g.traverse((m) => (m as THREE.Mesh).geometry?.dispose());
    }
    fig = createDegen(lookOutfit(l));
    fig.g.traverse((m) => ((m as THREE.Mesh).castShadow = false));
    turn.add(fig.g);
    frame();
  }

  function size() {
    if (!renderer || !canvas || !post) return;
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    const pr = Math.min(devicePixelRatio, d.low ? 1.5 : 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    post.setSize(w, h, pr);
    camera.aspect = w / h;
    // Keep all of him in view on wide and narrow stages
    camera.fov = camera.aspect < 0.9 ? 34 : 26;
    camera.updateProjectionMatrix();
    frame();
  }

  function frame() {
    if (!renderer || !post || !fig) return;
    turn.rotation.y = yaw;
    const P = fig.pose;
    idlePose(P, t);
    if (cheer >= 0) emotePose(P, 'cheer', cheer);
    fig.update();
    post.render();
  }

  function loop(now: number) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000 || 0);
    last = now;
    t += dt;
    if (!drag) yaw += spin * dt;
    if (cheer >= 0) {
      cheer += dt;
      if (cheer > 1.1) cheer = -1;
    }
    frame();
  }

  function down(e: PointerEvent) {
    drag = { x: e.clientX, yaw };
    canvas?.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (!drag) return;
    yaw = drag.yaw + (e.clientX - drag.x) * 0.012;
    if (d.reduced) frame();
  }
  function up() {
    drag = null;
  }

  return {
    attach(c, l) {
      canvas = c;
      if (!renderer) {
        try {
          renderer = new THREE.WebGLRenderer({ canvas: c, antialias: false, alpha: false, powerPreference: 'low-power' });
        } catch {
          c.hidden = true;
          return;
        }
        renderer.toneMapping = THREE.NeutralToneMapping;
        post = createPost(renderer, scene, camera, { msaa: d.low ? 0 : 4, bloomScale: 0.5, smaa: d.low });
        // Only the podium's neon ring glows; white clothes stay clothes
        post.bloom.strength = 0.4;
        post.bloom.threshold = 0.97;
        post.ink.uniforms.fadeNear.value = 40;
      } else {
        // The panel's markup is new each time it opens: move the drawing surface over
        c.replaceWith(renderer.domElement);
        renderer.domElement.className = c.className;
        renderer.domElement.setAttribute('aria-hidden', 'true');
        canvas = renderer.domElement;
      }
      canvas.addEventListener('pointerdown', down);
      canvas.addEventListener('pointermove', move);
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', up);
      ro = new ResizeObserver(size);
      ro.observe(canvas);
      dress(l);
      size();
      // Reduced motion: drawn when something changes, never on a loop
      if (d.reduced) return;
      last = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    },
    detach() {
      cancelAnimationFrame(raf);
      raf = 0;
      ro?.disconnect();
      ro = null;
      if (canvas) {
        canvas.removeEventListener('pointerdown', down);
        canvas.removeEventListener('pointermove', move);
        canvas.removeEventListener('pointerup', up);
        canvas.removeEventListener('pointercancel', up);
      }
      canvas = null;
      drag = null;
    },
    dress(l) {
      if (canvas) dress(l);
    },
    showOff() {
      if (!d.reduced) cheer = 0;
    },
  };
}

export type Fitting = ReturnType<typeof createFitting>;
