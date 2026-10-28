/*
 * The city's mode header: says which view you're in (City view, Walk mode;
 * "Sector 7" while the city loads or where it can't run) with a line on what
 * you can do there, and keeps the City / Walk switch in step. It watches the city root
 * (data-view, data-mode, data-kart, data-plane, data-boat, data-fight, is-fp, is-online, is-driving, is-flying) so every mode change updates it.
 */
const COPY = {
  /** Before the 3D city is up (data-view="loading"), or where it can't run (data-view="none") */
  still: { title: 'Sector 7', sub: (root: HTMLElement) => (root.dataset.view === 'none' ? 'Needs 3D graphics' : 'Loading the city') },
  explore: {
    title: 'City view',
    sub: () => (narrow() ? 'Tap a building to go in' : touch() ? 'Drag to move · tap a building to go in' : 'Drag to move · click a building to go in'),
  },
  walk: {
    title: 'Walk mode',
    sub: (root: HTMLElement) => `${root.classList.contains('is-fp') ? 'First person' : 'Third person'}${root.classList.contains('is-online') ? ' · online' : ''}`,
  },
} as const;

const touch = () => matchMedia('(pointer: coarse)').matches;
const narrow = () => matchMedia('(max-width: 640px)').matches;

export function createCityHead(root: HTMLElement) {
  const head = root.querySelector<HTMLElement>('[data-city-head]')!;
  const title = head.querySelector<HTMLElement>('[data-head-title]')!;
  const sub = head.querySelector<HTMLElement>('[data-head-sub]')!;
  const city = head.querySelector<HTMLButtonElement>('[data-mode-city]')!;

  function paint() {
    const mode = root.dataset.view !== '3d' ? 'still' : ((root.dataset.mode as 'explore' | 'walk') ?? 'explore');
    const c = COPY[mode] ?? COPY.explore;
    head.dataset.mode = mode;
    // In your car: "Driving" and which car (drive.ts sets is-driving and data-car)
    const driving = mode === 'walk' && root.classList.contains('is-driving');
    // In a kart: "Karting" and which course (kart.ts sets data-kart while a race is on)
    const karting = mode === 'walk' && !!root.dataset.kart;
    // In your aircraft: "Flying" and which one (fly.ts sets is-flying and data-plane, over is-driving); in the ring: "Fighting" and who (fight.ts sets data-fight)
    const flying = mode === 'walk' && root.classList.contains('is-flying');
    const fighting = mode === 'walk' && !!root.dataset.fight;
    // On the water: "Boating" and the boat (boat.ts sets data-boat, over is-driving)
    const boating = mode === 'walk' && !!root.dataset.boat;
    const t = fighting ? 'Fighting' : karting ? 'Karting' : flying ? 'Flying' : boating ? 'Boating' : driving ? 'Driving' : c.title;
    if (title.textContent !== t) title.textContent = t;
    const online = root.classList.contains('is-online') ? ' · online' : '';
    const s = fighting ? root.dataset.fight! : karting ? root.dataset.kart! : flying ? `${root.dataset.plane ?? 'Your aircraft'}${online}` : boating ? `${root.dataset.boat}${online}` : driving ? `${root.dataset.car ?? 'Your car'}${online}` : c.sub(root);
    if (sub.textContent !== s) sub.textContent = s;
    city.setAttribute('aria-pressed', String(mode === 'explore'));
  }

  new MutationObserver(paint).observe(root, { attributes: true, attributeFilter: ['data-view', 'data-mode', 'data-kart', 'data-plane', 'data-boat', 'data-fight', 'class'] });
  // Its real height (two rows on phones while walking) for everything pinned under it (--head-h in city.css)
  new ResizeObserver(() => {
    root.style.setProperty('--head-h', `${head.offsetHeight}px`);
    paint();
  }).observe(head);
  paint();
  return { paint, city };
}
