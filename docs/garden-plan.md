# The garden furnished: resort luxe round the house (a plan)

The owner's call (2026-11-25), after the house plan (`docs/house-plan.md`) went live: "Furnish the garden", the
compound outside the house done to the same standard as inside. Nothing is built until the owner signs off a phase;
keep this plan up to date.

What stands today (`docs/compound-plan.md`, its guide `docs/guide/endswood.md`): the plot inside its wall
(`HOME.plot`, -244.5..-218.5 by 368..392), the yard's wide grey paving between the garage, the workshop and the house,
the fountain and four palms on the drive (`FOUNTAIN`, `PALMS`), the lit lines along the drive's edges, nine bollards
(`BOLLARDS`), the planters by the front door (`PLANTERS`), the pool, three loungers, an umbrella and the cabana on the
east lawn (`POOL`, `LOUNGERS`, `CABANA`), a tree and a bench on the north-west lawn, the helipad on the garage's roof.
All drawn by `home3d.ts` (`gardens()`, `poolside()`, `showpiece()`), the solids in `HOME_SOLIDS` (`home.ts`).
Shots of today: the review's `garden-today` sheet (from above, the north-east, the pool lawn, the north-west lawn, the
strip west of the house, the yard).

## The owner's answers (2026-11-25)

| Question | Answer |
| --- | --- |
| The style | Resort luxe: stone paths, clipped green, palms, warm light at night, to suit the pool, the palms and the villa |
| What it has | Lit paths; an outdoor kitchen and a firepit |
| The yard's grey paving | A two-tone pattern, and trees in planters along its edges; the car's way and the drive kept clear |
| Not chosen | Planting along every wall; a gravel garden in the strip west of the house (both left as they are) |

## What holds

- **Nothing that exists moves**: the plot, the wall, the gates, the back gate, the garage's doors, `CAR_HOME`,
  `BIKE_HOME`, `HOME_SPAWN`, the doors and their prompts, the pool, the loungers, the cabana, the fountain, the palms,
  the bollards, the tree and its bench. New things fit round them, clear of the car's way from the garage to the gates
  and of every prompt (`tests/home.test.ts`).
- **No taller**: nothing new rises over the house's eaves; the yard's trees stay under the palms.
- **Made-up only**: no brand on the grill or anything else, no lettering, no numbers.
- **Minimal bloom**: the path lights are small soft caps; the firepit's glow is a small warm bed, never a lit slab.
  **Nothing flush**: the pattern's stones sit a hair over the paving (the plot's ground is layered: paving at 6 mm,
  its darker courses at 12, what lies on it at 24).
- **Draw calls are the budget**: everything in the compound's existing batch, in paints it already has where it can;
  many copies (path lights, stepping stones, the yard's planters) as one geometry each; fine detail near only; phones
  leave out the finest. Measured before and after each phase: the draw calls where he wakes (313 desktop, 198 phone
  today) and `?bench` (`ends-home`) on the phone tier.
- **Motion is optional**: the fire's flicker holds a still frame under `prefers-reduced-motion`.

## The design

### The yard: patterned, with trees

- **The pattern**: the paving laid in two tones, a border of the darker stone round the yard's edges and a band of
  it framing the drive from the gates to the garage, wide pale panels between; his D in the paving before the garage
  stays the one mark.
- **Trees in planters**: four to six square black steel planters, each with a small clipped tree (a round crown, lower
  than the palms), along the yard's edges: by the workshop's front, along the house's front either side of the
  planters at the door, and by the garage's side. All solids (`HOME_SOLIDS`), all clear of the car's way, the
  bollards and the doors.

### The paths, lit

- **Stepping stones** of pale stone set in the lawns, a hair over the grass:
  - the north-west lawn: from the yard's edge to the bench under the tree, and on to the back gate;
  - the east lawn: from the side door to the pool's edge, and along to the cabana and the outdoor kitchen.
- **Path lights**: low black posts with soft warm caps beside the stepping stones (as the bollards are made, smaller),
  lit at night, one geometry for all of them.

### The outdoor kitchen and the firepit

- **The outdoor kitchen** on the east lawn, along the south wall, west of the cabana (the free ground there, about
  4.9 by 2.8): a stone counter with a black steel grill (its hood closed), a small sink, a dark worktop, three bar
  stools on its lawn side, a pergola of black steel over it with a string of warm lights.
- **The firepit** on the north-west lawn, in the open ground between the tree and the yard: a low round stone bowl
  with a warm bed of embers in it (a soft glow, a slow flicker by night), a curved stone bench round half of it, two
  low chairs on the other side; the stepping stones pass it.
- **Looks only**: no prompt, nothing they do in the game (a later phase can add one if the owner wants).

## The phases (each with the owner's sign-off)

1. **The yard**: the paving's two-tone pattern and the trees in planters. `home.ts` (the planters' rects, in
   `HOME_SOLIDS`), `home3d.ts` (`gardens()`), `tests/home.test.ts` (clear of the car's way, the gates, the bollards,
   the doors' prompts, the spawn). Shots from above, the north-east and the yard, by day and night; draw calls and
   `?bench` before and after.
   *Signed off by the owner and live (2026-11-26).* The pattern is south3d.ts `yardBands()`: the yard's paving in the
   palette's pale path stone (`STONE.path`), bands of its edge stone (`STONE.edge`) 0.2 wide on a 2.4 grid (a row of
   panels centred on the drive's line), a 0.35 border inside the wall and a 0.34 band under each of the drive's lit
   lines; drawn at every distance (a few quads a site, in paints the plot's batch already has). His D before the garage
   is inlaid in black steel now (it was the coping's stone, lost on the pale panels). The trees are home.ts
   `YARD_TREES` and `YARD_TREE` (a 0.6 square planter 0.45 tall, the crown's top 1.85), solid in `HOME_SOLIDS`, drawn in
   home3d.ts `gardens()` in the north-west tree's trunk and crown paints, a warm uplight at each planter's lip (near
   only). Tested in `tests/home.test.ts` (in the yard, off the drive, clear of the bollards, the fountain, the palms
   and every prompt, the workshop's and the bays' ways out). Draw calls unchanged: 313 desktop, 198 phone.
   Shots: `docs/garden-shots/phase-1-*.webp`.
2. **The paths, lit**: the stepping stones on both lawns, the path lights. Tests that the stones and lights keep off
   the pool, the loungers, the cabana and the bench, and that the way to the back gate and the side door stays clear.
   *Signed off by the owner and live (2026-11-26).* home.ts `GARDEN_PATHS` (two lines of points: the north-west lawn's
   from the yard's corner past the bench and round south of the tree to the back gate; the east lawn's from the yard
   by the house's end down past the pool's west end to the side door, then along the pool's south side to the
   cabana's front), `pathStones()` (a stone every `STONE_SIZE.step` 0.55, 0.44 by 0.3, turned to the path, a little
   turned and sized in turn so they read laid by hand), `PATH_LIGHTS` and `PATH_LIGHT` (eight black posts 0.24 tall
   beside the stones, solid in `HOME_SOLIDS`, each a 0.8 pool of warm light at night in `HOME_POOLS`). Drawn in
   home3d.ts `gardens()` at every distance: the stones in the coping's stone a hair proud of the lawn, the posts in
   black steel with the bollards' soft caps. Tested in `tests/home.test.ts` (on the lawns, off the pool, loungers,
   cabana, bench and tree, the stones apart, where each path goes, the lights beside the stones and never on one,
   every prompt and way clear, the back gate's way in). Draw calls unchanged: 313 desktop, 198 phone. Shots:
   `docs/garden-shots/phase-2-*.webp` (the container's shot tool doesn't darken the compound, so the night caps and
   pools are to be seen on a real device).
3. **The outdoor kitchen and the firepit**: the counter, grill, sink, stools and pergola on the east lawn; the
   firepit, its bench and chairs on the north-west lawn; their solids; the fire's glow and flicker (still under reduced
   motion). Walked with the smoke test's home scenes.
   *Signed off by the owner and live (2026-11-26).* home.ts: `KITCHEN` (a counter 3.6 by 0.55, `KITCHEN_H` 0.46, against
   the east lawn's south wall west of the cabana), `KITCHEN_STOOLS` and `STOOL` (three on its lawn side), `PERGOLA` and
   `PERGOLA_POSTS` (four black steel posts, 1.25 to the beams); `FIREPIT` (a bowl 0.42 across its middle, 0.24 tall,
   between the north-west lawn's path and the garage), `fireBench()` (five stone pieces on a 1.0 curve round its south
   half), `FIRE_CHAIRS` and `FIRE_CHAIR` (one either side); all solid in `HOME_SOLIDS`. Drawn in home3d.ts
   `kitchenAndFire()` (called from `gardens()`) in the compound's paints: the counter in the coping's pale stone (it
   reads in the wall's shade), a dark worktop, the grill and its closed hood in black steel, a steel sink and tap, his
   magenta on the stools, the pergola's slats and a string of warm lights (near only, not on phones); the bowl in the
   loft's stone with a dark rim and ember bed, warm glints (near only), the bench in stone with timber seats, the
   chairs in the cabana sofa's teal. The flames are `firepitFlames()` (south3d.ts adds it, on the main thread): a few
   small warm cones in one instanced mesh, swaying in height; its count is set as it's drawn (`onBeforeRender`, from
   the camera): one while the camera's outside the house and within 40, none elsewhere (no draw call). That holds under
   reduced motion, when the city's ticks run on the first frame only; the flames then stand still. The den's trading
   screens (`denCharts()`) are gated the same way now, with the owner's go-ahead: shown by a tick, they never came on
   under reduced motion. Tested in
   `tests/home.test.ts` (on their lawns, off the paths, the lights, the pool, loungers, cabana, bench and tree, solid,
   low, the way between the pool and the stools, the pit's north side open, every prompt and way clear). Draw calls
   unchanged: 313 desktop, 198 phone. Shots: `docs/garden-shots/phase-3-*.webp`.
4. **Review**: the full set of shots by day and night, on a phone too, `?fps` and `?bench` on the phone tier, the
   guide (`docs/guide/endswood.md`) brought up to date.
   *Signed off by the owner and live (2026-11-27): the garden plan is complete.* Shots: `docs/garden-shots/phase-4-day.webp`, `phase-4-night.webp`
   (from above, the north-east, the yard, the east lawn, the kitchen, the north-west lawn, the firepit) and
   `phase-4-phone.webp` (a Pixel 7, by day and night). These are the first true night shots: the shot tool had clicked
   for a time-of-day button the city doesn't have, so every earlier "night" shot in this plan and in
   `docs/house-plan.md` was the day; it sets the sky's time itself now (`sky.setTime('night')`). By night the path
   lights' pools, the pergola's string, the firepit's flames and the windows read warm; nothing washes out. The cost,
   on the phone tier: draw calls where he wakes unchanged (313 desktop, 198 phone). The full `?bench` against the one
   before the garden (`docs/house-plan.md` Phase 5's build) moved in places, but between them main took other work (the
   loop's Endswood and Aldwyn's Green jobs, the golf course, the Flats) and the container's software renderer swings
   widely run to run (a view the garden doesn't touch went 5.7 to 1.9 fps on the same draws). So the garden was
   measured alone: two builds of the same main, one with the garden's three files at their pre-garden state, the
   bench's compound views twice each. With the garden: `ends-home` 1.8 / 1.9 fps (167-168 draws), `ends-room` 4.7 /
   5.5, `ends-den` 8.9 / 8.9 (126-131 draws); without: 1.7 / 1.8 (169-181), 2.9 / 3.3, 8.6 / 7.6 (128-134). Within
   the noise: the garden costs nothing measurable. Noted for later, not changed: up close at night the pergola's
   string lights glow as fair-sized orbs.

Each with the owner's sign-off.
