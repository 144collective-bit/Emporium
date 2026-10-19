/*
 * The city's mode header: says which view you're in (City view, Walk mode,
 * Build mode, or the 2D map) with a line on what you can do there, and
 * keeps the City / Walk / Build switch in step. It watches the city root
 * (data-view, data-mode, is-fp, is-online) so every mode change updates it.
 */
const COPY = {
  map: { title: 'City map', sub: () => (narrow() ? '2D view' : '2D view · pick a lit-up building') },
  explore: {
    title: 'City view',
    sub: () => (narrow() ? 'Tap a building to go in' : touch() ? 'Drag to move · tap a building to go in' : 'Drag to move · click a building to go in'),
  },
  walk: {
    title: 'Walk mode',
    sub: (root: HTMLElement) => `${root.classList.contains('is-fp') ? 'First person' : 'Third person'}${root.classList.contains('is-online') ? ' · online' : ''}`,
  },
  build: { title: 'Build mode', sub: () => (narrow() ? 'Demo · simulated' : 'Demo · purchases are simulated') },
} as const;

const touch = () => matchMedia('(pointer: coarse)').matches;
const narrow = () => matchMedia('(max-width: 640px)').matches;

export function createCityHead(root: HTMLElement) {
  const head = root.querySelector<HTMLElement>('[data-city-head]')!;
  const title = head.querySelector<HTMLElement>('[data-head-title]')!;
  const sub = head.querySelector<HTMLElement>('[data-head-sub]')!;
  const city = head.querySelector<HTMLButtonElement>('[data-mode-city]')!;

  function paint() {
    const mode = root.dataset.view !== '3d' ? 'map' : ((root.dataset.mode as 'explore' | 'walk' | 'build') ?? 'explore');
    const c = COPY[mode] ?? COPY.explore;
    head.dataset.mode = mode;
    if (title.textContent !== c.title) title.textContent = c.title;
    const s = c.sub(root);
    if (sub.textContent !== s) sub.textContent = s;
    city.setAttribute('aria-pressed', String(mode === 'explore'));
  }

  new MutationObserver(paint).observe(root, { attributes: true, attributeFilter: ['data-view', 'data-mode', 'class'] });
  // Its real height (two rows on phones while walking) for everything pinned under it (--head-h in global.css)
  new ResizeObserver(() => {
    root.style.setProperty('--head-h', `${head.offsetHeight}px`);
    paint();
  }).observe(head);
  paint();
  return { paint, city };
}
