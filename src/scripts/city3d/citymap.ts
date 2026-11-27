/*
 * A city as a map file (docs/cities-plan.md; DOM-free, tested in tests/citymap.test.ts): the land, water, streets,
 * zones and places of a city other than Sector 7, as plain data the stage (citystage.ts) draws and the map creator
 * edits. Sector 7 itself is written in code and isn't one of these.
 *
 * In tiles, as Sector 7 is, centred on 0, 0: x east, z south. Everything read from a file, the editor or the
 * browser's storage goes through `cleanMap()`, which keeps what's sound and drops the rest, so a hand-edited or an
 * old file can't break the stage.
 */

export type Pt = [number, number];

/** The file's version: raise it with a migration in `cleanMap()` when a shape changes */
export const MAP_VERSION = 1;

/** The level's width and depth in tiles: no smaller than a few blocks, no wider than Sector 7's own world */
export const SIZE_MIN = 64;
export const SIZE_MAX = 1400;

export type StreetKind = 'avenue' | 'street' | 'lane' | 'path';
/** A street's whole width in tiles, kerb to kerb, by its kind (a path is for walking and bikes only) */
export const STREET_WIDTH: Record<StreetKind, number> = { avenue: 6, street: 4, lane: 2.4, path: 1.2 };

export type WaterKind = 'river' | 'lake' | 'sea';
export type ZoneUse = 'homes' | 'shops' | 'towers' | 'works' | 'park' | 'plaza';
export type PlaceKind = 'airport' | 'landmark';
/** What a city is about, which picks its ground and its light (the plan: one idea a city) */
export type Theme = 'temperate' | 'coast' | 'desert' | 'mountain';

export const STREET_KINDS: readonly StreetKind[] = ['avenue', 'street', 'lane', 'path'];
export const WATER_KINDS: readonly WaterKind[] = ['river', 'lake', 'sea'];
export const ZONE_USES: readonly ZoneUse[] = ['homes', 'shops', 'towers', 'works', 'park', 'plaza'];
export const PLACE_KINDS: readonly PlaceKind[] = ['airport', 'landmark'];
export const THEMES: readonly Theme[] = ['temperate', 'coast', 'desert', 'mountain'];

/** A round hill: the ground rises to `height` at `at` and eases to nothing `radius` away */
export interface MapHill {
  id: string;
  at: Pt;
  radius: number;
  height: number;
}
export interface MapWater {
  id: string;
  kind: WaterKind;
  poly: Pt[];
}
/** A street's centre line */
export interface MapStreet {
  id: string;
  kind: StreetKind;
  pts: Pt[];
}
/** Land with a use: the stage fills it from the building kits */
export interface MapZone {
  id: string;
  use: ZoneUse;
  poly: Pt[];
}
export interface MapPlace {
  id: string;
  kind: PlaceKind;
  /** Its name on the map: made-up copy from the file, never typed by a visitor */
  name: string;
  at: Pt;
  /** Which way it fronts, in radians (0 fronts south, +z, as Sector 7's landmarks do) */
  yaw: number;
}
export interface CityMap {
  v: number;
  id: string;
  name: string;
  /** Width (x) and depth (z) in tiles */
  size: [number, number];
  theme: Theme;
  /** Where Degen stands on arriving, and which way he faces */
  spawn: { at: Pt; yaw: number };
  hills: MapHill[];
  water: MapWater[];
  streets: MapStreet[];
  zones: MapZone[];
  places: MapPlace[];
}

/** How many of each a map may hold: a file past these is cut short, so a huge one can't stall a phone */
export const LIMITS = { hills: 64, water: 64, streets: 600, zones: 600, places: 120, pts: 400, name: 40 } as const;
/** A hill's size: at most as high as Sector 7's hills run */
export const HILL = { radius: [4, 400], height: [0.5, 60] } as const;

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
/** To the centimetre: a map file stays short and reads the same after a save and a load */
const round = (v: number) => Math.round(v * 100) / 100;

/** An id: lower-case letters, digits and dashes, 1 to 32 long ('' when nothing's left) */
export function cleanId(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

/** A name: plain text on one line, no markup, at most `LIMITS.name` long */
export function cleanName(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v
    .replace(/[<>&"'`\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LIMITS.name);
}

/** Half the level's width and depth */
export const halfOf = (size: readonly [number, number]): Pt => [size[0] / 2, size[1] / 2];

/** Whether a point is on the level, `margin` in from its edge */
export function inMap(map: Pick<CityMap, 'size'>, p: Pt, margin = 0) {
  const [hx, hz] = halfOf(map.size);
  return Math.abs(p[0]) <= hx - margin && Math.abs(p[1]) <= hz - margin;
}

function cleanPt(v: unknown, size: readonly [number, number]): Pt | null {
  if (!Array.isArray(v)) return null;
  const x = num(v[0]);
  const z = num(v[1]);
  if (x === null || z === null) return null;
  const [hx, hz] = halfOf(size);
  return [round(clamp(x, -hx, hx)), round(clamp(z, -hz, hz))];
}

/** A line or an outline's points: sound ones only, none twice running, cut at the limit */
function cleanPts(v: unknown, size: readonly [number, number], closed: boolean): Pt[] {
  if (!Array.isArray(v)) return [];
  const out: Pt[] = [];
  for (const raw of v) {
    const p = cleanPt(raw, size);
    if (!p) continue;
    const last = out[out.length - 1];
    if (last && last[0] === p[0] && last[1] === p[1]) continue;
    out.push(p);
    if (out.length >= LIMITS.pts) break;
  }
  // (an outline whose last point repeats its first is the same outline without it)
  if (closed && out.length > 1 && out[0][0] === out[out.length - 1][0] && out[0][1] === out[out.length - 1][1]) out.pop();
  return out;
}

/** A polygon's area in square tiles (never negative) */
export function areaOf(poly: readonly Pt[]) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, z0] = poly[i];
    const [x1, z1] = poly[(i + 1) % poly.length];
    a += x0 * z1 - x1 * z0;
  }
  return Math.abs(a) / 2;
}

/** A line's length in tiles */
export function lengthOf(pts: readonly Pt[]) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return d;
}

/** Whether a point is inside an outline */
export function inPoly(poly: readonly Pt[], p: Pt) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

const oneOf = <T extends string>(v: unknown, all: readonly T[]): T | null => (all.includes(v as T) ? (v as T) : null);
const rec = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

/** A list's sound items, each id once, cut at its limit; an item with no id takes one from its place in the list */
function cleanList<T extends { id: string }>(v: unknown, limit: number, prefix: string, one: (r: Record<string, unknown>, id: string) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  const seen = new Set<string>();
  for (const raw of v) {
    if (out.length >= limit) break;
    const r = rec(raw);
    if (!r) continue;
    let id = cleanId(r.id) || `${prefix}-${out.length + 1}`;
    while (seen.has(id)) id = `${id.slice(0, 28)}-${seen.size + 1}`;
    const item = one(r, id);
    if (!item) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

/**
 * A map from anything (a file, the editor, the browser's storage): what's sound is kept, the rest dropped or
 * clamped, and what's missing takes the blank map's. Null when it isn't a map at all (no id).
 */
export function cleanMap(raw: unknown): CityMap | null {
  const r = rec(raw);
  if (!r) return null;
  const id = cleanId(r.id);
  if (!id) return null;
  // (a file from a later version than this code knows is read as far as it's sound)
  const sz = Array.isArray(r.size) ? r.size : [];
  const size: [number, number] = [Math.round(clamp(num(sz[0]) ?? 600, SIZE_MIN, SIZE_MAX)), Math.round(clamp(num(sz[1]) ?? 600, SIZE_MIN, SIZE_MAX))];
  const sp = rec(r.spawn);
  const spawn = { at: (sp && cleanPt(sp.at, size)) || ([0, 0] as Pt), yaw: round(num(sp?.yaw) ?? 0) };

  const hills = cleanList<MapHill>(r.hills, LIMITS.hills, 'hill', (h, hid) => {
    const at = cleanPt(h.at, size);
    const radius = num(h.radius);
    const height = num(h.height);
    if (!at || radius === null || height === null) return null;
    return { id: hid, at, radius: round(clamp(radius, HILL.radius[0], HILL.radius[1])), height: round(clamp(height, HILL.height[0], HILL.height[1])) };
  });
  const water = cleanList<MapWater>(r.water, LIMITS.water, 'water', (w, wid) => {
    const poly = cleanPts(w.poly, size, true);
    if (poly.length < 3 || areaOf(poly) < 1) return null;
    return { id: wid, kind: oneOf(w.kind, WATER_KINDS) ?? 'lake', poly };
  });
  const streets = cleanList<MapStreet>(r.streets, LIMITS.streets, 'street', (s, sid) => {
    const pts = cleanPts(s.pts, size, false);
    if (pts.length < 2 || lengthOf(pts) < 1) return null;
    return { id: sid, kind: oneOf(s.kind, STREET_KINDS) ?? 'street', pts };
  });
  const zones = cleanList<MapZone>(r.zones, LIMITS.zones, 'zone', (z, zid) => {
    const poly = cleanPts(z.poly, size, true);
    if (poly.length < 3 || areaOf(poly) < 1) return null;
    return { id: zid, use: oneOf(z.use, ZONE_USES) ?? 'homes', poly };
  });
  const places = cleanList<MapPlace>(r.places, LIMITS.places, 'place', (p, pid) => {
    const at = cleanPt(p.at, size);
    if (!at) return null;
    return { id: pid, kind: oneOf(p.kind, PLACE_KINDS) ?? 'landmark', name: cleanName(p.name) || 'Unnamed', at, yaw: round(num(p.yaw) ?? 0) };
  });

  return { v: MAP_VERSION, id, name: cleanName(r.name) || 'Unnamed city', size, theme: oneOf(r.theme, THEMES) ?? 'temperate', spawn, hills, water, streets, zones, places };
}

/** How far in from the south edge a blank level's arrivals pad stands, as a share of its depth */
const ARRIVALS_IN = 0.35;

/**
 * A blank open level: flat ground, nothing built, the arrivals airport's spot towards the south edge and Degen
 * standing just north of it facing the open land.
 */
export function blankMap(id: string, name: string, size: [number, number] = [600, 600]): CityMap {
  const depth = clamp(size[1], SIZE_MIN, SIZE_MAX);
  const z = round(depth / 2 - depth * ARRIVALS_IN);
  const map = cleanMap({
    id,
    name,
    size,
    theme: 'temperate',
    spawn: { at: [0, z - 20], yaw: Math.PI },
    places: [{ id: 'arrivals', kind: 'airport', name: 'Arrivals', at: [0, z], yaw: Math.PI }],
  });
  if (!map) throw new Error(`blankMap: "${id}" is no id`);
  return map;
}

/** A hill's height over the flat at a point: a smooth dome, level on top and at its foot */
function hillAt(h: MapHill, x: number, z: number) {
  const d = Math.hypot(x - h.at[0], z - h.at[1]) / h.radius;
  if (d >= 1) return 0;
  const t = 1 - d * d;
  return h.height * t * t;
}

/** The ground's height at a point: the highest hill over it (hills that overlap don't stack), 0 on the flat */
export function groundAt(map: Pick<CityMap, 'hills'>, x: number, z: number) {
  let y = 0;
  for (const h of map.hills) y = Math.max(y, hillAt(h, x, z));
  return y;
}

/** Whether a point is in the water */
export const inWater = (map: Pick<CityMap, 'water'>, p: Pt) => map.water.some((w) => inPoly(w.poly, p));

/** The map as the text of its file: stable, so the same map always makes the same file */
export const mapText = (map: CityMap) => JSON.stringify(cleanMap(map));

/** What a map holds, for the stage's bar and the editor */
export function census(map: CityMap) {
  return {
    tiles: map.size[0] * map.size[1],
    hills: map.hills.length,
    water: map.water.length,
    streets: map.streets.length,
    streetLength: Math.round(map.streets.reduce((a, s) => a + lengthOf(s.pts), 0)),
    zones: map.zones.length,
    places: map.places.length,
  };
}

/** Whether a map is still blank: nothing drawn on it but the places it started with */
export const isBlank = (map: CityMap) => !map.hills.length && !map.water.length && !map.streets.length && !map.zones.length;
