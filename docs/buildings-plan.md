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

### Phase 1: the pilot, the Emporium's block (built, waiting on sign-off)

The centre block's brownstones, shops, lofts and hotels (`PILOT` in
`infill.ts`); every other building in the city is as it was, and so are
the buildings the kits lay in other districts (`IN_SITE`). The wall atlas's
picture is unchanged (the textures made at build time are the same).

Measured before and after (`docs/blend-shots/buildings-before/`,
`buildings-after/`): see "Numbers" below.

### Phase 2: the rest of downtown

Every infill building in `INFILL`; the fronts' side walls where they face
a street or a lane.

### Phase 3: the kits

The buildings the kits lay (The Trenches' tenements and rows, the
recipes' districts): `IN_SITE` buildings take a modelled front too, built
in their sites (and in the site worker).

### Phase 4: the glass and the extras

Mullion fins and spandrels on the offices' towers; the diners; and, on
desktops only, rooms behind the glass (interior mapping) if the owner
wants it after seeing the rest.

## Numbers

Filled in as each phase is measured (`?bench` on the headless tiers: draws
and triangles mean something there, frame times don't).

| | Before | After |
|---|---|---|
| Boot code (gzipped) | 713.1 KB of 740 | 714.8 KB of 740 |
