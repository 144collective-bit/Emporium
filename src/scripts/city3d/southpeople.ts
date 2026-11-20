/*
 * The south's people about (docs/south-plan.md Phase 6c; the owner's picks, 2026-11-20): on the High Road outside its
 * pub, takeaway, fish bar and shops, on the estate's podium deck, on the Circus's sunken plaza and its tiers, in St
 * Aldwyn's churchyard and at the rec ground. Each stands (or sits) on what's there, where index.ts puts them in the
 * crowd (phones: half of them, the trim); the walkers round the High Road's and the village's blocks are life.ts's.
 * DOM-free, tested in tests/southpeople.test.ts.
 */
import type { IdleAct } from './crowdclips';
import { SHOPS } from './highroad';
import { PLAZA } from './circus';
import { DECKS } from './southblocks';
import { surfaceAt } from './southline';

export interface SouthPerson {
  x: number;
  z: number;
  /** Where their feet are (a seat's top for a sitter) */
  y: number;
  /** Their facing (life.ts `Idle`: 0 is +z, PI / 2 is +x) */
  ry: number;
  act: IdleAct;
  /** Which part of the south (for the tests and the trim) */
  where: 'high-road' | 'deck' | 'plaza' | 'churchyard' | 'rec';
}

/** The facing towards a point */
const facing = (x: number, z: number, tx: number, tz: number) => Math.atan2(tx - x, tz - z);

/** Outside a High Road shop: `out` from its front, `side` along it; facing its door, or a partner, or the street */
function atShop(name: string, people: { out: number; side: number; act: IdleAct; face: 'door' | 'street' | 'partner' }[]): SouthPerson[] {
  const s = SHOPS.find((o) => o.name === name);
  if (!s) return [];
  const [fx, fz] = s.face;
  const [sx, sz] = [-fz, fx];
  const spots = people.map((p) => [s.at[0] + fx * p.out + sx * p.side, s.at[1] + fz * p.out + sz * p.side] as const);
  return people.map((p, i) => {
    const [x, z] = spots[i];
    const mate = spots[i % 2 ? i - 1 : i + 1] ?? spots[i];
    const ry = p.face === 'door' ? Math.atan2(-fx, -fz) : p.face === 'street' ? Math.atan2(fx, fz) : facing(x, z, mate[0], mate[1]);
    return { x, z, y: surfaceAt(x, z), ry, act: p.act, where: 'high-road' };
  });
}

/** The pavement in front of the High Road's shops is under a metre deep (front to kerb): people stand in line along it */
const OUT = 0.5;
const HIGH_ROAD: SouthPerson[] = [
  // A pair talking outside the pub, someone on their phone by its door
  ...atShop('The Brook & Lantern', [
    { out: OUT, side: -2.2, act: 'chat', face: 'partner' },
    { out: OUT, side: -1.3, act: 'chat', face: 'partner' },
    { out: OUT, side: 2.6, act: 'phone', face: 'street' },
  ]),
  // Queuing at the takeaway and the fish bar, along the front to the door
  ...atShop('Lucky Star Takeaway', [
    { out: OUT, side: 0.5, act: 'queue', face: 'door' },
    { out: OUT, side: 1.4, act: 'queue', face: 'door' },
  ]),
  ...atShop('Brookside Fish Bar', [
    { out: OUT, side: -0.5, act: 'queue', face: 'door' },
    { out: OUT, side: -1.4, act: 'queue', face: 'door' },
  ]),
  // Looking in the mini mart's and the hardware shop's windows, a pair outside the corner store, one outside the café
  ...atShop('Ends Mini Mart', [{ out: OUT, side: 1.2, act: 'look', face: 'door' }]),
  ...atShop('Hilltop Hardware', [{ out: OUT, side: -1.0, act: 'look', face: 'door' }]),
  ...atShop("Mo's Corner Store", [
    { out: OUT, side: 0.6, act: 'chat', face: 'partner' },
    { out: OUT, side: 1.5, act: 'chat', face: 'partner' },
  ]),
  ...atShop("Rosa's Café", [{ out: OUT, side: 1.5, act: 'phone', face: 'street' }]),
];

/** The Circus's sunken plaza: some sitting round its tiers (clear of the subways' mouths and the station's corridor),
 * a few standing about on its floor */
const PLAZA_PEOPLE: SouthPerson[] = (() => {
  const t = PLAZA.tiers ?? { r0: 5, n: 3, rise: 0.22 };
  const w = (PLAZA.r - t.r0) / t.n;
  // (on the second tier, feet on the first: the tiers' angles clear of the subways at 50, 78, 235 and 285 degrees and the
  // station's corridor at 180)
  const r = t.r0 + w * 1.5;
  const seats = [125, 142, 160, 320, 340, 8, 200];
  const out: SouthPerson[] = seats.map((deg) => {
    const a = (deg * Math.PI) / 180;
    const [x, z] = [PLAZA.x + Math.cos(a) * r, PLAZA.z + Math.sin(a) * r];
    return { x, z, y: PLAZA.floor + t.rise * 2, ry: facing(x, z, PLAZA.x, PLAZA.z), act: 'sit' as IdleAct, where: 'plaza' as const };
  });
  // (on the floor: a pair talking, one on their phone)
  const stand: [number, number, IdleAct][] = [
    [-1.4, 0.6, 'chat'],
    [-0.4, 1.5, 'chat'],
    [2.0, -1.6, 'phone'],
  ];
  stand.forEach(([dx, dz, act], i) => {
    const [x, z] = [PLAZA.x + dx, PLAZA.z + dz];
    const mate = i < 2 ? stand[1 - i] : null;
    out.push({ x, z, y: PLAZA.floor, ry: mate ? facing(x, z, PLAZA.x + mate[0], PLAZA.z + mate[1]) : facing(x, z, PLAZA.x, PLAZA.z + 6), act, where: 'plaza' });
  });
  return out;
})();

/** The estate's podium deck (southblocks.ts `DECKS`): a pair talking in the middle, one looking out at its edge */
const DECK_PEOPLE: SouthPerson[] = (() => {
  const d = DECKS[0];
  if (!d) return [];
  const cx = d.poly.reduce((s, p) => s + p[0], 0) / d.poly.length;
  const cz = d.poly.reduce((s, p) => s + p[1], 0) / d.poly.length;
  return [
    { x: cx - 0.6, z: cz, y: d.y, ry: Math.PI / 2, act: 'chat', where: 'deck' },
    { x: cx + 0.6, z: cz + 0.2, y: d.y, ry: -Math.PI / 2, act: 'chat', where: 'deck' },
    { x: cx + 2.5, z: cz - 3, y: d.y, ry: Math.PI, act: 'phone', where: 'deck' },
  ];
})();

/** St Aldwyn's churchyard: two among the graves; and the rec ground: a few watching from its north edge */
const VILLAGE_PEOPLE: SouthPerson[] = [
  { x: -205, z: 466, ry: 0.6, act: 'look', where: 'churchyard' },
  { x: -212, z: 468, ry: -2.2, act: 'look', where: 'churchyard' },
  { x: -238, z: 550.5, ry: 0, act: 'look', where: 'rec' },
  { x: -236.8, z: 550.8, ry: -1.2, act: 'chat', where: 'rec' },
  { x: -238.2, z: 551.9, ry: 2.2, act: 'chat', where: 'rec' },
  { x: -218, z: 551, ry: 0.2, act: 'phone', where: 'rec' },
].map((p) => ({ ...p, y: surfaceAt(p.x, p.z), act: p.act as IdleAct, where: p.where as SouthPerson['where'] }));

export const SOUTH_PEOPLE: SouthPerson[] = [...HIGH_ROAD, ...PLAZA_PEOPLE, ...DECK_PEOPLE, ...VILLAGE_PEOPLE];

/** The blocks the south's walkers go round (life.ts): the High Road's north side (its south side has the people
 * standing outside its shops) and the village's blocks round St Aldwyn's, on the rolling ground (their height follows it) */
export const SOUTH_WALKS = ['south-b2', 'south-b6', 'south-b9', 'south-b10', 'south-b18'];
