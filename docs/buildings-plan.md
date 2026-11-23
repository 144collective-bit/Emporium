# Building quality: modelled fronts

The owner's call (2026-11): better-looking buildings without a heavy cost.
Until now an ordinary building's wall was one painted strip from the wall
atlas (`infill.ts`): windows, frames, sills and lintels all paint, the same
strip of eight bays by four floors repeating along every wall of its kind.
Cheap (one draw for every wall in the city), and flat: no depth, no
shadow, no ink outline round a window, and a window cut in half wherever a
wall ended part-way through a bay.

This plan keeps the atlas (and its one draw) and adds real geometry where
it shows. One phase at a time, each with the owner's sign-off.

It sits on top of The Trenches' variety plan (`docs/trenches-variety-plan.md`),
which landed while the pilot was being built and improved the paint itself:
a window type per wall kind (`windows.ts`: sashes, pairs, casements,
round-headed, shuttered, ribbons), each window's own light, blinds and
curtains, and several cornices. That plan makes the texture richer; this
one gives it depth. The frames follow whichever window type a wall paints.

## What changes

1. **Modelled windows, near only.** Round every painted window: a frame
   standing off the wall (so the glass sits back in it), a sill, a lintel;
   a capped hood on the round-headed ones, shutters on stucco, a post
   between a pair of sashes, the casements' concrete bands across the
   front, steel frames on the lofts' big windows, door frames on a hotel's
   balcony doors. Here and there a window box or an air conditioner (the
   blinds and curtains are the paint's). All in the
   shared paint (no new draw calls, no new materials), near only (they go
   with the building's other details past the tier's `far`), no shadows
   cast (a Batch's near details cast none). Phones get the sills and
   lintels alone.
2. **The front's shape, at every distance.** Bays are centred on the
   front: whole bays only, the leftover split between two corner piers
   that cover the plain ends, so no window is ever cut by a wall's end.
   The piers, the cornice's main course and the parapet are drawn at every
   distance, so a far building keeps its roofline and nothing pops as it
   comes near.
3. **Less repetition.** Each front starts its band on a floor of its own
   (as it already starts on a column of its own), so two fronts of one
   kind show different windows: 32 patterns a kind where there were 8.
   The window boxes and air conditioners are seeded per building.

Held for later (not in the pilot): the fake rooms behind the glass
(interior mapping in the atlas's shader, desktop only), side walls that
face a street, the offices' glass towers, the diners.

## How it's built

- `facade.ts` (DOM-free, tested in `tests/facade.test.ts`): the atlas's
  cell sizes, each window type's opening in its cell (`PANES`,
  `BALCONY_DOOR`, `PAIR_SASH`, `CASEMENT_BANDS`: the painter in `infill.ts`
  reads the same numbers, so paint and geometry can't drift), `styleOf()`
  (a wall kind's window type, windows.ts's; a curtain wall has none), `baysOf()` (a front's bays, centred, and the atlas's u at its left
  end) and `windowsOf()` (every window on a front, clipped under the
  cornice, none behind a brownstone's bay window).
- `infill.ts`: `fineOf()` says whether a building gets a modelled front
  (`Fine`: its style, bays and band row), `piers()` and `modelled()` draw
  it, `wall()` takes the band's starting row, and `shell()`, `dress()`,
  `cornice()` and `roof()` take the `Fine`. `kit()` has `wbox()` (a box
  against the wall, without the face on it: ten triangles), `jamb()` (six)
  and `panel()` (two).
- A window costs 32 triangles on desktops (sill 10, lintel 10, two jambs
  6 each), 20 on phones.

## Phases

### Phase 1: the pilot, the Emporium's block (built, signed off by the owner, 2026-11-21)

The centre block's brownstones, shops, lofts and hotels (`PILOT` in
`infill.ts`); every other building in the city is as it was, and so are
the buildings the kits lay in other districts (`IN_SITE`). The wall atlas's
picture is unchanged (the textures made at build time are the same).

Measured before and after (`docs/blend-shots/buildings-before/`,
`buildings-after/`): see "Numbers" below.

### Phase 2: the rest of downtown (built, signed off by the owner, 2026-11-21)

Every infill building in `INFILL`; the fronts' side walls where they face
a street or a lane.

- **Every front:** `fineOf()` has no pilot bounds now: every infill
  building downtown with a window type gets its modelled front (the
  pilot's 133 windows and about 214 more).
- **The sides:** a front's side walls that face a street, a lane, an
  alley or a park take the same windows (`sideFronts()` in infill.ts):
  their bays centred along the side, their corner piers, and their
  painted band laid from those bays (`Fine.sides`, read by
  `shellWalls()`), so each frame sits on its painted window. A side is
  open where most of five points just outside it are clear of anything
  taller than a person in `SOLIDS` (`sideOpen()` in facade.ts, tested):
  31 of downtown's 78 sides, about 384 windows. The rest stand against a
  neighbour's wall and stay paint. The sides' windows are drawn in a frame
  turned to the side, so `modelled()` and `piers()` work there as on a
  front; a side is painted from the ground up, so its windows count from
  there.
- **Measured** (headless, the medium tier at 1280 x 800 and the phone
  tier at 390 x 844; draws and triangles from `?fps` at three downtown
  views, a street, the square and from high; they swing a little with the
  traffic):

  | | Before | After |
  |---|---|---|
  | Draws, phone (street / square / high) | 316 / 288 / 292 | 314 / 279 / 294 |
  | Triangles, phone | 0.53M / 0.45M / 0.43M | 0.52M / 0.47M / 0.45M |
  | Draws, desktop | 527 / 450 / 569 | 533 / 426 / 542 |
  | Triangles, desktop | 1.61M / 1.78M / 1.58M | 1.65M / 1.76M / 1.61M |
  | The boot's own work, phone / desktop | 6.62 / 7.98 s | 6.75 / 8.02 s |
  | The site's code (all of it, gzipped) | 1,450.2 KB | 1,450.6 KB |

  No new draws (the shared paint), a few per cent more triangles near.
  Geometry by count (the headless readings swing more with the sites
  built than this moves them): about 600 windows more, two boxes each on
  phones (about 2 KB) and four on desktops (about 4 KB), so about 1.2 MB
  on a phone and 2.4 MB on a desktop, all of it near-only detail held
  from the boot as the pilot's was.

### Phase 3: the kits (built, signed off by the owner, 2026-11-23)

The buildings the kits lay (The Trenches' tenements and rows, the
recipes' districts): `IN_SITE` buildings take a modelled front too, built
in their sites (and in the site worker).

- **What takes it:** the kits' buildings of the downtown types, drawn
  through `infillBuilding()` in their sites: The Trenches' rows (48
  brownstones and 17 shops, projects3d.ts) and its tenements (65 shops,
  streetwall3d.ts). Southfield's yards have none of those types. All 130
  are in `SOLIDS`, so their side walls are judged as downtown's are: 92 of
  their 260 sides face a street or a lane. The side test
  (`tests/facade.test.ts`) covers them too.
- **Phones: the fronts, not the sides** (the owner's pick; `fineOf()`'s
  `side()`: `IN_SITE && LOW`). They're about 3,300 windows (about 1,700
  on the fronts and 1,600 on the sides, the rows being long and deep):
  every one on phones measured about 7 MB more geometry (6.6 by count),
  where downtown's 750 or so are under 2 MB, and the phone's geometry is
  the tight one. The fronts alone are about 3.5 MB on a phone by count
  (the headless readings swing too much with how many sites had built
  to show it). On desktops it's all of it, near-only detail in the sites,
  let go with them past the haze.
- **memcheck** (the phone, every site built; the owner's ask before
  merging): geometry 201.2 MiB of 210 with Phase 3, 200.7 on main without
  it (+0.5: near forms past the budget are let go). Its frame ceilings
  failed on main without Phase 3 too (`south-rampart` 294 ms, `crest-drive`
  348, the route 1843) and with it (`south-rampart` 296, the rest under):
  a hitch from what the sites build there, not Phase 3's.
- **Measured** (headless, the medium tier and the phone tier, at the bench
  view over The Block, a row's corner and a tenement's): desktop draws
  282 / 523 / 267 before, 292 / 514 / 292 after; triangles 1.49M / 1.79M /
  0.86M before, 1.51M / 1.72M / 0.90M after (they swing with the traffic
  and with how much of the Trenches' sites had built). With every window
  on phones too, the phone's geometry rose about 7 MB and the view over
  The Block 0.38M to 0.46M triangles; with phones kept painted, the
  phone's geometry after the views is 111.6 MB before and after.

### Phase 4: the glass and the extras (built, signed off by the owner, 2026-11-23: the plan complete)

Mullion fins and spandrels on the offices' towers; the diners; and, on
desktops only, rooms behind the glass (interior mapping) if the owner
wants it after seeing the rest (the owner's pick: yes).

- **The towers** (`towerSkin()` in infill.ts): each glass wall in a frame
  turned to it, as its band runs. A fin on every painted mullion (every
  half cell: where the band's u is on one of its 16 panes' edges; every
  other one on phones), a spandrel over each floor's painted dark band.
- **The diners** (`dinerSkin()`): chrome mullions on the painted ones
  (every 42 of the band's 256 pixels), a chrome sill and head along the
  long window on all four walls.
- **Rooms behind the glass, desktops only** (rooms.ts, DOM-free and
  tested; rooms3d.ts): a quad 5 mm off each bare window's painted glass
  (a window with blinds or curtains keeps its paint, so near and far
  agree), each tower pane and each diner pane, in one material
  (`ROOMS_MAT`, a `MeshBasicMaterial` with `onBeforeCompile`: batching and
  fog as any other). Its shader casts the view into a box behind the wall
  (interior mapping) and draws the back wall (a sofa or desk along its
  foot, a picture over it), the sides, floor and ceiling in flat colours
  with ink where they meet, and the glass's sky over it (more at a
  glancing look). By day it's well under the street's light; at night it
  takes the painted window's own light (`paneAt()` of that window's atlas
  cell: its band's seed, the band's row on its floor, its column), or
  goes dark; a diner's is warm day and night. A Batch keeps only position,
  normal and uv, so the window's size and its light ride in the uv's whole
  part (`packRoomUv()`); the colours are written as on screen and turned
  to linear light at the end, as the atlas's are.
- **Measured** (headless, against main, at downtown's street, the square
  and the towers from the north): phones the same (draws 312 / 284 / 257
  before, 314 / 283 / 250 after; triangles 0.51M / 0.46M / 0.56M before
  and after within a per cent; geometry after the views 102.0 and 102.1
  MB); desktops draws 532 / 425 / 483 before, 512 / 454 / 482 after
  (within the traffic's swing), triangles 1.61M / 1.68M / 1.49M before,
  1.68M / 1.79M / 1.48M after, geometry 137.9 and 138.3 MB. The boot's
  code 765.6 KB of 775 (the rooms' shader and code, about 3 KB).

## Numbers

Filled in as each phase is measured (`?bench` on the headless tiers: draws
and triangles mean something there, frame times don't).

| | Before | After |
|---|---|---|
| Boot code (gzipped) | 713.1 KB of 740 | 714.8 KB of 740 |
