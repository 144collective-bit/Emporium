# Lot 9 (plan)

The owner's call (2026-11): a trailer park on the open land just south of the
ring highway's south-west corner, under The Trenches. A little run down, a rough
community: the grittier edge (a burnt-out shell, boarded and condemned units,
chained dogs behind fences, KEEP OUT signs), moody but nothing threatening, no
violence or crime shown. Made-up names only, under the Emporium.

**Moved (2026-11, docs/estate-plan.md Phase 1):** Lot 9 moved 130 south
(`MOVED` in lot9.ts) so Endswood Estate can take its old land by the highway;
the tunnel stayed, its footpath now running south over the open land to the
hole in the north fence.

## The owner's answers

- **Where:** hugging the highway, south of its south side, west of the south
  avenue (ns0s), under The Trenches.
- **Size:** medium, about 55 homes.
- **Tone:** the grittier edge (above).
- **What it is:** tied to the storyline. A place (pin, directory entry, panel
  with Walk in) whose story is coming soon. Its marquee: "Lot 9 keeps its
  secrets".
- **Name:** Lot 9.
- **Homes:** single-wides, double-wides, old caravans and RVs (a camper, a
  bus conversion), with add-ons everywhere: lean-tos, porches and steps, tarp
  carports, sheds, satellite dishes, window AC units.
- **Shared spaces:** the manager's office and the coin laundry by the gate,
  the fire pit hangout (old couches and lawn chairs round a burn barrel,
  string lights), the junk and scrap corner (dead cars, a boat on a trailer,
  tyre stacks, a scrap pile, a mechanic at work).
- **Getting in:** a gravel lane off the south avenue to a gate in a chain-link
  fence, and on foot from The Trenches through **a pedestrian tunnel under the
  highway** (the owner's pick), coming up by a hole cut in the fence.
- **Night:** sodium lamps (some flickering or dead, as in The Trenches),
  porch bulbs, TV glow in the windows, the fire pit, a bug zapper; dogs, a
  radio, the highway's hum.
- **People:** porch sitters, kids on bikes and running about with a couple
  of loose dogs, the mechanic, the fire pit crowd.
- **Getting there:** a bus stop on the avenue by the lane; the metro stays
  where it is (The Trenches' station is a walk away through the tunnel).
- **Build:** all in one go.

## What it is in the code

- `lot9.ts` (DOM-free, the boot's, tested in `tests/lot9.test.ts`): the land
  and its fence (`FENCE`, `LOT9_RECT`, `inLot9()`), the gate and the hole, the
  lane in and the two one-way loops (`LOT9_STREETS`, `LOT9_CROSSINGS`: the
  street plan's, so traffic, taxis and the world map have them), the
  lots' grid, the office, the laundry, the fire pit, the junk corner,
  `LOT9_SOLIDS`, `LOT9_LAMPS`, `LOT9_TREES`, the people (`LOT9_IDLE`,
  `LOT9_PEOPLE`), the junk corner's cars, `LOT9_SPAWN`.
- `lot9homes.ts` (DOM-free, the chunk's, so the boot stays under its
  budget: Lot 9 costs it about 2 KB): the lots and the home on each
  (`LOTS`, `HOMES`: kind, condition, add-ons, seeded), `HOME_SOLIDS` (joined
  through `addSolids()` when the chunk loads), `HOME_CARS`, `PORCH_SITTERS`
  (the crowd's spare slots), `CHAINED_DOGS`.
- **The tunnel** (`TUNNEL`): straight under the highway in line with The
  Trenches' x -112 street, between row C's blocks: a ramp down from Bottom
  Street's side, the passage under the highway, a ramp up on Lot 9's side.
  `tunnelY()` is its ground (walk.ts `groundAt()`, by Degen's height under the
  roof), `tunnelWall()` its walls (and the edges of its open cuttings at
  street level), `tunnelRoom()` the walk camera's room down there,
  `TUNNEL_HOLES` the ground cut away over its open cuttings (world.ts), its
  parapets, headwalls and bollards solid (cars stop at them, a walker gets
  between the bollards). Down there the walk camera keeps low under
  the roof and skips the hills' and rolls' checks.
- `lot9-3d.ts`, a district loaded as you approach (`LAZY_DISTRICTS` id
  `lot9`): the lanes, the lots' gravel, the homes and their add-ons, the
  fence, the gate's sign, the office and laundry, the fire pit, the junk
  corner, the tunnel, one sign atlas of fixed made-up copy; on the main
  thread the kids' bikes and the dogs.
- Wired in: the street plan, `SOLIDS`, `KEEPS` (the trees and the rolls keep
  off), the ground's influences (worn and bare round it), sodium lamps
  (`SODIUM_AREAS`), the sound (`hood`, the radio by the fire pit as the
  boombox), `PLACES`, `LIVE_PLACES`, the spot, its pin and panel.

## Checked

Tests (`tests/lot9.test.ts`, and every suite at both world sizes), the
budgets, and screenshots by day and at night, from the City view and in
walk mode: the gate, the rows, the fire pit, the junk corner, both ends of
the tunnel and inside it.

## Later (not built)

- The storyline: what Lot 9 is hiding.
- Inside the office and the laundry.
