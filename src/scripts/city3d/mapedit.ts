/*
 * The map creator's rules (docs/cities-plan.md, Phase 2; DOM-free, tested in tests/mapedit.test.ts): what each tool
 * does to a map (citymap.ts), undo and redo, snapping a point to the streets already drawn, what's under a point,
 * and the drafts kept in the browser. mapeditor.ts is the screen; it only draws these and calls them.
 *
 * Every change makes a new map through `cleanMap()`, so a draft is always a sound file.
 */
import { HILL, LIMITS, cleanId, cleanMap, curveOf, shoreOf, inMap, inPoly, type CityMap, type Pt, type StreetKind, type WaterKind } from './citymap';

/** The tools, in the order of the tool strip */
export const TOOLS = ['move', 'street', 'water', 'hill', 'spawn', 'erase'] as const;
export type Tool = (typeof TOOLS)[number];
export const TOOL_NAMES: Record<Tool, string> = { move: 'Move', street: 'Street', water: 'Water', hill: 'Hill', spawn: 'Arrive', erase: 'Erase' };

/** How many steps back undo keeps */
export const UNDO_MAX = 100;

export interface Edit {
  map: CityMap;
  past: CityMap[];
  future: CityMap[];
}
export const newEdit = (map: CityMap): Edit => ({ map, past: [], future: [] });

/** A change: the map before goes on the undo list, and redo is forgotten. The same map again changes nothing. */
export function commit(ed: Edit, next: CityMap | null): Edit {
  if (!next || JSON.stringify(next) === JSON.stringify(ed.map)) return ed;
  return { map: next, past: [...ed.past, ed.map].slice(-UNDO_MAX), future: [] };
}
export function undo(ed: Edit): Edit {
  if (!ed.past.length) return ed;
  return { map: ed.past[ed.past.length - 1], past: ed.past.slice(0, -1), future: [ed.map, ...ed.future] };
}
export function redo(ed: Edit): Edit {
  if (!ed.future.length) return ed;
  return { map: ed.future[0], past: [...ed.past, ed.map], future: ed.future.slice(1) };
}

/** A new id of a kind that no item of the list has */
function freshId(list: readonly { id: string }[], prefix: string) {
  const taken = new Set(list.map((i) => i.id));
  let n = list.length + 1;
  while (taken.has(`${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
}

/** A street through the points drawn; null when it's too short to be one or the map is full */
export function addStreet(map: CityMap, kind: StreetKind, pts: readonly Pt[], level: 0 | 1 = 0): CityMap | null {
  if (pts.length < 2 || map.streets.length >= LIMITS.streets) return null;
  const next = cleanMap({ ...map, streets: [...map.streets, { id: freshId(map.streets, kind), kind, pts, level }] });
  return next && next.streets.length > map.streets.length ? next : null;
}

/** Water inside the outline drawn; null when it's no outline or the map is full */
export function addWater(map: CityMap, kind: WaterKind, poly: readonly Pt[]): CityMap | null {
  if (poly.length < 3 || map.water.length >= LIMITS.water) return null;
  const next = cleanMap({ ...map, water: [...map.water, { id: freshId(map.water, kind), kind, poly }] });
  return next && next.water.length > map.water.length ? next : null;
}

/** A hill; its size is clamped to what a hill may be */
export function addHill(map: CityMap, at: Pt, radius: number, height: number): CityMap | null {
  if (map.hills.length >= LIMITS.hills || !inMap(map, at)) return null;
  return cleanMap({ ...map, hills: [...map.hills, { id: freshId(map.hills, 'hill'), at, radius: Math.max(HILL.radius[0], radius), height }] });
}

/** Degen's arrival moved, facing the way given */
export function moveSpawn(map: CityMap, at: Pt, yaw = map.spawn.yaw): CityMap | null {
  if (!inMap(map, at)) return null;
  return cleanMap({ ...map, spawn: { at, yaw } });
}

/** The nearest point of a line to p, and how far off it is */
export function nearestOn(line: readonly Pt[], p: Pt): { at: Pt; d: number } {
  let best = { at: line[0], d: Math.hypot(p[0] - line[0][0], p[1] - line[0][1]) };
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1];
    const [bx, bz] = line[i];
    const len2 = (bx - ax) ** 2 + (bz - az) ** 2;
    const t = len2 ? Math.min(1, Math.max(0, ((p[0] - ax) * (bx - ax) + (p[1] - az) * (bz - az)) / len2)) : 0;
    const at: Pt = [ax + (bx - ax) * t, az + (bz - az) * t];
    const d = Math.hypot(p[0] - at[0], p[1] - at[1]);
    if (d < best.d) best = { at, d };
  }
  return best;
}

/**
 * A point being drawn pulled onto the streets already there, within `reach`: a street's drawn point or end first
 * (so streets join end to end), then the nearest point along one (a junction partway). Further off, it's left.
 */
export function snap(map: Pick<CityMap, 'streets'>, p: Pt, reach: number): { at: Pt; snapped: boolean } {
  let best: { at: Pt; d: number } | null = null;
  for (const s of map.streets)
    for (const q of s.pts) {
      const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (d <= reach && (!best || d < best.d)) best = { at: [q[0], q[1]], d };
    }
  if (best) return { at: best.at, snapped: true };
  for (const s of map.streets) {
    const n = nearestOn(curveOf(s.pts), p);
    if (n.d <= reach && (!best || n.d < best.d)) best = n;
  }
  return best ? { at: [Math.round(best.at[0] * 100) / 100, Math.round(best.at[1] * 100) / 100], snapped: true } : { at: p, snapped: false };
}

export type Hit = { type: 'street' | 'water' | 'hill'; id: string };

/** What's under a point, for the eraser: a street within `reach` first, then a hill's top, then water, then a hill */
export function hit(map: CityMap, p: Pt, reach: number): Hit | null {
  let best: { id: string; d: number } | null = null;
  for (const s of map.streets) {
    const d = nearestOn(curveOf(s.pts), p).d;
    if (d <= reach && (!best || d < best.d)) best = { id: s.id, d };
  }
  if (best) return { type: 'street', id: best.id };
  for (const h of map.hills) if (Math.hypot(p[0] - h.at[0], p[1] - h.at[1]) <= reach) return { type: 'hill', id: h.id };
  for (let i = map.water.length - 1; i >= 0; i--) if (inPoly(shoreOf(map.water[i].poly), p)) return { type: 'water', id: map.water[i].id };
  // (the smallest hill over the point: the one drawn on top)
  const over = map.hills.filter((h) => Math.hypot(p[0] - h.at[0], p[1] - h.at[1]) <= h.radius).sort((a, b) => a.radius - b.radius)[0];
  return over ? { type: 'hill', id: over.id } : null;
}

/** The map without the thing hit */
export function remove(map: CityMap, h: Hit): CityMap | null {
  return cleanMap({
    ...map,
    streets: h.type === 'street' ? map.streets.filter((s) => s.id !== h.id) : map.streets,
    water: h.type === 'water' ? map.water.filter((w) => w.id !== h.id) : map.water,
    hills: h.type === 'hill' ? map.hills.filter((x) => x.id !== h.id) : map.hills,
  });
}

/* ---------- The drafts kept in this browser ---------- */

/**
 * Where the drafts are kept. Not in the game's backup (backup.ts `BACKUP_KEYS`): putting a game backup back removes
 * every key it doesn't hold, which would take the owner's drafts with it. A draft's own backup is its exported file.
 */
export const MAPS_KEY = 'degen-city-maps-v1';
export const STORE_V = 1;
/** How many cities' drafts are kept */
export const STORE_MAX = 12;
export interface MapStore {
  v: number;
  maps: Record<string, CityMap>;
}

/** The drafts from storage's text: sound maps only, each under its own id; empty when there's nothing readable */
export function readStore(text: string | null): MapStore {
  const store: MapStore = { v: STORE_V, maps: {} };
  if (!text) return store;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return store;
  }
  const maps = raw && typeof raw === 'object' ? (raw as { maps?: unknown }).maps : null;
  if (!maps || typeof maps !== 'object') return store;
  for (const v of Object.values(maps as Record<string, unknown>)) {
    if (Object.keys(store.maps).length >= STORE_MAX) break;
    const m = cleanMap(v);
    if (m) store.maps[m.id] = m;
  }
  return store;
}

/** The store with a draft put in (replacing that city's last) */
export const withDraft = (store: MapStore, map: CityMap): MapStore => ({ v: STORE_V, maps: { ...store.maps, [map.id]: map } });
/** The store without a city's draft */
export function withoutDraft(store: MapStore, id: string): MapStore {
  const maps = { ...store.maps };
  delete maps[id];
  return { v: STORE_V, maps };
}

/** The exported file's name: open-level.city.json */
export const fileName = (map: CityMap) => `${cleanId(map.id) || 'city'}.city.json`;
/** The biggest file Import reads (a full map is well under it) */
export const FILE_MAX = 2_000_000;

/**
 * An imported file's map, kept under the id of the city being edited (a file drawn as one city can be brought into
 * another); null when it isn't a map file.
 */
export function readFile(text: string, into: Pick<CityMap, 'id' | 'name'>): CityMap | null {
  if (text.length > FILE_MAX) return null;
  try {
    const m = cleanMap(JSON.parse(text));
    return m ? { ...m, id: into.id, name: into.name } : null;
  } catch {
    return null;
  }
}

/* ---------- The plan view ---------- */

/** The plan's view: the map point at the middle of the screen, and how many pixels a tile is */
export interface View {
  x: number;
  z: number;
  scale: number;
}
export const SCALE = { min: 0.4, max: 24 } as const;

/** The view that shows the whole level in a screen `w` x `h`, with a margin */
export function fitView(size: readonly [number, number], w: number, h: number, margin = 24): View {
  const scale = Math.min((w - margin * 2) / size[0], (h - margin * 2) / size[1]);
  return { x: 0, z: 0, scale: Math.min(SCALE.max, Math.max(SCALE.min, scale)) };
}
/** A screen point's place on the map (the screen's middle is the view's x, z; north is up) */
export const toMap = (v: View, w: number, h: number, sx: number, sy: number): Pt => [v.x + (sx - w / 2) / v.scale, v.z + (sy - h / 2) / v.scale];
/** A map point's place on the screen */
export const toScreen = (v: View, w: number, h: number, p: Pt): [number, number] => [w / 2 + (p[0] - v.x) * v.scale, h / 2 + (p[1] - v.z) * v.scale];
/** The view zoomed by `k` about a screen point, which stays over the same spot of the map */
export function zoomAt(v: View, w: number, h: number, sx: number, sy: number, k: number): View {
  const scale = Math.min(SCALE.max, Math.max(SCALE.min, v.scale * k));
  const [mx, mz] = toMap(v, w, h, sx, sy);
  return { x: mx - (sx - w / 2) / scale, z: mz - (sy - h / 2) / scale, scale };
}
/** The view moved by a drag of dx, dy pixels, its middle kept on the level */
export function panBy(v: View, size: readonly [number, number], dx: number, dy: number): View {
  const clampTo = (c: number, half: number) => Math.min(half, Math.max(-half, c));
  return { x: clampTo(v.x - dx / v.scale, size[0] / 2), z: clampTo(v.z - dy / v.scale, size[1] / 2), scale: v.scale };
}
