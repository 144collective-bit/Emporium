# The flats' plan: walkways, stairwells, cover and the ground round them

Endswood's estate (the brutalist blocks: `southblocks.ts`, `southblocks3d.ts`, `southsky.ts`; its guide
`docs/guide/endswood.md`, the earlier work `docs/brutalist-plan.md`).

## What the owner asked (2026-11-26)

Check the walkways between the blocks, improve the stairwells, and make the balcony railings low enough for players
to shoot over; then questions on what else. The owner's picks, from the options put to them:

- **Railings** (the galleries' fronts): a low concrete wall with an open metal rail above it. You can see and shoot
  through the rail standing or crouched, and the concrete stops bullets, so crouching behind it is cover.
- **Bridges** between the blocks: clear glass to see the estate through (a light tint and the mullions). Shots
  pass through the glass; the concrete under it stops them.
- **Stairwells** (the caged stairs beside the blocks): solid flights (stringers, solid steps, landings meeting the
  cage), handrails, a caged light on each landing lit at night with a painted floor colour by each door, and grit.
- **And:** the blocks' concrete as cover (bridge walls, the cores, the podium deck's edge); the ground-floor
  entrances (a lit canopy, the block's name, a door-entry panel); the courtyards (benches, bins, trees, lamps, worn
  grass); roof access (a stair cage up onto one tower's roof, railed round).

Rule kept: no number on a sign anywhere (CLAUDE.md), so the stairwells' floor markers are a painted colour band per
floor, not floor numbers.

## What was there (2026-11-26, shots)

- The galleries' fronts: solid concrete 0.62 over the floor with a coping to 0.67. A player is about 1.15 tall (the
  figure at 0.66 scale): the eye 0.84 up standing in first person, 0.71 in third, 0.54 crouched in third. Crouched,
  the view is the concrete. Bullets aren't stopped by it at all (it isn't a solid: up there only the walking rules,
  `skyWall()`, keep you on).
- The far-side balconies (not walked on): solid fronts 0.45.
- The bridges: tubes 1.8 wide, concrete sides to 0.6, glass to 1.5, a roof. From inside the glass reads as solid
  dark panels: no view out.
- The stairs in their cages: flights drawn as thin slopes, the steps floating, no rails, no landing lights.

## What stays fixed

Nothing moves: the blocks, the cores, the bridges, the galleries and every floor you stand on stay where they are
(`tests/snapshot.test.ts`, `tests/southsky.test.ts`). The walking rules don't change: the rail's height changes what
you see and shoot through, not where you can walk.

## Phases

1. **The galleries' railings and the bridges' glass.** The front cut to a 0.40 wall with its coping, posts every
   1.2 m and a steel handrail at 0.64 to 0.68 (crouched, you see between the wall and the rail; standing, over the
   rail). Bullets stop on the wall: shot-only boxes with a bottom (`SKY_COVER`, `southsky.ts`), which `rayBoxes()`
   now reads (a box's sixth number its bottom). The bridges' glass a light see-through tint.
2. **The stairwells.** Solid flights and landings, handrails, landing lights, the floors' colour bands, grit.
3. **The concrete as cover.** The bridges' sides under the glass, the cores' landings' walls, the podium deck's
   balustrade: into `SKY_COVER`.
4. **The entrances.** A canopy over each block's door, lit; the block's name; a door-entry panel.
5. **The courtyards.** Benches, bins, trees in groups, lamps, worn grass on the lines people cut.
6. **Roof access.** One tower's caged stair carried up onto its roof, a railing round the roof's edge, the roof
   walkable (`SKY_SHAPES`).

Each phase: tests extended, every check, shots, merged on its own.

## Log

- 2026-11-26: the plan, from the owner's answers. Phase 1 started.
- 2026-11-26: Phase 1 built. The galleries' fronts a 0.40 wall with its coping and a steel rail at 0.68 on posts;
  `SKY_COVER` (1 box about every 0.6 m of front) stops bullets, `rayBoxes()` reading boxes' bottoms; the bridges'
  glass clear. Tested: the wall under a crouched eye, the rail between the crouched and standing eyes, a low shot from
  the gallery stopped by the wall, a crouched one over it. Shots: crouched, standing, from outside, inside a bridge.
