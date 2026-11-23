# Kart park plan: moved to the south bank, a new longer circuit, a real kart venue

**Signed off by the owner (2026-11-23).** Phase 0 (the drawing) next, for the owner's look before Phase 1. It's built a phase at a time (by a session or the
improvement loop, `docs/improvement-loop-plan.md`), each phase merged on its own with its tests, before-and-after
shots and the guide (`docs/guide/kart-park.md`) kept up to date. The new park is built behind a switch (`?karts=new`,
read in one place) and turned on for everyone in Phase 8. Keep this plan up to date.

## What the owner asked (2026-11-23)

From a screenshot of the world map, an arrow from today's kart park across the river: move the kart park to the south
bank, west of the Docks. Asked and answered the same day:

- **Where:** the riverside, facing the river. The gate and grandstand on the riverside road (`ew4-w`), looking across
  the water at the city, next to the Docks but not inside them.
- **The circuit:** **a new, longer circuit**, the kart park redesigned. A **figure of eight with a crossover bridge**,
  **about 1.5 times** today's lap.
- **Records:** **reset everything**: lap records, ghosts **and the trophies and cups won** start fresh on the new
  circuit.
- **The name:** **Riverside Raceway** (made-up), on its signs, place, pins and map.
- **The surroundings, built up so it looks like a real kart park** ("stacked tyres and workshops etc."): all four:
  workshops and a tyre store, a hire-kart garage, a full paddock, race control and safety. And **night racing**.
- **Getting there:** a **river bus stop** at the park's riverside gate. **The old site goes back to open land**, kept
  clear for later.

## What's there today

- **The park** (`kartpark.ts`, `kartcircuit.ts`, `kartfacility.ts`, drawn by `kartpark3d.ts` and `kartgrounds3d.ts`;
  `docs/guide/kart-park.md`): on the open land outside the ring highway's west side, north of the river, west of exit
  8's ramps (`KART_PARK`: x -374 to -262, z -146 to -26, 112 by 120). It's reached by Kart Road off ew0, the metro's
  Kart Park station on ew3, and exit 8 ("Uptown · Kart Park", `viaduct.ts`). The twelve-corner circuit is raced both
  ways. The facility has armco, tyre walls, catch fencing, a grandstand and banks, the clubhouse, café, podium,
  timing tower, a paddock with tents and transporters, LED screens, floodlights and a car park. Classes, items mode,
  cups, the live crowd, your own kart's look, and the records and ghosts (`kart-records.ts`) all hang off the circuit.
- **The new land** (surveyed 2026-11-23): the south bank west of the Docks is open from the Docks' west edge
  (`DOCKS_RECT`, x -402) to the wall (x -760). It runs from the riverside road `ew4-w` (z 137, a rural road along the
  bank) south to the Southfield road (z about 340). There are no solids, no district and no streets inside it, only
  the riverside road along its north edge and its stubs at x -654. That's about 240 by 200 units free near the river.
- **The river bus** (`riverbus.ts` `STOPS`) runs only between Uptown (x -90) and Pier 7 (x -74): a stop at the park
  means its route extended about 400 units west, past the Docks' channel (x -316 to -302).
- **The snapshot** (`tests/snapshot.test.ts`) holds the kart park, its gate, road, loop, site, bays, hut door and
  every 40th sample of the circuit. The move rewrites it on purpose (the owner's move), in the phase that switches.

## The design

### The site

A park about **170 by 150** on the riverside land, its north side on `ew4-w`, its east side a street's width clear of
the Docks (their yards and `docks-ring`), its south side well short of the Southfield road. The land is held level
for the circuit and shaped round it: the spectator banks rise from the river side, and the approach falls gently to
the river bus pier. The public side faces north to the river (gate, plaza, grandstand, café deck); the working side
faces south (paddock, workshops, hire garage, car park, transporters).

### The circuit: winding, a tunnel, about 2.2 times today's lap (the owner's picks after Phase 0)

The owner saw three concepts in Phase 0 and asked for more: "a more diverse and exciting course. Winding roads, tunnel,
it needs to be more complex", then "make the track slightly wider". The approved layout (concept 4, now
`kartcircuit2.ts`, drawn by `npm run kart-fit` as `docs/kart-shots/riverside.webp`):

- **Its parts, raced forward:** the pit straight east along the south, in front of race control; the **Docks
  wiggles** north up the east side and a **hairpin** at the top; the **riverside straight** west along the north, the
  grandstand and the river beside it; the **winding descent** onto the hill and the **hill-top switchbacks**, raised
  over the tunnel; west to the **keyhole hairpin** in the north-west corner and the **esses** down the west side; the
  **carousel** round the south-west, then north-east through the **tunnel** under the hill (under the switchbacks
  twice); the **chicane** and back onto the pit straight.
- **The tunnel replaces the crossover bridge:** the lap crosses itself twice, both under the hill, the hill-top run
  `HILL_TOP` (3.4) over the tunnel's floor, a clear height `TUNNEL_CLEAR` (2.6) inside and the rest its roof.
- **Its numbers** (`tests/kartcircuit2.test.ts`): the lap 791.5 (today's 351.3: about 2.25 times, longer than the 1.5
  first picked, the owner's call for more complexity); the track **5.2 wide** (`TRACK2_W`, today's 4.4), kerbs 0.5 and
  run-off 3 (`CLEAR2` 6.1 from its middle); no corner under `MIN_RADIUS2` 5 (tightest 6.1; today's 4.4); no ramp over
  `MAX_SLOPE2` 0.15 (steepest 0.134; today's limit 0.3); every two runs at least 12.2 apart (closest 13.8) unless one
  passes over the other; inside the site with its run-off, clear of the Docks, the streets and every solid.
- **The site** grew to fit: 175 by 155 (`SITE2`: x -585 to -410, z 145 to 300).
- **Raced both ways** as today; the AI's lines, the items mode's boxes, the crowd and marshals follow (Phase 3).

### The venue: built up like a real kart park

All in the park's local numbers, DOM-free data with tests, drawn in sites (`site()`), near-only detail, phones trimmed:

- **Workshops and the tyre store:** a tuning shed (benches, karts up on stands and trolleys, engine racks, tool walls,
  a parts counter), a tyre store with racks and a tyre-fitting machine, and **tyres stacked everywhere**: tyre walls
  painted in the club's colours at every corner, loose stacks by the workshops and the pit wall.
- **The hire-kart garage:** rows of hire karts under a canopy, a helmet rack, the sign-on desk and a briefing room
  with a screen (the race's rules in made-up copy).
- **The full paddock:** team transporters with awnings, vans and trailers on hardstanding, a kart wash, the
  weighbridge and the scrutineering bay by the pit entry.
- **Race control and safety:** the timing tower with its screens, the start gantry with its lights over the grid,
  marshal posts round the lap with flag boards, a recovery tractor, and a medical cabin.
- **The visitors' side:** a riverside grandstand, raised viewing banks, a café-bar deck over the water, the ticket
  kiosk and gate arch, a toilet block, banners for made-up sponsors (no real brands, never the token, no numbers or
  prices on signs).
- **What moves over from today:** the clubhouse with its trophy cabinet, the podium and its ceremony, the LED screens,
  the live crowd, the coaches and car park, all re-laid for the new site.

### Night racing

Floodlight masts round the whole lap (under the Emporium's height), neon edges on the kerbs, LED boards and the start
gantry glowing, and a short light show before a night race. Per the city's rules: **minimal bloom** (only small,
very bright things pass the threshold, never a whole slab), and the light show still under `prefers-reduced-motion`.
Phones: fewer masts lit, the neon edges near only.

### Getting there

- **A Kart Park river bus stop** at the park's riverside gate: the route extended west from Pier 7 past the Docks, its
  landing off the bank (`riverbus.ts` `STOPS`, the boats' route and timetable, the map and the pins).
- **The road:** `ew4-w` along the park's north side (its gate off it), a short service road to the paddock and car
  park off its south side.
- **The rest that names the park:** places (`PLACES`, `LIVE_PLACES`, `maptab.ts` `AREAS`), the world map, pins and
  waypoints, taxis' drop-off, fast travel and the "Kart Park" spawn (`KART_SPAWN`). The highway signs: exit 8 drops
  "Kart Park" (back to "Uptown"), and the exit nearest the new site gains it. The metro's Kart Park station on ew3 is
  renamed **Exit 8** (the owner's pick).

### The old site

Back to open land, kept clear for a district later: the park, its facility, Kart Road and its car park removed, the
land's ground cover and trees returned as the outskirts' (`treeSpot()`), exit 8's sign and the metro station's name
changed.

## Phases

Each phase merges on its own and leaves the city working; the new park is behind `?karts=new` until Phase 8.

0. **The survey and the drawing** (done, 2026-11-23): the land measured, four concepts drawn to scale for the owner,
   the fourth approved (above); `npm run kart-fit` draws it from the circuit's data.
1. **The new circuit as data** (the centre line, its width and heights, done 2026-11-23): `kartcircuit2.ts`
   (DOM-free, on `DOM_FREE`), `CIRCUIT2` sampled every `STEP2`, the hill-top run raised over the tunnel; tested (the
   lap's length, width, radius, slope, the tunnel's two passes and clearance, spacing, the site, streets and solids).
   **Phase 1b** (done, 2026-11-23): `COURSES2` both ways (Riverside Raceway and its reverse, the same surface), the
   start line on the pit straight in front of race control (`START2_U`), the corners found from the curvature and
   numbered in race order (24 each way, lefts and rights mirrored), the grid (`gridSlots2()`, eight two abreast behind
   the line), the pit lane (`PIT2_LANE`, off the pit straight before the line and back on before the Docks wiggles,
   its straight along the garages `PIT2_STRAIGHT` clear of the run-off) and a racing line each way (in to the apexes,
   out wide either side, on the track with room for a kart, about 4% shorter than the middle); tested, and drawn by
   `npm run kart-fit`.
2. **The site and its ground** (`kartpark2.ts`): the park's rect on the land, the ground held level and shaped
   round it (banks, the approach to the river), its solids, its land kept clear of the outskirts' trees, the riverside
   road's edge and the service road. Behind the switch.
3. **The track drawn and raced, behind the switch**: the circuit, its kerbs and run-off, the bridge and ramps, armco,
   tyre walls, catch fencing; `kart-sim.ts` on the new circuit (heights, the bridge), the AI's lines, the items mode's
   boxes, the race start and finish. `npm run smoke`'s kart race run on it with `?karts=new`.
4. **The venue, behind the switch**, a step a night: 4a workshops and the tyre store; 4b the hire-kart garage;
   4c the paddock (transporters, awnings, vans, trailers, the kart wash, weighbridge, scrutineering); 4d race control
   and safety (the tower, start gantry, marshal posts, tractor, medical cabin); 4e the visitors' side (grandstand,
   banks, café deck, kiosk, gate, toilets, banners) and the clubhouse, podium, screens and crowd moved over.
5. **Night racing, behind the switch**: floodlights, neon kerbs, the boards and gantry, the light show; checked at
   night against the bloom rule, on phones.
6. **The river bus stop**: the route extended past the Docks, the Kart Park landing at the gate, its timetable, the
   map and pins (live: the stop can open before the switch, saying "coming soon" at the gate until Phase 8).
7. **The records reset** (the owner's call): the kart save's records, ghosts, trophies and cups cleared once by its migration
   (`kart-records.ts` loader, `cleanSave()`'s rules: the save keeps its key and its backup), the boards empty on the
   new circuit. Tested.
8. **The switch**: the new park on for everyone; the old site removed (open land, Kart Road gone, exit 8's sign and the
   metro station's name changed, the new exit's sign added); places, map, pins, waypoints, taxis, spawn and fast
   travel moved; `tests/snapshot.test.ts` rewritten for the park on purpose (this plan, owner-signed); `npm run
   smoke` and every check.
9. **Polish and performance**: a `?bench` view of the park (day and night), the phone tier's draws at or under today's
   park's, review shots at the five widths for its menus, the guide brought up to date.

## Risks

- **The bridge in the sim:** today's circuit is flat apart from its hill and jump; a crossover needs the sim, the
  camera and the AI to know which level a kart is on where the two sections cross. That's tested in Phase 1's data and
  Phase 3's sim before anything is drawn.
- **Draw calls:** a much busier venue. Everything fixed goes in the park's sites and batches; the stacked tyres, karts
  on stands and paddock vehicles are instanced; the small mess is near only and off on phones. Measured with `?bench`.
- **The river bus route** passing the Docks: its channel and any bridge over it need room for the boat (checked in
  Phase 6, `riverbus.ts`'s tests).
- **Saves:** the records reset is a migration, not a wipe of the save; everything else in a visitor's save stays.

## The owner's decisions (2026-11-23)

- The riverside west of the Docks, facing the river; a new circuit, a figure of eight with a crossover bridge, about
  1.5 times today's lap; all four kinds of buildings (workshops and tyre store, hire-kart garage, full paddock, race
  control and safety) and night racing; a river bus stop at the gate; the old site back to open land.
- Records, ghosts, trophies and cups all reset.
- Named **Riverside Raceway**; the old metro station renamed **Exit 8**.
- The highway sign goes on the exit nearest the new site; hire karts free, as everything is for now (`FREE_FOR_NOW`),
  and your own kart races there as today.
- Signed off; Phase 0's drawing goes to the owner before Phase 1.
