/*
 * Endswood's decks walked on (docs/estate-plan.md Phase 5; DOM-free, the boot's: walk.ts and index.ts read it; tested
 * in tests/endsdecks.test.ts), as Liberty Bridge's high level: Fennel House's galleries, the street in the sky over the
 * spine between its halves and Harrier Point's bridges to its lift tower are ground by Degen's height
 * (`endsDeckY()`), their parapets and the faces they run along his walls up there (`endsDeckWall()`), their slabs, the
 * galleries' lintels and the bridges' roofs the walk camera's (`ENDS_CAMERA`), and lifts in Fennel House's cores and
 * Harrier Point's lift tower take him up and down (`ENDS_LIFTS`, `endsLiftDoors()`): walk prompts and a fade, as
 * Sector 7 Tower's.
 */
import { BLOCKS, DECK, deckRect, finSpans, type EstateBlock, type Side } from './endsblocks';
import { SLAB_Y, type Rect } from './endswood';
/** A box with a bottom: x0, z0, x1, z1, top, bottom */
type CamBox = [number, number, number, number, number, number];

/** A floor walked on: where it is (the whole slab: what's ground), where his body may be (`walk`: inside its parapets
 * and end walls) and its height */
export interface Floor {
  id: string;
  rect: Rect;
  walk: Rect;
  y: number;
}
/** A parapet's or an end wall's thickness */
const EDGE = 0.12;
/** How far under a floor he can be and still be on it (a step up onto it), and how far over (a jump on it) */
const UNDER = 0.4;
const OVER = 1.2;

const inset = ([x0, z0, x1, z1]: Rect, s: Partial<Record<Side, number>>): Rect => [x0 + (s.w ?? 0), z0 + (s.n ?? 0), x1 - (s.e ?? 0), z1 - (s.s ?? 0)];
const OPP: Record<Side, Side> = { n: 's', s: 'n', e: 'w', w: 'e' };
const bridgeAt = (r: Rect, y: number, end: 'a' | 'b', alongX: boolean) =>
  BLOCKS.some((b) =>
    b.bridges.some((br) => {
      if (Math.abs(br.y0 - y) > 0.01) return false;
      const [x0, z0, x1, z1] = br.rect;
      if (alongX) return (end === 'a' ? Math.abs(x1 - r[0]) < 0.02 : Math.abs(x0 - r[2]) < 0.02) && z0 < r[3] && z1 > r[1];
      return (end === 'a' ? Math.abs(z1 - r[1]) < 0.02 : Math.abs(z0 - r[3]) < 0.02) && x0 < r[2] && x1 > r[0];
    })
  );

function galleryFloors(b: EstateBlock): Floor[] {
  return b.decks.flatMap((d, k) => {
    if (!d.walk) return [];
    const r = deckRect(b, d);
    const alongX = d.side === 'n' || d.side === 's';
    return d.ys.map((y, i): Floor => {
      // (its parapet on the outer side; its end walls, but where a bridge meets it at this height)
      const ends = alongX ? { w: bridgeAt(r, y, 'a', true) ? 0 : EDGE, e: bridgeAt(r, y, 'b', true) ? 0 : EDGE } : { n: bridgeAt(r, y, 'a', false) ? 0 : EDGE, s: bridgeAt(r, y, 'b', false) ? 0 : EDGE };
      return { id: `${b.id}:${k}:${i}`, rect: r, walk: inset(r, { ...ends, [d.side]: EDGE, [OPP[d.side]]: 0 }), y };
    });
  });
}
function bridgeFloors(b: EstateBlock): Floor[] {
  return b.bridges.map((br, i): Floor => {
    const [x0, z0, x1, z1] = br.rect;
    const alongX = x1 - x0 >= z1 - z0;
    return { id: `${b.id}:bridge:${i}`, rect: br.rect, walk: inset(br.rect, alongX ? { n: EDGE, s: EDGE } : { w: EDGE, e: EDGE }), y: br.y0 };
  });
}
export const ENDS_FLOORS: Floor[] = BLOCKS.flatMap((b) => [...galleryFloors(b), ...bridgeFloors(b)]);
/** All of them with a tile round them: nothing up there is further out */
const ZONE: Rect = ENDS_FLOORS.reduce<Rect>((a, f) => [Math.min(a[0], f.rect[0] - 1), Math.min(a[1], f.rect[1] - 1), Math.max(a[2], f.rect[2] + 1), Math.max(a[3], f.rect[3] + 1)], [Infinity, Infinity, -Infinity, -Infinity]);

const inRect = (r: Rect, x: number, z: number, m = 0) => x >= r[0] - m && x <= r[2] + m && z >= r[1] - m && z <= r[3] + m;
/** The floor he's on at `x, z` when he's at `yNow`: its height, or null (on the ground, under it, or off it) */
export function endsDeckY(x: number, z: number, yNow: number): number | null {
  if (yNow < SLAB_Y + 1 || !inRect(ZONE, x, z)) return null;
  let best: number | null = null;
  for (const f of ENDS_FLOORS) if (yNow >= f.y - UNDER && yNow <= f.y + OVER && inRect(f.rect, x, z) && (best === null || f.y > best)) best = f.y;
  return best;
}
/** Is he up on the decks at `y` near `x, z` (only their walls stop him then) */
export function upOnEnds(x: number, z: number, y: number) {
  if (y < SLAB_Y + 1 || !inRect(ZONE, x, z)) return false;
  return ENDS_FLOORS.some((f) => y >= f.y - UNDER && y <= f.y + OVER && inRect(f.rect, x, z, 1));
}
/** Up there, is a body `r` round at `x, z` against a parapet, an end wall or the face (outside every floor at its
 * height) */
export function endsDeckWall(x: number, z: number, y: number, r: number) {
  const level = ENDS_FLOORS.filter((f) => y >= f.y - UNDER && y <= f.y + OVER && inRect(f.rect, x, z, 1));
  if (!level.length) return false;
  const h = Math.max(...level.map((f) => f.y));
  const on = level.filter((f) => Math.abs(f.y - h) < 0.01);
  const d = r * Math.SQRT1_2;
  const pts = [
    [0, 0],
    [r, 0],
    [-r, 0],
    [0, r],
    [0, -r],
    [d, d],
    [d, -d],
    [-d, d],
    [-d, -d],
  ];
  return pts.some(([dx, dz]) => !on.some((f) => inRect(f.walk, x + dx, z + dz)));
}

/** What the walk camera can't pass that he walks under or along: every gallery's slab (walked or not), a walked
 * gallery's cross walls over its openings (their solids stop at its first floor, endsblocks.ts), the bridges' floors
 * and roofs; boxes with a bottom (b[5]) */
export const ENDS_CAMERA: CamBox[] = BLOCKS.flatMap((b) => [
  ...b.decks.flatMap((d) => {
    const r = deckRect(b, d);
    const slabs = d.ys.map((y): CamBox => [...r, y, y - DECK.slab]);
    const lintels = d.walk ? finSpans(b, d).flatMap((f) => f.spans.slice(1).map(([y0, y1]): CamBox => [...f.rect, y1, y0])) : [];
    return [...slabs, ...lintels];
  }),
  ...b.bridges.flatMap((br): CamBox[] => [
    [...br.rect, br.y0, br.y0 - 0.32],
    [...br.rect, br.y1 + 0.14, br.y1],
  ]),
]);

/* ---------- The lifts ---------- */

export interface LiftDoor {
  /** Where you stand for its prompt */
  x: number;
  z: number;
  /** The door on its wall (endsblocks3d.ts draws it) and the way it faces; none at the ground floor's entrance (the
   * entrance's glazing is the door) */
  wall?: { x: number; z: number; nx: number; nz: number };
}
export interface LiftStop {
  /** The floor's height and what it's called ("Ground", "Floor 3") */
  y: number;
  name: string;
  /** Its doors: up to the next stop, down to the one before (none past the ends) */
  up?: LiftDoor;
  down?: LiftDoor;
  /** Where it lets you out, facing which way (walk.ts's yaw 0 looks north) */
  out: { x: number; z: number; y: number; yaw: number };
}
export interface EstateLift {
  id: string;
  name: string;
  stops: LiftStop[];
}
/** Floors over the ground floor named the British way: the first gallery's the first floor */
const floorName = (y: number) => `Floor ${Math.round(y - SLAB_Y - 1.5) + 1}`;

const fennelLifts = (b: EstateBlock): EstateLift[] => {
  const d = b.decks[0];
  const [, , , face] = b.shells[0].rect;
  // (along the gallery towards the street in the sky)
  const yaw = b.id === 'fennel-w' ? -Math.PI / 2 : Math.PI / 2;
  return b.shells.slice(1).map((core, i) => {
    const [x0, z0, x1] = core.rect;
    const cx = (x0 + x1) / 2;
    const stops: LiftStop[] = [{ y: SLAB_Y, name: 'Ground', up: { x: cx, z: z0 - 0.6 }, out: { x: cx, z: z0 - 1, y: SLAB_Y, yaw: 0 } }];
    d.ys.forEach((y, k) =>
      stops.push({
        y,
        name: floorName(y),
        up: k < d.ys.length - 1 ? { x: cx - 0.7, z: face + 0.35, wall: { x: cx - 0.7, z: face, nx: 0, nz: 1 } } : undefined,
        down: { x: cx + 0.7, z: face + 0.35, wall: { x: cx + 0.7, z: face, nx: 0, nz: 1 } },
        out: { x: cx, z: face + 0.95, y, yaw },
      })
    );
    return { id: `${b.id}-${i}`, name: b.name, stops };
  });
};
const harrierLift = (b: EstateBlock): EstateLift => {
  const [x0, , x1, z1] = b.shells[1].rect;
  const cx = (x0 + x1) / 2;
  const stops: LiftStop[] = [{ y: SLAB_Y, name: 'Ground', up: { x: cx, z: z1 + 0.6 }, out: { x: cx, z: z1 + 1, y: SLAB_Y, yaw: Math.PI } }];
  b.bridges.forEach((br, k) => {
    const [bx0, bz0, , bz1] = br.rect;
    const mz = (bz0 + bz1) / 2;
    stops.push({
      y: br.y0,
      name: floorName(br.y0),
      up: k < b.bridges.length - 1 ? { x: bx0 + 0.25, z: mz - 0.4, wall: { x: bx0, z: mz - 0.4, nx: 1, nz: 0 } } : undefined,
      down: { x: bx0 + 0.25, z: mz + 0.4, wall: { x: bx0, z: mz + 0.4, nx: 1, nz: 0 } },
      // (looking out north over the estate to Fennel House, the open side beside him)
      out: { x: bx0 + 0.85, z: mz, y: br.y0, yaw: 0 },
    });
  });
  return { id: 'harrier', name: b.name, stops };
};
export const ENDS_LIFTS: EstateLift[] = [...BLOCKS.filter((b) => b.id === 'fennel-w' || b.id === 'fennel-e').flatMap(fennelLifts), ...BLOCKS.filter((b) => b.kind === 'tower').map(harrierLift)];

/** The lift doors at his height: walk prompts (`lift:ends:<lift>:<stop>:<up|down>`) */
export function endsLiftDoors(y: number) {
  const out: { id: string; x: number; z: number; label: string }[] = [];
  ENDS_LIFTS.forEach((l, li) =>
    l.stops.forEach((s, si) => {
      if (Math.abs(y - s.y) > 0.6) return;
      if (s.up) out.push({ id: `lift:ends:${li}:${si}:up`, ...s.up, label: `Lift up · ${l.stops[si + 1].name}` });
      if (s.down) out.push({ id: `lift:ends:${li}:${si}:down`, ...s.down, label: `Lift down · ${l.stops[si - 1].name}` });
    })
  );
  return out;
}
/** Where a lift prompt takes him, and what the toast says there */
export function endsLiftRide(id: string): { to: LiftStop['out']; arrived: string } | null {
  const [, , li, si, way] = id.split(':');
  const l = ENDS_LIFTS[Number(li)];
  const s = l?.stops[Number(si) + (way === 'up' ? 1 : -1)];
  return s ? { to: s.out, arrived: `${l.name} · ${s.name}` } : null;
}
