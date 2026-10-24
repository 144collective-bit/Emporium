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
3. **Liberty Bridge** in the style of Tower Bridge (to ask first: whether
   its high walkways are climbed in walk mode, and whether the lower deck's
   halves lift for tall boats). Until then it stretches over the wider water
   on its old supports.
4. **River life:** more boats, perhaps islands and a ferry (to be asked).
