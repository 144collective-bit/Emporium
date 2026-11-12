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
2. **Facades.** More materials: orange-red, purple-brown and painted brick,
   the cream glazed brick of post-war projects, precast concrete panels;
   weathering (stains under sills and copings, soot near the roofs, faded
   paint); a ground floor in its own material on the tenements and rows.
3. **Rooflines.** Tenements of mixed heights (3 to 6 storeys), cornices of
   different kinds (bracketed, stepped, a plain coping, none), a few
   setbacks; roofs in tar grey, gravel and silver paint, not all navy;
   rooftop clutter in variety (water tanks of different shapes, bulkheads,
   vents, aerials, dishes).
4. **Ground floors.** A mix of shopfronts (roll shutters half up, bodegas
   with awnings, recessed doorways, gated entries, stoops), fire escapes on
   some fronts only, door surrounds, a few painted ground floors.
5. **Streets and yards.** Cars parked along the kerbs where the streets
   allow, street trees in pits, utility poles and their wires, more signs and
   tags, scaffolding on a few more fronts; the yards less bare (worn grass,
   low fences, benches, bins).
6. **Polish.** Review and benchmark views, phones, the budget; the plan done.

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
