# Lot 9

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- **Lot 9** (the owner's call: a trailer park, "a little run down, rough
  community", the grittier edge: a burnt-out shell, boarded and condemned
  units, chained dogs, KEEP OUT signs, moody but nothing threatening; tied to
  the storyline, coming soon) on the open land south of the ring highway's
  south-west corner, planned in `docs/trailer-plan.md` (the owner's
  answers; built in one go); keep it up to date. Made-up names only, under
  the Emporium. It moved south (`MOVED`, 130: Endswood Estate's Phase 1,
  `docs/estate-plan.md`), so Endswood stands between it and the highway;
  its tunnel stayed, the footpath running on south to it.
  - `lot9.ts` (DOM-free, the boot's, tested in `tests/lot9.test.ts`): the
    chain-link `FENCE`, `LOT9_RECT` / `inLot9()`, the gate on the east side
    (`GATE`), the lane in off the south avenue (ns0s, `ROAD_Z`, `ROAD_HALF`)
    and two one-way loops off it (`LOT9_STREETS` / `LOT9_CROSSINGS` in the
    street plan: traffic drives in down the south avenue under the raised
    highway), the lots' grid (`COL0`, `LOT_W`,
    `COLS`), the fire pit (`FIRE_LOT`, `FIRE`, `FIRE_SEATS`, `FIRE_POLES`,
    the zapper and the radio), the office and the coin laundry by the gate
    (`OFFICE`, `LAUNDRY`), the junk corner along the west fence (`JUNK`:
    the boat, the mechanic's `BAY`, `TYRES`, `SCRAP`, dead cars),
    `LOT9_SOLIDS` (in `SOLIDS`), sodium lamps (`LOT9_LAMPS`, lampmix.ts's
    `SODIUM_AREAS`; the odd one dead and a few flickering, `inLot9Lamps()`),
    people (`LOT9_IDLE`: the fire pit's crowd, the mechanic, the manager;
    `LOT9_PEOPLE`: kids on BMXs and running round the loops, life.ts),
    `LOT9_SPAWN`, `LOT9_PIN`, a bus stop each way on the avenue by the lane
    (`STOP_ZONE`, transit.ts), its sound (ambience.ts `hood`, the radio as a
    `boombox`), the trees and rolls kept off (`KEEPS`), worn and bare ground
    round it (ground.ts).
  - **The tunnel** (`TUNNEL`, the owner's pick): a pedestrian underpass
    straight under the highway in line with The Trenches' x -112 street,
    between row C's blocks: a ramp down from Bottom Street's side, the
    passage under the roof (the highway over it), a ramp up on Lot 9's side,
    the footpath to the hole cut in the fence (`HOLE`, `FOOTPATH`). It's
    the city's first ground below street level for walking, a passage of
    the underground kit since Endswood's Phase 2 (`LOT9_PASSAGE`, below under
    Endswood): `tunnelY()`
    (walk.ts `groundAt()`: the ramps and open cuttings always, the floor
    under the roof only when Degen is down there, `DOWN`), `tunnelWall()`
    (walk.ts `blocked()`: down there only its walls stop him; at street
    level the open cuttings' edges), `tunnelRoom()` (the walk camera's room
    down there, `cameraRoom()`), `TUNNEL_HOLES` (world.ts cuts the ground
    over the open cuttings), `TUNNEL_SOLIDS` (parapets, headwalls and the
    bollards at each ramp's top: cars stop, a walker gets through). Down
    there the walk camera keeps low (its pitch held under the roof) and
    skips the hills' and rolls' checks, which read anything under street
    level as under the ground.
    Anything new below ground goes through the same three.
  - `lot9homes.ts` (DOM-free, the chunk's, tested): the lots in six rows
    and a home on each, seeded (`Home`: kind single, double, caravan, rv or
    bus; condition kept, worn, rough, condemned or burnt; deck, car,
    carport, shed, lean-to, dog run, junk, KEEP OUT, dish, AC, tarp, boarded
    windows, flowers, skirting, porch bulb, TV glow), `HOME_SOLIDS` (joined
    through `addSolids()` when the chunk loads), `HOME_CARS`,
    `PORCH_SITTERS` (the crowd's spare slots, `addPeople()`),
    `CHAINED_DOGS`. The boot never carries it. Since the polish round (the
    owner's call: "a lived in feel... almost a rough camp on a large
    scale") each home sits a little in or back, a single-wide a little
    shorter or longer, and has its yard (`yard`, `YardThing`, `yardOf()`:
    bins, propane, washing lines, above-ground pools, a trampoline, kiddie
    pools, grills, picnic tables, garden beds, firewood, flamingos, gnomes,
    toys, flags, each where it fits on its lot; the bigger ones solid,
    `YARD_SOLID`), its hookup pedestal (`hookup`) and, some, Christmas
    lights left up (`xmas`); power poles along the lanes on the side the
    lamps aren't (`POLE_LINES`, `POLES`, `POLE_SOLIDS`) with a drop to every
    home but the burnt one (`DROPS`).
  - **The Field** (the polish round): the fence carried west to x -205
    round a camp on the land west of the old park's fence line (`PARK_X0`,
    the old line now half down, open at `INNER_GAPS`; `FIELD`, `inField()`),
    its dirt track in from the west lane through the gap and round a
    wobbled loop (`TRACK_SPUR`, `TRACK_LOOP`, `TRACK_HALF`, `fromTrack()`,
    `inLoop()`), its shade trees (`FIELD_TREES`, in `LOT9_TREES`) and three
    lamps (in `LOT9_LAMPS`): that much is the boot's, in lot9.ts. The rest
    is `lot9camp.ts` (DOM-free, the chunk's, tested in
    `tests/lot9camp.test.ts`): the commons (the shower and toilet block,
    porta-potties, the standpipe and trough, the big fire circle and its
    logs, the camp kitchen, the firewood pile, a washing line, the dumpster
    corral, the notice board, THE FIELD over the gap, the vegetable patch
    and the chicken coop) and by the park's gate the dumpsters, the ice
    chest, the drinks machine and the propane cage (`GATE_SOLIDS`); the
    pitches (`PITCHES`, a seeded planner: along both sides of the track and
    in the back corners, each facing the track, nothing on one crossing
    the track, a tree, a lamp, the commons or another pitch, `crosses()`
    for turned footprints): domes, ridge and cabin tents, travel trailers,
    teardrops, vans with awnings, pallet-and-tarp shacks and bus
    conversions, each with its fire ring and chairs, a canopy over a
    table, its car, and what a long stay gathers; `CAMP_SOLIDS` (solid
    only inside each thing, `inner()`), `CAMP_CARS`, `CAMP_PEOPLE` (the
    crowd's spare slots: the reserve is 320, 160 on phones),
    `CAMP_DOGS`. Drawn by `lot9camp3d.ts` (`registerCamp()`,
    `registerPower()`, `yardThing()`, `hookupOf()`, `xmasLights()`,
    `campGlow()`: the fires' glow one mesh; one sign atlas of fixed made-up
    copy). Fixed numbers there add `MOVED` too.
  - Drawn by `lot9-3d.ts` (`LAZY_DISTRICTS` id `lot9`): the gravel lanes,
    a site a home, the fence (its mesh in the FX layer), the gate and its
    LOT 9 board, the office, the laundry, the fire pit, the junk corner,
    the footpath (the tunnel itself is Endswood's chunk's since its Phase
    6, dressed as its subway), one sign atlas of fixed made-up copy (`LOT9_SIGNS`);
    on the main thread the parked cars, the kids' BMXs, the dogs (loose
    after the kids, chained in their runs) and the fire's glow.
  - A place: spot `lot9` (pin over the fire pit, directory entry, panel
    `data-panel-tpl="lot9"` with Walk in, `data-lot9-walkin`, marquee "Lot 9
    keeps its secrets"), `PLACES` and `LIVE_PLACES` entries.
