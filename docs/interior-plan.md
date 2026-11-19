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

1. **The lounge and the palette, and the vault.** *Built, waiting on the owner's sign-off.* The ground floor in the palette (its walls, floor, ceiling, the
   doors' and windows' frames). The media wall on the west wall: the TV mounted on it over a long low fire, lit
   niches either side. The corner sofa re-laid to face it (its long run with its back to the hall, a chaise at its
   south end), a cognac armchair under the front window, a black marble coffee table on a rug, a brass arc lamp. He
   wakes on the sofa facing the TV (`HOME_WAKE`, `SOFA_SEAT`). The trophy wall moves along the west wall, south of the
   media wall. The stash box goes: the stash is a vault door in the den's north wall (`home:stash` in the basement).
2. **The kitchen and dining.** A working kitchen along the back wall: a hob with an extractor over it, an oven and
   the fridge in tall walnut units, a sink with its tap under the window, open brass shelves; the island in black
   marble with leather stools; a dining table for four with its pendant.
3. **Upstairs: the bathroom and the walk-in wardrobe.** The bathroom behind the landing's shut door (a walk-in shower,
   a double basin under a lit mirror, a toilet, a towel rail); a dressing room off the bedroom (lit rails, a shoe
   wall, a mirror; the wardrobe's prompt moves there); the bedroom and the office in the palette (an upholstered bed
   on a green headboard wall, a TV on the wall facing the bed).
4. **The utility and boot room, and the den in the palette.** By the side door: a washer and a dryer, coat hooks and a
   bench. The den keeps its screens and LEDs, its furniture in the palette.
5. **Polish.** Lighting (strips, wall lights), art of his own, plants, the review shots and the phone checks.

Each with the owner's sign-off.
