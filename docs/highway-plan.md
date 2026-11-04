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

## Phase 1: the shape as data (built, waiting on the owner's sign-off)

- `viaduct.ts` (DOM-free, tested in `tests/viaduct.test.ts`; nothing reads it
  yet):
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
- **What the ramps run into** (`docs/highway-exits-fit.png`, every exit
  from above: the ramps orange at the ground to magenta at the deck, the
  piers black, the districts' land in their colours, solids magenta):
  1. Stadium: inside, Uptown North's west towers' corner and Westlake
     Park's north-east lawn; outside, the stadium's car park, its loop and
     Stadium Road's end.
  2. Kart Park: inside, Palm Court's north end and Sunridge's north-west
     corner; outside, the kart park's car park, Kart Road and its loop.
  3. Crestmont: inside, Sunridge's east edge; outside, the Flats' west
     blocks and the street along them (crest-ns0).
  4. Airport: inside, the east side of Southfield Yards' ring and what's on
     it; outside, Airport Drive and the landside beside it.
  5. Southfield · General Aviation: inside, clear; outside, the general
     aviation road, its loop and the airport's land beside it.
  6. Lot 9 · The Trenches: inside, row C and Bottom Street's west end in The
     Trenches; outside, Lot 9's north lane.
  7. Southbank Docks: inside, The Trenches' row W (West Street's low
     commercial) and Trench Avenue's west end; outside, the Docks' ring road.
  8. Uptown · Westlake Park: inside, Westlake Park's west lawn; outside,
     clear.
- **The metro** crosses the ring four times (the main line at Kart Park,
  where it comes over from the Trenches to the Docks, where it comes back
  over the north bank avenue into Uptown, and the airport branch), each
  within 26 to 74 of a station: the el's deck (today 5.2) must be at least
  7.4 over the crossing, so Kart Park's station (26 from it) and the Docks'
  (43, across exit 7's ramps) are raised with it.

## Phases

1. **The shape as data** (above, built). Then, with the owner's sign-off on
   the moves: **1b, making room**: each exit's land cleared by moving the
   district edges listed above (their data, the snapshot rewritten on
   purpose), and a test that every ramp keeps clear of every block, street,
   solid and the water.
2. **The viaduct drawn and the ring raised:** the deck, piers, parapets,
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
