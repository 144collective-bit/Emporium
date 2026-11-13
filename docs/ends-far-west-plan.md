# The Ends' far west, and Degen's compound (a plan)

The owner's call (2026-11-13): Degen's home is a landmark and deserves its
own design; it may move; the Ends still needs work, so build it as the
next phase of building in the Ends. Nothing is built until the owner signs
off a phase; keep this plan up to date.

## The owner's answers (2026-11-13)

| Question | Answer |
| --- | --- |
| Where | A new plot in the Ends' far west (the half of the land `docs/ends-west-plan.md` kept for later) |
| The design | A compound: a walled yard with gates, the house, a double garage and a workshop round a courtyard |
| Extras | A double garage and a wide drive; a roof terrace or balcony; a garden with a gate and a wall |
| How | One plan for the Ends' far-west phase as a whole, the home its centrepiece, the home built first |
| How grand | Made good, not flash: brick and render, one bold colour, a modest lit sign |
| Round it (Phase 4) | A small close of bungalows along the new road, allotments behind |
| The workshop | A working place: its door opens the garage menu's upgrade tab (asked again, 2026-11-13) |
| The inside (Phase 3) | One bigger room downstairs, the roof terrace upstairs |
| The gates | Standing open: drive and walk straight in |

## What it is

- **Degen's compound**: the one detached, walled plot in a council
  estate. Still the Ends' brick and concrete, done up: he made good and
  stayed. It stands at the far end of the Close, its gates facing down the
  road, so you see it from the moment you turn into the estate.
- **The Ends carried further west** round it: still Endswood (an extension
  of the estate, as the first one was), its lamps sodium, its sound and
  life Endswood's. What goes round the compound is the owner's pick
  (question 3 below).
- Everything under the Emporium, and no taller than the estate's own
  three-storey rows. Made-up names only. Nothing threatening.

## The site (measured)

- **Free land:** west of the rows as built (`WEST_RECT` ends at x -204) to
  about x -380, z 330 to 466: 176 across, 136 deep. No street, block,
  solid or country road stands on it. Lot 9's Field is south of it (its
  fence from z 472, as far west as x -205); the Docks are north-west (to
  about z 292); the world's wall is far off (x -760).
- **The way in:** the Close runs east to west at z 380 (3.4 wide) and ends
  in bollards at x -200.8, with the two service lanes just inside them
  (x -198 to -194). It's a dead end, so no traffic drives it.
- **The home as it is:** the end house of row `rn2` (4.5 by 6), a garage
  in its back garden (4.4 by 3.8) and a 3-wide driveway; one room inside;
  its place `home`, where walking starts.

## The compound (the design)

Sizes in tiles; the plot about **26 across by 24 deep**, at the head of
the Close (about x -236 to -210, z 368 to 392), the road ending at its
gates.

- **The wall and the gates:** a brick wall about head high (1.3), stone
  coping, brick piers. Double gates on the east side, on the Close's line,
  standing open (a car drives straight in); a small gate beside them for
  walking. A made-up house sign on a pier, small and lit.
- **The courtyard:** block paving, room to turn a car; the wide drive is
  the yard itself. The car's place by the garage's left door, the bike's by
  the right.
- **The house** (about 9 by 7, two storeys, flat roof behind a parapet):
  the estate's brick with a painted render front, a wide front door under
  a canopy, big ground-floor windows onto the yard, lit at night.
- **The roof terrace:** on the house's flat roof, a rail round it, a
  couple of chairs, a string of lights; reached from inside (a stair, a
  fade as the doors are). You look back down the Close over the estate.
- **The double garage** (about 8 by 5, one storey, two doors side by
  side): the car's door and the bike's. Its menu and showroom rules are
  the home garage's as built (garage.ts `at('home')`).
- **The workshop** (about 5 by 4): a lean-to with a roller door half up, a
  bench and a tyre stack seen through it. **A working place** (the owner's
  pick): its door opens the garage menu on its upgrade tab, a second way
  in to what the home garage has already (the first question put it
  wrongly as "what the city's Workshop does", which is the business's
  jobs; asked again, this is the answer).
- **The garden:** behind the house inside the wall: grass, one tree, a
  bench, a washing line, a gate in the back wall.

### What moves, and what goes back

"Nothing that exists moves" holds but for the owner's call, and this is
one:

- The place `home` (its pin, panel, spawn and door), `HOME_SPAWN`,
  `CAR_HOME`, `BIKE_HOME`, the garage's prompt, the room, the stash and
  the wardrobe move to the compound. `tests/snapshot.test.ts` is rewritten
  for the home's entries only, on purpose.
- The old end house (`rn2-0-2`) goes back to an ordinary neighbour's: its
  shed, washing, fences and porch as its row's; the garage and the
  driveway there are taken out.
- Saves: where the car and the bike stand isn't in the save (they stand
  at home or in town by `garage.at()`), and the stash and the look don't
  say where the house is, so no save changes and no migration. A visitor
  who last walked at the old house simply starts at the new one.

## The phases (each with the owner's sign-off)

1. **The land and the road** (built, waiting on the owner's sign-off).
   - `endswood.ts`: Endswood's land grows west by `FAR_RECT` (x -264 to
     -200, z 340 to 420), read as one with the rest by `inEndswood()`; the
     Close's bollards are taken up (`CLOSE_BOLLARDS` is empty).
   - `endsfar.ts` (DOM-free, the boot's, tested in `tests/endsfar.test.ts`):
     the Close's run on from its old end to a T (`ends-close-far`, `HEAD`)
     with the lane across it (`ends-lane`, x -216, z 348 to 412; dead ends,
     no traffic); the compound's plot at the head of the Close (`PLOT`,
     block `ends-fc`, 26 by 24) with its gates' place opposite the road's
     end (`GATES`); the bungalows' land north and south of it (`ends-fn`,
     `ends-fs`), the allotments behind (`ends-fa`) and the verge between
     the lane and the rows (`ends-fen`, `ends-fes`), all blocks in the
     street plan (ref `endswood`); five sodium lamps (`FAR_LAMPS`).
   - Its land in `KEEPS` (`endsfar`), its ground worn and bare-edged as
     the estate's (ground.ts), its lamps, edge, crowd and sound Endswood's
     through `inEndswood()` and the blocks' ref.
   - Drawn by `endsfar3d.ts` (`LAZY_DISTRICTS` id `endsfar`), all sites:
     the Close's worn asphalt and dashed line to a give-way line at the T,
     the lane, the compound's plot in block paving with a brick kerb where
     its wall will stand (open at the gates), the other plots in worn
     grass.
   - `tests/snapshot.test.ts` gained the two streets and lost nothing.
   - Shot: `docs/far-west-shots/phase-1-close-to-the-gates.webp`.
2. **The compound's outside** (built, waiting on the owner's sign-off).
   Home base is the compound now.
   - `home.ts` (DOM-free, the boot's, tested in `tests/home.test.ts`) is
     written round the plot (`endsfar.ts` `PLOT`, `GATES`): the wall
     (`WALL_T`, `WALL_H`) with the gates open on the Close's line between
     two piers (`PIER`) and a small back gate in the west wall
     (`HOME.backGate`); the double garage at the yard's west end on the
     Close's line, so its two doors face you down the road (`HOME.garage`,
     `carDoor`, `bikeDoor`; `CAR_HOME` and `BIKE_HOME` inside, noses out);
     the house along the south side, 9 by 6.5, two storeys under a flat
     roof (`HOME.house`, its front door on the yard, a side door onto the
     east lawn); the workshop against the north wall (`HOME.workshop`); two
     lawns (`HOME.lawns`); the yard between them is the wide drive.
     `HOME_SOLIDS` (22 boxes) at the boot.
   - **How it differs from the sketch above:** the garage, not the house,
     is on the Close's line (the car on show as you arrive), the house
     faces north onto the yard, and the garden is two lawns (the
     north-west corner with the tree and the bench, and east of the house
     with the washing line) rather than one behind the house.
   - The room came with it (it has to be inside the house's walls): the
     same furniture kinds refitted to the bigger ground floor (8.7 by 6.2),
     the stash and the wardrobe as before, the back door now a side door.
     Phase 3 is the roof terrace's stair and the room's polish.
   - The workshop's prompt (`HOME_WORKSHOP_DOOR`, walk.ts) opens the
     garage's menu on its Kit tab (`garageUI.show('kit')`).
   - Drawn by `home3d.ts`, one site registered by `endsfar3d.ts`: all in
     the shared paint; the terrace's rail, chairs and string of lights are
     drawn on the roof already. The plaque on the gate's pier is plain (no
     lettering yet). Windows are dark glass: lit at night comes in Phase 5.
   - The old end house (`rn2-0-2`) is a neighbour's again: endsterraces.ts,
     endsterraces3d.ts and endswestlife.ts have no special case left (its
     shed, gate, fences, porch, washing and solid as its row's).
   - The Close is one street to the T (`ends-close` in endswood.ts ends at
     `FAR_LANE_X`), so a taxi's route reaches the compound;
     `tests/travel.test.ts` allows the longer ride (the overlook to the
     compound, corner to corner, about 107 s; the cap is 110).
   - `tests/snapshot.test.ts`: the Close's line is longer and the separate
     run Phase 1 added is gone; nothing else moved.
   - The smoke test's home scenes are at the compound, with one for the
     workshop; `?bench`'s `ends-home` view looks down the Close through
     the gates. Shots: `docs/far-west-shots/phase-2-*`.
3. **Inside, and the roof terrace** (built, waiting on the owner's
   sign-off). The room was refitted in Phase 2; this is the way up.
   - `home.ts`: the terrace's floor (`ROOF_Y`) and the roof inside its
     rail (`TERRACE`), what stands on it (`ROOF_THINGS`: the stairs' hatch
     over the stairs below, two chairs and a low table at the front rail,
     a planter in each back corner), `onRoof()`, `roofWall()`,
     `homeRoofY()`; `inHouse()` takes how high he is, so the room is the
     ground floor only. Two more fades in `HOME_PORTALS`: **Upstairs** at
     the stairs' foot in the room, **Downstairs** by the hatch.
     `homePlaces(y)` gives each floor its own prompts (the room's and the
     terrace's stand over one another).
   - `groundheight.ts` has a `homeroof` layer; walk.ts's `blocked()` asks
     `roofWall()` up there (only the rail and what stands on it stop
     you); index.ts passes his height to the rain's and the stash's checks,
     and the sound is the street's again on the roof.
   - `home3d.ts` draws the terrace's things from `ROOF_THINGS`.
   - Tests: the terrace in `tests/home.test.ts`, the layer in
     `tests/groundheight.test.ts`; the smoke test's `hometerrace` scene
     (up, along the rail, down). Shot:
     `docs/far-west-shots/phase-3-on-the-terrace.webp`.
4. **The far west round it** (built, waiting on the owner's sign-off):
   the owner's pick, bungalows and allotments.
   - `endsfarhomes.ts` (DOM-free, the chunk's, tested in
     `tests/endsfarhomes.test.ts`): **four bungalows** (`BUNGALOWS`), two
     on each block north and south of the compound, facing the lane: one
     storey under a pitched roof (ridge 1.85: under his garage's top, so
     the compound is the tallest thing out there), pebble-dash or brick,
     each door its own colour; a front garden behind a low wall with a gap
     at the path (`frontWall()`), a back garden in close-board fencing
     (`backFences()`), a shed in some, a bin. **The allotments**
     (`ALLOTMENT`): the long block behind all three in a low wire fence, a
     gate at each end and one opposite the compound's back gate, a path
     down the middle and one in from that gate; sixteen plots (`PLOTS`),
     each with three or four beds (a crop in rows, or dug earth), a shed
     and a water butt on some, a couple left to grass. Seeded, so they're
     the same every time. `FAR_HOME_SOLIDS`, joined with the chunk.
   - Drawn by `endsfarhomes3d.ts` (registered by `endsfar3d.ts`): a site a
     bungalow, a site a pair of plots, the fence a site a run; all in the
     shared paint, the crops' greens and the paths' earth from the
     palette; phones draw every other crop row.
   - Shots: `docs/far-west-shots/phase-4-*`.
5. **Life, night and sound.** Neighbours and walkers on the new road, the
   compound's windows, sign and terrace lights at night, a pool at the
   gates; its sound Endswood's, the house quiet inside as now.
6. **Polish.** `?bench` views (the gates from the Close, the yard, from
   the terrace), the review shots, phones checked and trimmed, every width;
   the guides (`endswood.md`, `vehicles.md`, `tests.md`); the plan done.

Each phase: `npm run typecheck`, `npm run lint`, `npm test`,
`npm run test:wide`, a build, `npm run budget`, the smoke test, and shots
in `docs/far-west-shots/`.

## Performance

- One new lazy chunk; everything fixed through a `Batch` in sites; the
  compound is a handful of sites, near detail (the rail, the lights, the
  workshop's insides, the garden) near only.
- The house measured as built cost about 12 draw calls and 4,500
  triangles in its own view; the compound is bigger, so it's measured with
  `?bench` before and after Phase 2, on the phone tier.
- Phones: the low tier's trims as the rest of the Ends (no string lights'
  bulbs, fewer garden things).

## The owner's questions (all answered above)

1. **How grand?**
   - A) Made good, not flash: brick and render, one bold colour, a modest
     sign (my pick: it belongs to the estate and still stands out).
   - B) Loud: neon along the wall's top, a gold gate, a mural the length
     of the wall.
   - C) Low-key: you'd only know by the gates.
2. **The gates:**
   - A) Standing open: drive and walk straight in (my pick: nothing to
     wait for, and nothing in the city is shut to you).
   - B) They swing open as you come near.
   - C) Shut, with a prompt.
3. **What goes round the compound, in Phase 4?**
   - A) A small close of bungalows and their gardens along the new road,
     and allotments behind (my pick: low, cheap to draw, makes the compound
     the tallest thing out there).
   - B) Two more pairs of terraced rows, as the near half.
   - C) A community hall and a five-a-side cage, with a car park.
   - D) Nothing yet: the compound alone on open ground, the rest later.
4. **The workshop:**
   - A) Dressing for now (my pick).
   - B) A place: the Workshop's upgrades for your car, done at home.
   - C) Leave it out; a bigger garden.
5. **The inside (Phase 3):**
   - A) One bigger room downstairs and the terrace upstairs (my pick).
   - B) Two floors inside: living room and kitchen down, a bedroom up,
     then the terrace.
   - C) Keep the room as it is, only moved.
