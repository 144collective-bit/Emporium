# The river, four times as wide

The owner's call: the river four times as wide, Liberty Bridge redesigned
to suit, one big bridge in the style of the Brooklyn Bridge where the metro
crosses, and the river looking natural, not a straight line. Built in
steps, each with the owner's sign-off; keep this plan up to date.

## The owner's decisions

- **Width:** about 60 tiles (about 108 m), up from 15. It widens
  **southward**: downtown, Uptown, Westlake Park, the kart park and
  everything else north of the river stay put. Everything south of it moves
  45 tiles further south (`WIDEN` in `layout.ts`; places written before the
  first widening add `SOUTH_SHIFT`, which carries both).
- **The ring highway** grows with it: its south side moves out 45 too, so
  The Trenches and the airport stay inside it.
- **Bridges:** only two cross the water in town:
  - **Liberty Bridge**, redesigned in the style of Tower Bridge: its two
    gate towers stand in the river on big piers, a high walkway between
    them and shorter arched approaches to each bank. Footbridge only, the
    flame on both towers, everything under the Emporium.
  - **One large bridge in the style of the Brooklyn Bridge** on the east
    ring avenue, where the metro crosses: two stone towers in the river,
    suspension cables, a raised deck (a long gentle arch over the water so
    boats pass under, ramps from the bank avenues), two lanes each way, the
    metro down the middle and a raised timber walkway above it. Its name is
    made up (the owner's pick).
  - The four avenue bridges go: downtown's other avenues end at the bank
    avenues. The ring highway keeps its two crossings far out of town, as
    plain concrete bridges.
- **The metro** crosses on the new bridge, a realistic system that looks
  good.
- **A natural river:** gentle in town, freer out of town. In town the bank
  avenues stay straight; the water's edge keeps straight stone quays where
  things stand on the water (Uptown's boulevard and its yachts, the town's
  promenade and jetties, the riverside's boardwalk, Pier 7 and the Night
  Market, Liberty Bridge, the bridges) and pulls back elsewhere, leaving
  riverside parks, grass banks and a sandy cove. Past the ring highway it
  wanders freely, with grass banks, reeds, pebble beaches and trees. The
  width swings between about 45 and 60.
- **Pier 7** stays as it is for now.
- **The 2D map** goes: the loading poster, the 2D view in Settings and the
  start menu, and the fallback without 3D (a simple message instead).
- Saves are safe: plots, lots and corner shops are owned by id. The layout
  snapshot is rewritten for the owner's deliberate move.

## Steps

1. **The river** (built): `RIVER_W` 60; the south bank, The Trenches,
   the airport and the metro's south end move south (`WIDEN`); the highway's
   south side moves out; the river's natural shape (`river.ts`: its edges
   at any x, the quays, the coves and the banks), drawn with stone quays,
   grass banks, sand and reeds; walking, driving, boats, trees, the world
   map and the sound follow its edges; the four avenue bridges removed
   (traffic re-routes itself), the east avenue's crossing kept plain until
   step 2 (the el's pillars on its median over the water); the 2D map
   removed (a card says the city needs 3D graphics where it can't run).
   The airliners were re-timed for their longer loop round the moved
   airport, the outskirts' tree densities re-measured, and the boot code's
   budget raised from 658 to 662 KB for the river (`scripts/budget.mjs`).
2. **Harbour Bridge** (built; the owner's name and design, option 3 for
   its height): the water lowered 1.5 under the streets (`WATER_Y` in
   `river.ts`: stone quay walls down to it, the natural banks sloping down,
   everything afloat on it and the piles, posts and piers reaching down to
   it); on the east avenue, two stone towers with pointed arches standing
   in the river, four suspension cables with suspenders and a web of stays,
   the deck humped 2.4 over the middle from the bank avenues' kerbs so the
   boats pass under (about 1 to 3 clear), two lanes each way, the metro
   down the middle on its raised level at the el's height (posts on the
   median), a footway along each outer edge through the towers' smaller
   arches, lanterns and a necklace of bulbs on the cables at night
   (`harbour.ts`, `harbour3d.ts`). It's a place with a pin and a panel.
   The highway's two bridges got piers. The boot code's budget went from
   662 to 666 KB for it.
3. **Liberty Bridge** (built; the owner's calls: the high walkways walked
   on, the lower deck's halves lifting): rebuilt in the style of the old
   gate-tower bridges. Two sandstone towers stand in the river on cutwater
   piers; the approaches rise from the promenades, hung from pale blue
   chains between the towers and abutments off the quays; the lower deck
   crosses the middle on two leaves that lift on a timetable for a tall
   ship, which lies at anchor west of the bridge and east of it in turn
   and sails through between them; two enclosed walkways and a gallery on
   each tower make the high level, reached by a lift in each tower. The
   south bank's jetty that stood under the old bridge moved west.
4. **River life** (the owner's picks: a river bus, more boats, and boating
   yourself; no islands), in three parts:
   - **4a, more boats:** two traffic boats to a lane (each lane's pair at one
     pace, so they never close up), a police launch in the middle lane; a
     sightseeing cruise boat on its own loop through the town's reach
     (eastward north of Liberty's north pier, westward south of its south
     pier, turning wide at each end); a rowing eight out and back west of
     Pier 7; sailing dinghies tacking round the wide reach past the highway
     out west. Everything new on a line of its own, clear of the lanes, the
     tall ship, the piers, the decks and the bridges' undersides, a function
     of the clock like the tall ship, drawn as a district loaded as you
     approach the river. The highway's bridges' piers move between the
     lanes (they stood in the middle one).
   - **4b, the river bus:** two boats on a loop with four stops (Uptown's
     esplanade, Downtown's promenade, South Row's promenade, by Pier 7),
     each a landing on the water with a gangway down from the quay; at the
     top of the gangway a "River bus" prompt opens the stop's card (the
     other stops and how long each ride takes), the ride runs along the
     route under a camera alongside, and you step off at the destination's
     gangway, as the metro does. The stops are places on the map (fast
     travel, taxis). South Row's stop takes the jetty that stood there.
   - **4c, boating yourself:** a boat to hire at Downtown's landing
     ("Take a boat"), driven like your car (arcade, soft bumps off
     everything on the water, the banks, the piers and the decks; it passes
     under the bridges), with its own chase camera, readout and engine;
     you get out at any river bus landing and the boat goes back to its
     berth.
