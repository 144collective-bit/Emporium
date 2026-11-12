# Blending the city: palette, ground, verges, rolls, Southfield, seams

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- **Blending the city** (the owner's call): a
  polish and clean-up so the districts read as one city that grew (lived-in
  realism in the toon style): one ground palette blended at every seam, a
  kerb on streets only, gentle rolls outside the town, the gaps inside the
  highway filled by their neighbours, transitions between districts, paths,
  hedges, utilities and wild bits, countryside outside the highway, and the
  corridors after the raised highway. Planned in `docs/blend-plan.md` in
  phases, each with the owner's sign-off; free on phones, nothing that
  exists moves; keep it up to date. Phase 0 (the seam map and the review
  kit) is built:
  - `seams.ts` (DOM-free, tested in `tests/seams.test.ts`; `npm run seams`):
    `landMap()` (the world on a grid of `CELL`: the highway, streets by kind,
    water, walks, the `AREAS` with their `Character`, open land in or out of
    the highway), `seams()` (where areas meet, across what, ranked) and
    `gaps()` (the open land inside the highway in patches, each named in
    `GAP_NAMES`: a new patch fails the test until it's named). Nothing in the
    browser reads it yet.
  - The review views are `BLEND_VIEWS` (`blendviews.ts`); `?shots`
    (`shots.ts`, its own chunk: straight in, clear sky, every district
    loaded, the city's chrome hidden, `window.__shots`) holds the camera on
    each, and `npm run shots -- <label>` (`scripts/shots.mjs`, after a
    build) shoots them on the desktop and phone tiers by day and at night,
    still, into `shots/<label>/` (not in git) and a contact sheet per run in
    `docs/blend-shots/<label>/` (`SHOTS_BENCH=1` adds the headless bench's
    draws and triangles). Shoot before and after every phase; change a view
    only between phases.
  - Phase 1 (foundations) is built: the ground palette, `palette.ts`
    (DOM-free, tested in `tests/palette.test.ts`: `COVER`, `KERB`, `TREE`,
    `LAMP`, and since the polish plan's Phase 10 `LAMP_POST` (the posts'
    paint), `ROAD` (asphalt, lines, zebras, the yellow line), `STONE` (the
    squares' and parks' kerbs, paths, edges, caps, gravel, paving, inlays),
    `PLANT` (hedges, clipped box, shrubs), `SOIL` and `BANK` (the river's
    quays, sand, pebbles, rocks)): the ground's covers, the kerbs, the trees
    and the street lamps' light; every file that draws ground, kerbs,
    trees or lamps takes its colours from it, never a hex of its own (the
    test holds it: a new colour there goes in the palette, and in its
    `shared` set only where it's also plain paint on something else); the one clearing rule for the
    outskirts' trees (`landuse.ts`, above under the world's size) and the
    belt eased out.
  - Phase 2 (the ground) is built: `ground.ts` (DOM-free, tested in
    `tests/ground.test.ts`): `coverAt()` / `colourAt()`, the open land's
    mix (rough grass, meadow and dry grass patches, `openMix()`) with each
    of `INFLUENCES` laid over it (a worn verge along every street, the
    highway's dry verges, each district's ground fading out round it over a
    wobbled reach); world.ts paints it on the ground's vertices
    (`paintGround()`, the grid from `groundStep()`: one quad under a
    district, coarse far out, coarser on phones), the hills starting from
    it. A district's ground round it goes in `INFLUENCES`, its colours in
    the palette.
  - Phase 3 (the block edges) is built: `verges.ts` (DOM-free, tested in
    `tests/verges.test.ts`, baked at build time, `baked()` key `verges`):
    `VERGES`, every stretch of a block's edge (and the bends' outer kerbs)
    that meets open land at least `DEEP` out (`openAt()`; packed for the
    page, `pack()` / `unpack()`; the districts they take after are
    `areas.ts`, small, so the boot never takes the seam map); world.ts's `buildVerges()` eases
    the slab down to the ground there over `RAMP` (the block's cover at the
    top, the ground's at the foot; `vergeY()` in walk.ts's `groundAt()`)
    and stands the district's hedge or low wall along the foot
    (`BY_CHARACTER`, `EDGE`; colours `VERGE` in the palette) with a way
    through every `GAP_EVERY` (`edgePieces()`), solid (`VERGE_SOLIDS` in
    `SOLIDS`), vaultable (vault.ts), the outskirts' trees kept off
    (`KEEPS`). A new district's blocks get theirs by themselves; a new kind
    of district needs its line in `BY_CHARACTER`.
  - Phase 4 (gentle rolls) is built: `rolls.ts` (DOM-free, tested in
    `tests/rolls.test.ts`, baked at build time, `baked()` key `rolls`):
    low swells and dips (`ROLL.up` 1 tile, `down` 0.45) on the open land
    outside the ring highway only, on a lattice `ROLL.cell` (15) apart from
    fixed waves (`shape()`), each point's share 0 within `ROLL.clear` of
    anything the trees keep off (`KEEPS`), the land inside the highway, the
    hills' land or the edge, rising over `ROLL.ramp`. Between the points
    the ground is each cell's two triangles split low corner to high
    (`rollsAt()`), exactly what world.ts draws (`rolledPlane()`, tinted
    drier on the crests and lusher in the lows), so walking, driving and
    flying (walk.ts `groundAt()`), the walk camera and shots
    (`rollsAlong()`) and the outskirts' trees stand on what's drawn.
    `terrain.ts`'s `heightAt()` is still the hills only. Anything new on
    open land outside the highway stands at `rollsAt()`, or its land goes
    in `KEEPS` so the rolls flatten round it.
  - Phase 5a (the band south of the south row) is built: **Southfield**,
    `southfield.ts` (DOM-free, tested in `tests/southfield.test.ts`; the
    boot's: streets, blocks, solids, lamps, trees, people) and
    `southfield3d.ts` (`LAZY_DISTRICTS` id `southfield`): Southfield Yards
    (ref `southyards`, character industry: the ring `sy-ring` off the south
    bank avenue, Forge Street, its south leg and Kiln Lane, with Yard Street
    `sy-yard` across it, lit at the avenue; the bus depot and Kingpost
    Builders north of Yard Street, warehouses and a works (`YARD_LOTS`, the
    kits), a truck depot and lock-ups south of it; sodium lamps,
    `inYards()`), Southfield Park (ref `southfield`, a park: paths, the pond
    `POND` walked round, the community garden, `PARK_TREES`), the
    allotments in the south strips (`PLOTS`, `shedOf()`, the hut), the
    west strip's lock-ups and warehouses, the railside walk under the
    airport branch (`RAIL_WALK`) and the walk under the main line
    (`STRIP_WALK`); `SOUTHFIELD_SOLIDS` (in `SOLIDS`), `SF_CARS` (the buses,
    trucks and a van, `parkedCars()`), `FUTURE_SITES` (kept for later, no
    pin or price). No new street goes within reach of a metro track: its
    pillars are worked out from the street plan, and must not move.
  - Phase 5c (the smaller leftovers) is built: the slivers between the
    districts and the highway stay open land, dressed by their neighbours:
    `fringes.ts` (DOM-free, tested in `tests/fringes.test.ts`): the Kiln Lane
    substation east of Kiln Lane (`SUBSTATION`), Sunridge's fringe with its
    dry wash (`WASH`, `HEADWALLS`) and the dirt path beside it
    (`FRINGE_PATH`, from Sunridge's footpath at Palm Court to the north ring
    avenue, `PATH_SQUEEZE`, `FRINGE_BENCHES`), four billboards facing the
    highway (`BILLBOARDS`, `BOARD_COPY`: fixed made-up copy, the city's own
    places, no price or number), `FRINGE_SOLIDS` (in `SOLIDS`) and
    `FRINGE_KEEPS` (the trees keep off); drawn by `fringes3d.ts`
    (`registerFringes()` from southfield3d.ts, sunridge3d.ts and
    westlake3d.ts) with the scrub wherever a tree could stand and a little
    closer to the highway (`REGIONS`; Sunridge's desert plants, brambles,
    gorse and grass elsewhere). Nothing of theirs comes within
    `HIGHWAY_KEEP` (6) of the highway's centre line: its lamps stand at 4.7.
  - Phase 6a (lamps mixed at the edges) is built: `lampmix.ts` (DOM-free,
    tested in `tests/lampmix.test.ts`): `SODIUM_AREAS` (The Trenches, the
    waterfront, the Docks, Southfield Yards), `sodiumDepth()`,
    `sodiumShare()` (0 to 1 across `MIX`, 18, either side of their edge) and
    `lampTone()` (each lamp seeded from where it stands; The Trenches' dead
    and flickering ones its own), read by `buildLamps()` in world.ts. A new
    sodium district goes in `SODIUM_AREAS`.
  - **A lamp post per district** (the polish plan's Phase 10, the owner's
    call) is `lampposts.ts` (DOM-free, tested in `tests/lampposts.test.ts`):
    `lampStyle(x, z)` says which post a lamp is from where it stands
    (`LampKind`: `town` everywhere not named, `uptown` in Uptown, Uptown
    North and the mall (slim steel, a flat head), `lantern` in Crestmont,
    `suburb` in Sunridge (a short globe), `cobra` in The Trenches and Lot 9,
    `park` in Westlake Park, `strip` on the Neon Mile (a double arm, a neon
    line down the pole), `airport` on the airport's roads (a tall mast)), and
    `LAMP_POSTS` what each looks like (pole, arm or cap, head; `headOf()`
    where its light is). `buildLamps()` draws each kind as three instanced
    shapes (a draw a kind, the phones' trim as before); the light's colour
    is still lampmix.ts's, the halos and pools unchanged; the posts' paint is
    the palette's `LAMP_POST`. A new district picks its kind in
    `lampStyle()`. A lamp's arm reaches along (cos ry, -sin ry) (`addLamp()`'s
    `ry`: 0 is +x, `Math.PI / 2` is -z, `-Math.PI / 2` is +z): a street lamp
    reaches out over its street, and `tests/lampfacing.test.ts` holds every
    lamp list's lamps by a street to it (the owner's call, 2026-11-12, after
    many had been written mirrored); a new list goes in that test.
  - **The kerb blended at The Trenches' edge** (the polish plan's Phase 10,
    the owner's call) is lampmix.ts's `kerbShare(x, z)`: over `MIX` either
    side of the west ring avenue's centre line (`KERB_SEAM`, along The
    Trenches' blocks) the share of the grit's grey eases from 1 inside to 0
    in the town, a half on the line. world.ts paints a slab the band crosses
    vertex by vertex (`Batch.shade()` in kit.ts: a shape in the shared paint
    coloured per vertex from where each one stands, one draw with the rest)
    from `KERB.town` to `KERB.grit`, so the two meet in the middle of the
    avenue instead of switching on a line. Nothing moves.
  - Phase 6b (the first seam, downtown and the town across the ring avenue)
    is built: `ringstreet.ts` (DOM-free, tested in `tests/ringstreet.test.ts`):
    `RING_SIDES`, the same town lamp on both sidewalks (`RING_LAMPS`, by the
    kerb, `KERB_IN`; about every `LAMP_GAP` between junctions,
    `JUNCTION_CLEAR` from them; clear of the shelters, alley mouths, the
    metro's door and solids; added in neighbourhoods.ts) and Uptown's planted
    median carried round downtown (`RING_MEDIAN`, `HEDGE`, `HEDGE_CLEAR`,
    `TREE_GAP`; round the el's pillars, no tree under the el; drawn with the
    medians in world.ts).
  - Phase 6c (the second seam, Uptown and Westlake Park across the north
    avenue) is built in `ringstreet.ts` too: `PARK_SIDE_LAMPS` (the same lamp
    across from each of Uptown's on the park's sidewalk, flanking the gates,
    `GATE_CLEAR`), the north side's planted median carried on west to
    Uptown's west edge (its `median` span, broken at the axis's zebra) and
    `PARK_EDGE_TREES` (a row just inside the park's wall, `EDGE_TREE_GAP`,
    `EDGE_TREE_IN`), added in neighbourhoods.ts.
  - Phase 6d (the third seam, Starlight Mall and Palm Court across the east
    avenue) is built in `ringstreet.ts` too: `MALL_SIDE_LAMPS` (both sides
    from the mall's north edge to the Parkway, `MALL_STRETCH`, on the
    sidewalks or the grass strip, off the verges' banks, clear of Palm Court's
    zebra), the east side's median carried north under the el (cut at the
    zebra) and `STRIP_TREES` (down the grass strip by the mall's loop,
    `STRIP_X`, `STRIP_TREE_GAP`), added in neighbourhoods.ts.
  - Phase 6e (the fourth seam, Uptown North and Westlake Park with no street
    between) is built: `parkedge.ts` (DOM-free, tested in
    `tests/parkedge.test.ts`): the two sidewalks along the park's east wall as
    one granite walk (`PROMENADE`, `EDGE_X`), lamps down its middle
    (`EDGE_LAMPS`) and trees in grates between them (`EDGE_TREES`, `GRATE`),
    clear of the gates (`GATE_CLEAR`), their walks and the lobbies' doors
    (`DOOR_CLEAR`); the lamps and trees at the boot (index.ts), the granite and
    grates drawn by uptownnorth3d.ts.
