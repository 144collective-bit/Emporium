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

### The boulevard and the land (Phase 1, built)

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

What was built:

- **Data:** `strip.ts` (DOM-free, tested in `tests/strip.test.ts`): the
  boulevard (`strip-blvd`, layout.ts `STRIP_BLVD`: z 30, two lanes each way
  either side of a 4-wide planted median, 10.8 across) from the Parkway's
  line (`BLVD_WEST`, `parkwayX()`) to the east road (`strip-east`, Mile End
  Road, x `STRIP_EAST_X` 252, one lane each way); `STRIP_CROSSINGS` (lit at
  the Parkway, at the boulevard's east end and where the east road meets the
  ring's north avenue and the north bank avenue); `STRIP_BLOCKS`, the north
  and south rows (about 23 deep and 125 long each), their west sides along
  the Parkway's outer sidewalk, a 1.2 sidewalk round them (`STRIP_WALK`),
  grass until the resorts come; `STRIP_LAMPS`; `STRIP_RECT` / `inStrip()`.
- **The small streets:** layout.ts `STRIP_GAP`, `ewRuns()`, `ewStreet()`:
  `ew1` and `ew2` end at the Parkway's crossing, and their east pieces
  (`ew1e`, `ew2e`) run from the east road past the highway into Crestmont,
  so the highway's junctions and slip lanes and Crestmont's crossings are
  the east pieces' (streetplan.ts, crestmont.ts). The Parkway's outer
  sidewalk runs on where they crossed it and breaks at the boulevard
  (outer.ts `onRoad()`); world.ts leaves their asphalt and lines off the
  Strip (`stripGap()`), and a crossing with a `strip-` street breaks the
  avenues' medians and lines (`highwayGaps()`).
- **Traffic:** routes.ts reads it (an avenue's planted `median` pushes its
  lanes out, `wide()`); buses stop along the boulevard (transit.ts reads
  `inStrip()`).
- **Drawing:** `strip3d.ts`, a district loaded as you approach
  (`LAZY_DISTRICTS` id `strip`): the boulevard's asphalt in pieces, its
  raised median with grass, palms every 7 with magenta and cyan neon
  uplights at their feet, white lane dashes and edge lines, zebras at its
  ends; the east road with its yellow centre line and zebras at the
  avenues. The palms' shapes are `palms3d.ts`, shared with Crestmont's
  planting. The lamps are the boot's (index.ts), the lots' slabs world.ts's.
- **Trees** keep off the Strip (outskirts.ts `treeSpot()`); the trees'
  density tests count its land as the mall's was.
- **The snapshot:** rewritten (the owner's call): `ew1` and `ew2` end at the
  Parkway, the new streets added, nothing else moved.
- **The boot** grew 4.2 KB, to 676.6 of 680: the traffic's baked routes
  now drive the boulevard (2.7 KB) and the street plan carries its streets
  (0.9 KB). (Merged with main's start-up pass since: 669.2.)

### The resorts (Phase 2, built)

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

What was built:

- **The data:** `resorts.ts` (DOM-free, tested in `tests/resorts.test.ts`):
  `RESORTS`, each on its own stretch of a row, written in its own frame
  (`frame()`: `u` along the boulevard from its west end, `v` back from the
  row's boulevard edge), so a resort reads the same on either row; its
  `parts` (boxes, drums, upright prisms, pyramids, cones, the saucer, the
  dome; `windows` for the hotels' floors, `solid: false` for what's over
  something else), the sign pylon (`pylon`: its LED screen and the column
  of the LED texture it shows, `row`), the porte-cochère (`porte`, its
  posts `portePosts()`), a car under it (`cars`), the door (`door`, a walk
  prompt that opens the panel), the spot you walk in at, facing it
  (`spawn`), the water at the ground (`water`, held in by a rim, `RIM`),
  the pool deck on the podium (`pool`), its `top` and neon colours. The
  themes' own: `WILD_ACE` (the star, the cowboy, the marquee), `DRAWBRIDGE`,
  `SCARAB` (the apex, the sphinx, the obelisk, the portal), `BIG_CITY` (the
  crowns, the spire, the bridge over the pool), `COASTER` and `coasterAt()`
  (the rollercoaster round the cluster, a closed Catmull-Rom curve through
  its points, `COASTER_SAMPLES`), `GONDOLIER` (the bridge over the canal,
  the gondolas), `LAGOON` (the islet where the volcano will stand, the
  palms), `ORBIT` (the shaft, the saucer, the mast, the fins). `SPHERE_LOT`
  with its hoardings until Phase 3. `RESORT_SOLIDS` (in `SOLIDS`: the parts
  as boxes, drums as three crossing boxes, the crescent in strips,
  `polyStrips()`, the pyramid in steps; the pylons, the porte-cochères'
  posts, the waters' rims (open at the drawbridge and the canal's bridge),
  the cars, the sphinx and the obelisk, the hoardings), `RESORT_TALLEST`.
- **The heights:** Wild Ace 11.5 (under the Emporium); Big City's towers
  14.6 to 22 with its spire to 30.5; the Golden Scarab's pyramid 15 and its
  stepped towers 21; Lava Lagoon's crescent 23.5 to 28; the Gondolier 27
  (its bell tower 23.6); Dragonspire's tower 24 with its spires to 32.4;
  Orbit's shaft 33, its saucer to 36.6, its mast 44, the tallest. Every
  flight passes well over them (the test).
- **The places:** spots `wildace`, `dragonspire`, `scarab`, `bigcity`,
  `gondolier`, `lagoon`, `orbit` (index.ts: pick boxes from the solid parts,
  the pin over the highest; the south row's fly-in from the north), pins,
  directory entries, panels (`data-panel-tpl`, kickers 30 to 36, coming
  soon, **Walk in** to the spawn, `data-strip-walkin`), `PLACES` and
  `LIVE_PLACES` entries, the doors' prompts (walk.ts `ALL_DOORS`).
- **Taxis:** a taxi comes by the shortest way and may stop on the
  boulevard's far kerb, the planted median between (no U-turns); the test
  allows it. The resorts' own drives, with taxis and limos pulling in under
  the porte-cochères, are for Phase 5.
- **Drawing:** `resorts3d.ts` (`registerResorts()` from strip3d.ts's
  `register()`): each resort two sites (its shell; its front and theme) and
  the coaster a site, the Sphere's hoardings one. The Strip's own
  curtain-wall atlas (`strip-glass`: gold, blue, dark and silver glass,
  cream stucco and brick with punched windows, four floors to a band, lit
  windows at night from its light map; plain bands for Wild Ace's red
  panels, Orbit's white podium with its lit ribbon, Dragonspire's stone,
  Big City's brick shops, the Gondolier's palace front of arcades and
  diamonds, Lava Lagoon's bronze ribbons), laid on in world units, stacked
  so a band never wraps (the pyramid's slopes in strips a band high). The
  signs (`strip-signs`: the names in their neon, VALET, THE SPHERE · COMING
  SOON) and the LED faces (`strip-led`: a column of four made-up slides a
  resort, its name, card suits and stars, a show, a starburst; stepped on
  together every 4 s by the tick). Every resort: the forecourt's paving, the
  drop-off's asphalt, the pylon (a dark column, gold base, its screen and
  name both ways, neon up its edges and round its crown), the porte-cochère
  (a white canopy on gold posts, neon round its fascia, its soffit lit, a
  valet's stand), the pool deck with loungers and umbrellas, its name high
  on its tower, neon along its podium's roofline, the doorway. Wild Ace:
  the marquee and bulbs round its front, the roofline and the star, chasing
  in three sets, starbursts, the star on its post, the cowboy (a neon
  cut-out, his arm waving on the main thread). Dragonspire: merlons, the
  gatehouse's arch, the drawbridge on its chains, flags on the spires,
  banners. The Golden Scarab: gold neon up the ridges, the gold capstone,
  the portal, the sphinx, the obelisk with its screen, the beam from the tip
  at night (an additive column in the FX layer). Big City: the crowns and
  the spire, neon up the towers' corners, the bridge over the pool, the
  coaster (two red rails, ties, white supports down to the ground or the
  podium's roof, a train of four cars round it on the clock, a lap every
  26 s). The Gondolier: white merlons, the belfry's arches, the bridge over
  the canal, the gondolas and their striped poles, lanterns along the lake.
  Lava Lagoon: gold neon along the crescent, the islet, rocks and two
  waterfalls down from the podium (a streaked texture the tick scrolls),
  palms round the lagoon. Orbit: three fins up the shaft with neon edges,
  rings of neon round the saucer, a band of lit windows, the dome, the mast
  and its red light. On the main thread: the water (the city's
  `waterMat`) with its rims, the cars (`parkedCars()`), the cowboy's arm,
  the beam, the train, the chase and the slides.
- **The boot** grew 4.2 KB, to 673.4 of 680 (the resorts' solids, places,
  doors and spawns); the Strip's chunk is 12.6 KB.

### The landmarks (Phase 3, built)

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

What was built:

- **The data:** `stripmarks.ts` (DOM-free, tested in
  `tests/stripmarks.test.ts`): `WELCOME` (the diamond on two posts in the
  median between its first two palms, `WELCOME_TOP`); the fountain's `JETS`
  (two rows along the Gondolier's lake and five shooters down its middle,
  `JET_MAX`), its timetable `SHOW` (a show of six movements of 9 s every
  three minutes: a wave along the rows, the rows taking turns, a sweep, the
  shooters in turn, the crescendo, the finale; the lake still between),
  `showAt()`, `jetHeights()`, `SHOW_STILL`; the volcano (`VOLCANO` on the
  lagoon's islet, `ERUPT`: an eruption every 150 s, the glow building, the
  flames bursting, dying down; embers in the crater between; `eruptionAt()`,
  `ERUPT_STILL`, `volcanoRumble()`); the Sphere (`SPHERE`: a ball 18 across
  on its plinth at the south row's east end, its pavilion facing the
  boulevard, `SPHERE_TOP` 19.2, `SPHERE_DOOR`, `SPHERE_SPAWN`); the
  `SEARCHLIGHTS` on five resorts' roofs and either side of the Sphere's
  pavilion; `MARK_SOLIDS` (in `SOLIDS`: the sign's posts, the ball, the
  pavilion, the plaza's drums). The hoardings came down.
- **The place:** spot `sphere` (pin, directory entry, panel kicker 37,
  shows coming soon, Walk in `data-sphere-walkin`, `PLACES` and
  `LIVE_PLACES` entries, its door in walk.ts `ALL_DOORS`).
- **The sound:** the volcano's roar, a deep layer of its own in sound.ts
  (`quakeGain`, `update()`'s `quake`, soundlazy.ts too) from
  `volcanoRumble()` where you hear from (index.ts); none under reduced
  motion.
- **Drawing:** `stripmarks3d.ts` (`registerMarks()`, from strip3d.ts):
  sites for the welcome sign (its face a small texture of its own,
  `strip-welcome`, on both sides, a neon border, bulbs chasing round it with
  Wild Ace's, the star), the fountain's lit nozzles, the volcano (a rugged
  cone, lava streaks and its crater in `strip-lava`, which the tick heats),
  the Sphere's plaza (paving, the plinth with its ring of light, uplights,
  the glass pavilion under a white canopy, THE SPHERE over its doors) and
  the searchlights' drums. On the main thread: the jets (an instanced
  column and spray, from `jetHeights()` every frame), the volcano's flames
  (one instanced flame: from the crater and a ring on the water), the
  Sphere (its skin a shader of LED dots playing an eye that looks round and
  blinks, the moon turning, a banded planet with its storm, a wave and the
  Emporium's diamond turning, 12 s each with a crossfade), the searchlights'
  beams (one instanced cone at night). Under reduced motion each stands at
  its still frame. The Strip's chunk loads from further out
  (`STRIP_REACH` in districts.ts), so the towers and the Sphere are seen
  from across town.
- **Left for Phase 5:** the crowd stopping to watch the fountains.
- **The boot** grew 1.4 KB, to 674.8 of 680; the Strip's chunk is 17 KB.

### The monorail (Phase 4, built)

- A beam on pillars along the strip between the south row and the north
  bank avenue, three stations (west end, middle, east end), a sleek train on
  a timetable (like the metro's `trainAt()`), rides between stations (like
  `metro-ui.ts`).
- **The link to the metro:** the line carries on west along the north bank
  avenue's north side to a terminus by the east ring avenue, a short walk
  from the metro's Downtown station. Its exact run is measured in this
  phase (it crosses the eastern districts' blocks on a beam).
- Its stations are places (the world map, taxis, fast travel).

What was built:

- **The line** (`monorail.ts`, DOM-free, tested in `tests/monorail.test.ts`;
  the owner's call: on through to the metro): a single concrete beam over
  the north bank avenue's median (`MONO`, as the metro's el keeps to an
  avenue's median), straight from just east of the east ring avenue's
  junction (x 73) to past the Sphere (x 231), the cars' floor at `FLOOR`
  (7.45, well over the buses); T-shaped pillars in the median every 10 or
  less, clear of the Parkway's junction (`MONO_PILLARS`).
- **Four stations** (`MONO_STATIONS`): **Downtown Link** (its lift tower on
  the lawn north of the avenue, its door facing the ring avenue, about 25
  from the metro's Downtown station), **Neon Mile West** (between the
  Gondolier and Lava Lagoon), **Neon Mile Central** (between Lava Lagoon
  and Orbit) and **The Sphere** (between Orbit and the Sphere's lot): the
  Strip's towers at the back of the walks between the resorts, their doors
  on the walk, a short stroll from the boulevard. Each a platform beside
  the beam over the avenue's westbound lanes, clear of the cars' sides, a
  glazed skybridge over the sidewalk to its tower.
- **The train** (`MONO_TRAIN`: three cars): a shuttle on a timetable
  (`monoAt()`, a function of the clock): the Link out to the Sphere and
  back, 12 s at each station, a gentle start and stop (`MONO_PERIOD` about
  110 s). **Rides** (`monoRide()`): straight between any two stations, 7 to
  25 s; after one the timetable picks up from that station (`monoResume()`,
  through `MONO_VIEW`, which the drawing reads).
- **Getting on:** each station's door is a walk prompt, "Monorail"
  (`mono:<id>` in index.ts, `MONO_DOORS`), which loads the ride's card the
  first time (`monorail-ui.ts`, its own chunk: the metro's card and ride
  bar with buttons of its own; Skip ride or Esc cuts to the end; reduced
  motion: a cut). Free. The live settings can close it (`monorail` in
  `LIVE_FEATURES`).
- **The map and getting about:** places `mono-<id>` (kind `mono`: taxis,
  fast travel, the world map's amber line and dots).
- **Drawing:** `monorail3d.ts` (`registerMono()`, from strip3d.ts): the
  beam in pieces (pale concrete, an amber neon edge each side) with its
  pillars, each station a site (the platform with its yellow edge and glass
  rail, a white canopy on slim posts with amber edges and the station's
  name on boards both ways, the skybridge, the glass tower between white
  piers with MONORAIL over its door); the train on the main thread (white
  cars straddling the beam, an amber stripe, a band of windows lit at night,
  rounded noses).
- `MONO_SOLIDS` (in `SOLIDS`: the pillars, the towers). The boot grew 2.5
  KB, to 677.3 of 680.

### Life and sound (Phase 5, built)

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

What was built:

- **Two new models** (in the traffic only, made-up names): the **Velvet
  Stretch** (`limo`: the Midnight Exec drawn out to 4.6, five tinted side
  windows, chrome along its windows and sills, a lit roof fin) and the
  **Party Liner** (`partybus`: the city bus's body, its lower deck enclosed
  with lit windows, the top deck open behind chrome railings with a lit band
  under them, a canopy over its front third, the DJ's booth, speaker stacks,
  magenta and cyan stripes down its sides). Each across the model tables
  (carspec.ts `CARS` and `PAINTS`, vehicleids.ts, suspension.ts, carinside.ts;
  cars.ts `EXTRAS`); the party bus drawn as a bus where the bus is special.
- **Its traffic** (strip.ts `STRIP_LEAD`, `STRIP_MIX`, `STRIP_PAINTS`; life.ts
  `STRIP_HOME`, as Crestmont's and Sunridge's, a Home now naming its lead
  model and paints of its own): the party bus, then limos, Cruisers in taxi
  yellow, a supercar, a town car and a coupe, put back on its streets when
  they wander off; 7 on desktops, 6 medium, 4 on phones (`strip` in `TIERS`).
  The party bus cruises at a bus's pace and doesn't stop at bus stops; the
  limos take it easy.
- **Its people:** walkers round both rows' sidewalks, most with shopping bags
  (life.ts's walks, after Crestmont's Drive); and standing about
  (`striplife.ts`, DOM-free, tested in `tests/striplife.test.ts`, added to
  the crowd's spare slots from the chunk; the crowd keeps more of them now,
  `reserve` 192, 96 on phones): two valets at every porte-cochère, doormen
  either side of every door (closer in on Dragonspire's drawbridge and the
  Gondolier's bridge), a crowd along the Gondolier's lake for the fountains,
  another in front of the lagoon for the volcano, an arc on the Sphere's
  plaza looking up at it; phones every other one.
- **Its sound** (ambience.ts `strip`, `casino`, `show`; sound.ts): the
  crowd's babble on the Strip, slot machines' chimes (quick pentatonic bell
  runs) by every casino door, and round the Gondolier's lake the fountain
  show's music while a show is on (a made-up tune a beat at a time over a
  soft chord, `showAt()`), with the jets' water; the volcano's roar (Phase 3).
- **The boot** grew 0.9 KB, to 678.2 of 680: still under it, so the budget
  wasn't raised (the owner's go stands for when it's needed).

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
- **The boot's size:** 678.2 of its 680 KB with Phase 5 (677.3 with Phase 4, 674.8 with Phase 3, 673.4 with Phase 2 (main's start-up
  pass made room). The owner has said to raise it when it's needed.
- **The monorail's west end:** answered: on through to the metro (built).

## The phases

1. The boulevard and the land (the streets, the lots, traffic). Built.
2. The resorts (the seven, as places). Built.
3. The landmarks (the welcome sign, the fountain show, the volcano, the
   Sphere, the searchlights). Built.
4. The monorail. Built.
5. Life and sound. Built.
6. Polish and performance.
