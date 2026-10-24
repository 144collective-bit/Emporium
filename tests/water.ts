// What stands on (or in) the water a boat must keep off, for the river's tests (riverlife, riverbus, boating)
import { RIVER } from '../src/scripts/city3d/layout';
import { LIBERTY_RECTS } from '../src/scripts/city3d/liberty';
import { TOWER, TOWERS, HX } from '../src/scripts/city3d/harbour';
import { BARGE, DECKS } from '../src/scripts/city3d/waterfront';
import { ESPLANADE_DECKS, OVERLOOKS, PONTOON } from '../src/scripts/city3d/boulevard';
import { YACHTS } from '../src/scripts/city3d/boulevarddress';
import { JETTIES } from '../src/scripts/city3d/outer';
import { MOORED } from '../src/scripts/city3d/boats';
import { riverBridges } from '../src/scripts/city3d/streetplan';
import { BRIDGE_PIERS, PIER_HALF } from '../src/scripts/city3d/waterfront';
import { STOPS } from '../src/scripts/city3d/riverbus';

export type Rect = [number, number, number, number];
/** Everything standing on (or in) the water a boat must keep off (but the river bus's own landings: `LANDINGS`) */
export const OBSTACLES: [string, Rect][] = [
  ...LIBERTY_RECTS.slice(1).map((r): [string, Rect] => ['Liberty Bridge', r]),
  ...TOWERS.map((z): [string, Rect] => ['Harbour Bridge', [HX - TOWER.base.hu - TOWER.base.cut, z - TOWER.base.hz, HX + TOWER.base.hu + TOWER.base.cut, z + TOWER.base.hz]]),
  ...riverBridges()
    .filter((b) => b.street === 'highway')
    .flatMap((b) => BRIDGE_PIERS.map((z): [string, Rect] => ['a highway pier', [b.x0, z - PIER_HALF, b.x1, z + PIER_HALF]])),
  ...DECKS.map((r): [string, Rect] => ['a deck', r]),
  ...ESPLANADE_DECKS.map((r): [string, Rect] => ['the esplanade', r]),
  ...OVERLOOKS.map((o): [string, Rect] => ['an overlook', o.rect as Rect]),
  ['the pontoon', PONTOON as Rect],
  ...YACHTS.map((y): [string, Rect] => ['a yacht', [y.x - y.len / 2, y.z - y.beam / 2, y.x + y.len / 2, y.z + y.beam / 2]]),
  ['the barge', BARGE as Rect],
  ...MOORED.map((m): [string, Rect] => ['a moored boat', [m.x - 0.8, m.z - 0.35, m.x + 0.8, m.z + 0.35]]),
  ...JETTIES.map((j): [string, Rect] => ['a jetty', [j.x - 1.1, j.bank === 'north' ? RIVER[0] - 0.1 : RIVER[1] - 0.75, j.x + 1.1, j.bank === 'north' ? RIVER[0] + 0.75 : RIVER[1] + 0.1]]),
];
/** The river bus's landings */
export const LANDINGS: [string, Rect][] = STOPS.map((s) => [`the ${s.name} landing`, s.landing]);
export const inRect = ([x, z]: [number, number], r: Rect, m: number) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
