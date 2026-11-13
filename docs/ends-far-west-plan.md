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
  bench and a tyre stack seen through it. Dressing for now (question 4).
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

1. **The land and the road.** Endswood's land grows west again (a second
   rect read by `inEndswood()`); the Close carried west from its bollards
   to the compound's gates, the bollards taken up, a turning head in front
   of the gates; the compound's plot and whatever else the owner picks as
   blocks in the street plan (the world map, walking); footpaths, sodium
   lamps; the land in `KEEPS`, its ground in `INFLUENCES`, its edge in
   `BY_CHARACTER`. A new chunk (`LAZY_DISTRICTS`), its data DOM-free in the
   boot. Tests for all of it, and `npm run test:wide`.
2. **The compound's outside.** The wall, the gates, the courtyard, the
   house, the double garage, the workshop, the garden; its solids and
   doors. Home base moves (the list above); the old house goes back to its
   row. The smoke test's home scenes moved to the new spots.
3. **Inside, and the roof terrace.** The room refitted to the new house
   (bigger: the same furniture kinds, the stash and the wardrobe where they
   make sense), the stair's fade up to the terrace and back, the camera's
   room for both; the garage's two bays seen through its doors.
4. **The far west round it** (the owner's pick, question 3).
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

## The owner's questions (my picks marked)

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
