# Landmarks: the Emporium, the Armoury, Liberty, Kestrel and Harbour bridges

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- The Emporium arcade tower (`emporium()` in `emporium.ts`) is the centrepiece: keep it the tallest, most
  detailed building. Its LED wall shows (`drawWall`), pixel font, ticker and
  signs use fixed copy only (Insert coin, Player 1, Game on, Hi score with
  made-up names, GM degens, Arcade, Prizes); never put token details on
  them. The rooftop hologram is `createDegen()` in hologram light: it
  dances the emotes' dance 16 s of every 28 and stands on the crowd pack's
  captured idle between (`captureplay.ts`, the polish plan's Phase 8; the
  formula idle until the pack is in). Its
  podium, claw machines and prize booth are mirrored in `walk.ts`
  (`SOLIDS`, `CAMERA_ONLY`).
- The Armoury (`armoury()` in `armoury.ts`) is a modern
  military compound and the players' gun store, not a castle: blast walls
  with razor wire, steel watchtowers, a checkpoint (booth, boom barrier, sign
  gantry) and a flat-roofed concrete gun store with a shopfront, canopy sign
  and a counter where players gear up. It links to the plan window. Keep it
  stealth dark at night (low red and green lights, no floodlights). Its
  soldiers are instanced; the checkpoint guards salute and the barrier lifts
  when the walker (`walker` in `life.ts`) comes near. Its walls, towers,
  checkpoint, store, counter and vehicles are mirrored in `solids.ts`
  `SOLIDS` (shared with the game server).

## Liberty Bridge (the owner's call)

- A one-of-a-kind landmark: a **footbridge** in the style of the old
  gate-tower bridges with lifting leaves (river plan step 3, the owner's
  calls: its high walkways walked on, its lower deck's halves lifting),
  sandstone towers and pale blue steelwork, with the Liberty flame (the
  owner's permission; the flame mark only, `src/assets/liberty-flame.png`)
  as a 3D spiral on top of both towers and as a crest on their outer faces.
  Name it "Liberty Bridge"; never link it anywhere, and keep the flame the
  only outside mark on it. It's for people only: no road, no cars.
- **The numbers** are `liberty.ts` (DOM-free, tested in
  `tests/liberty.test.ts`) on `FOOTBRIDGE_X` (`layout.ts`, x -23.5):
  - two gate towers standing in the river either side of its middle
    (`TOWERS`, `FACES` their inner faces, `TOWER`: the pointed arch through
    each for the lower deck, cornice, turrets, the flame's drum and height,
    all under the Emporium; the pier under each with cutwaters, `pier`;
    `pointedArch()`);
  - the lower deck (`LOW_Y` over the middle): an approach from each bank's
    promenade (`APPROACH`, rising to the towers' outer faces, `OUTER`;
    `lowY()`), hung from chains between the tower and an abutment just off
    the quay (`CHAIN`, `chainY()`, `ABUTMENTS`), through the towers, and
    across the middle on two leaves (`LEAF`) hinged at the towers' faces;
  - the leaves lift for the **tall ship** on a timetable, a function of the
    clock the same for everyone (`leavesAt()`: the gates shut, the leaves
    rise to `LEAF.max`, hold while it passes, come down, `LIFT_TIMES`,
    `SHUT_WINDOWS`); the ship (`SHIP`, `shipAt()`, `SHIP_TIMES`) lies at
    anchor west of the bridge and east of it in turn (`ANCHOR_X`: west of
    Kestrel Bridge, which swings open for it, below, and east of the river
    bus's west crossing; west of Harbour Bridge, which it can't pass) on
    its own line through the middle span, off the boats' lanes; the tests
    hold the leaves fully up whenever any of it is over the bridge's line,
    and clear of its sails and of the high level;
  - the high level (`HIGH_Y`, `HIGH`): two walkways between the towers'
    upper storeys and a gallery along each tower's inner face joining them
    (`onHigh()`), reached by a lift in each tower (`LIFTS`: a door in the
    arch on the lower deck and one on the gallery, where each lets you
    out); `DECK_STROLLS` (life.ts walks people round it at `HIGH_Y`);
  - `BOAT_LANES` (as before: under the north approach, through the middle,
    under the south approach; boats.ts sounds a horn for it, `BOAT_HALF`),
    `LIBERTY_RECTS` (what it covers: the promenades' dressing keeps off),
    `LIBERTY_SOLIDS` (in `SOLIDS`: the towers either side of the arch, the
    abutments), `LIBERTY_CAMERA` (what the walk camera can't pass that you
    walk under: the towers over their arches, the walkways' roofs; boxes
    with a bottom) and `LIBERTY_SPAWN` (the foot of the north approach).
- **Walking on it:** `footbridgeY(x, z, y, m, open)` is the lower deck and
  the high level as ground (by Degen's height), the leaves only while
  they're down (`open`: walk.ts's `leavesOpen()`, always under reduced
  motion), and `footbridgeWall()` its edges (you can't step or fall off,
  but off the approaches' low first stretch onto the promenade). When the
  gates shut with Degen out on the leaves, walk.ts walks him back to the
  nearer tower with a toast. The lifts' doors are walk prompts
  (`libertyDoors()` in index.ts, by his height: "Lift · High walkway",
  "Lift · Deck"), a fade like Sector 7 Tower's (`rideTo()`), closed with
  the place by the owner's live settings.
- **Drawn by** `libertybridge.ts`: the towers (an outline with the arch
  cut up into it, extruded; the pier with its cutwaters and a dark band at
  the water; the ring of stones round the arch, lancet windows lit at
  night, the crest and the LIBERTY BRIDGE plaque on the outer faces, the
  lift's door on the inner, a string course, corbelled cornice,
  crenellations, four turrets with octagonal slate domes and finials, the
  drum), the approaches in pieces a tile long following their rise (paving
  between pale blue lattice parapets with white handrails, iron lanterns
  with pools of light), the chains and their hangers, the abutments with
  their little slate roofs and lanterns, the high level (floors on a truss,
  lattice sides, roofs, lamps under them, the galleries' railings), the
  leaves and the boom gates (groups of their own, moved by the tick,
  `userData.keep`), the tall ship (its own group on the water, not part of
  the bridge's hover: hull, gold stripe, stern castle with lit windows,
  three masts with square sails, a jib, a flag) and `flameGeometry()`: the
  flame mark as a sculpture, coloured per vertex, turning slowly (still
  under reduced motion). Under reduced motion the leaves stay down and the
  ship at its west anchor. The whole bridge is the spot's group.
- **The place:** spot `liberty` (after the Emporium in `spots`), its pin
  over the north tower's flame, directory entry and an info-only panel
  (`data-panel-tpl="liberty"`) with **Walk in**. No outside links.

## Kestrel Bridge, the swing bridge (docs/highway-plan.md Phase 5, the owner's call)

- A road bridge from Uptown to The Trenches at x -112 (`SX`), in line with
  Uptown's southbound street and The Trenches' cross street, that swings open
  for the tall ship on Liberty Bridge's timetable; its name is made up
  (`SWING_NAME`). Not a place yet (no pin or panel).
- **The numbers** are `swingbridge.ts` (DOM-free, tested in
  `tests/swingbridge.test.ts`): street `swing` in the plan (`swingPts()`,
  points every 1.5 so the routes carry its heights; both ends lit
  crossroads; `riverBridges()` lists it), the deck low over the water up a
  ramp from each kerb (`deckY()`, `H`, `RAMP`; the boats pass under), the
  swing span on its round pivot pier between the north and middle boat lanes
  (`SPAN`, `PIVOT`, `REST`, `SOUTH_PIER`, `SWING_PIERS`), the timetable
  (`swingAt()`, `SWING_TIMES`, `SWING_WINDOWS`; open while the ship's within
  `SWING_REACH`, liberty.ts `shipNear()`), the barriers (`BARRIERS`,
  `barrierHold()` for the traffic and taxis, `BARRIER_WALLS` for walking and
  driving, `betweenBarriers()`: whoever's between them as they come down is
  put back behind the nearer one, your car too), the surface (`swingY()`,
  `onSwingDeck()` in walk.ts; `swingRoadY()` in routes.ts `heightsOf()`), the
  parapets (`SWING_SOLIDS` in `SOLIDS`, over the water only: the esplanade
  and the boardwalk cross it at grade by the kerbs), `SWING_LAMPS` (at the
  boot) and `SWING_RECT` (the promenades' railings, lamps, benches and trees
  keep off: outer.ts `offBridges()`, boulevard.ts `clearOfMouths()`,
  waterfront.ts `clearAt()` and `RAIL_GAPS`).
- To let the ship by, it anchors west at x -129 and weighs anchor 50 s into
  each half; the river bus crosses at x -136 (riverroute.ts `CROSS`), the
  rowing eight keeps west of it, and the cruise boat's west turn is east of
  the bridge, once round each half of the ship's round, timed to miss it.
- **Drawn by** `swingbridge3d.ts` (`LAZY_DISTRICTS` id `swing`): the fixed
  approaches and the piers as sites; on the main thread the span (steel
  camelback trusses, bracing, the operator's cabin with the name on its
  ends, red and green lights), turning with the clock, and the barriers'
  booms and flashing lights. Under reduced motion it stays shut.

## Harbour Bridge (river plan step 2, the owner's design)

- The east ring avenue's bridge over the river, where the metro crosses, in
  the style of the old suspension bridges; the owner's name. A landmark and
  a place (spot `harbour`, its pin over the north tower, directory entry,
  panel `data-panel-tpl="harbour"` with **Walk in** to `HARBOUR_SPAWN`, a
  `PLACES` and `LIVE_PLACES` entry). Its name is made up; no outside marks.
- **The numbers** are `harbour.ts` (DOM-free, tested in
  `tests/harbour.test.ts`; across the bridge an offset `u` from `HX`, the
  avenue's centre line): the deck from the north bank avenue's kerb (`Z0`)
  to the south one's (`Z1`), humped `RISE` (2.4) over the middle in one
  smooth rise and fall (`deckY()`, `deckSlope()`) so the boats pass under
  (the water lies `WATER_Y` under the streets); the avenue's own two lanes
  each way and its median (`ROADWAY`: the traffic runs on as before), a
  lattice girder each side of the roadway and along each outer edge
  (`GIRDER`), a timber footway between them (`FOOTWAY`, `FOOT_H` up);
  two stone towers in the river either side of the middle (`TOWERS`,
  `TOWER`: the great pointed arch over the roadway and the metro, a smaller
  pointed arch through each leg for the footway (`foot`), the cornice, top
  and the saddles' housings, all under the Emporium; the pier under each
  with cutwaters up and down the river, `base`; `pointedArch()`, `CROWN`);
  four main cables over the inner piers and the outer legs (`CABLE_U`,
  `CABLE`, `cableY()`: from the anchorages on the promenades, `ANCHORS`,
  over the saddles, down to the middle), suspenders every `SUSPENDER`, the
  stays fanning from each tower's top (`STAYS`). The metro rides its raised
  centre at the el's height (metro.ts `DECK_Y`), on posts on the median.
  `onHarbour()` / `harbourY()` are its ground (walk.ts `groundAt()`, and
  so your car's), `HARBOUR_SOLIDS` (in `SOLIDS`: the towers' piers and
  legs, the girders, the anchorages; the roadway and the footways through
  the towers are clear), `HARBOUR_RECT` (the promenades' railings, lamps
  and benches keep off), `HARBOUR_STREET` (its street in the plan:
  `riverBridges()` gives its full width, so the river walls' gap is the
  deck's).
- **Drawn by** `harbour3d.ts` (`buildHarbourBridge()`, at the boot): the
  towers (an outline with the arches cut up into it, extruded; rings of
  stones round the arches, a blind lancet up each leg, a string course,
  cornice, parapet, the saddles' housings, HARBOUR BRIDGE on a plaque over
  the great arch on both faces), the deck in pieces a tile long following
  the hump (`onDeck()`: the steel body, asphalt, lines, the median's kerb,
  the footways' boards, the girders' chords and posts, near only their
  diagonals), iron lanterns on the outer girders with halos and pools of
  light, the cables, suspenders, stays and anchorages, and a necklace of
  bulbs along the outer cables. world.ts leaves the avenue's asphalt,
  median, lines and the promenades out from under it. The traffic and the
  taxi ride its hump (`deckY()`, nose along `deckSlope()`).
