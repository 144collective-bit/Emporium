# The Neon Mile (the Strip)

The owner's call: a strip like Las Vegas, lights and casinos, on the open
land east of town. Built in phases, each with the owner's sign-off. Keep
this plan up to date as it's built. Every name is made up: no real resort,
casino, brand, show or person, and nothing about the token.

## What the owner asked (2026-11)

- **Where:** the open land between the Parkway's east side and the ring
  highway's east side, north of the river (the kart park's old land, kept
  clear for a district; the owner's screenshot).
- **Layout:** one grand boulevard down the middle in place of the two small
  streets there, resorts on deep lots both sides, like the real Strip.
- **Height:** tall, like Uptown: hotel towers about 20 to 35 tiles, over the
  Emporium. The Emporium stays the tallest downtown; every flight keeps clear
  of them (tested).
- **In the game:** scenery first. Each resort is a place you can walk up
  to, with a pin and a panel that says coming soon. No betting in this plan
  (games could come later, only ever with Dorras, play money, never real
  money and never bought).
- **Style:** a mix: themed resorts, sleek glass towers and old-school neon.
- **Name:** **The Neon Mile** (the gateway sign: Welcome to the Neon Mile).
- **Landmarks:** a welcome sign, a fountain show, a giant LED sphere and a
  volcano.
- **Resorts:** seven: a pyramid and sphinx, a castle, canals, a tropical
  lagoon (with the volcano), a city skyline (with a rollercoaster), a
  space-age tower and a classic neon casino.
- **Getting there:** a monorail along the backs of the south row (the river
  side), three stations, the west one linked to the metro.
- **Look:** bright by day (the resorts' colours, glass and palms read
  clearly), blazing at night (every sign, bulb and LED face lit; within the
  bloom rules, nothing washes out).
- **Life:** crowds, limos and party buses, searchlights at night.
- **Sound:** the full buzz (a crowd's hum, slot-machine chimes by the
  casino doors, the fountains' music, the volcano's rumble), only once the
  visitor turns sound on.
- **How:** this plan first, then a phase at a time with the owner's
  sign-off.

## The land (measured from the street plan)

- **West:** the Parkway's east leg (its line at x about 124, its sidewalk
  outside it to about 126.5).
- **East:** the ring highway's east side (centre line x 275, its west edge
  about 270.8; the slip lanes at its junctions reach in to x about 263).
- **North:** the east-west street at z -4.5 (`ew0`, an avenue, 3.7 a side).
- **South:** the north bank avenue (`ew3`, z 64.5, 3.7 a side), the town's
  promenade and the river beyond.
- **Between them today:** two small streets carried on from downtown, at
  z 17 (`ew1`) and z 43 (`ew2`), one lane each way, each with a lit
  junction and slip lanes on the highway and going on into Crestmont past
  it. The land is three empty strips, about 16, 23 and 16 deep and 136 long,
  with a few trees.
- **Nothing flies over it:** no flight on today's timetable comes within
  reach of this land (measured over a whole period). The tests will hold the
  towers 4 clear of every flight anyway, so a later route can't hit one.
- **Nearby:** the metro's Downtown station on the east ring avenue (x 64.5,
  z 33), about 60 west across the eastern districts; Harbour Bridge to the
  south-west; Crestmont across the highway.

## What the Neon Mile is

### The boulevard and the land (Phase 1)

- **The Strip itself** (`STRIP_BLVD`): one grand boulevard along z 30 from
  the Parkway to an east road short of the highway's slip lanes. Two lanes
  each way (wider than the avenues' lanes), a broad planted median of palms
  with neon uplights, wide sidewalks, zebras at its junctions. It meets the
  Parkway at a lit junction (the welcome sign stands in the median there).
- **The two small streets** (`ew1`, `ew2`) stop at the Parkway's sidewalk
  on the west and at the east road on the east; the short pieces from the
  east road to the highway stay, so the highway's junctions, their slip
  lanes and Crestmont's streets past them are as they are.
- **The east road** (`STRIP_EAST`, x about 252): north to south from `ew0`
  to the north bank avenue, clear of the slip lanes, where the boulevard
  ends at a lit T, joining `ew1` and `ew2` too.
- **The lots** (`STRIP_LOTS`): a north row between `ew0` and the boulevard
  (about 25 deep) and a south row between the boulevard and the monorail's
  strip along the north bank avenue (about 21 deep), cut into resort lots
  with service ways between (walk-only alleys and the resorts' drives).
- **Traffic** drives it (routes.ts reads the street plan); taxis and fast
  travel reach its places.
- **The snapshot** (`tests/fixtures/layout.json`) is rewritten for the
  streets that change: the owner's call.

### The resorts (Phase 2)

Seven resorts on their lots, every name made up (draft names, the owner to
change any):

| Side | West to east | Theme |
| --- | --- | --- |
| North | **Wild Ace** | Classic neon: an old casino covered in bulbs and starbursts, a giant neon star and a waving neon cowboy (made up) on its front, by the welcome sign; the smallest, under the Emporium |
| North | **Dragonspire** | A castle: turrets and spires in bright colours, a drawbridge entrance, its hotel tower behind |
| North | **The Golden Scarab** | A dark glass pyramid with a light beam from its tip at night, a sphinx at the gate, an obelisk pylon |
| North | **Big City** | A cluster of mini skyscrapers of a made-up big city, a rollercoaster looping round them, a bridge over its pool |
| South | **The Gondolier** | An old-world palace on a canal with gondolas, a bell tower, the fountain show's lake in front on the boulevard |
| South | **Lava Lagoon** | A curved gold tower behind palms, a lagoon and the volcano out front |
| South | **Orbit** | The space-age tower: the tallest on the Strip, a flying-saucer top deck with neon rings |
| South | **The Sphere** | The giant LED sphere on its own lot (Phase 3) |

- **Each resort:** a hotel tower (or towers) of 20 to 35 tiles on a casino
  podium (but Wild Ace), a porte-cochère with valets over its drive off
  the boulevard, its sign pylon by the boulevard (a giant LED screen and its
  name in neon), lit windows in towers by night, a pool deck on the
  podium's roof, its theme's dressing near only.
- **Places:** a pin, a directory entry and a panel each (coming soon, Walk
  in), `PLACES` and `LIVE_PLACES` entries.
- **Data:** `strip.ts` / `resorts.ts` (DOM-free, tested): lots, parts
  (boxes, drums, pyramids, the saucer), solids (`STRIP_SOLIDS` in
  `SOLIDS`), spawns, heights (the tallest and the flight test).
- **Drawing:** a district loaded as you approach (`LAZY_DISTRICTS` id
  `strip`), a site per resort, walls from a curtain-wall atlas of its own
  (like Uptown's) and the city's wall atlas, one sign atlas of fixed made-up
  copy, LED faces from one texture of made-up animations (never a number,
  never a real brand), far forms from the sites' own levels.

### The landmarks (Phase 3)

- **The welcome sign:** a diamond-shaped neon sign in the boulevard's
  median at the west end, WELCOME TO THE NEON MILE, bulbs chasing round its
  edge (both ways, so it reads coming and going).
- **The fountain show:** the lake in front of The Gondolier, rows of jets
  dancing to a timetable (a function of the clock, the same for everyone),
  lit at night; the crowd stops to watch.
- **The volcano:** in Lava Lagoon's lagoon, erupting on a timetable: a glow
  from inside, flames on the water, a rumble.
- **The Sphere:** a ball about 20 tiles across on a base, covered in LED
  panels showing made-up animations in turn (an eye, the moon, a planet, a
  wave, the Emporium diamond), seen from across the city.
- **Searchlights:** beams sweeping the sky at night from several resorts
  (like Club PULSE's), the pyramid's straight up.
- Under reduced motion every timetable shows still frames: nothing moves.

### The monorail (Phase 4)

- A beam on pillars along the strip between the south row and the north
  bank avenue, three stations (west end, middle, east end), a sleek train on
  a timetable (like the metro's `trainAt()`), rides between stations (like
  `metro-ui.ts`).
- **The link to the metro:** the line carries on west along the north bank
  avenue's north side to a terminus by the east ring avenue, a short walk
  from the metro's Downtown station. Its exact run is measured in this
  phase (it crosses the eastern districts' blocks on a beam).
- Its stations are places (the world map, taxis, fast travel).

### Life and sound (Phase 5)

- **Crowds:** busy sidewalks day and night (walkers round the Strip's
  blocks, people with shopping bags and phones, crowds watching the
  fountains, the volcano and the sphere).
- **Limos and party buses:** a stretch limo and an open-top party bus in
  the Strip's traffic (new models, made-up names), taxis, valets at the
  porte-cochères.
- **Searchlights** at night (from Phase 3).
- **Sound** (ambience.ts `strip`): the crowd's hum, slot-machine chimes by
  the casino doors, the fountains' music swelling with the show, the
  volcano's rumble.

### Polish and performance (Phase 6)

- `?bench` views over the Strip by day and at night; phones draw fewer
  details, simpler LED faces and fewer people; the boot's size checked.

## Rules for every phase

- Made-up names only: no real resort, casino, brand, show, performer or
  person, and nothing about the token. Signs and screens are fixed copy.
- No betting in this plan. If games come later, only ever with Dorras,
  play money earned in the city, never real money, never bought, never
  cashed out, never pitched as anything more.
- The towers over the Emporium are the Strip's only (the Emporium stays the
  tallest downtown); every flight 4 clear of them (tested).
- Bloom stays minimal: small bright things pass the threshold, big LED
  faces and lit windows stay under it (soft), so nothing washes out.
- Data in DOM-free modules with tests, the drawing in sites in its own
  chunk, the boot carrying only what it must (solids, streets, places).

## Open questions for the owner

- **The resorts' names:** the draft names above, change any you like.
- **Which side each resort stands on:** the table above is a proposal.
- **The boot's size:** the boot is at 672.4 of its 680 KB. The Strip's
  streets, solids and places will need a few KB; the budget may need
  raising again, asked when it comes up.
- **The monorail's west end:** carry it on west to the metro (above), or
  stop it at the Strip's west end with a walk to the metro?

## The phases

1. The boulevard and the land (the streets, the lots, traffic).
2. The resorts (the seven, as places).
3. The landmarks (the welcome sign, the fountain show, the volcano, the
   Sphere, the searchlights).
4. The monorail.
5. Life and sound.
6. Polish and performance.
