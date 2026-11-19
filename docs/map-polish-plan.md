# The map polish plan: low-grade builds, glitches, placement

The owner's brief (2026-11-19): "scan the entire map for low grade builds
in any assets... polish the entire map and fix any low grade builds,
glitches, incorrectly placed assets and add a level of realism to the way
things are placed in the map." It came with five screenshots: blank-backed
terraces and lone brick yard walls in the south, the lock-ups and skate
spot under the highway, flat-windowed semis and a bare slab in a shop
parade.

This sits beside `docs/polish-plan.md` (game-wide unevenness: balance,
sound, menus) and `docs/buildings-plan.md` (modelled fronts); it is about
what the map looks like and where things stand. As every plan in `docs/`:
one phase at a time, each with the owner's sign-off; keep it up to date.
Nothing in it moves anything that exists (the snapshot holds), brings back
a retired thing, or raises a budget to get a build through.

**How it was found**: read from the code, district by district (five
passes: the south, the highway and downtown, Westlake to Sunridge, the
Docks to the kart park, placement across the map), checked against the
owner's screenshots. The headless shots (`npm run shots`) can't build the
city in a cloud container without a GPU (30 minutes and not ready), so the
eyes are the owner's screenshots; run `npm run shots` on a machine with a
GPU before and after a phase where possible.

## The owner's screenshots, traced

| Shot | What shows | Where it comes from |
|---|---|---|
| Under the highway | Plain beige boxes with blank cream panels | The lock-ups: one flat `lockup` box with a 2 cm `door` slab, no ribs, frame, number or lock, all one colour at an even stride, built with `cast: false` (`viaduct3d.ts` `under()`, `viadress.ts` `makeUnder()`) |
| The skate spot | Grey on grey, a straight slab on grass | `viaduct3d.ts` `skate()`; the under-deck gravel (blend plan Phase 9) never built, so every under-deck band is a hard rectangle on grass |
| Terraces | Blank backs and gable ends | `village3d.ts` `PIECES`: windows, doors and sills on the front face only |
| Terraces | Brick walls alone in grass | `southterraces.ts` `ALLEYS` laid house by house; a wall only where a strip fits, no side walls, nothing enclosed |
| Semis | Flat dark windows | `council3d.ts` `win()`: a bare dark quad, no frame or sill; backs blank, gardens unfenced; rows of four switched off (`council.ts` `four`) |
| Shop parade | A bare brown slab in a gap | `highroad3d.ts` the `gap` plot: one plywood box, the rough ground behind it never drawn |

## What else is rough, by theme

### Blank faces (the same class as the terraces)

- Uptown: 19 of 32 tower backs face a real street but draw the service
  wall (`streetlevel.ts` drops the back from `FRONTAGES`; `highrise3d.ts`).
  The Exchange, the hotel and the theatre put service bands on street
  faces (`uptownsites3d.ts`).
- The civic quarter: no door at City Hall's rear where the Mall ends;
  blank rear stubs beside the walks (`cityhall3d.ts`, `civic.ts`).
- Palm Court's outer walls are cladding to the first floor; the rows'
  south ends have no openings (`courtinside3d.ts`).
- The stadium's outer ring is a blank band but for the south gate
  (`stadium3d.ts`).
- Sunridge: side and back windows near only (`sunhouses3d.ts`); the
  school's west wing and hall ends blank (`sunamenities3d.ts`).
- Coral Drive's end boutiques show bare stone ends (`coral.ts`).
- The Docks' SHED 3 gables; the ship's bridge sides (`docksport3d.ts`).
- The airport's fire station a flat brick box; the maintenance hangar's
  north wall bare (`airportgrounds3d.ts`).
- The High Road's rows: one box each, windows on the front only
  (`highroad3d.ts`).

### Flat windows and doors

- The civic quarter (`cityhall3d.ts` `windows()`, also `flank3d.ts`) and
  Crestmont's hotel, civic hall and clubhouse (`crestsites3d.ts` `pane()`):
  dark panes 1-2 cm off the wall.
- Every resort's entrance, Scarab's portal, the Docks' doors: flat dark
  panes (`resorts3d.ts`, `docksport3d.ts`).
- The Trenches' kit buildings: flat paint (buildings plan Phase 3).

### Glitches

- The Gondolier's canal bridge: a square bar 2.3 m thick as its deck,
  burying half the palace door (`resorts3d.ts`).
- Flicker: the airport's markings 2 mm over the asphalt; about 25 other
  places step 0.5-2 mm; `polygonOffset` nowhere.
- The highway's deck floats about 12 cm over its piers at a distance (the
  bearings are near only; `viaduct3d.ts`).
- The south's lamps carry the ground's lift in their data and are lifted
  again when drawn (needs confirming on screen).
- The High Road's buildings are drawn near only: gone at a distance, no
  shadows (`highroad3d.ts`).
- Posts 1 cm thin: goal posts, fences, verandas, the lychgate, the
  allotment fence (whose rail floats on phones).
- The airport's fuel farm bund has no east wall.
- The Docks' booth glass 3 mm proud of its booth.

### Misplaced

- 15 of Sunridge's 56 lamps stand in a driveway's mouth (`sunridge.ts`).
- A street-arm lamp dead centre in every pocket park
  (`neighbourhoods.ts`).
- High Road lamps through the parade's canopy; lamps on the south's
  unbuilt greens stand in grass (`endswood.ts`).
- Crestmont's guard rails and vineyard rows step down the hills
  (`landscape3d.ts`, `crestgardens3d.ts`).
- Terrace bends open wedge gaps you can see through (`southterraces.ts`,
  `council.ts`).

### Realism of placement

- Lamps, trees and bins on a fixed stride that knows nothing of doors and
  drives (Sunridge, Crestmont's Flats, downtown's cross streets).
- No shared yard clutter: the kit districts, the terraces and the council
  rows have almost none (bins, sheds, washing lines, drainpipes, cars on
  drives); each district that has it rolls its own.
- Nothing grounds a prop in the City view: no contact shadow; the lamp
  pool one size for every post and 13 cm over the road.
- No test that props are off the road, clear of doors, on the ground.

### The house rules

- Sunridge: straight land edges and zones; the three cul-de-sacs end
  without a footpath through.
- The resorts' lagoon and moat are hard rectangles; both bridges cross
  dry paving between two pieces of water.
- The kart park's lawn a ruler-straight patch.

## Phases

### Phase 0: the guard rails (with Phase 1)

- The south's lamps lifted once, not twice; a test that what's drawn
  stands on `groundAt()`.
- Sunridge's lamps kept clear of the drives, and a test.
- Thin steps under 5 mm raised where found in Phase 1's files.
- Later in Phase 6: a DOM-free placement helper (a kerb line with blocked
  spans: doors, drives, crossings, junctions) and one test over every
  placed lamp, tree, bench and bin.

### Phase 1: the quick glitches (with Phase 0)

The Gondolier's bridge; the airport's marking heights and fuel bund; the
deck's gap over its piers; the thin posts; the pocket-park lamps; the
High Road at a distance; shadows under the deck; Crestmont's rails; the
booth glass and the deck's joints. Each S.

### Phase 2: the south's houses (the screenshots)

Terrace backs (back doors, windows, drainpipes, outriggers on alternate
houses), gable windows; each row's alley one strip with a joined wall, a
gate a house and side walls; the semis' framed windows, backs and fences,
rows of four on; a hoarding on the gap plot; the bends' wedges closed; the
caravan, the corner shops, the community centre and the allotment sheds
built properly. L.

### Phase 3: under the highway

Lock-ups with ribbed doors, frames, numbers, tags, colour by unit, one or
two half open, an uneven stride; the skate spot's coping, scuffs and
colour; the under-deck gravel with a wandering edge (blend plan Phase 9).
M.

### Phase 4: blank faces elsewhere

The list above, district by district. L.

### Phase 5: modelled windows

Buildings plan Phases 2-3 (the rest of downtown, the kits); the civic
quarter's and Crestmont's windows framed at every distance. L.

### Phase 6: placement that makes sense

The placement helper; a shared `dressing` of seeded yard clutter for every
district without it; contact shadows sized to each footprint; lamp pools
sized by post and on the ground; fenders on the quays. M-L.

### Phase 7: the rules and the water

Sunridge's edges and footpaths through; the resorts' moat, canal and
lagoon as one curved water each; the kart lawn's edge; filler on the
empty lots (the owner's call). M-L.

## Status

- Plan written 2026-11-19. Phases 0 and 1: the owner's go, 2026-11-19.

### Phases 0 and 1: built, waiting on the owner's sign-off

- **The south's lamps and yard trees lifted once.** `ENDS_LAMPS` and
  `YARD_TREES` carried `southLift()` in their heights and the Batch lifted
  them again: on the village's hill a post stood up to 2.4 over the
  sidewalk while its halo and pool (not in a Batch) stood on it. Their
  data is now the slab's height; the halos and pools take kit.ts
  `liftAt()` (which also puts every other south lamp's pool on its
  ground). Test: `tests/southground.test.ts`, every lamp on the hill.
- **Sunridge's lamps clear of the drives**: 17 of 56 stood in a drive's
  mouth; `sunlamps.ts` slides each along the kerb past the drive's nearer
  edge (all 56 kept), baked so the houses stay out of the boot (749.7 of
  750 KB before, 749.2 after: the houses load only where the lamps are
  worked out, the tests and the bake). Test: `tests/sunlamps.test.ts`.
- **The pocket parks' lamps**: a park lantern where the paths cross
  (`addLamp()` takes a post kind), not a street lamp's arm over the lawn.
- **The High Road's lamps** keep out from under a shop and the parade's
  canopy (`endswood.ts` `underShop()`; one stood through it).
- **The Gondolier's canal bridge**: a 25 cm slab along its arch, not a
  2.3 m square bar burying the palace door.
- **The airport's markings** 8 mm over the asphalt (were 2), the decals
  5 mm over them, the aprons and car parks 6 mm under the roads; the
  taxilane's line between.
- **The fuel farm's bund** closed on its east side, a steel stile over it.
- **The highway's deck on its piers**: the bearings at every distance and
  5 mm up into the girder (near only, the deck floated 12 cm from afar).
- **Posts**: the goal posts, the veranda's, the rail's and the lychgate's
  square, not 1 cm blades; the allotment fence's posts every 2.5 at every
  distance (the rail floated on phones).
- **Crestmont's guard rails** along the grade, as the walls are, their
  posts at each point's own height; on phones every other post (none
  before, so the rail floated).
- **The Docks' booth glass** 8 mm proud of the booth (was 3).

### Phase 2: the south's houses (built, waiting on the owner's sign-off)

Seen in a render of the village's sites alone (a small three.js page, the
city's builders run into it: headless, in seconds, where the whole city
can't be).

- **The terraces' backs**: a kitchen window and a back door down, two
  windows up, a gutter and downpipe near; a window each storey in a row's
  end gable; a single-storey back kitchen with a slate lean-to on about
  three deep yards in four (clear of every other house and alley, solid).
- **The yards walled round**: a party wall and a back wall with a gate
  behind the back door, at every distance, solid, clipped clear of the
  next row's house at the corners. No more loose walls in the grass.
- **The semis**: every window framed (a mullion across the wide ones) at
  every distance, sills near; the backs windowed with back doors; a landing
  window in each end wall; the back gardens fenced (panels and posts,
  drawn, not solid yet). The bungalows the same at the back.
- **The High Road**: the gap plot a hoarding of boards on posts with bills
  and a tag, rough ground, rubble, weeds and a skip behind; every end wall
  without a neighbour against it windowed.
- **The placeholders**: the corner shops a door by their window and backs
  windowed; the community centre's boards framed, a canopy, bills, downpipes;
  the allotment sheds pitched with a door, a window and a water butt; the
  caravan windowed on its wheels and hitch (no bungalow has one at present).
- The ginnels 6 mm over the alleys they meet (were 3 mm under them).
- The rows of four stay off (the owner's call, 2026-11-19: turning them on
  lays the council's lots again, so things would move).
- **The extras** (the owner's go, 2026-11-19): the wedges on the terraces'
  bends filled (village3d.ts `WEDGES`, `drawWedges()`: 106 of the 128 pairs
  whose fronts meet opened a gap at the back, up to 1.34: a wall front and
  back, the roof across from each house's profile; sky no longer through
  it); the semis' and bungalows' fences solid (council.ts `GARDEN_FENCES`,
  `FENCE_SOLIDS`, added with the council's solids; tested).
- The boot: 749.8 of 750 KB (the backs' data and solids are in it).

### Phase 3: under the highway (built, waiting on the owner's sign-off)

Seen in a render of the highway's sites round the lock-ups and the skate
spot (as Phase 2's). Drawing only, in the highway's lazy chunk: nothing
moved, the lock-ups' solids as they were, the boot unchanged.

- **The lock-ups** (the owner's first screenshot): each in one of five
  paints, a felt cap over its roof, a concrete frame round a roller door in
  one of four colours, the door's slats near, a number plate on the lintel,
  a padlock near; one in six half up with the dark inside under it; bills
  or a tag on about half. Seeded from where each stands.
- **The ground under the deck**: every stretch (car parks, lock-ups,
  courts, the skate spot) on worn gravel a little wider than the deck, its
  edges and ends wandering (the blend plan's Phase 9), not a straight slab
  on the grass.
- **The skate spot** (the owner's second screenshot): joints across the
  slab every 2, a yellow line along its edges, the ledges' feet and the
  quarter pipe's coping painted, the pieces a warmer concrete than the
  slab, tags on the slab.
- Left: the lock-ups' even stride (their places are the solids' and the
  data's: moving them is the owner's call).

### Phase 4: blank faces (built, waiting on the owner's sign-off)

Each district seen in a render of its own sites (as Phases 2 and 3).

- **Sunridge**: the houses' side and back windows at every distance (near
  only before), a side door into each garage; the school's west wing,
  north end, the front wing's back and the hall's sides windowed; the
  clubhouse's side and back windows at every distance, in surrounds.
- **The civic quarter**: every window (City Hall, the police headquarters,
  the courthouse) in a stone surround with a mullion and a transom at every
  distance; City Hall's back door onto the Mall (bronze, a canopy); the
  front range's back windowed where it shows by the walks.
- **The Docks**: the roller doors (SHED 3's, the warehouses' loading
  doors) framed in steel with a roll box, slatted near; SHED 3's gables a
  shutter, a door and windows under the ridge; the Harbour Master's door
  panelled under a fanlight.
- **The airport**: the hangar's north wall ribbed with windows and a door;
  the fire station windowed down its sides and back, a back door, a band.
- **The resorts**: lit glass doors in gold jambs in every entrance and
  Scarab's portal. The Gondolier's bridge (Phase 1) seen right.
- **Uptown**: a tower's back on a real street (21 of them) a glazed ground
  floor and ribbon, not louvres and a steel door (drawing only: the shops'
  data as it was).
- **Coral Drive**: each block's end boutique windowed on its cross street
  (the cafés where they were).
- **Crestmont**: the hotel's, civic hall's and clubhouse's windows in white
  surrounds with a glazing bar, the doors in stone; the hotel's balconies
  under every other window (they were off the windows' line) with open rails
  (they were solid black slabs).
- **Palm Court**: a shop window at street level on every row's outer face
  and on the south ends, the ribbon over them.
- **The stadium**: turnstile entrances east, west and north, banners down
  the facade (stadiumgrounds3d.ts, with the park: the stadium itself is in
  the boot).
- The boot: 749.9 of 750 KB.

### Phase 7: the rules and the water (in part, waiting on the owner's sign-off)

- **The resorts' water**: Dragonspire's moat and the Gondolier's canal run
  on under their bridges (a water a little under the deck, no rim at the
  two pieces' facing ends poking up through it; the solids as they were,
  those rims at the bridges' sides); Lava Lagoon's water inside its rim a
  beach of sand to a shore that wanders, not the rim's rectangle.
- **The kart park's lawn**: a strip of rough grass along the fence, its
  inner edge ragged (the circuit's run-off is 15 clear of it).
- **Sunridge** (the owner's calls, 2026-11-19: footpaths through, yes; the
  wall left straight, a walled estate's):
  - a footpath from each cul-de-sac's turning circle north to the loop's
    sidewalk (sunridgelots.ts `COURT_PATHS`), paved between the lots' side
    walls, a kerb either side, three bollards at each end; the lots laid
    clear of them (101 lots to 97), the lamps out of their mouths;
    `tests/sunpaths.test.ts`;
  - a lot no house fitted on stays open grass (its walls stood loose in
    the open); the fanned lots round the turning circles in their back
    yard's ground to their walls (the walls stood in grass beyond the yard);
  - a loose, wandering row of shrubs where the club's, the park's and the
    school's land meet.

Checked and left: the High Road's buildings are drawn at every distance
(the outer `detail()` is `'all'`); the under-deck props casting shadows
(they stand in the deck's own shade); the deck's joints (5 mm over the
road, 5 mm under its lines). Not seen on a screen: the owner's eyes on
the hill lamps, the bridge and Crestmont's rails before sign-off.
