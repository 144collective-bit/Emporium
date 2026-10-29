# The Hills: a north-east town in the style of Beverly Hills (the owner's call)

The owner wants a new town in the north-east, in the style of Beverly Hills:
ultra-premium buildings, palm trees and hills. It's the biggest district yet
and the first ground in Sector 7 that isn't flat, so it's built in phases,
each a PR with the owner's sign-off. Keep this plan up to date as each is
built.

Working name: **the Hills** (the owner picks the real one in Phase 0; it's
made up, never a real place's name, and not "Palm ..." since Palm Court is
taken).

## Where

The open land outside the ring highway's north-east corner:

- **The Flats:** east of the highway's east side (x 275) out towards the
  world's edge (`EXT` 460), from the north bank avenue (z about 69) north to
  about z -60. Flat, a planned grid like Beverly Hills' flats. Downtown's
  east-west roads (z -9, 17, 43, 69) already run on past the highway here
  as plain continuations with no traffic: they become the Flats' streets.
- **The Hills:** north of the Flats, rising to the world's north-east
  corner (x 230 to 460, z -60 to -420), past the kart park's east and
  north sides (`KART_PARK` x 113-225, z -311.5 to -191.5). Winding roads,
  estates on terraces cut into the slopes, a ridge road along the crest.
- Today it's open land with the outskirts' trees and, further out, the
  pine woods (`WOODS`, `outskirts.ts`). The hills give the far skyline
  (`SKYLINE`) a backdrop on that side.

Nothing that exists moves (`tests/snapshot.test.ts`): the kart park, the
highway, its junctions and slips, the airport's land south of the river and
Palm Court stay as they are.

## Questions for the owner (Phase 0)

1. **The name** of the town and its main streets (made up). Ideas: Crestmont,
   Sunridge, Golden Hills, Palisade Heights, Sector 7 Hills.
2. **How high the hills go.** The Emporium's roof is 12.5 tiles (about
   22 m). Real hills there are 100 m and more, which would dwarf the city.
   Recommendation: the Flats at street level, the hills rising gently to
   about 25-35 tiles (45-60 m) at the far corner, the buildings on them
   low (two or three storeys), so "the Emporium is the tallest building"
   holds (it's about buildings; Uptown's towers are the owner's one
   exception). The airliners' turn north past the runway and the aircraft
   you fly must clear the hills (the flight tests get the ground's height).
3. **A sign on the hillside?** Big letters on the slope are the look
   people know. Recommendation: SECTOR 7 in white letters, lit at night,
   the city's own name (fixed copy, nothing else).
4. **Getting there:** the highway and the Flats' streets (Phase 2) for
   sure. Should the metro run on from Kart Park station to a Hills station
   (Phase 9)? Taxis, fast travel and the world map come with it anyway.
5. **Places to go into or only scenery?** Recommendation: scenery first,
   then a few places with pins and panels (the grand hotel, the shopping
   street, the overlook, the country club) saying "coming soon" like the
   others, and later (optional, Phase 10) an estate you can buy for
   Dorras.
6. **What goes in.** Picks for the landmarks (Phase 7): a grand hotel in
   its gardens, a civic hall with a tiled tower, a country club with a golf
   course, a hilltop overlook park, a reservoir. Anything else?

## The rules for it

- Made-up names only: shops, the hotel, the streets. No real brands,
  designers, hotels, people or celebrities (no "homes of the stars" tour of
  real people). Signs are fixed copy from atlases, never prices.
- Premium but it's the game: estates and shops are places and scenery, never
  pitched as an investment; any price is Dorras (Phase 10, if the owner
  wants it).
- Degen's style as everywhere: toon materials, ink outlines, flat shading,
  and the PulseChain neon at night (the Drive's signs, the pools lit, the
  palms uplit), bloom held to the rules (small things bright, big surfaces
  under the threshold).
- Built the city's way: DOM-free data with tests for everything the boot,
  walking, driving, the traffic and the server need; the drawing a district
  loaded as you approach (`LAZY_DISTRICTS`), its buildings as sites
  (`site()`), fine detail near only, far forms, phones lighter. The boot is
  at 651 of 670 KB: the town's data in the boot must stay small (Phase 1's
  ground is the one thing it can't do without).
- Fixed numbers written east of the highway and north of the river: no
  `SOUTH_SHIFT` / `WIDEN` (they're north of the river). Anything written
  against the world's edge works at both sizes (`npm run test:wide`).

## Phases

### Phase 0: decisions and measuring

- The owner's answers to the questions above, written into this plan.
- A sketch of the land: the Flats' grid, the hill roads, the terraces, the
  landmarks, as a picture in `docs/` for sign-off (like the kart plan's).
- Bench views over the Flats and the hills (`BENCH_VIEWS`) so every phase
  measures before and after; the boot's budget room checked.

### Phase 1: the ground that rises (the hard one)

The whole world is flat today, at y 0 but for decks and bridges. This phase
makes ground that rises, and everything that stands or moves on the ground
follow it, with the hills empty.

- `terrain.ts` (DOM-free, tested in `tests/terrain.test.ts`): `HILLS_RECT`,
  `heightAt(x, z)` (0 everywhere outside it, so nothing else in the world
  changes; inside, smooth seeded hills easing up from the Flats to the
  corner, `slopeAt()` / `normalAt()`), with **cut and fill**: flat pads
  (`PADS`, each at its own height) and graded road corridors (`grade()`:
  a road's profile at most `MAX_GRADE`, its cross-section level) pressed
  into the hills, eased into the slope round them. Small enough for the
  boot (a few numbers and a noise, no height map).
- Everything reads it: the ground's mesh (world.ts, a grid per tile with
  its vertices on `heightAt()`, the grass shading by slope); walking
  (walk.ts `groundAt()`, steps no steeper than he can climb, the camera kept
  over the ground); your car, bike and kart (drive-sim.ts, the springs on
  the ground under each wheel, which `suspension.ts` already reads); the
  traffic and taxis (their y and pitch along a street, as on Harbour
  Bridge's hump); the crowd's feet; trees, lamps and sites placed on the
  ground (a site's base y); the collision boxes and bullets with a floor
  (`rayBoxes()`: boxes stand on the ground, the ground stops shots);
  flying (`floorAt()`); the shadows' box; the world map shaded by height
  with contours.
- The tests: 0 outside the rect, smooth (no step a walker or car can't
  take on a road), the pads flat, the roads within their grade, every
  aircraft's route well over the ground, the snapshot unchanged.
- Risks: the ink outlines on long slopes (check the depth pass), triangles
  per tile on phones, the far form of a hill (a coarser grid far).

### Phase 2: the streets

- `hills.ts` (DOM-free, tested): the Flats' grid (the four east-west roads
  given traffic and kerbs, north-south streets between them every block,
  a planted-median boulevard through the middle lined with palms, the
  shopping street, **the Drive**, short and wide, two blocks long); the hill
  roads (winding canyon drives up from the Flats, switchbacks round the
  spurs, cul-de-sacs to the estates, the ridge road along the crest to the
  overlook), each at its grade from Phase 1; junctions (lit in the Flats,
  stop signs up the hills); the blocks and their slabs; lamps (ornate twin
  lanterns in the Flats, low ones up the hills).
- Joined to the street plan (`cityPlan()`), so traffic (`routes.ts`),
  taxis, walking, the world map and the sound read them; the highway's
  junctions on its east side get their outer slip lanes (`OUTER_SLIPS`).
- Drawn by `hills3d.ts` (the district's chunk): asphalt following the
  ground, kerbs, sidewalks, zebras, the medians. Clean: no wear (the
  opposite of The Trenches).

### Phase 3: palm trees and the landscape

- Palm trees, new to the city: tall fan palms (the thin ones down the
  avenues), date palms (the fat crowns by the hotel and the estates) and
  short fan palms in gardens, each a few shapes in Degen's style (a curved
  segmented trunk, fronds as flat bent blades), instanced through
  `Batch.instances()` with a far form (crossed cards), the fronds swaying
  in the wind (`SWAY`, as the canopies), fewer on phones.
- The Flats: lines of palms down every street, clipped hedges, lawns,
  jacarandas. The hills: dry grass and scrub on the slopes, oaks in the
  canyons, retaining walls of stone and white render where the pads and
  roads are cut, the outskirts' trees and the woods kept off the town
  (`keepTreesOff()`).

### Phase 4: the Drive, the shopping street

- Low, polished boutiques (two or three storeys): white stone, glass,
  bronze, black-and-gold awnings, a short arcade with fountains and cobbles,
  window displays lit at night, made-up names (one sign atlas), flags,
  planters, kerbside valets with supercars and the town car parked
  (`parkedCars()`), café terraces. Built from kits and recipes like
  downtown's infill (new kits: the boutique, the arcade).

### Phase 5: the Flats' estates

- Big houses on big lots behind hedges and gates: Spanish Colonial (white
  render, red tile roofs, arches), Mediterranean villas, Tudor, Georgian
  and white modern, each on its lawn with a drive, a fountain, a pool out
  back. A house kit with styles and a recipe laying them on the blocks
  (`layBlock()`), the details near only.

### Phase 6: the hills' mansions

- Estates on the terraces from Phase 1: cantilevered glass moderns over
  the slope with infinity pools lit at night, villas with tiled terraces
  stepping down, a few gated compounds with long drives, the summit estate.
  Gates with columns and lamps, hedged walls, parked supercars. Each on a
  pad (`PADS`), its solids from its parts, every one under the Emporium.

### Phase 7: the landmarks

The owner's picks from question 6, each scenery or a place (spot, pin,
directory entry, a panel with Walk in, `PLACES` and `LIVE_PLACES` entries):

- **The grand hotel** in its gardens off the boulevard (a pastel
  hotel with a tower, a curving drive, palms, cabanas by the pool, its name
  in script on the roof).
- **The civic hall** at the end of the boulevard (a white tower with a
  tiled dome, a park in front, fountains).
- **The country club** (a golf course over the lower slopes: fairways and
  greens shaped into the ground, bunkers, a clubhouse, carts).
- **The overlook** on the ridge (a little park looking back over Sector 7,
  benches, viewers, the hillside sign below it if the owner says yes).
- **The reservoir** in a canyon (still water, the city's water shader).

### Phase 8: its life, night and sound

- People: shoppers with bags on the Drive, valets and doormen, joggers and
  dog walkers on the hill roads, gardeners, people by the pools (acts from
  the crowd's rows). Traffic: more convertibles, coupes and the town car;
  a tour bus round the town (no real people's homes).
- Night: the palms uplit, the pools glowing, the Drive's windows and signs
  lit, the estates' windows, the sign on the hill.
- Sound (`ambience.ts`): a quiet hum, birds and sprinklers by day,
  crickets and an owl at night, fountains on the Drive.

### Phase 9: getting there

- The town's places on the world map, taxis and fast travel.
- If the owner wants it: the metro on from Kart Park station east to a
  Hills station by the Flats (`metro.ts`, its viaduct over the highway).

### Phase 10 (optional, the owner's call): an estate of your own

- Buy a mansion for Dorras (a game number, never an investment), a garage
  at it for your cars and bike, a place on the business card. Planned
  separately with `docs/tycoon-plan.md` if the owner wants it.

### Phase 11: polish and performance

- Every width (320 to 1440), both tiers, day and night; the bench before
  and after; phones lighter (half the palms, simpler estates far, no pool
  glow); far forms for the estates and hotel if the district's draws need
  them.
