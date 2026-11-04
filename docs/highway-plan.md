# The raised highway and the roads (plan)

The owner's call (2026-10, taken up 2026-11): the ring highway rebuilt to look
real, raised on a concrete viaduct all the way round, with real exits, and the
road system upgraded wherever the city needs it. Built one phase at a time,
each with the owner's sign-off; keep this file up to date.

## The owner's answers (2026-11)

- **Raised:** all the way round, on one viaduct; every arterial passes under
  at street level, the river crossings become the viaduct's river spans.
- **Exits:** about eight, numbered clockwise from the stadium. Laid out as
  **partial cloverleafs** (the owner's pick once it was measured that a
  diamond's ramps can't climb between arterials only 18 to 26 apart): each
  exit's four ramps on its corner side, a loop by the junction and a straight
  ramp round it in each quadrant. **Move things** to make room (the owner's
  call): district edges are moved where an exit's ramps need the land, which
  changes the layout snapshot.
- **The look:** a modern box girder: a smooth pale concrete deck on slim
  hammerhead piers, expansion joints, concrete parapets with a steel rail, a
  concrete median barrier.
- **The metro:** rises over the deck where it crosses, about 5 m over the
  parapets, then back down.
- **Crossings:** Lot 9's tunnel stays (a gritty shortcut and a storyline
  spot, entered under the viaduct); the stadium's footbridge is retired (you
  walk under the viaduct, a zebra on Stadium Road).
- **Under it in town:** car parks and storage, courts and murals in The
  Trenches and Lot 9 (made-up names), lamps where streets pass under.
- **Sound walls:** past homes (Sunridge, The Trenches, Lot 9, Uptown North),
  open parapets elsewhere.
- **The roads (all four):**
  - a **second river bridge**, Uptown to The Trenches (in line with Uptown's
    one-way pair and The Trenches' cross streets, about x -112), a **swing
    bridge** turning on a pier in the river to let the tall ship through on
    Liberty Bridge's timetable, traffic waiting at barriers;
  - **turn lanes and signals** at the busiest avenue junctions;
  - the avenues past the highway out to the world's edge become **rural
    roads** (two lanes, verges, ditches, fences, the odd lamp, a little
    traffic);
  - the **concrete-era look** on the town's streets (kerbs, sharper
    markings, worn patches, manholes, drains).
- **Process:** phases, each signed off.
- Kept from the first draft (not asked again): your car, bike and taxis use
  it, walking onto it no (turned back at the top), flying over it; two lanes
  each way; green gantries and exit numbers with made-up names.

## Phase 1: the shape as data (built, signed off)

- `viaduct.ts` (DOM-free, tested in `tests/viaduct.test.ts`):
  - the ring worked out exactly (`ringAt()`, `ringPoint()`, `ringS()`: `s`
    along it clockwise from the middle of the north side, `o` across it,
    outward positive; `RING_LEN` about 1,840);
  - the deck: `DECK_Y` 3.8 over the ground (about 6.8 m), the girder
    `GIRDER` 1 deep, so `CLEARANCE` 2.8 for what passes under (the tallest
    in the traffic, the rig's trailer, is 2.12), `PARAPET`, `DECK_HALF`;
  - `EXITS`, the eight, each at a junction of today and its corner side:
    1 Stadium · Westlake Park (ns0 north, west), 2 Kart Park · Starlight
    Mall (ns3 north, east), 3 Crestmont · Sunridge (ew0 east, north),
    4 Airport · Harbour (ew4 east, south), 5 Southfield · General Aviation
    (ns3 south, east), 6 Lot 9 · The Trenches (ns0 south, west), 7 Southbank
    Docks (ew4 west, south), 8 Uptown · Westlake Park (ew0 west, north);
  - `RAMPS`, four an exit (`QUAD`: a loop of radius 9 by the junction and a
    straight ramp round it, each side of the ring; an off and an on each
    side, so every direction gets off and on), their heights eased in and out
    of a climb never steeper than `RAMP_GRADE` (7%), flat by the terminal,
    joining the outer lane at the deck's height; `REACH` (92) along the ring.
- `viapiers.ts`: `PIERS`, about every 14 under the median, moved a little to
  keep clear of every street that passes under, the metro and Lot 9's tunnel;
  over the river only on the highway bridges' pier lines today (between the
  boats' lanes). Spans up to about 40 where the arterials cluster.
- **Open land only** (the owner's call, once the fit was shown): nothing
  built moves; parks, lawns, car parks, roads at the airport and the Docks,
  and Lot 9's lane can. Each quadrant (inside or outside the ring) takes a
  form (`Form` on each exit): `full` (the loop and the straight ramp), `slip`
  (only the straight ramp, its terminal just off the deck and alongside it
  all the way: where what stands near the deck stays), or `none`. Every exit
  still gets off and on (the test holds it):

  | Exit | Inside | Outside | What moved for it (Phase 1b, built) |
  | :-- | :-- | :-- | :-- |
  | 1 Stadium · Westlake Park | slip | full | Stadium Road's way in came off the north road 23 further north, the car park loop up with it, a bend down to the stretch past the stadium's front, the block's east edge in for the bend |
  | 2 Kart Park · Starlight Mall | slip | slip | nothing (outside, the kart park's plaza, kiosk and gate arch stand where the straight ramp would run) |
  | 3 Crestmont · Sunridge | slip | slip | nothing |
  | 4 Airport · Harbour | slip | slip | nothing (outside, Airport Drive could only move east through the Runway Hotel) |
  | 5 Southfield · General Aviation | full | slip | nothing |
  | 6 Lot 9 · The Trenches | slip | slip | The Trenches' land (`inTrenches()`) keeps off the ramps' strip by the highway |
  | 7 Southbank Docks | slip | slip | the same (outside, the Docks' ring road and everything east of it stay) |
  | 8 Uptown · Westlake Park | full | full | Westlake Park's south-west corner cut back (`EXIT_NOTCH`), its south-west gate east of it |

  Exits 2 and 3, and 6 and 7, pair up round their corners: between them each
  pair takes traffic off and on both ways. `rampLand()` (viaduct.ts) is the
  ramps' land: the outskirts' trees keep off it (`KEEPS`), the seam map
  counts it the highway's, and `quadrantEdge()` gives a district the edge to
  keep behind. `tests/viaduct.test.ts` holds every ramp clear of every
  district's land and block, every street but its own arterial, the water
  and everything solid.
  The metro's pillars keep clear of the ramps since Phase 2 (below).
  `docs/highway-exits-fit.png` shows each exit as it is now.
- **The metro** crosses the ring four times (the main line at Kart Park,
  where it comes over from the Trenches to the Docks, where it comes back
  over the north bank avenue into Uptown, and the airport branch), each
  within 26 to 74 of a station: the el's deck (today 5.2) must be at least
  7.4 over the crossing, so Kart Park's station (26 from it) and the Docks'
  (43, across exit 7's ramps) are raised with it.

## Phase 2: the viaduct drawn and the ring raised (built, waiting on the owner's sign-off)

- **Nothing meets it at street level:** the street plan keeps the highway as
  a street (kind `highway`, a loop) with no crossing and no slip lane
  (`OUTER_SLIPS` and the slips went); where it crossed an arterial the
  arterial runs straight on under the deck (`RING_MEETS` in streetplan.ts
  names each by the junction it was, for the exits). Its river spans are
  overhead: `riverCrossings()` leaves them out, so the river walls close
  under them (`riverBridges()` still lists them, for the boats' limits).
  world.ts no longer draws its asphalt, median, lines, lamps, slips or
  bridges; the arterials' medians and lines run on under it.
- **Its traffic up on the deck:** the first `RING_ROUTES` (4) routes, round
  it both ways in both lanes, carry `deck` (routes.ts); life.ts draws their
  cars at the deck's height, and they never follow, stop for or bump into
  anything at street level (you, a taxi, your car, the crowd) nor anything
  at street level them (`bodies.cars`' `y`).
- **The viaduct** is `viaduct3d.ts`, a district loaded as you approach
  (`LAZY_DISTRICTS` id `viaduct`; its land is the whole ring, so it comes in
  just after the boot), a site every 12 along the ring: the box girder (its
  wings cantilevered over sloping webs down to the soffit), the asphalt
  with its lines (dashes between each way's lanes, solid edge lines, a
  yellow line by the median), a concrete parapet each side with a steel
  rail on posts (near only), the median barrier, an expansion joint over
  every third pier (`JOINT_EVERY`), the hammerhead piers (a stem with its
  corners cut, the head flaring out to the soffit, bearings, near only; down
  into the river over it). Its lamps (`DECK_LAMPS` in viapiers.ts, every
  `LAMP_GAP` in the median barrier, the arm over each carriageway in turn,
  none under the metro) are placed at the boot with the town's. The piers
  are solid (`PIER_SOLIDS`, in `SOLIDS`); the deck is the walk camera's
  (`DECK_CAMERA`, boxes with a bottom in `CAMERA_GRID` only: you walk, drive
  and shoot under it).
- **The metro rises over it** (metro.ts `trackY()`, `PLATEAUS`): its deck at
  `DECK_Y` (5.2) but where it crosses the ring or a ramp, `HIGH_Y` (7.4)
  there, eased up and down over `RISE` (55; about 6% at the steepest), two
  climbs closer than 180 along a track one stretch up; a station beside a
  climb is raised and level (Kart Park and Crestmont's spur from it,
  Southbank Docks with the arch and the north bank's crossing, the Airport).
  Its pillars keep clear of the ramps; metro3d.ts draws the deck in pieces
  following the climb, the pillars, portals, hangers and stations at their
  heights, the train pitched on the climbs; the ride's camera follows.
- **The stadium's footbridge is retired:** the Mall runs on to a new north
  gate in Westlake Park's wall (`gate-n`), then a paved walk under the deck
  to a zebra over Stadium Road (stadium.ts `WALK`, `ZEBRA`; the piers keep
  off it). Lot 9's tunnel is as it was, its ends under the deck's shadow.
- Until the exits come in (Phase 3) the ring is off-limits from the ground:
  a taxi goes the long way through town (up to about 94 s corner to
  corner), and the arterials' stretches past their last junction out to
  the world's edge carry no traffic.
- The snapshot was rewritten on purpose: the slip lanes gone, the park's
  north gate added, the footbridge gone.

## Phases

1. **The shape as data** (above, built). Then **1b, making room** (signed
   off: open land only; built, signed off): the moves
   in the table above (the snapshot rewritten on purpose: Westlake Park's
   block and south-west gate, the stadium's road, loop and block), and the
   test that every ramp keeps clear.
2. **The viaduct drawn and the ring raised** (above, built, waiting on the
   owner's sign-off): the deck, piers, parapets,
   median barrier, lamps and joints; the street-level asphalt, median,
   lamps, junctions and slip lanes taken out (every arterial now passes
   under); the ring's own traffic up on the deck; the metro's rises (its
   height profile, the raised stations); the stadium's footbridge retired
   (a zebra on Stadium Road); Lot 9's tunnel kept, its ends under the deck.
3. **The exits:** the ramps and their terminals in the street plan, routes
   with heights, merging and the lights at the ramps' feet; taxis; your car
   and bike up the ramps; walking kept off.
4. **Signs and the look:** gantries and exit numbers (one sign atlas, fixed
   made-up copy), sound walls past homes, what's under it, night lighting,
   the world map.
5. **The swing bridge** (Uptown to The Trenches): its streets, the river
   pier, the swing on Liberty's timetable, the barriers, the boats and the
   tall ship.
6. **Turn lanes and signals** at the busiest avenue junctions.
7. **Rural roads** past the highway.
8. **The concrete-era look** on the town's streets.
9. **Polish and performance:** bench views (a junction, a straight, a
   river span, an exit), phones, the boot budget (697.9 of 700 KB before
   this plan: the drawing goes in a chunk where it can, the budget raised
   on purpose where it can't, the owner's standing go).
