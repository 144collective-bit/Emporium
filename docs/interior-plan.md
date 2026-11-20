# The interior: Degen's house fitted out to a high standard (a plan)

The owner's call (2026-11-19): "Make the interior of Degen's house to a much higher standard. Ensure it's functional
and has everything he needs, played out in a way that's realistic. Make the stash box a safe in the wall... don't
place the TV in the middle, mount it on the wall. High end fit out with a proper colour palette. Think interior
design." Nothing is built until the owner signs off a phase; keep this plan up to date.

What stands today is `docs/compound-plan.md`'s house (Phases 2 to 5): one open room on the ground floor (`ROOM`,
`FURNITURE`), the landing, bedroom and office upstairs (`UPSTAIRS`), the trading den in the basement (`BASEMENT`), all
in `home.ts` and drawn by `home3d.ts` (`docs/guide/endswood.md`). The house's shell, its doors, its stairs and its
floors don't move.

## The owner's answers (2026-11-19)

| Question | Answer |
| --- | --- |
| The palette | Dark luxe: charcoal and deep green walls, walnut, brass and his gold, black marble, emerald velvet and cognac leather; his neon used sparingly |
| The TV | On the lounge's end wall (the west wall), over a long low fire, lit niches either side; the sofa facing it |
| The stash | A vault door in the basement den's wall (the stash's prompt moves there; the box in the lounge goes) |
| What the house gains | All four: a real bathroom, a working kitchen with a dining table, a walk-in wardrobe, a utility and boot room |

## The palette

Every room takes it, in the room's shared paint (lit from inside: `paint()` in home3d.ts):

- **Walls**: warm charcoal; a deep forest green on the feature walls (the media wall's, the bedroom's headboard wall).
- **Floors**: walnut boards on the ground floor and upstairs; black marble in the bathroom; the den's dark floor.
- **Wood**: walnut for the joinery (the media wall's niches, the kitchen's tall units, the wardrobe).
- **Stone**: black marble with pale veins (the coffee table, the kitchen's worktops and island, the bathroom).
- **Metal**: brushed brass for the handles, lamps and trims; black steel for the frames.
- **Fabric**: emerald velvet (the sofa), cognac leather (the armchair, the stools, the bed's headboard).
- **Light**: warm lamps and strips under the shelves; his magenta only as an accent (the den keeps its LEDs).

## Phases

1. **The lounge and the palette, and the vault.** *Built, signed off by the owner (2026-11-19), live.* The ground floor in the palette (its walls, floor, ceiling, the
   doors' and windows' frames). The media wall on the west wall: the TV mounted on it over a long low fire, lit
   niches either side. The corner sofa re-laid to face it (its long run with its back to the hall, a chaise at its
   south end), a cognac armchair under the front window, a black marble coffee table on a rug, a brass arc lamp. He
   wakes on the sofa facing the TV (`HOME_WAKE`, `SOFA_SEAT`). The trophy wall moves along the west wall, south of the
   media wall. The stash box goes: the stash is a vault door in the den's north wall (`home:stash` in the basement). Shots: `docs/interior-shots/phase-1-*`.
2. **The kitchen and dining.** *Built, signed off by the owner (2026-11-20), live.* (Built third, the owner's order.) homerooms.ts
   `FURNITURE`: the oven's tall walnut unit at the back wall's west end (two ovens stacked, black glass, brass
   handles), the run in walnut with a black marble top and the sink under the window with its brass tap, the fridge's
   tall walnut unit at its east end (the white fridge gone); the island in walnut with a thick black marble top down
   its ends, the hob set in its kitchen side, a black extractor with a brass band hung over it from the ceiling, two
   brass pendants, cognac leather stools with low backs on brass legs; dining for four in the corner east of the hall
   (`dining`, four `chair`s: a walnut table on black steel legs, a runner and a brass bowl, cognac chairs, a black
   pendant over it), clear of the ways to the side door and the stairs. Shots: `docs/interior-shots/phase-2-*`.
3. **Upstairs: the bathroom and the walk-in wardrobe.** *Built, signed off by the owner (2026-11-19), live.* (Built second, the
   owner's order.) First the rooms' lists left the boot, which was full (the owner's pick): `homerooms.ts` lays them
   out on home.ts's `HOUSE_GEO`, in its own small chunk that imports nothing, fetched as the city starts (index.ts);
   `homeWall()` gets them by `setRooms()` and waking waits for them. Then upstairs (`UPSTAIRS`): **the dressing room**
   off the landing, walked through to the bedroom (its partition at `DRESS_X`, west of the middle front window, its
   doorway `BED_DOOR`): lit walnut rails along its back hung with his clothes (the wardrobe's prompt, `WARDROBE_RECT`,
   moved up here from the ground floor, where the old wardrobe is a cupboard now), an island of drawers in walnut and
   black marble before the window with his watch on a tray, his shoe wall (lit shelves of trainers), his caps on a
   brass rail, a tall brass-framed mirror. **The bedroom**: the bed's head on a deep green wall, a tall buttoned
   cognac headboard, a walnut frame, a charcoal duvet and an emerald throw, walnut bedside tables with brass lamps, a
   cognac bench at its foot on a rug, the telly on the wall facing it. **The bathroom** behind the landing (its doorway
   `BATH_DOOR`, a pocket door): black marble floor and walls with pale veins, a wall-hung toilet with a brass plate, a
   double basin in walnut and marble with brass taps under a mirror lit from behind, a walk-in shower behind a black
   steel-framed screen with a brass rain head, a brass towel rail. **The office** in the palette (a walnut desk, a
   cognac chair). The upstairs windows drawn where they are outside (`houseWindows()`). Shots:
   `docs/interior-shots/phase-3-*`.
4. **The utility and boot room, and the den in the palette.** *Built, signed off by the owner (2026-11-20), live.* homerooms.ts
   `FURNITURE`: by the side door, the boot room (`boots`: the east wall behind it in the deep green, a walnut bench with
   a cognac cushion, his trainers under it, a brass rail of hooks over it with his jackets and a cap; the old cupboard
   gone) and the laundry's tall walnut unit in the corner south of the door (`laundry`: the washer and the dryer
   stacked, white fronts with round dark doors, a cupboard over them; the hall's plant gone), the door's way clear
   between them. The den in the palette: charcoal walls, dark walnut boards, a dark ceiling, a rug in the lounge's,
   a black marble table, a walnut desk, the bar in walnut and black marble with cognac stools on brass, his chair in
   cognac; its LEDs, screens, arcade and vault kept. The room's curtains in the media wall's deep green (they were
   red). Shots: `docs/interior-shots/phase-4-*`.
5. **Polish.** Lighting (strips, wall lights), art of his own, plants, the review shots and the phone checks.

Each with the owner's sign-off. The owner's order (2026-11-19): Phase 3 (upstairs) after Phase 1, then the kitchen.
