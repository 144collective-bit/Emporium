# The military base and airfield (the owner's call, 2026-11)

The military base by the north wall, from the build-out plan's land plan
(`docs/buildout-plan.md`, the North Ward, power), grown into a very large
base with its own airfield. It guards the wall and holds the wall's first
exit gate (the wall plan's exits, `docs/wall-plan.md`), shut until the
storyline opens it. Built one phase at a time, each with the owner's
sign-off. Keep this plan up to date. Nothing is built yet. **Phase 0 is
under way**: the lines are drawn and signed off (2026-11-19, below) and the
baseline is measured (below). The phone is over its geometry ceiling before
the base adds anything; the owner's pick (2026-11-19) is to trim first:
find what grew since 2026-11-14 and bring the phone back under 187 MiB with
room for the base's 8. Phase 1 follows, on the owner's go.

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

- **Memory, with every district loaded** (what `npm run memcheck` holds):
  phone geometry **191.8 MiB**, textures 32.9, render targets 9.0; desktop
  geometry 352.1, textures 76.0, targets 53.8.
- **The phone is over its geometry ceiling already** (187,
  `MEMORY_CEILINGS.phone`; 169.8 measured 2026-11-14). The south's
  re-laying, Degen's home and the spawn plan came in since, while
  memcheck couldn't run. The base adds nothing until the owner picks what
  comes first (below).
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
| Before | 192.0 MiB |
| 1. The split faces share their corners (nothing on screen changes; 37d5244) | **179.2 MiB** (−12.8) |
| 2. The south's small parts near only | to measure |

The ceiling stays 187; with the first trim the base's 8 MiB nearly fits
(187.2).

