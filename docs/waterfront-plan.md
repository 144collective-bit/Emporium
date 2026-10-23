# The Trenches' waterfront (a proposal: nothing built yet)

The owner's call: a waterfront area on The Trenches' side of the river. This
is the starting plan: what's there today, the choices, some suggestions and
the questions to settle before anything is built. Build it one step at a
time with the owner's sign-off, like every other plan in `docs/`.

## Done first: the turned blocks

Row A's two eastern blocks, `trench-a2` and `trench-a3`, are turned round
(`TURNED` in `projects.ts`): the recipe lays them as before and the rows
are mirrored north for south. Their businesses now face north across the
bank avenue to the river: Trench Arms, The Rusty Nail, Club PULSE (still on
its corner with the cross street), Block Bodega and Avenue Deli. The
brownstones that faced the river face Trench Avenue and the el. Corner-shop
ownership is by id, so saves are unchanged. These fronts are where the
waterfront would start.

## What's there today

- **The stretch:** the south bank from the highway's west bridge (x -215)
  to Liberty Bridge (x -23.5), where the town's promenade begins
  (`PROMENADE.x` starts at -42). About 190 tiles, some 340 m.
- **The land:** very little. The river wall is at z 86 and the bank avenue
  (`BANK`, two lanes each way with a median) has its kerbs at z 88.3 and 95.7,
  with row A from 96.5. Between the water and the kerb there are only about
  2 tiles (3.7 m) of land, with no promenade, benches, railings, lamps or
  jetties (the only jetty on this side is Liberty Bridge's, at x -24).
- **Crossings:** none between the highway (x -215) and Liberty Bridge. The
  nearest road bridge is the x -4.5 avenue.
- **Across the water:** the north bank avenue (z 64.5) and the outskirts'
  trees, open land west of the Parkway. Downtown and the Emporium are up
  the river to the east.
- **On the water:** three boats run the whole river in Liberty Bridge's
  three lanes (`BOAT_LANES`), spent near you.
- **Behind it:** row A (a0 and a1 still rows facing out on all four sides,
  a2 and a3 turned), and row W's low commercial at the west end
  (`trench-w0`, warehouses, the auto shop, the scrap yard).

## The big choice: where the room comes from

1. **Out over the water.** A timber boardwalk on piles along the south
   wall, 4-5 tiles out. Nothing on land moves. The river is 15 wide, so the
   boats' lanes would have to shift north or narrow (checked in a test).
2. **Calm the bank avenue.** West of the south row's bend, one lane each
   way and no median, giving about 4 tiles to a wide riverside walk.
   Traffic follows by itself (routes are generated from the street plan);
   the snapshot changes on purpose.
3. **Give up a block.** Turn `trench-a0` or `trench-a1` into the
   waterfront's hub (a pier plaza, a market hall) and keep the rest a
   narrow walk.
4. **A mix (my pick):** the boardwalk out over the water (1) for the
   length, plus one hub (3) in front of the turned blocks or on a1, and the
   avenue kept as it is. That's the most room for the least disruption.

## Suggestions (pick and mix)

The feel: a working waterfront that came alive, Brooklyn-style (Red Hook,
DUMBO): old docks, brick and steel, sodium light, murals with made-up
words, people out at night. Gritty like the rest of The Trenches, never
glossy, nothing threatening.

- **The boardwalk:** a timber deck along the wall, railings at the water,
  sodium lamps (`lampKind()`), benches facing the river, trees in planters,
  string lights in places. It joins the town's promenade at -42 and Liberty
  Bridge's south stairs.
- **A pier (the centrepiece):** a long pier out into the river, opposite
  the turned blocks, with a lit arch sign (a made-up name: "Pier 7",
  "Trench Pier"...), coin binoculars, people fishing off the end,
  benches, and the Emporium in view up the river.
- **A night market:** shipping-container stalls and food trucks with
  picnic tables and string lights. Scenery first, later perhaps stalls you
  run for Dorras, like the market square.
- **The old docks:** a dock crane (the `crane` kit exists), stacked
  containers, mooring bollards, a rusty barge tied up, a warehouse turned
  lofts, a mural on the flood wall.
- **Things to do:** a basketball court on a pier deck, a skate spot under
  the boardwalk's ramp, a boathouse with kayaks.
- **Boats:** a few tied up at new jetties. Bigger: a **ferry or water
  taxi** stop, a new way to get about next to taxis and the metro (growth
  plan Phase 8 style), from The Trenches to downtown's jetties.
- **Club PULSE on the water:** a riverside terrace, the queue along the
  rail at night.
- **Sound:** water lapping, gulls by day, a foghorn now and then, the
  market's hum, the club's beat over the water (a `waterfront` layer in
  `ambience.ts`).
- **Later, the game:** fishing as a mini-game (XP, missions, badges), a
  waterfront business to own (Dorras only, like the corner shops).

## How it would be built

- `waterfront.ts` (DOM-free, tested in `tests/waterfront.test.ts`): the
  boardwalk, pier, hub, jetties and dressing as data, z written from
  `RIVER` and `SOUTH_ROAD` (never fixed numbers south of the river), its
  solids in `SOLIDS`, trees and lamps kept off it, the boats' lanes clear,
  every top under the Emporium.
- `waterfront3d.ts` draws it as sites (`site()`, merged by the tiles),
  details near only, phones lighter (the trim's rules).
- Walking on a boardwalk out over the water needs ground there: a slab or
  a `footbridgeY()`-style height for the deck, and the river walls opened
  where you step on.
- Works at both world sizes (`npm run test:wide`); the snapshot only grows
  unless a choice above moves something on purpose.

### Steps (each with the owner's sign-off)

1. **The walk:** the boardwalk (or the wider walk) along the whole stretch,
   railings, lamps, benches, planters, a zebra over the bank avenue to the
   turned blocks' fronts.
2. **The pier and the hub:** the centrepiece, the night market, people.
3. **The old docks:** crane, containers, barge, murals, the sound.
4. **Optional, the game:** a ferry, fishing, a business to own.

## Questions for the owner

1. **Room:** out over the water, a narrower bank avenue, a block given up,
   or the mix?
2. **How far:** only The Trenches' stretch (-215 to -42), or carried on to
   join the town's promenade and Liberty Bridge? And the north bank
   opposite (outskirts today)?
3. **The feel:** gritty working docks, a lively night spot (market, lights,
   music), a calmer riverside park, or a blend?
4. **Scenery or things to do:** scenery first, or something to play from
   the start (fishing, a ferry, a stall or business)?
5. **The pier:** yes or no, and its name (made up)?
6. **Boats:** a few tied up, or a ferry / water taxi as a way to travel?
7. **Row A's other blocks** (a0, a1): turn them to face the river too?
8. **Club PULSE:** give it a riverside terrace?
