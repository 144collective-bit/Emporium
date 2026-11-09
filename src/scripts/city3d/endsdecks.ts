/*
 * Endswood's decks walked on (docs/estate-plan.md Phase 5; DOM-free, the boot's: walk.ts and index.ts read it; tested
 * in tests/endsdecks.test.ts), as Liberty Bridge's high level: Fennel House's galleries, the street in the sky over the
 * spine between its halves and Harrier Point's bridges to its lift tower are ground by Degen's height
 * (`endsDeckY()`), their parapets and the faces they run along his walls up there (`endsDeckWall()`), their slabs, the
 * galleries' lintels and the bridges' roofs the walk camera's (`ENDS_CAMERA`), and lifts in Fennel House's stair
 * towers and Harrier Point's lift tower take him up and down (`ENDS_LIFTS`, `endsLiftDoors()`): walk prompts and a
 * fade, as Sector 7 Tower's. Since the polish round every block's galleries are walked, and the stair towers
 * (endsblocks.ts `STAIRS`) climb to them from the street: their flights are floors that rise (`slope`, `floorY()`).
 */
import { BLOCKS, DECK, STAIR, STAIRS, deckRect, finSpans, type EstateBlock, type Side, type StairGeom } from './endsblocks';
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
  /** A stair's flight: its height rising from `y0` at world x or z `from` to `y1` at `to` (along x if `alongX`) */
  slope?: { alongX: boolean; from: number; to: number; y0: number; y1: number };
  /** A stair tower's piece (its flights and landings): he's on it only inside it, not near it */
  stair?: true;
  /** A stair's foot at street level: where he may step off the first flight, never ground of its own */
  ground?: true;
}
/** A floor's height at `x, z` (a flight's along its slope, held at its ends) */
export function floorY(f: Floor, x: number, z: number) {
  if (!f.slope) return f.y;
  const { alongX, from, to, y0, y1 } = f.slope;
  const t = Math.min(1, Math.max(0, ((alongX ? x : z) - from) / (to - from)));
  return y0 + (y1 - y0) * t;
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
/**
 * A stair tower's pieces (endsblocks.ts `STAIRS`): at each gallery a landing where it meets the gallery (reaching into
 * its parapet's gap), and between each two floors a flight out on lane A to a half landing and a flight back on lane B;
 * at the foot, the porch under the first landing (street level, `ground`)
 */
function stairFloors(g: StairGeom): Floor[] {
  const { half, spine, run, far } = STAIR;
  const near = g.near;
  const m = 0.03;
  const L = g.levels;
  const id = `stair:${g.tower.block}`;
  const out: Floor[] = [];
  const flight = (k: number, lane: 'a' | 'b', yNear: number, yFar: number): Floor => {
    const [u0, u1] = lane === 'a' ? [-half, -spine] : [spine, half];
    return {
      id: `${id}:${lane}${k}`,
      rect: g.rect(u0, near, u1, near + run),
      walk: g.rect(u0 + m, near - 0.05, u1 - m, near + run + 0.05),
      y: Math.min(yNear, yFar),
      slope: { alongX: g.vAlongX, from: g.alongV(near), to: g.alongV(near + run), y0: yNear, y1: yFar },
      stair: true,
    };
  };
  out.push({ id: `${id}:foot`, rect: g.rect(-half, -0.3, half, near), walk: g.rect(-half + m, -0.3, half - m, near + 0.05), y: L[0], ground: true });
  for (let k = 0; k + 1 < L.length; k++) {
    const mid = (L[k] + L[k + 1]) / 2;
    out.push(flight(k, 'a', L[k], mid), flight(k, 'b', L[k + 1], mid));
    out.push({ id: `${id}:half${k}`, rect: g.rect(-half, near + run, half, near + run + far), walk: g.rect(-half + m, near + run - 0.05, half - m, near + run + far - m), y: mid, stair: true });
    // (the landing at the gallery: into the parapet's gap, so its walk meets the gallery's)
    out.push({ id: `${id}:land${k + 1}`, rect: g.rect(-half, -0.3, half, near), walk: g.rect(-half + m, -0.3, half - m, near + 0.05), y: L[k + 1], stair: true });
  }
  return out;
}
export const ENDS_FLOORS: Floor[] = [...BLOCKS.flatMap((b) => [...galleryFloors(b), ...bridgeFloors(b)]), ...STAIRS.flatMap(stairFloors)];
/** All of them with a tile round them: nothing up there is further out */
const ZONE: Rect = ENDS_FLOORS.reduce<Rect>((a, f) => [Math.min(a[0], f.rect[0] - 1), Math.min(a[1], f.rect[1] - 1), Math.max(a[2], f.rect[2] + 1), Math.max(a[3], f.rect[3] + 1)], [Infinity, Infinity, -Infinity, -Infinity]);

const inRect = (r: Rect, x: number, z: number, m = 0) => x >= r[0] - m && x <= r[2] + m && z >= r[1] - m && z <= r[3] + m;
const level = (f: Floor, x: number, z: number, y: number) => {
  const fy = floorY(f, x, z);
  return y >= fy - UNDER && y <= fy + OVER;
};
/** The floor he's on at `x, z` when he's at `yNow`: its height, or null (on the ground, under it, or off it); a stair's
 * flights from the street up */
export function endsDeckY(x: number, z: number, yNow: number): number | null {
  if (yNow < SLAB_Y - 0.5 || !inRect(ZONE, x, z)) return null;
  let best: number | null = null;
  for (const f of ENDS_FLOORS) {
    if (f.ground || !inRect(f.rect, x, z) || (!f.stair && yNow < SLAB_Y + 1) || !level(f, x, z, yNow)) continue;
    const fy = floorY(f, x, z);
    if (best === null || fy > best) best = fy;
  }
  return best;
}
/** Is he up on the decks or a stair at `y` near `x, z` (only their walls stop him then) */
export function upOnEnds(x: number, z: number, y: number) {
  if (!inRect(ZONE, x, z)) return false;
  return ENDS_FLOORS.some((f) => !f.ground && (f.stair ? inRect(f.rect, x, z) && level(f, x, z, y) : y >= SLAB_Y + 1 && level(f, x, z, y) && inRect(f.rect, x, z, 1)));
}
/** Up there, is a body `r` round at `x, z` against a parapet, an end wall or the face (outside every floor at its
 * height) */
export function endsDeckWall(x: number, z: number, y: number, r: number) {
  const near = ENDS_FLOORS.filter((f) => inRect(f.rect, x, z, 1 + r));
  if (!near.length) return false;
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
  // (each point inside a floor's walk at his height there: a flight's or the next landing's as he climbs)
  return pts.some(([dx, dz]) => !near.some((f) => inRect(f.walk, x + dx, z + dz) && level(f, x + dx, z + dz, y)));
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
]).concat(STAIRS.flatMap(stairCamera));
/** A stair tower's for the camera: its landings' slabs, its flights in short steps (each from its surface down to
 * under its slab), its roof */
function stairCamera(g: StairGeom): CamBox[] {
  const out: CamBox[] = [];
  const { half, wall, run, far, slab } = STAIR;
  const near = g.near;
  for (const f of stairFloors(g)) {
    if (f.ground) continue;
    if (!f.slope) {
      out.push([...f.rect, f.y, f.y - slab]);
      continue;
    }
    // (short steps, so a step's box isn't much lower than the flight over it)
    const n = 16;
    const [a, c] = [f.slope.from, f.slope.to];
    for (let i = 0; i < n; i++) {
      const [p, q] = [a + ((c - a) * i) / n, a + ((c - a) * (i + 1)) / n];
      const r: Rect = f.slope.alongX ? [Math.min(p, q), f.rect[1], Math.max(p, q), f.rect[3]] : [f.rect[0], Math.min(p, q), f.rect[2], Math.max(p, q)];
      const ys = [p, q].map((v) => floorY(f, f.slope!.alongX ? v : r[0], f.slope!.alongX ? r[1] : v));
      out.push([...r, Math.max(...ys), Math.min(...ys) - slab]);
    }
  }
  out.push([...g.rect(-half - wall, 0, half + wall, near + run + far + wall), g.top, g.top - 0.25]);
  return out;
}

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

/** A stair tower's lift (Fennel House's, endsblocks.ts `lift`): its shaft beside the near landing, an up door and a
 * down door side by side in the wall between them, at the street in the porch and at each gallery; it lets you out on
 * the landing, facing the gallery */
const towerLift = (g: StairGeom): EstateLift => {
  const b = BLOCKS.find((q) => q.id === g.tower.block)!;
  const { half } = STAIR;
  const [up, down] = [0.4, g.near - 0.4];
  // (the doors on the tower's +u wall, facing in; you stand a little off it)
  const door = (v: number): LiftDoor => {
    const [x, z] = g.at(half - 0.32, v);
    const [wx, wz] = g.at(half, v);
    return { x, z, wall: { x: wx, z: wz, nx: -g.across[0], nz: -g.across[1] } };
  };
  const [ox, oz] = g.at(0, g.near / 2);
  // (facing the gallery: yaw 0 looks north, walk.ts)
  const yaw = Math.atan2(g.out[0], g.out[1]);
  const stops: LiftStop[] = g.levels.map((y, k) => ({
    y,
    name: k === 0 ? 'Ground' : floorName(y),
    up: k < g.levels.length - 1 ? door(up) : undefined,
    down: k > 0 ? door(down) : undefined,
    out: { x: ox, z: oz, y, yaw },
  }));
  return { id: `${b.id}-lift`, name: b.name, stops };
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
export const ENDS_LIFTS: EstateLift[] = [...STAIRS.filter((g) => g.tower.lift).map(towerLift), ...BLOCKS.filter((b) => b.kind === 'tower').map(harrierLift)];

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
