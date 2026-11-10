# Southbank Docks

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- **Southbank Docks** (the owner's name, `DOCKS_NAME`; growth plan Phase
  9c, the owner's call: a working port on the south bank west of The
  Trenches past the ring highway, scenery first, the metro to run on through
  it over the red arch moved there; its ship-to-shore cranes tall, the
  owner's call, over the Emporium at about real height, clear of what flies:
  nothing else there over it), planned in
  `docs/docks-plan.md` in four phases, each with the owner's sign-off; keep
  it up to date. Phase 1 (the land, the streets and the quays) is built:
  `docks.ts` (DOM-free, tested in `tests/docks.test.ts`; today's world
  numbers, `DOCKS_RECT` / `inDocks()`, well short of the west edge): the
  south bank avenue carrying traffic on west under the raised highway, the docks' ring off it (`docks-ring`: Dock Road,
  Yard Road, West Road; lit where it meets the avenue) and Quay Road across
  it (`DOCK_STREETS`, `DOCK_CROSSINGS` in the street plan); the basin
  (`BASIN`) and its mouth (`CHANNEL`) open to the river under the avenue's
  flat bridge (`DOCK_BRIDGE`), its water at `WATER_Y` between quay walls
  (world.ts `basinWater()` / `basinWalls()` at the boot, the grass cut round
  it, the river's quay wall open across the mouth), not part of river.ts's
  `inWater()`: walking stops at it through `inBasin()` (walk.ts), cars at
  `BASIN_WALLS` (drive-sim.ts); the frontage a straight quay (river.ts's
  south bank stretch ends at `DOCKS_QUAY`); the blocks round the basin
  (`DOCK_BLOCKS`, ref `docks`: grey sidewalks over worn concrete, the strips
  along the basin's south quay and over the mouth all sidewalk, `walk` 0);
  sodium lamps (`DOCK_LAMPS`); the trees kept off (`treeSpot()`). Drawn as
  you approach by `docks3d.ts` (`LAZY_DISTRICTS` id `docks`: the streets,
  the bridge's railings, the quays' coping, near only bollards and
  ladders); the world map draws the basin. Phase 2 (the metro via the
  docks, the red arch moved) is built: Southbank Docks station on the east
  quay (`EL_STATION`), the line north over the river on the arch along
  `EL_X` and east along the north bank avenue into Uptown (the metro,
  above). Phase 3 (the port) is built: `docksport.ts` (DOM-free, tested in
  `tests/docksport.test.ts`): the container terminal on the west quay
  (three ship-to-shore cranes on rails along the basin's west wall,
  `CRANES` / `CRANE`, one boom raised, `craneTop()`, `craneRect()`; ORCA
  STAR at the berth, `SHIP`, `SHIP_STACKS`; the stacks, `STACKS`, 40-foot
  boxes, `BOX`, in made-up lines, `LINES`; the gate off West Road, `GATE`,
  `GATE_Z` in docks.ts; straddle carriers and a reach stacker), the old
  docks on the east quay (SHED 3, `SHED`; the dry dock, docks.ts
  `DRY_DOCK` / `DOCK_FLOOR` / `CAISSON`, cut into the quay at the boot by
  world.ts and one of `HOLES` with the open water, so walking and driving
  stop at it, SEA MULE on its blocks, `COASTER`; the tugs and the pilot
  boat, `TUGS`), the yards (warehouses 4 to 8, `WAREHOUSES`; the fuel farm,
  `FUEL`; the truck park, `TRUCKS`, the rigs through `parkedCars()`), the
  lighthouse (`LIGHTHOUSE`), floodlight masts (`MASTS`, their sodium pools
  at the boot) and the **Harbour Master**'s office (`HARBOUR_MASTER`, a
  place: spot `harbourmaster` at the boot through crestspots.ts's `spot()`,
  pin, directory entry, panel `data-panel-tpl="harbourmaster"` with Walk in
  to `HM_SPAWN`, its door's prompt, `PLACES` and `LIVE_PLACES` entries);
  `PORT_SOLIDS` (in `SOLIDS`), everything but the cranes under the Emporium
  (`PORT_TALLEST`), the cranes well under every flight (the test). Drawn by
  `docksport3d.ts` (sites in the docks' chunk, one sign atlas of fixed
  made-up copy). Made-up names only.
