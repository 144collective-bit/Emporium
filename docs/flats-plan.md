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
- 2026-11-26: Phase 1 merged (#285). Phase 2 built: the cages' flights on concrete stringers, solid steps with nosings,
  handrails and wall rails, a caged lamp at each landing (about one in seven dead), the floors' colour bands either side
  of each landing's way into the core, tags over some flights and litter on some landings. Drawing only: the walked
  flights (southsky.ts) don't change. Shots: inside a cage, from outside by day and night.
- 2026-11-26: Phase 2 merged (#286). Phase 3 built: the bridges' and links' concrete under the glass and the podium
  deck's edge (now the galleries' low wall and rail) into `SKY_COVER`, in 0.25 pieces (0.6 ones at a slant reached
  within the shooter's own 0.6 and were skipped: the test caught it on the Rampart-Linnet bridge). Tested from each
  bridge's middle: low across, the concrete stops it; at a standing eye, out through the glass.
- 2026-11-26, night 6 pass 1 (22:07): Phase 3 merged (#287); Phases 1-3 live (Build site 423-425 green). Phase 5 (the
  courtyards; Phases 4 and 6 wait on the owner's answers: the entrances' names, which tower's roof) built in a draft:
  `southsquares.ts`, five compact squares on the paving beside Linnet, Marten and Wren Courts (a planter with grass and
  a tree, two benches facing it, a bin, a sodium lamp), clear of the blocks, cages, piers, bridges, streets, courts,
  grass and the yard's things; solid, joined when the chunk loads. The first cut chose the verges past the slabs'
  ends (the roomiest ground): now only beside a slab along its length, and compact (the paving there is narrow). The
  full checks next pass.
- 2026-11-26, night 6 pass 2 (23:07): Phase 5 finished. The night's shots found three of five squares across the avenue
  on the field east of the estate: now a square is only beside a slab with no street between. Four squares, all on
  the paving strips between the slabs and their avenues. Lint, typecheck, `npm test` and `test:wide` 2429 of 2429,
  smoke fine, bootJs unchanged (773.3 KB). Merged. Phases 4 and 6 wait on the owner's answers.
- 2026-11-27: the owner's answers (A to each): Phase 4's entrances carry the block names already on the bridges (e.g.
  "Linnet Court"), no new copy; Phase 6's roof access is Kite Point's (Degen's flat's tower). Both to Ready; the
  nightly loop builds them in the board's order.
- 2026-11-27, night 7 pass 2 (23:07): Phase 4 built: each lobby's door under a concrete canopy, the block's name on its
  front edge (the bridges' sign sheet, no new copy), a warm light under it, a door-entry panel beside the door (near
  only). The first shots had the names mirrored: fixed, they read left to right from in front.
- 2026-11-28, night 7 pass 3 (00:07): Phase 4 merged (#294). Phase 6 (Kite Point's roof, the owner's pick) is bigger
  than one pass, so split: **6a** the rules: from The Core's top-floor bridge's end at Kite's door (`core-kite-17`), a
  short caged stair up Kite's face to its roof (`southsky.ts`: a flight shape and its landing, as The Core's stair);
  the roof a walkable level inset from the parapet, the plant room and beacon left out of it (strips round them); the
  railing the galleries' (`GALLERY_RAIL`) on the parapet; `skyWall()` keeps you off the edge; tested in
  `tests/southsky.test.ts` (on from the bridge, up the stair, round the roof, never past the parapet, the smoke test's
  `sky` scene still passing). **6b** the drawing: the stair's cage, the rail, a hatch and a lamp on the roof.
- 2026-11-28, night 7 pass 4 (01:07): Phase 6a built and checked (lint, `npm test` and `test:wide` 2432 of 2432, smoke
  fine, bootJs 768.7 KB, texFull 4331.4): `KITE_ROOF` and its shapes in southsky.ts, tested by a walk in tenths of a
  metre from the bridge's end up the stair and round the roof. Held back, not merged: alone it would walk you through
  the top bridge's glass onto a stair not drawn yet. It merges with 6b (the drawing) next pass.
- 2026-11-28, night 7 pass 5 (02:07): Phase 6b drawn: the top bridge's side open over its last metre, the patch, a
  solid flight on a stringer up Kite's face, the landing over a gap in the parapet, a rail all the way and round the
  roof's parapet, a lamp by the landing. Shots from beside the tower and from above. 6a and 6b merge together.
