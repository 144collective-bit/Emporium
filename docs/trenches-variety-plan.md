# The Trenches, more real and more varied

The owner's call (2026-11-12): The Trenches' streets look too alike ("the
buildings are all the same"); make them look more realistic and varied. The
owner picked all five suggestions, as a plan in phases with a sign-off at
each, starting with the windows and the facades. Every phase keeps to the
grit's rules: worn and lived-in, nothing threatening, made-up names only,
everything under the Emporium, phones light.

## What makes it look the same (measured, 2026-11-12)

- **Windows.** Every wall comes from infill.ts's wall atlas (`ATLAS.wall`):
  one band per wall kind, 4 floors by 8 bays, repeated across every face.
  Each band has one window shape, at one size and spacing, and about four in
  ten windows are painted "lit" in pink, cyan or yellow on the daytime
  texture too (`wallBand()`, `lit()`, `GLOWS`), so by day the blocks read as
  candy rather than glass. The same 32 windows repeat on every building of a
  colour.
- **Brick.** The Trench Houses take 8 picks over four bands (`BRICKS` in
  projects.ts), the tenements 6 (`BRICKS` in streetwall.ts), and half of both
  are the one plain red `brick`.
- **Roofs.** Every flat roof is the same dark navy slab with the same
  parapet, so from above the blocks look stamped out.
- **Tenements.** Every street-wall tenement (`TENEMENTS` in streetwall.ts) is
  the same `shop` kit with a fire escape (`escape: true`), 3 to 5 storeys,
  the same cornice and shopfront.
- **Yards.** Much of row B's yards is bare grey concrete between the towers.

## The phases (each with the owner's sign-off)

1. **Windows.** Several window types (single sashes, pairs, wide picture
   windows, tall narrow ones, the projects' steel casements), with stone or
   concrete sills and lintels; by day mostly dark glass with a sky sheen,
   blinds and curtains half drawn, the odd one lit; at night a lived-in mix
   (warm light, TV blue, dark), from the light map. Bands laid so neighbours
   don't repeat.

   The owner's picks (2026-11-12): the whole city's shared atlas (downtown,
   the kits, The Trenches and Endswood's terraces change together); by day
   about one window in twenty lit, warm; at night about half, mostly warm,
   some a television's blue, the odd pink or cyan.

   Built, signed off by the owner:
   - `windows.ts` (DOM-free, tested in `tests/windows.test.ts`):
     `WINDOW_TYPE` gives each wall kind its own window (sashes on red brick,
     pairs on tan, wide steel casements between concrete bands on dark
     brick, round-headed on brownstone; shutters, balcony doors, the
     warehouses' steel and the curtain walls as they were); `paneAt()` says
     what each window shows from a hash of where it is in its band: lit at
     night and in which light (`NIGHT_LIT`, `NIGHT_MIX`), lit by day too
     (`DAY_LIT`, only ever a warm one lit at night), and a blind part drawn,
     curtains or bare glass behind it.
   - infill.ts's `wallBand()` paints them (`glazed()`): by day dark glass
     with the sky's sheen and a streak across, the blind or curtains behind;
     on the light map the night's light. The atlas's light map shows by day
     at 0.05 where it was 0.15, so lit windows no longer tint the day.
   - Bands already start at a seeded bay on each building, so neighbours of
     one kind don't line up.
2. **Facades.** More materials: orange-red, purple-brown and painted brick,
   the cream glazed brick of post-war projects, precast concrete panels;
   weathering (stains under sills and copings, soot near the roofs, faded
   paint); a ground floor in its own material on the tenements and rows.

   Built, signed off by the owner (the owner's "go" on the plan's
   set):
   - Five more wall kinds in the shared atlas (`WallKindName` in
     windows.ts, `WALL_COLOR` in infill.ts): `brickOrange` (sashes),
     `brickPurple` (pairs), `brickPainted` (sashes, its courses faint under
     the paint), `brickGlazed` (casements between concrete bands, a shine
     on each course) and `panel` (precast concrete, joints at each floor and
     every two bays, a long low `ribbon` window a bay).
   - Weathering on every band but glass: soft stains down from each sill
     and a few water streaks down the band.
   - The Trench Houses take ten picks over eight materials (`BRICKS` in
     projects.ts: ten, since the towers take every third in turn), red brick
     the most common but no longer most of them (the projects test holds
     it); the tenements seven over seven (`BRICKS` in streetwall.ts). The
     tests hold both to at least five materials, none on 40% or more.
   - The tenements' ground floors were already shopfronts in their own
     band, and the rows' brownstones stand on their stone base, so that item
     needed nothing new.
   - The atlas grew from 11 wall bands to 16 (4,796 pixels tall; phones draw
     it at half size).
3. **Rooflines.** Tenements of mixed heights (3 to 6 storeys), cornices of
   different kinds (bracketed, stepped, a plain coping, none), a few
   setbacks; roofs in tar grey, gravel and silver paint, not all navy;
   rooftop clutter in variety (water tanks of different shapes, bulkheads,
   vents, aerials, dishes).

   The owner's picks (2026-11-12): tenements of 3 to 6 storeys, no two
   neighbours alike; roofs in tar grey, gravel and silver paint with some
   navy kept; varied clutter on most roofs.

   Built, signed off by the owner:
   - `rooftones.ts` (DOM-free, tested in `tests/rooftones.test.ts`): each
     pick a hash of where a building stands, so nothing in the seeded layout
     moves: `roofTone()` (`ROOF_TONES`, `ROOF_MIX`: tar, gravel, silver,
     navy), `corniceAt()` (`CORNICE_MIX`: bracketed, stepped, a plain
     coping, none), `tankAt()` (round timber or square steel), `ventsAt()`,
     `aerialAt()`.
   - infill.ts: every flat roof's slab in its covering (`roof()`, so
     downtown's and the kits' too), the shop kit's cornice by `corniceAt()`.
   - projects3d.ts: the Trench Houses' roofs in their covering, a round or
     square tank (`squareTank()`), one to three vent stacks (`vent()`) and
     an aerial on most bulkheads.
   - streetwall.ts: the tenements 2 to 5 storeys over the shop (3 to 6 in
     all), never as tall as the one before along the run, still one roll a
     lot; the tests hold neighbours apart.
4. **Ground floors.** A mix of shopfronts (roll shutters half up, bodegas
   with awnings, recessed doorways, gated entries, stoops), fire escapes on
   some fronts only, door surrounds, a few painted ground floors.

   The owner's picks (2026-11-13): fire escapes on about half, mostly the
   taller tenements; a mix of shopfronts; some ground floors painted.

   Built, signed off by the owner:
   - `shopfronts.ts` (DOM-free, tested in `tests/shopfronts.test.ts`), each
     pick a hash of where a tenement stands (rooftones.ts `spotHash()`):
     `escapeAt()` (`ESCAPE`: most with four floors or more over the shop, a
     few of the rest), `frontAt()` (`FRONT_MIX`: open, a roll shutter half
     up, a recessed doorway, a steel gate), `paintAt()` (`PAINTED` of them in
     one of `PAINTS`).
   - streetwall.ts sets them on each tenement (`escape`, `shopfront`,
     `paint`: new Infill fields in downtown.ts); infill.ts's shop kit draws
     them, near only (pilasters and a stall riser in the paint; the shutter's
     slats, ribs and box; the recess, its jambs, head and threshold; the
     gate's bars and rails). Downtown's shops carry none of it.
   - streetwall3d.ts leaves the new front off a lot the grit shutters right
     down (grit.ts `shuttered()`), so the two never overlap.
5. **Streets and yards.** Cars parked along the kerbs where the streets
   allow, street trees in pits, utility poles and their wires, more signs and
   tags, scaffolding on a few more fronts; the yards less bare (worn grass,
   low fences, benches, bins).

   The grit already gave the streets trees in pits, tags and bills, worn
   grass and dirt, dumpsters and bags, and the streets their parked cars;
   this phase fills in what was still bare (the owner's "continue",
   2026-11-13).

   Built, signed off by the owner:
   - `yardbits.ts` (DOM-free, tested in `tests/yardbits.test.ts`):
     `YARD_BITS` (benches with a bin, bike racks of three hoops, concrete
     planters with a shrub; on a grid over each yard, about one spot in
     five left bare, clear of the towers, their ways in, the amenities, the
     worn ground, the trees, the dumpsters and each other, each turned to
     the nearest tower's door), `STREET_POLES` (a timber pole every
     `POLE_GAP` just inside a yard's open street edge, slid along it off a
     taken spot, a cross arm, insulators, a transformer on some) and
     `POLE_WIRES` (three wires sagging between neighbouring poles, never
     across a tenement or a tower).
   - grit3d.ts draws them in each yard's site: the bits and poles at every
     distance in the yard's batch, the wires near only. Nothing is solid.
6. **Polish.** Review and benchmark views, phones, the budget; the plan done.

   Done (2026-11-13), the owner's pick: a full review.
   - Phones (the low tier, 390 by 844), the city before the plan
     (2de34c00) against after Phase 5, at five views of The Trenches
     (`?shots&fps`): draws 195 to 193 over The Trenches, 188 to 192 in a
     yard, 246 to 246 along the poles, 205 to 200 on Trench Avenue, 196 to
     176 on Bottom Street; triangles up at most 0.02M a view; geometry 184
     to 182 MB, textures 108 to 109 MB (the wall atlas's five more bands,
     half size on phones).
   - The desktop tier couldn't be measured in the cloud's software
     renderer (its sites never finished building); run `?bench` on a
     laptop to confirm it.
   - The boot 707.2 KB of its 740 (`npm run budget`).
   - Night shots: about half the windows lit, mostly warm, some a
     television's blue, the odd pink or cyan; nothing washes out; the
     yards' bits read in the lamplight. Nothing to fix.

   **The plan is done.**

## Phase 1's questions (to answer before it starts)

1. **Where the new windows go:**
   - A) The Trenches only: bands of its own, the rest of the city as it is
     (suggested: it's the owner's ask, and nothing elsewhere changes).
   - B) The whole city's shared atlas: downtown and the kits change too.
2. **Lit windows by day:**
   - A) Almost none (one in twenty, warm), as real windows are by day
     (suggested).
   - B) A few more (one in eight), still warm.
   - C) As now.
3. **At night:**
   - A) About half lit, mostly warm, some TV blue, the odd pink or cyan
     (suggested).
   - B) Fewer lit, moodier (about a third).
