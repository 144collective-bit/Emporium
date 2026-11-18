# The military base and airfield (the owner's call, 2026-11)

The military base by the north wall, from the build-out plan's land plan
(`docs/buildout-plan.md`, the North Ward, power), grown into a very large
base with its own airfield. It guards the wall and holds the wall's first
exit gate (the wall plan's exits, `docs/wall-plan.md`), shut until the
storyline opens it. Built one phase at a time, each with the owner's
sign-off. Keep this plan up to date. Nothing is built yet. The owner has
answered the plan's questions (the second round, below); Phase 0 is next, on
the owner's go.

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

## The layout (rough: settled in Phase 0)

- **The base's land** (`BASE_AREA`): about x −720 to 280, z −735 to −300.
  That's about 1,000 by 435 tiles, 1.8 km by 0.8 km, about a fifth of the
  land inside the wall. **That's about the size of the whole built city
  today** (the build-out plan measured the built city at 18% of the land). Most
  of it is grass, runway, taxiways and aprons, which are cheap to draw. The
  buildings stand in a few clusters.
- **The fence** follows the land, so no straight rectangle of land meets
  another (the project's rule):
  - it bends round the woods, which stay outside it as a screen, or inside it
    round the shelters;
  - a scrub-and-hedge belt runs along its outside, never a straight edge;
  - chain-link on posts with wire on top (the owner's pick), see-through,
    the panels instanced;
  - it's lit at night (lamps in `lampStyle()`);
  - it's solid for walking, driving and the camera's ground.
- **The main gate** is on `ns0-n` at about z −300, north of the stadium: the
  north avenue from town ends at it. It has a guardhouse, a barrier that stays
  down and NORTHGATE AIR BASE in raised letters.
  - **The visitors' area** is outside the barrier: a car park, a visitors'
    centre (a place, coming soon) and a viewing terrace looking north over
    the field.
  - Past the barrier, **the parade avenue** runs on north in line with ns0 to
    the wall gate. It's one of the few streets that may be straight (the
    project's rule: a street planned straight).
- **The service gate** is on `ns3-n` at about the same z: trucks only, its
  barrier down. Traffic on both roads drives up, turns at the gate and goes
  back.
- **The airfield**, in the middle band, west of the avenue:
  - **The runway:** east-west, about 500 long (the airport's is 300), at
    about z −540, from x about −600 to −100, clear of the avenue at its east
    end, with the approach lights stopping short of it.
  - **On the ground:** the parallel taxiway on its south side and the main
    apron, with the big hangars, the control tower, the fire station and the
    fuel farm along it.
  - **Hardened shelters:** in loops off the taxiway on the north side, among
    the woods.
- **The cantonment**, the base's town, in the south band (z −300 to −420)
  between the field and the stadium:
  - the HQ facing the parade ground on the avenue, with flags;
  - barracks blocks, the mess hall, the gym and the medical centre;
  - the motor pool east towards the service gate;
  - the heliport, a row of pads;
  - a radar dome on a low mound, a water tower and watchtowers with
    searchlights on the fence.
- **The firing range** in the far west by the west wall: scenery first, its
  building a place later.
- **The wall gate** at the avenue's north end (x −4.5, z −760): a gatehouse
  in the wall's face with blast doors, shut. The wall stays solid behind
  them (the wall plan: solid all round until the exits come).
- **The north-east** past the hills (x 285 to 800, z −760 to −450) stays open
  land and woods. It isn't the base's.

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
- **The boot's code budget** (740 KB) is close to full. The base's boot data
  must be small. If it doesn't fit, more features move to `lazy()` first, as
  the stadium's stage did (`docs/north-plan.md`).
- **Phones are already past their geometry target** (the performance plan: about 210 MB
  with every district loaded, against 150). That's why the base loads as two
  chunks and never all at the start. If Phase 0 shows phones can't take it, the
  build-out plan's Phase 2 (letting far districts go) comes first, the
  owner's call.

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
  in `BENCH_VIEWS` and `BLEND_VIEWS`.
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
