/*
 * Westlake Park's people who come with its chunk (docs/westlake-plan.md Phase 7; DOM-free, tested in
 * tests/parkcrowd.test.ts), out of the boot: parkstands3d.ts hands them to the city's crowd (life.ts `addPeople()`)
 * and parklife3d.ts draws the woodland walk's dogs.
 *
 * - **The band** (`BAND`): a brass band of six at the bandstand, seated in a horseshoe facing the benches on the
 *   lawn (three cornets in front, a trombone, the drummer and a tuba behind), playing from 6 to 9:30 pm on five
 *   evenings in seven (`bandOn()`: which ones seeded by the day, the same for everyone); its listeners on the
 *   benches round it while it plays (`LISTENERS`).
 * - **The Lakehouse Café** (`DINERS`, `WAITER`): people eating at its tables from 8 am to 6 pm (`CAFE_HOURS`), a
 *   waiter going from the door to the tables and back, stopping at each to serve.
 * - **The woodland walk** (`RAMBLE_PEOPLE`, `RAMBLE_DOGS`): walkers, joggers and dog walkers out along the ramble's
 *   paths and back.
 */
import type { Idle } from './idle';
import { BANDSTAND, LAKEHOUSE, LAKEHOUSE_DOOR, PATHS, onCafeDeck, type Pt } from './westlake';
import { BANDSTAND_BENCHES, CAFE_TABLES } from './parkstands';
import { COATS, JOG_PACE, WALK_PACE, lanePerson, type Dog, type ParkPerson } from './parklife';

/** The lawn's top (world.ts's SLAB) */
const SLAB = 0.15;

/* ---------- The band ---------- */

/** When it plays: these hours (the city's), on `days` evenings in seven */
export const BAND_HOURS = { from: 18, until: 21.5, days: 5 };
/** Does the band play on day `day` (a count of days, clock.ts `clockAt()`): five in seven, seeded by the day */
export function bandDay(day: number) {
  // (each week's run of seven a shuffle of five on and two off, so no week goes without and none has more)
  const week = Math.floor(day / 7);
  const h = (Math.imul(week + 7919, 2654435761) >>> 0) % 7;
  const off = [h, (h + 3) % 7];
  return !off.includes(((day % 7) + 7) % 7);
}
/** Is it playing at this hour on this day */
export const bandOn = (day: number, hour: number) => bandDay(day) && hour >= BAND_HOURS.from && hour < BAND_HOURS.until;
/** Whether it's playing now, as the park's chunk last saw it (sound.ts plays its music while it is) */
export const BAND_NOW = { on: false };

/** The bandstand's floor (the stone drum's cap) and a chair's seat over it */
export const BAND_FLOOR = SLAB + BANDSTAND.base + 0.1;
export const BAND_SEAT = 0.36;
export type Part = 'cornet' | 'trombone' | 'drum' | 'tuba';
/** Where each player sits (facing north, the benches' side: ry PI), their part */
export const BAND: { x: number; z: number; ry: number; part: Part }[] = (() => {
  const [cx, cz] = BANDSTAND.c;
  // (a horseshoe: the front row's ends forward and turned in, the back row behind on the steps' side)
  const seat = (dx: number, dz: number, turn: number, part: Part) => ({ x: cx + dx, z: cz + dz, ry: Math.PI + turn, part });
  return [
    seat(-1.25, 0.0, 0.35, 'cornet'),
    seat(0, 0.35, 0, 'cornet'),
    seat(1.25, 0.0, -0.35, 'cornet'),
    seat(-1.35, 1.55, 0.2, 'trombone'),
    seat(0, 1.85, 0, 'drum'),
    seat(1.35, 1.55, -0.2, 'tuba'),
  ];
})();
/** The players as the crowd's idle people: there only while the band plays (`now()`: the day count) */
export function bandPeople(now: () => number): Idle[] {
  return BAND.map((s) => ({ x: s.x, z: s.z, ry: s.ry, y: BAND_FLOOR + BAND_SEAT, act: s.part === 'drum' ? 'drum' : 'brass', when: (h) => bandOn(now(), h) }));
}
/** The bandstand's benches (parkstands.ts's, the same ring): two listeners a bench, facing the band */
export function listeners(now: () => number): Idle[] {
  return BANDSTAND_BENCHES.flatMap((b) =>
    [-0.22, 0.22].map((s) => {
      // (along the bench: its right is (cos ry, -sin ry); a hair forward of its back)
      const [rx, rz] = [Math.cos(b.ry), -Math.sin(b.ry)];
      return { x: b.at[0] + rx * s - Math.sin(b.ry) * 0.04, z: b.at[1] + rz * s - Math.cos(b.ry) * 0.04, ry: b.ry, y: SLAB + 0.3, act: 'sit' as const, when: (h: number) => bandOn(now(), h) };
    })
  );
}

/* ---------- The café ---------- */

export const CAFE_HOURS = { open: 8, close: 18 };
export const cafeOpen = (hour: number) => hour >= CAFE_HOURS.open && hour < CAFE_HOURS.close;
/** A table's floor: the deck's or the lawn's */
const floorAt = ([x, z]: Pt) => SLAB + (onCafeDeck(x, z) ? LAKEHOUSE.deckY : 0);
/** A table's chairs (parkstands3d.ts draws them there): three round it, 0.62 out, the first turned by its x */
export const chairsOf = ([x, z]: Pt): Pt[] => Array.from({ length: 3 }, (_, k) => ((a) => [x + Math.cos(a) * 0.62, z + Math.sin(a) * 0.62] as Pt)((k / 3) * Math.PI * 2 + x));
/** How many sit at each table (some empty), in order of `CAFE_TABLES` */
export const SEATED = [2, 1, 3, 0, 2, 1, 2, 1];
/** The diners: at their tables' chairs, facing the table, eating; while the café's open */
export const DINERS: Idle[] = CAFE_TABLES.flatMap((t, i) =>
  chairsOf(t)
    .slice(0, SEATED[i] ?? 0)
    .map(([x, z]) => {
      // (a little in from the chair's middle, towards the table)
      const [px, pz] = [x + (t[0] - x) * 0.06, z + (t[1] - z) * 0.06];
      return { x: px, z: pz, ry: Math.atan2(t[0] - px, t[1] - pz), y: floorAt(t) + 0.46, act: 'eat' as const, when: cafeOpen };
    })
);

/**
 * The waiter's round: from the door along the strip's tables (from their walk side), across the inlet walk to the
 * deck's near row (from its open side on the walk), back to the door; a pause at each table with someone at it
 */
export const WAITER_PAUSE = { table: 5, door: 8 };
interface Stop {
  at: Pt;
  /** Facing while stopped there */
  ry: number;
  wait: number;
}
const STOPS: Stop[] = (() => {
  const out: Stop[] = [{ at: [LAKEHOUSE_DOOR.x - 0.5, LAKEHOUSE_DOOR.z], ry: Math.PI / 2, wait: WAITER_PAUSE.door }];
  const served = CAFE_TABLES.map((t, i) => ({ t, n: SEATED[i] ?? 0 })).filter((q) => q.n);
  // (the strip's, west of the pavilion: stood on their west side facing east; then the deck's near row, stood on its east edge facing west)
  const strip = served.filter((q) => q.t[0] > LAKEHOUSE.deck[2]).sort((a, b) => a.t[1] - b.t[1]);
  const near = Math.max(...CAFE_TABLES.filter((t) => onCafeDeck(t[0], t[1])).map((t) => t[0]));
  const deck = served.filter((q) => q.t[0] === near).sort((a, b) => b.t[1] - a.t[1]);
  for (const q of strip) out.push({ at: [q.t[0] - 1.1, q.t[1]], ry: Math.PI / 2, wait: WAITER_PAUSE.table });
  for (const q of deck) out.push({ at: [q.t[0] + 0.95, q.t[1]], ry: -Math.PI / 2, wait: WAITER_PAUSE.table });
  return out;
})();
/** The round's legs: walking from each stop to the next at a stroll, the time each starts */
const ROUND = (() => {
  let t = 0;
  const legs = STOPS.map((s, i) => {
    const n = STOPS[(i + 1) % STOPS.length];
    const len = Math.hypot(n.at[0] - s.at[0], n.at[1] - s.at[1]);
    const leg = { s, n, t0: t, walk: len / WALK_PACE };
    t += s.wait + leg.walk;
    return leg;
  });
  return { legs, len: t };
})();
export const WAITER_STOPS = STOPS;
/** The waiter, a mover in the crowd: on their round while the café's open (by the city's hour now, `hourNow()`), out of the world when it's shut */
export function waiter(hourNow: () => number): ParkPerson {
  return {
    id: 'cafe-waiter',
    trim: false,
    at: (t, m) => {
      if (!cafeOpen(hourNow())) return Object.assign(m, { x: -1e5, z: -1e5, clip: 'idle' as const, speed: 0 });
      const u = ((t % ROUND.len) + ROUND.len) % ROUND.len;
      const leg = ROUND.legs.findLast((l) => l.t0 <= u)!;
      const into = u - leg.t0;
      const { s, n } = leg;
      if (into < s.wait) {
        Object.assign(m, { x: s.at[0], z: s.at[1], ry: s.ry, clip: s === STOPS[0] ? ('idle' as const) : ('serve' as const), speed: 0 });
      } else {
        const f = Math.min(1, (into - s.wait) / leg.walk);
        Object.assign(m, { x: s.at[0] + (n.at[0] - s.at[0]) * f, z: s.at[1] + (n.at[1] - s.at[1]) * f, ry: Math.atan2(n.at[0] - s.at[0], n.at[1] - s.at[1]), clip: 'walk' as const, speed: WALK_PACE });
      }
      m.y = floorAt([m.x, m.z]);
      return m;
    },
  };
}

/* ---------- The woodland walk ---------- */

/** An open line with `d` taken off each end (so a lane's turn, and a dog ahead on its lead, stay on the path) */
function cut(pts: Pt[], d: number): Pt[] {
  const trim = (q: Pt[]) => {
    let left = d;
    const out = [...q];
    while (out.length > 2) {
      const l = Math.hypot(out[1][0] - out[0][0], out[1][1] - out[0][1]);
      if (l > left) {
        const f = left / l;
        out[0] = [out[0][0] + (out[1][0] - out[0][0]) * f, out[0][1] + (out[1][1] - out[0][1]) * f];
        break;
      }
      left -= l;
      out.shift();
    }
    return out;
  };
  return trim(trim(pts).reverse()).reverse();
}
/** Who goes along the ramble's paths (out along one side and back along the other): walkers (some with a dog) and joggers */
const RAMBLE = [
  { path: 'ramble-n', walkers: 3, dogs: [0, 2], joggers: 2 },
  { path: 'ramble-e', walkers: 3, dogs: [1], joggers: 2 },
  { path: 'ramble-w', walkers: 1, dogs: [], joggers: 0 },
];
const made = (() => {
  const people: ParkPerson[] = [];
  const dogs: (Dog & { person: ParkPerson })[] = [];
  RAMBLE.forEach((r, ri) => {
    const pts = cut(PATHS.find((p) => p.id === r.path)!.pts, 1.8);
    for (let k = 0; k < r.walkers; k++) {
      const p = lanePerson(`${r.path}-walk-${k}`, pts, 0.3, WALK_PACE, k / r.walkers + ri * 0.21, k % 2 === 1, r.dogs.includes(k));
      people.push(p.person);
      if (p.dog) dogs.push({ walker: -1, coat: COATS[(dogs.length + 3) % COATS.length], size: [0.85, 1.1, 0.95][dogs.length % 3], at: p.dog, person: p.person });
    }
    for (let k = 0; k < r.joggers; k++) people.push(lanePerson(`${r.path}-jog-${k}`, pts, 0.6, JOG_PACE, k / r.joggers + 0.13 + ri * 0.37, k % 2 === 1, false).person);
  });
  return { people, dogs };
})();
export const RAMBLE_PEOPLE = made.people;
export const RAMBLE_DOGS = made.dogs;
