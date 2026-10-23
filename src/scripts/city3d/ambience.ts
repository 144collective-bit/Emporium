/*
 * What the city sounds like where you are (docs/growth-plan.md Phase 8;
 * DOM-free, tested in tests/ambience.test.ts): how much of each ambient layer
 * the sound engine (sound.ts) mixes in round a spot, so the sound follows
 * the district you're in rather than centring on the Emporium: the city's
 * hum in town, fading out past it; the river close to the water; the rush of
 * traffic beside the ring highway and the town's avenues; wind over the open
 * land and the woods; the arcade's beat near the Emporium; and in The
 * Trenches (the grit step) the hood's own: distant sirens and a dog now and
 * then (`hood`), a boombox by a walk-up's stoop (`boombox`), Club PULSE's
 * beat through its walls by the door (`club`); the el's rumble follows the
 * train itself (metro3d.ts `rumbleAt()`).
 */
import { CITY_EXT, RIVER } from './layout';
import { PLAN, distToStreet } from './streetplan';
import { fromHighway, insideHighway } from './highway';
import { DOORS } from './solids';
import { TRENCH_RECT, inTrenches } from './trenches';
import { BOOMBOXES } from './grit';
import { CLUB } from './avenue';

export interface Ambience {
  /** The town's hum, 0-1 */
  city: number;
  /** Water lapping, 0-1 */
  water: number;
  /** Traffic's rush, 0-1 */
  road: number;
  /** Wind over open land, 0-1 */
  open: number;
  /** The Emporium's beat, 0-1 */
  beat: number;
  /** The Trenches: sirens far off, a dog now and then, 0-1 */
  hood: number;
  /** A boombox by a stoop, 0-1 */
  boombox: number;
  /** Club PULSE's beat, muffled by its walls, 0-1 */
  club: number;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const AVENUES = PLAN.streets.filter((s) => s.kind === 'avenue');
const EMPORIUM = DOORS.find((d) => d.id === 'emporium')!;

/**
 * The layers at x, z; `lift` is how far above it the listener is (the City
 * view's camera): the beat fades with it as before, and the ground's layers
 * soften to a wash of the town
 */
export function ambienceAt(x: number, z: number, lift = 0): Ambience {
  // Out of town: how far past the town's edge
  const ox = Math.max(CITY_EXT[0] - x, x - CITY_EXT[1], 0);
  const oz = Math.max(CITY_EXT[0] - z, z - CITY_EXT[1], 0);
  const out = Math.hypot(ox, oz);
  const city = 1 - smooth(0, 70, out);
  const river = Math.max(RIVER[0] - z, z - RIVER[1], 0);
  const water = 1 - smooth(3, 28, river);
  // The highway carries traffic all the way round; the avenues only inside it (out past it they're empty)
  let avenue = Infinity;
  if (insideHighway(x, z)) for (const s of AVENUES) avenue = Math.min(avenue, distToStreet(s, [x, z]));
  const road = Math.max(1 - smooth(10, 45, fromHighway(x, z)), 0.6 * (1 - smooth(4, 22, avenue)));
  const beat = 1 - smooth(8, 36, Math.hypot(x - EMPORIUM.x, z - EMPORIUM.z) + lift * 0.4);
  const k = 1 - 0.6 * smooth(20, 160, lift);
  // The Trenches: all of it inside, fading out over 30 past its edge
  const [tx0, tz0, tx1, tz1] = TRENCH_RECT;
  const past = inTrenches(x, z) ? 0 : Math.hypot(Math.max(tx0 - x, x - tx1, 0), Math.max(tz0 - z, z - tz1, 0)) + 4;
  const hood = 1 - smooth(0, 30, past);
  let box = Infinity;
  for (const b of BOOMBOXES) box = Math.min(box, Math.hypot(x - b.x, z - b.z));
  const boombox = 1 - smooth(2, 20, box + lift * 0.5);
  const club = 1 - smooth(3, 32, Math.hypot(x - CLUB.door.x, z - CLUB.door.z) + lift * 0.5);
  return { city, water: water * k, road: road * k, open: (1 - city) * k, beat, hood: hood * k, boombox, club };
}
