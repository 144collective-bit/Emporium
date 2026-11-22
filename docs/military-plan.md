# The military base and airfield (the owner's call, 2026-11)

The military base by the north wall, from the build-out plan's land plan
(`docs/buildout-plan.md`, the North Ward, power), grown into a very large
base with its own airfield. It guards the wall and holds the wall's first
exit gate (the wall plan's exits, `docs/wall-plan.md`), shut until the
storyline opens it. Built one phase at a time, each with the owner's
sign-off. Keep this plan up to date. Nothing is built yet. **Phase 0 is
under way**: the lines are drawn and signed off (2026-11-19, below) and the
baseline is measured (below). The phone is over its geometry ceiling before
the base adds anything; the owner's pick (2026-11-19) was to trim first,
and it's done: 192.0 to about 179.5 MiB (below). **Phase 0 is done.** **Phase 1 is built and signed off** (2026-11-19,
measured below). A full tile batch now grows by small steps (below: the phone at 170.7 MiB of 187, steady). **Phase 2 (the
airfield) is built and signed off** (2026-11-19, measured below). **Phase 3 (the base) is built and signed off**
(2026-11-19, measured below). **Phase 4 (life, night and sound) is built and
trimmed** (2026-11-20, measured below: the owner's call). **Phase 5 (polish) is built and signed off** (2026-11-20, below). **Phase 6 (the wall and a polish pass) is built and merged** (2026-11-21, #233, below; its draw counts and after shots the same day).
**The plan is done.** What's next is its "Later" list, each in a plan of its own (the owner's picks below).

## The owner's answers (2026-11-18)

| Question | Answer |
| --- | --- |
| What goes north of the city | **A very large military base and airfield.** |
| How big | **The whole north**, from the west wall to Crestmont's hills (1A). |
| Performance | **Built lean, measured each phase on the phone tier** (2A). It doesn't wait for the build-out plan's Phases 2 and 3. If a phase's numbers say it must, it waits. |
| Getting in | **A guarded main gate and a visitors' area.** The rest is seen through the fence (3A). |
| Gameplay | **Scenery first** (4A). Places come in later phases (the range, the hangar), each in a plan of its own. |
| The base's name (the second round) | **Northgate Air Base** (made up; it holds the wall's gate). |
| The two country roads | **Both end at the base's gates**: `ns0-n` at the main gate, `ns3-n` at the service gate, each with a turning loop there. |
| Flying your own aircraft over it | **Allowed**, like anywhere else: no turn-back at its fence. |
| The fence | **See-through chain-link with wire on top**, the base seen through it. |

## The site (measured, 2026-11-18)

In world numbers, x across and z north to south (north is −z).

- **The wall's inner face** is at −760 on the north and west sides
  (`WALL_INNER`, wall.ts). You can walk and drive to 1 short of it
  (`WORLD_BOUNDS`). The cameras and floodlights stand along its foot
  (`CAMERAS`, `FLOODS`).
- **The ring highway's north side** is at z −170 (`HIGHWAY`), from x −215 to
  275.
- **What already stands north of the highway:**

  | | x | z |
  | --- | --- | --- |
  | The stadium, its road and car park (`STADIUM_AREA`) | −184 to −4.5 | −262 to −160 |
  | Crestmont (`CREST_RECT`) | 294 to 454 | −380 to 68 |
  | Crestmont's hills (`HILLS`, `TERRAIN_RECT`) | 285 to 490 | −450 to −75 |
  | The metro's curve to Crestmont (metro.ts `CREST`) | about 205 to 285 | to −190 |
  | The kart park (`KART_AREA`), west of the highway | −454 to −241.5 | −155 to 60 |

- **The two country roads north** (rural.ts, `RURAL_RUNS`):
  - `ns0-n`, the north avenue's (ns0) country road, at x −4.5 from z −241 to
    its turning loop at −660;
  - `ns3-n` at x 64.5, from z −213 to its loop at −660.

  They're the only streets on the land.
- **The pine woods** (`WOODS`, `inWoods()`) cover about 16% of the land
  north of z −200 in patches. The biggest are round x −200 to −80, z −750 to
  −450; round x 350 to 450 at the north-east; and round x −650 to −550 by the
  west wall.
- **Everything else is open land:** grass, the outskirts' trees and the
  rolls. North of the stadium (z −270) to the wall is about 490 deep, and
  from the west wall to the hills (x −760 to 285) about 1,045 across.

## The layout (drafted in Phase 0, signed off 2026-11-19)

The map is `docs/military-map.png`: today's north with the draft lines on it.
The numbers are world numbers, x across and z north to south (north is −z).
They go into `airbase.ts` in Phase 1, where the tests hold them.

- **The fence** (`FENCE`) is a closed line that wanders, so no straight
  rectangle of land meets another (the project's rule). Inside it is about
  416,600 square tiles, about 1.8 km by 0.8 km and a sixth of the land inside
  the wall: **about the size of the whole built city today** (the build-out
  plan measured the built city at 18% of the land). About 15% of it is pine
  woods today. They stay as woods round the shelters and along the
  avenue; the open ground's trees go.
  - **The south side:** from (−730, −330) east by (−640, −318), (−520, −326),
    (−400, −312), (−300, −318), (−200, −306), (−110, −312), (−40, −308),
    (30, −308), (120, −314) and (200, −322) to (262, −336). That's 44 north of
    the stadium's north edge (−262).
  - **The east side:** from (262, −336) north by (272, −420), (266, −500),
    (276, −600) and (266, −690) to (258, −730). It stays west of Crestmont's
    hills, which start at x 285. All the fence's corners are on flat ground.
  - **The north side:** from (258, −730) west by (150, −736) and (40, −734) to
    the wall gate's yard, which meets the wall from (2, −736) to (−70, −736).
    Then west by (−150, −730), (−300, −738), (−450, −732) and (−600, −736)
    to (−700, −730).
  - **The west side:** from (−700, −730) south by (−722, −650), (−732, −560),
    (−724, −460) and (−732, −380) back to the start.
  - **Clear of the wall's floodlights:** the closest is 18 from the fence.
    About 25 of grass is left between the fence and the wall's foot all the
    way round, but at the gate's yard.
  - **The fence itself:** chain-link on posts with wire on top (the owner's
    pick), see-through, the panels instanced. It's lit at night (lamps in
    `lampStyle()`) and solid for walking, driving and the camera's ground.
    A scrub-and-hedge belt runs along its outside.
- **The main gate** (`GATES`) is on `ns0-n` at z −305, its barrier down.
  The north avenue from town ends there, with a turning loop in front of the
  barrier at (−4.5, −292). It has a guardhouse, the barrier and NORTHGATE AIR
  BASE in raised letters.
  - **The visitors' area** is outside the barrier, west of the road: a car
    park (x −90 to −20, z −298 to −262), clear of the stadium's car-park loop
    (which reaches −251), and the visitors' centre (x −62 to −32, z −298 to
    −286). The centre is a place (coming soon), with a viewing terrace on its
    roof looking north over the field.
- **The service gate** is on `ns3-n` at z −306, trucks only, its barrier
  down. Its turning loop is at (64.5, −294).
- **The parade avenue** runs north from the main gate in line with ns0 to
  z −700. It's one of the few streets that may be straight (the project's
  rule: a street planned straight). Then it bends west to the wall gate.
- **The wall gate** is at x −49 to −19 against the wall, z −758 to −746, in
  the gap between the wall's floodlights at x −52 and −16. A gate on the
  avenue's own line (x −4.5) would have meant moving two floodlights and a
  camera, so it stands in the gap and nothing that exists moves. It's a
  gatehouse in the wall's face with blast doors, shut; the wall stays solid
  behind them (the wall plan: solid all round until the exits come).
- **The airfield,** west of the avenue:

  | Part | Where |
  | --- | --- |
  | The runway | x −620 to −120 at z −540, 12 wide (the airport's: 300 long, 10 wide). Approach lights out to x −680 and to x −60, short of the avenue. |
  | The parallel taxiway | x −610 to −130 at z −516, 7 wide. Connectors to the runway at x −600, −480, −370, −250 and −140. |
  | The north taxiway | x −580 to −140 at z −578. Links to the runway at x −580, −360 and −140. |
  | The hardened shelters | nine, in threes, at x −560 to −140, z about −606 to −612, each 16 by 20, on stubs off the north taxiway among the woods |
  | The main apron | x −470 to −200, z −508 to −462 |
  | Three big hangars | each 40 by 26, along the apron's south side at z −458 to −432 |
  | The control tower | (−262, −452), its top under the Emporium's roof (12.5) |
  | The fire station | x −238 to −214, z −462 to −446 |
  | The fuel farm | x −575 to −520, z −490 to −450 |

  The runway's west end is 140 from the wall. The base's own flights take
  off and land over the east (Phase 4) and keep their circuits inside the
  wall.
- **The cantonment**, the base's town, between the field and the gates:

  | Part | Where |
  | --- | --- |
  | The parade ground | x −80 to −12, z −360 to −322, on the avenue |
  | The HQ | x −72 to −18, z −392 to −368, facing the parade ground |
  | Twelve barracks blocks | three rows of four, x −262 to −112, z −388 to −324 |
  | The mess hall, the gym and the medical centre | east of the avenue, x 10 to 50, z −400 to −320 |
  | The motor pool | x 80 to 165, z −400 to −328, off the service gate's road |
  | The heliport | four pads, x 185 to 250, z −440 to −350 |
  | The radar dome | on a low mound at (205, −505) |
  | The water tower | (−120, −432) |
  | The watchtowers | along the fence, with searchlights |

- **The firing range** is in the far west by the fence, x −716 to −600,
  z −420 to −340. It has six lanes firing west into a berm at x −716.
  Scenery first; its building becomes a place later.
- **Room left inside:** the north-east of the base (east of the avenue,
  north of the heliport) is kept as woods and open ground for later.
- **Outside the base:** the north-east past the hills (x 285 to 800, z −760
  to −450) stays open land and woods, and so does the band between the
  fence and the stadium, the highway and the kart park.

## The rules it keeps

- **Nothing threatening, and nothing attacks you** (the project's rule):
  - no weapons on display: no guns on the aircraft, the vehicles, the
    watchtowers or the people;
  - the personnel and the patrols never stop or chase you;
  - the gate's barrier only stays down.
  - There are no tanks or missiles. The vehicles are trucks, jeeps, fuel
    bowsers, tugs, fire engines, buses and helicopters.
- **Made-up names only:**
  - the base, its units, its aircraft and its signs;
  - no real air force, roundel, insignia, aircraft type, maker or real base;
  - the markings are the city's own emblem and colours;
  - no number on a sign; the runway's ends are painted on the ground, as
    the airport's are.
- **Under the Emporium** (roof 12.5): the control tower (the airport's is
  11.6), the hangars, the radar dome, the water tower and the masts. The wall
  stays the owner's exception.
- **Nothing that exists moves**, but for the owner's call here: `ns0-n` and
  `ns3-n` end at the gates instead of their turning loops at −660. Their new
  ends get turning loops of their own. The snapshot is rewritten for those
  two only.
- **The world's size is final:** all of it is inside the wall, and anything
  written against the edge passes `npm test` and `npm run test:wide`. It's
  written in fixed numbers, not from `EXT`, as the airport's `SITE` is.

## Performance (the owner's pick: lean, measured each phase)

- **Two chunks** (`LAZY_DISTRICTS`): `airbase-field` (the airfield, west of
  the avenue) and `airbase-camp` (the cantonment, the gates and the
  visitors' area). They load as you approach, so standing at the main gate
  doesn't load the far end of the runway's shelters. The data (streets,
  solids, places, lamps) is DOM-free in the boot; drawing-only data stays
  out of it.
- **The drawing:**
  - fixed geometry in sites (`site()`, `tileBatch()`);
  - every repeated thing instanced: the shelters, barracks blocks,
    hangars, lamps, fence panels, parked aircraft and vehicles;
  - fine detail near only;
  - simple far forms for the hangars and the tower, seen from town.
- **Measured before and after every phase** with `?bench` and `?fps`, on
  the phone tier and desktop:
  - from the overview;
  - from the stadium looking north;
  - at the main gate;
  - on the runway.

  The numbers go in this plan. Phase 0 sets each phase's allowance (draw
  calls, triangles, phones' geometry memory). **If a phase goes over, the
  phase is trimmed, never the budgets** (`scripts/budget.mjs`).
- **The boot's code budget** (750 KB) is close to full: 736.9 KB in the
  build of 2026-11-18. The base's boot data
  must be small. If it doesn't fit, more features move to `lazy()` first, as
  the stadium's stage did (`docs/north-plan.md`).
- **Phones are already past their geometry target.** The performance plan
  set 150 MB; it measured about 210 MB with every district loaded. Packing
  the vertices brought that to about 170, and `npm run memcheck` holds it to
  187 (`MEMORY_CEILINGS.phone`). That's why the base loads as two
  chunks and never all at the start. If Phase 0 shows phones can't take it, the
  build-out plan's Phase 2 (letting far districts go) comes first, the
  owner's call.

## Phase 0's baseline (measured 2026-11-19)

`?bench` on the build of 2026-11-19 (17bd863), headless Chromium in the
software renderer: a phone (390 x 844 at 1x, touch: the **low** tier) and a
desktop (1280 x 800 at 1x: the software renderer counts as shared graphics,
so the **medium** tier). Frame times there mean nothing; draws, triangles
and memory do. The run found `?bench` broken since the spawn plan's Phase 1
(on foot at home, the far sites never built, so it never began): fixed in
the same Phase 0 (`enter(false, true)`, `performance.md`).

| View | Phone draws | Phone tris | Desktop draws | Desktop tris |
| --- | ---: | ---: | ---: | ---: |
| Home view | 286 | 0.34M | 465 | 1.23M |
| Every district, from high | 212 | 0.37M | 468 | 1.36M |
| The north, from over the stadium | 59 | 0.09M | 74 | 0.33M |
| Northgate Air Base, from high | 54 | 0.09M | 56 | 0.14M |
| The main gate | 103 | 0.16M | 126 | 0.30M |
| The runway | 54 | 0.09M | 62 | 0.22M |
| The route | 239 | 0.37M | 399 | 1.30M |

For scale, the phone's busiest views today: the far edge 427 draws, a
downtown street 331, the outskirts 313; the most triangles 0.60M (the far
edge).

- **Memory, with every district loaded,** at the benchmark's end (a
  little over what `npm run memcheck` reads, below): phone geometry
  **191.8 MiB**, textures 32.9, render targets 9.0; desktop
  geometry 352.1, textures 76.0, targets 53.8.
- **The phone was over its geometry ceiling** (187,
  `MEMORY_CEILINGS.phone`; 169.8 measured 2026-11-14; memcheck read 192.0
  on 90dee3e). The south's re-laying, Degen's home and the spawn plan came
  in since, while memcheck couldn't run. Trimmed back to about 179.5 in
  this phase (the phone trim, below).
- **The boot:** 736.9 KB of 750 KB.

### Each phase's allowance (added to the baseline; signed off 2026-11-19)

| Phase | Phone draws, any base view | Phone tris | Desktop draws | Phone geometry | Boot |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1: the land, fence and gates | +40 | +0.08M | +60 | +1.5 MiB | +4 KB |
| 2: the airfield | +50 | +0.12M | +75 | +3 MiB | +2 KB |
| 3: the base | +50 | +0.15M | +75 | +3 MiB | +2 KB |
| 4: life, night and sound | +15 | +0.03M | +25 | +0.5 MiB | 0 (lazy) |
| **All of it** | **+155** | **+0.38M** | **+235** | **+8 MiB** | **+8 KB** |

All of it leaves the gate at about 258 draws and 0.54M triangles on a
phone, under the far edge and a downtown street today. The home view and
the overview take at most +10 draws in all (the base's far forms). Over an
allowance, the phase is trimmed, never the budget.

## Phases

### Phase 0: the baseline and the lines

- Measure the city as it is (the views above, the phone tier and desktop)
  and set each phase's allowance from it.
- Settle the exact lines (the fence, the gates, the runway, the clusters)
  against the woods, the roads and the wall's floodlights. Show the owner a
  map for sign-off.
- The owner's picks: the open questions below.

### Phase 1: the land, the fence and the gates

- A DOM-free `airbase.ts`, tested in `tests/airbase.test.ts`:
  - the land, the fence's line and its solids;
  - the two gates and the visitors' area;
  - the parade avenue's line;
  - the lots kept for Phases 2 and 3.
- **In the street plan:**
  - `ns0-n` and `ns3-n` cut at the gates, with turning loops there and
    traffic to them;
  - the visitors' car park;
  - the base's own roads (no traffic inside until Phase 4).
- **The district's parts:** its land in `KEEPS` (with `since`); its ground
  in `INFLUENCES` (mown grass, concrete); its edge in `BY_CHARACTER`; its
  lamp in `lampStyle()`; its chunks in `LAZY_DISTRICTS` and its builders in
  `serveSites()`.
- **Also in this phase:**
  - the woods kept off its open ground;
  - the world map drawing it;
  - the visitors' centre in `PLACES` and `LIVE_PLACES` (its marquee line and
    live line; its panel says coming soon), reached through `live.closed()`.
- **Drawn:** the fence with its lights, the gates, the guardhouses, the
  barriers, the visitors' centre and terrace, and the base's name.
- Its guide file, `docs/guide/airbase.md`, with its line in `CLAUDE.md`'s
  index.
- **The tests:**
  - walking and driving stop at the fence;
  - the gates' roads join up;
  - nothing on the woods' screen or the wall's floods;
  - the snapshot rewritten for the two roads only.

### Phase 2: the airfield

- **The runway:** its markings, edge and centreline lights, the approach
  lights and the PAPI.
- **The taxiways and aprons:** the taxiway and its connectors, the main
  apron, and the shelters' loops with the shelters (instanced).
- **The buildings:** the big hangars (one with its doors open on a parked
  transport), the control tower, the fire station and the fuel farm.
- **What's parked:** made-up, unarmed aircraft (transports, trainers, a
  tanker, helicopters), the apron's vehicles and the windsock.
- **At night:** the runway's lights through `lit()`, under the bloom's
  threshold.

### Phase 3: the base

- **The parade avenue and the parade ground:** flags, lamp standards and a
  monument at the HQ.
- **The cantonment:** the HQ, barracks blocks (the kits' recipes where they
  fit), the mess hall, the gym, the medical centre and the motor pool.
- **Round the base:** the heliport, the radar dome, the water tower, the
  watchtowers with searchlights, and the firing range's buildings and berms
  (scenery).
- **The wall gate:** its gatehouse and the shut blast doors in the wall's face
  (wall3d.ts), the wall solid behind them.

### Phase 4: life, night and sound

- **In the air:** the base's flying traffic, circuits and landings on its
  own runway and helicopters to the heliport. They're kept clear of the
  airport's flights and every tall thing, and turn back short of the wall
  (tests). The executive helicopter may land there.
- **On the ground:** vehicles on the base's roads, and the personnel (a crowd
  style in `STYLES` / `districtAt()`, a made-up uniform) drilling on the
  parade ground and walking between the blocks. There are patrols along the
  fence that never stop or chase you.
- **At night:** floodlit aprons, the searchlights' sweep (held still under
  `prefers-reduced-motion`).
- **Sound** (ambience.ts `airbase`): far engines and the wind across the
  field, off until the visitor turns it on.

### Phase 5: polish

- **The views:** `airbase-gate`, `airbase-runway` and `airbase-overview`
  in `BLEND_VIEWS` (they've been in `BENCH_VIEWS` since Phase 0).
- **Checks:**
  - the seams (`npm run seams`);
  - the phone tier's trims;
  - every width (320 to 1440, phones upright and on their side) for its
    panel.
- **The last measure,** against Phase 0's.

### Later, each in its own plan (the owner's picks then)

- the range as a place, tied to target practice (dummies and drones only);
- the hangar as a place: a new made-up, unarmed aircraft to fly from it;
- landing your own aircraft on its runway;
- the wall gate opening with the storyline.

## The owner's second round (2026-11-18)

All four suggestions: the name **Northgate Air Base**, **both country roads
ending at the gates**, **flying over it allowed**, and **a see-through
chain-link fence**. They're in the table at the top and the layout above.

## The owner's sign-off on the lines (2026-11-19)

All four suggestions, on the map (`docs/military-map.png`):

| Question | Answer |
| --- | --- |
| The wall gate | **Kept in the floodlights' gap** (x −49 to −19). The avenue bends to it near the wall, and no light or camera moves. |
| The band between the fence and the stadium | **Grass and trees**, so the fence's line wanders behind a soft edge. No road there. |
| The base's north-east, east of the heliport | **Kept as today's woods.** They hide the fence's corner and cost little to draw. |
| The runway and the camp | **As drawn**: one runway, x −620 to −120 at z −540, 12 wide, with the apron and hangars to its south. |

## The owner's picks on the baseline (2026-11-19)

| Question | Answer |
| --- | --- |
| The phone over its geometry ceiling (191.8 of 187 MiB) | **Trim first**: find what grew since 2026-11-14 and trim it back under 187, with room for the base's 8 MiB (about 179 or less), before Phase 1. |
| Each phase's allowance | **As set** (the table above). |

## The phone trim (2026-11-19, the owner's pick: trim first)

Where the 22 MiB since 2026-11-14 went (`__mem()` row by row, today against
the build of 2026-11-14, every district loaded): all of it in the tiles, all
of it in the re-laid south-west. The ground built at the boot went from 10.0
to 18.4 MiB, and the sites drawn at every distance from 47.7 to 55.0 (the
south's 4.3 to 11.5); the near pieces didn't grow. The cause was kit.ts
`liftOnto()`: the faces split onto the south's rolling ground each had their
own three corners (about 24 a square of the 5 m ground grid, where 4 do).

| Trim (the owner's picks) | Phone geometry |
| --- | ---: |
| Before (`npm run memcheck` on 90dee3e: fails) | 192.0 MiB |
| 1. The split faces share their corners (nothing on screen changes; 37d5244) | |
| 2. The south's small parts near only (the footpaths' bollards, Lot 9's fence posts and rail, the village's front walls; f7e6ab2) | |
| **After both** (f7e6ab2, a minute into the benchmark; `npm run memcheck` read 168.9, before the big batch grew: below) | **179.5 MiB** (−12.5) |

The first step did nearly all of it: a reading taken a little later (once
the benchmark has begun flying round its views, which reads about 10 MiB
over memcheck's) went 192.0 to 179.2 with it alone, and didn't move with
the second (179.5): in the City view the phone's near pieces fill their
budget (32 MiB) whatever they are, so the second step's 0.6 MiB off what's
drawn at every distance was taken up by others. It helps on the street and
far off, and keeps the south's small parts near only as the city's rule is,
so it stays.

**Where it ends, corrected (2026-11-19):** memcheck reads the phone's memory the moment every site is built, and that
reading jumps by 10 to 14 MiB with whether the city's biggest tile batch (57 MiB of the paint material, about 80% full)
has grown yet: a batch is made again a quarter bigger than what it holds when it fills (tilebatch.ts `ROOM`, 1.25).
The post-trim build read 168.9 twice (before that batch grew), Phase 1's build 179.6 and 179.7 (after); a minute
later, once the benchmark is under way, both read the same: **179.5 MiB after the trim, 179.6 with Phase 1**. So the
trim took 192.0 to about 179.5 (−12.5, not −23.1), and the room under the ceiling is about **7.4 MiB**, not 18: the
base's Phases 2 to 4 have 6.5 MiB of allowance left, and one more growth of that batch would put the phone over 187.
The owner's call what comes first (below, Phase 1's measure).

## Phase 1's measure (2026-11-19, the build of 0f777fa, the phone tier)

| View | Draws before → after (allowance +40) | Triangles before → after (allowance +0.08M) |
| --- | --- | --- |
| The north, from over the stadium | 59 → 78 (+19) | 0.09M → 0.17M (+0.08M) |
| Northgate Air Base, from high | 54 → 70 (+16) | 0.09M → 0.17M (+0.08M) |
| The main gate | 103 → 106 (+3) | 0.16M → 0.20M (+0.04M) |
| The runway | 54 → 39 (−15) | 0.09M → 0.06M |
| The home view | 286 → 266 | 0.34M → 0.40M |
| Every district, from high | 212 → 218 (+6) | 0.37M → 0.44M |

(The baseline is Phase 0's, before the phone trim and the road cut: the runway's and the country road's views lost the
long stretch of `ns0-n` past the gate.) All within the allowance; every view's slowest CPU frame under 250 ms.

- **Memory:** what the base draws is 1.16 MiB on a phone, built alone (the fence 1.08 of it); in the city, at the same
  moment as before, 179.5 → 179.6 MiB (what's drawn at every distance +0.6, the near pieces' budget the rest). Within the
  allowance (+1.5). memcheck passes (179.7 of 187), but see the trim's correction above: 7.4 MiB of room.
- **The boot:** 736.9 → 739.3 KB of 750 (+2.4, the allowance +4). **Textures:** one more, the signs' atlas (192).
- **Departures from the plan, for the owner's sign-off:** one corner of the south fence 1 m north, (-40, -307), so that
  run isn't ruler-straight (the main gate at z -307.5, its loop at -291.5); the parade avenue drawn but not in the street
  plan till its traffic comes (Phase 4); trees kept off only what's built and the kept lots, not the whole base (the
  base held 69 of the woods' trees: clearing them would have broken the woods' count); the lamps the town's post, white.

## The owner's sign-off on Phase 1 (2026-11-19)

| Question | Answer |
| --- | --- |
| Phase 1, as built (its departures included) | **Signed off.** |
| A full tile batch growing by a quarter at once (about 14 MiB on the phone's biggest) | **Grow by small steps** (tilebatch.ts), before Phase 2: nothing on screen changes, measured before and after. |
| Next | **Degen is ready**: the batch growth first, then Phase 2 (the airfield). |

## A full tile batch grows a step at a time (2026-11-19, c3053c7)

tilebatch.ts: a batched mesh's room past what it holds is a quarter, but at most `ROOM_MAX` (4 MiB), when it grows and
when its room is given back (`roomFor()`, tested in tests/tilebatch.test.ts). On the phone, every district loaded:

| | memcheck (every site built) | A minute into the benchmark |
| --- | ---: | ---: |
| Phase 1, before | 179.7 MiB | 179.6 MiB |
| Phase 1, a step at a time | **170.7 MiB** | **170.6 MiB** |

The two readings agree now (the jump with the big batch's growth is gone), about 16 MiB under the ceiling (187): room
for the base's 6.5 MiB of allowance left, and more. Every view's slowest CPU frame passes memcheck's 250 ms, none worse
(the route 34 ms, 40 before). The ceiling stays 187.

## Phase 2's measure (2026-11-19, the build of 0cfc25b, the phone tier)

Built: the runway (its markings, no numbers, its edge, threshold and end lights, the approach lights), the parallel and
north taxiways with their connectors, links and the shelters' stubs, the apron and its road from the avenue, the three
hangars (the middle one open on a transport), the control tower (its top 11.6), the fire station, the fuel farm, the nine
hardened shelters, and what's parked: three transports, four trainers and two helicopters (the airport's made-up,
unarmed models in the base's greys, their titles left off), a tug, a fuel bowser and the windsock. The airfield is its own
chunk (`airbase-field`).

| View | Draws, Phase 1 → 2 (allowance +50) | Triangles (allowance +0.12M) |
| --- | --- | --- |
| The north, from over the stadium | 78 → 79 (+1) | 0.17M → 0.11M |
| Northgate Air Base, from high | 70 → 70 | 0.17M → 0.11M |
| The main gate | 106 → 103 | 0.20M → 0.18M |
| The runway | 39 → 69 (+30) | 0.06M → 0.09M (+0.03M) |
| The home view | 266 → 271 (+5) | 0.40M → 0.33M |

(The triangles fell where the tile batches' step, c3053c7, came in between.) Every view's slowest CPU frame under
250 ms (the runway's 36 ms).

- **Memory:** memcheck 170.7 MiB of 187, as before the airfield (its geometry within the step's room).
- **The boot:** 739.3 → 740.6 KB of 750 (+1.3, the allowance +2). **Textures:** none new.

## The owner's sign-off on Phase 2 (2026-11-19)

| Question | Answer |
| --- | --- |
| Phase 2, the airfield, as built | **Signed off.** |
| The parked transports (the airport's airliner, its white body and stripe) | **All grey**: the base's fleets' bodies in grey (theirs only; the airport's own aircraft as they are). |
| Next | **Degen is ready**: the grey first, then Phase 3 (the base). |

## Phase 3's measure (2026-11-19, the build of 776b315, the phone tier)

Built: the parade ground (paved, kerbed) with three flags in the city's colours and a monument, the HQ facing it (three
storeys, a portico), twelve barracks blocks in three rows, the mess hall, the gym, the medical centre (a green band, not
a cross: that emblem isn't ours to use), the motor pool (its yard, its open shed, six olive trucks) and its road from the
service gate, the heliport's four pads (each its ring and H) and hut, the radar dome on its grassy mound, the water tower
(its top 12.1), eight watchtowers round the fence (their searchlights `light()`s), the firing range as scenery (lanes,
the earth berm, the range house: no targets), the wall gate's gatehouse with its blast doors shut (the wall solid behind
them), and twenty lamp standards down the parade avenue. All solid (`BASE_SOLIDS`), under the Emporium, tested.

| View | Draws, Phase 2 → 3 (allowance +50) | Triangles (allowance +0.15M) |
| --- | --- | --- |
| The north, from over the stadium | 79 → 68 | 0.11M → 0.10M |
| Northgate Air Base, from high | 70 → 67 | 0.11M → 0.10M |
| The main gate | 103 → 112 (+9) | 0.18M → 0.21M (+0.03M) |
| The runway | 69 → 70 (+1) | 0.09M → 0.09M |
| The home view | 271 → 290 (+19) | 0.33M → 0.43M |
| Every district, from high | 191 → 225 (+34) | 0.36M → 0.46M |

The home view and the overview look south over the town, the base behind them; they moved −27 the run before, so
this +19 and +34 are taken for the runs' own swing (the traffic, the people), not the base: to watch in Phase 4's.
Every view's slowest CPU frame under 250 ms.

- **Memory:** memcheck 170.7 → 171.5 MiB of 187 (+0.8, the allowance +3).
- **The boot:** 740.6 → 741.6 KB of 750 (+1.0, the allowance +2). **Textures:** none new.

## The owner's sign-off on Phase 3 (2026-11-20)

| Question | Answer |
| --- | --- |
| Phase 3, the base, as built | **Signed off.** |
| How much of Phase 4 | **All of it, lean**: the flights and helicopters, the vehicles, the personnel and patrols, the night's lights and the sound, measured on phones (fewer people and flights there). |
| Next | **Degen is ready** for Phase 4. |

## Phase 4's measure (2026-11-20, the build of 028e1fd, the phone tier)

Built: the apron's floodlight masts and their pools, the watchtowers' sweeping searchlights (still under reduced
motion), the personnel (17 standing, 18 moving: the drill squad, walkers, two pairs of patrols; half on phones) in the
base's uniform, a jeep and a truck on the base's own roads, the base's own flights (a trainer's circuits and a
helicopter's round of the base, as more of its parked fleets: on phones only the trainer), and its sound.

| View | Draws, Phase 3 → 4 (allowance +15) | Triangles (allowance +0.03M) |
| --- | --- | --- |
| The north, from over the stadium | 68 → 83 (+15) | 0.10M → 0.15M (**+0.05M**) |
| Northgate Air Base, from high | 67 → 81 (+14) | 0.10M → 0.13M (+0.03M) |
| The main gate | 112 → 133 (**+21**) | 0.21M → 0.23M (+0.02M) |
| The runway | 70 → 74 (+4) | 0.09M → 0.10M |
| The home view | 290 → 299 (+9) | 0.43M → 0.42M |

- **Memory:** memcheck 171.5 → 172.4 MiB of 187 (**+0.9**, the allowance +0.5; since the batches' step a reading moves
  by up to that step's 4 MiB of room, so this isn't cleanly the base's).
- **The boot:** 741.6 → 741.4 KB (the allowance 0: Phase 4 is in its chunks). Every view's slowest CPU frame under
  250 ms (the gate's 24 ms). The wide world passes (the searchlights now look in square to their fence: dcb24cd).
- **Over:** the gate's draws (+21 of 15: the jeep's two and the crowd's near detail on the sentries, most likely), the
  stadium view's triangles (+0.05M of 0.03M) and the memory (+0.9 of 0.5). The owner's call: trim, or take it.

## Phase 4 trimmed (2026-11-20, e13c54a; the owner's call: trim, and Degen ready for Phase 5)

The jeep drawn as one mesh (its paint merged with its detail), the motor pool's moving truck and the gates' sentries
left out. Against Phase 3, on the phone:

| View | Draws (allowance +15) | Triangles (allowance +0.03M) |
| --- | --- | --- |
| The north, from over the stadium | 68 → 66 | 0.103M → 0.100M |
| Northgate Air Base, from high | 67 → 68 (+1) | 0.104M → 0.104M |
| The main gate | 112 → 112 | 0.210M → 0.204M |
| The runway | 70 → 70 | 0.087M → 0.090M |

All within it. **Memory:** memcheck read 177.5 MiB of 187 (it read 172.4 before the trim, with more drawn): a tile
batch's growth step (up to 4 MiB of room) landing in this run, not the base. It passes, 9.5 under the ceiling; Phase 5's
last measure looks at that step. The boot 741.5 KB of 750.

## Phase 5, the polish (2026-11-20)

- **The views:** `airbase-gate`, `airbase-runway` and `airbase-overview` in `BLEND_VIEWS` (f424479). Their review shots
  by day and at night are in `docs/blend-shots/airbase-phase5/` (`npm run shots`, the desktop tier). At night the main
  gate's lamps light their pools and the jeep shows behind the shut gate; the view from high (110 up) renders with a day
  sky in the night set, the whole sky, not the base: the review tool's to look at, not this plan's.
- **The seams:** `npm run seams` runs clean. The base isn't on the seam map (it's drawn from the street plan's blocks,
  and the base has none): its edge is its fence, the mown grass fading 6 past it.
- **The phone tier's trims:** on phones the fence's arms and wire, the near detail, every other person and the
  helicopter's flight are left out (Phases 1 to 4, tested).
- **Every width:** the base's panel at 320, 375, 768, 1024 and 1440 wide and a phone on its side (812 by 375): no
  sideways scroll, nothing clipped.
- **The last measure, against Phase 0's** (the phone tier):

  | | Phase 0 | Now | The whole base's allowance |
  | --- | ---: | ---: | ---: |
  | The north, from over the stadium: draws | 59 | 66 (+7) | +155 |
  | Northgate Air Base, from high: draws | 54 | 68 (+14) | +155 |
  | The main gate: draws | 103 | 112 (+9) | +155 |
  | The runway: draws | 54 | 70 (+16) | +155 |
  | The busiest base view's triangles | 0.16M | 0.20M (+0.04M) | +0.38M |
  | The home view: draws | 286 | 265 | +10 |
  | Phone geometry, a minute into the benchmark | 191.8 MiB | 172.4 MiB | +8 MiB |
  | The boot | 736.9 KB | 741.5 KB (+4.6) | +8 KB |

  The whole base cost well under its allowance, and the phone holds less than before it was begun (the trims on the
  way: the south's shared corners and the tile batches' step). memcheck passes (177.5 of 187 in its last run: its
  reading still moves by a batch's step of up to 4 MiB, the next thing to watch if the north grows again).

## The owner's sign-off on Phase 5, and what's next (2026-11-20)

| Question | Answer |
| --- | --- |
| Phase 5, and the plan | **Signed off: the plan is done.** |
| The branch | **A pull request into main**, for the owner to review and merge (a push to main goes live). |
| What to plan next (planning only: nothing built without the owner's go) | **All four**: the range as a place (target practice, dummies and drones only), the hangar as a place (a new made-up, unarmed aircraft to fly from it), opening the wall gate (the storyline's first way out: the owner's story), and the review tool's night sky from high. |

## The boot budget with main merged (2026-11-20, the owner's call)

With main's 188 commits merged into the branch (ab80986), the build was just over two budgets: the boot 765.9 of 765 KB
and the textures 4950.5 of 4950. The base's drawing-only data moved to `airbasedress.ts` (its chunks' only) and its
signs' atlas was halved (1024 by 256): the textures 4941.5 (fits), the boot 765.6. The owner's call: **the boot budget
from 765 to 767 on purpose** (scripts/budget.mjs, its reason written beside it).

Main merged again (b72fbbd, Crestmont's cable car): main alone measured 764.5 KB (boot) and 4942.9 (textures), the
merge 768.8 and 4952.5. The owner's calls: **the boot budget from 767 to 770 on purpose**, and the signs' atlas cut to
its three rows (1024 by 192, no spare row). The empty row had compressed to almost nothing (0.4 KB saved, the
textures 4952.1), so, as that call allowed, **the texture budget from 4950 to 4955 on purpose**.

## The night sky from high: what it is (2026-11-20, the first of the owner's "Later" picks)

Not the review tool and not the base: `?shots=night` sets the night once for the whole run (shots.ts). sky.ts thickens
the haze at night (its density about 0.0105 against 0.0037 by day) and colours it the night sky's horizon, a pale
grey-blue (`NIGHT.hor`); the City view thins it when pulled back, but only to 55% (`thin`, `70 / distance`, at least
0.55). From the base's view from high (110 up, about 340 from what it looks at) that leaves the ground about 98% the
haze's pale colour at night (about 37% by day), so the night picture reads as a hazy day. The same holds for the whole
city's City view at night when pulled far back: a look question for the owner (sky.ts, the whole city), not a bug.


## Phase 6: the base's wall and a polish pass (2026-11-21, the owner's call)

The owner's call: **the fence round the base becomes a large concrete wall**, and **a polish pass across the whole
base**, built in one go and signed off once. The fence's line (`FENCE`, `FENCE_RUNS`), the gates, the lots and every
place stay where they stand (the snapshot holds them): only what stands on the line changes.

| Question | Answer |
| --- | --- |
| The wall's height | **4.5** (over a truck): the base hidden from the street on foot and in a car; the watchtowers' cabins (8), the hangars (11), the tower, the radar and the water tower still show over it. |
| Its look | **Precast panels with wire**: grey concrete slabs with joints every few metres and a capping strip; coiled razor wire along the top, near only. Not the city's smooth wall. |
| The gates | **Wall ends and steel gates**: the wall turns in at each opening on thick piers; each gate a solid steel sliding gate, shut; the barriers and guardhouses as they are. |
| Looking in | **The visitors' terrace raised** to about 6 with its rail, so a visitor up there sees over the wall to the parade ground and the airfield. |
| The wall's lights | **Lights on the wall's top facing out**, on brackets, lighting its outer face and the grass at night (near only, under the bloom's threshold). The lamps inside stay. |
| The polish | **All four**: review shots and fixes (every base view by day, night and on the phone tier); the seams at the edges (the stadium's band, the city's wall, Crestmont's hills, the woods); life and night tuned; the performance measured again. |
| Getting up there | **A real stair to climb**: a flight up the centre's west side to a landing, onto the roof terrace; walked like Endswood's sky decks (its floor in the ground's layers, its rails off the treads). |
| Phases | **One phase, one go**, one sign-off. |

### What it changes

- **Its lines** (airbase.ts): `FENCE_H` 2.6 → the wall's 4.5 (`AIRBASE_WALL`: its thickness, the panels' spacing, the
  piers), its solids from `runBoxes()` as thick as the wall; the gates' shut boxes and the piers. The base's flights, the
  watchtowers and the patrols already keep clear of the line; their tests hold the new height.
- **Drawn** (airbase3d.ts, a stretch a site as the fence was): the panels (one box a run with its joints and capping
  near only), the razor wire (near only, not on phones), the outward lights (near only); no chain-link mesh in the FX
  layer, so the wall should cost fewer draws and less memory than the fence did. The gates: the piers and a steel leaf.
- **The visitors' centre**: its terrace raised (`VISITOR_CENTRE_H` 6.2) and its solid with it; a stair of 14 steps and
  a landing up its west side (`VISITOR_STAIR`, `VISITOR_LANDING`, `visitorsFloorAt()`, `visitorsWall()`); Walk in unchanged.
- **The world map** draws the wall as the fence's line, thicker.
- **Its allowance**: nothing more than Phase 5's measure (no draws, triangles, phone memory or boot added: the wall
  replaces the fence). The boot stands at 767.8 of 770 KB: the change there is a few numbers.
- **Before and after**: review shots of the base's views (`docs/blend-shots/airbase-wall-before`, `-after`), by day
  and night, desktop and phone, with six more views for the wall (outside the south side, the service gate, the
  visitors' terrace, the west and east ends, the south side from above).

### Phase 6 as built (2026-11-21)

- **The wall** (4.5, precast panels, capping, footing, razor wire near only), **its gates** (piers, shut steel sliding
  gates), **the raised visitors' terrace** (6.2) and **its stair** (14 steps and a landing, walked as Endswood's sky
  decks are), as the table above. Its review shots: `docs/blend-shots/airbase-wall-before` (the fence, on main) and
  `airbase-wall-after`, desktop by day and night; `airbase-wall-phone`, the phone tier.
- **The polish, from the shots:** the wall's lights moved to the middle of their panels (they stood on joints); a lamp
  on each gate pier facing out, its wash in the wall's; the washes carried on as a pool on the grass at the wall's
  foot; the terrace's rail drawn on phones too (phones draw no near detail, so up there a phone showed no rail); the
  wall two materials a stretch (the slab; the footing, capping and posts), so two draws a stretch on a phone.
- **Night in the review shots:** some views (the base from high, the terrace) come out with a day or pink sky in the
  night set, and not the same from one run to the next (the same view was night in one run, day-blue in another): the
  review tool shooting before the sky has settled after the camera jumps, not the game's sky, and older than the wall
  (Phase 5's night overview did it too). A task of its own, not this plan's.
- **The measures** (the phone tier, against main the same day):

  | | main | Phase 6 |
  | --- | ---: | ---: |
  | memcheck: geometry | 196.9 MiB | 196.8 MiB |
  | memcheck: textures | 35.4 MiB | 35.4 MiB |
  | The boot | 769.8 KB | 770.3 KB (+0.5: the stair's rules, at the boot for walking) |

  memcheck passes on both (210 and 70 the ceilings). The boot's budget was raised to 771 for the stair (the owner's
  call); main has since raised it to 775 for its own work, and the stair sits inside that. Every view's slowest CPU frame
  passes memcheck's 250 ms.
- **The draws, counted after the merge** (the owner's call: a small follow-up). The full `?bench` flies every view in
  the city and outran an hour under the software renderer here, and `?fps` under the review shots averages over frames
  it didn't draw; so every site `airbase3d.ts` makes was built in Node, as the tests do, and its meshes (a draw each
  before the tile batches merge them further) and triangles counted, on main before the wall (c93e2b5) and after (#233):

  | `airbase3d.ts`'s sites | Before: the fence | After: the wall |
  | --- | ---: | ---: |
  | Phone: the line's meshes (its own, and the FX layer's) | 111 and 111 | 109 and 0 |
  | Phone: the line's triangles | 11,868 | 6,540 |
  | Phone: the gates' meshes (and FX) | 2 and 2 | 2 and 0 |
  | Phone: the visitors' centre's triangles (the stair, its rails) | 214 | 1,150 |
  | Desktop: the line's meshes (all, near, FX) | 111, 111, 111 | 109, 218, 0 |
  | Desktop: the line's near triangles (the wire, posts and lights) | 14,532 | 404,052 |

  On phones the wall costs half the fence's draws (no chain-link in the FX layer) and 45% fewer triangles; the rest
  of the base is unchanged. At night the washes are one mesh in all (`wallWash()`). On desktop the razor wire is the
  weight: about 3,700 triangles a 30 m stretch, near only (within the tier's `far`, 120 on the high tier), so
  about eight stretches of a straight run at once, some 30,000 (the whole line's 404,052 is never drawn together). The next thing to trim if the north grows (fewer sides a coil, or coils further
  apart).
- **Checks:** `npm test` and `npm run test:wide` pass; the wall's tests hold its height, thickness, gates, piers, lights
  (on the line, facing out, clear of the joints), the piers' lamps, the stair's climb and rails, and the phone's rail.
