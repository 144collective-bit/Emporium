# The kart park

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

## The kart park (3D walk mode)

- **The move west and the upgrade** (the owner's call, 2026-11) are
  planned in `docs/kart-west-plan.md` in eight phases: the move, nothing
  clipping, the facility, the live crowd and the podium, driving, your
  kart's look, the items mode, polish. All are built and merged to main
  (the owner's go, 2026-11-05); keep it up to date.

- **The place** (the owner's call): a Mario-Kart-style go-kart park on
  the open land outside the ring highway's west side, north of ew0, west
  of exit 8's ramps (`docs/kart-west-plan.md`, the owner's call: moved
  there from north of the highway's north-east corner, where the north
  side's stage 2, `docs/north-plan.md`, had put it, the same circuit to the
  last sample, so lap records, ghosts and boards stay valid; both its old
  lands are open again, kept clear for a district later, and Kart Road off
  the east ring avenue went with it), fenced round its facility, its gate
  on Kart Road, which comes up off ew0 (`DRIVE_X`) from exit 8 ("Uptown ·
  Kart Park"), the metro's Kart Park station on the north bank avenue a
  walk to the south;
  one circuit raced both ways (the rebuild, `docs/kart-plan.md`), the
  clubhouse (door prompt "Clubhouse"; the kart hut until the kart-west
  plan's Phase 3: two storeys, the café and the trophy cabinet behind its
  glass front, the lounge over the pits, the roof terrace), a grandstand
  in the infield facing the start straight and a big covered one over the
  hill and the jump, tall grass banks reaching the fence with berms
  outside it, the pit lane with eight team garages, the timing tower, the
  paddock with its tents and trucks, the plaza inside the gate with its
  flags, the podium and the café, three LED screens showing the race,
  armco, tyre walls, catch fencing, marshal posts and floodlights
  (`kartfacility.ts`, below); its totem, signs and coach park on the
  approach. It's a place like the landmarks (spot
  `karts`, pin, directory entry, a City-view panel with your records and
  **Walk in**, which starts walk mode at the gate, `KART_SPAWN`). Race karts
  stay on the track, but your own kart can be taken out of the pits and
  driven anywhere on the map (the owner's call: "Get in" at the show kart,
  `drive.ts` drives it like the car, with Degen seated, on a feel of its
  own (`KART_FEEL` in mykart.ts: light, a quick rack, rear-driven and a
  little loose; the drive test holds it turning quicker than the saloon)
  and with its rear light swapped for the brakes and reverse (`lights` on
  the street kart only, karts.ts; the polish plan's Phase 6); it rides the
  circuit's ground (the deck, the banking, the grass banks) through
  `circuitSurfaceAt()`, and goes back to the pits when a race starts).
  Walking follows the same ground inside the park, and up the banks
  (`groundAt()` in `walk.ts`, `bankY()`; your kart climbs them too).
- **The site** is `kartpark.ts` (DOM-free): `KART_PARK` (world x -374 to
  -262, z -146 to -26, its fence: the frame's corner `X0`, `Z0`), local numbers via `toWorld()` /
  `toLocal()` (u east, v south from the circuit frame's corner; the
  circuit's frame is kartcircuit.ts's, the site reaches past it on every
  side), Kart Road (`ROAD`: north off ew0 at `DRIVE_X`, then east along
  the fence past the gate) and the car park's one-way loop (`LOOP`, west
  of the fence), in the street plan as `KART_STREETS` / `KART_CROSSINGS`
  (traffic drives them, off exit 8 and out along ew0), the fence's `GATE` and
  `KART_SPAWN`, and the line maths every track part uses: `sampleLine()`
  (centripetal Catmull-Rom through control points `CPt`, heights
  cosine-eased from point to point, or through a `glide` point in one
  long ease (a ramp round a bend), sampled every half tile), `Line`, `frame()`, `at()`,
  `locate()` (keeps to the layer its hint is on), `along()`, `wrapS()`,
  `heightAt()` (banking), flags `F` (deck, tunnel, bank). The site is flat
  ground, not a slab, and the outskirts' trees keep off it, the road and
  the car park (`KART_RECTS`, `treeSpot()` in `outskirts.ts`).
- **The facility** (the north side's stage 2, the owner's picks: proper
  trackside, spectator areas, a paddock and entrance, night lighting) is
  `kartfacility.ts` (DOM-free, tested in `tests/kartfacility.test.ts`), in
  the park's local numbers round the unchanged circuit: armco along the
  run-off's edge wherever it's open and clear of the rest of the circuit
  and the pits (`BARRIERS`, `ARMCO_OUT`), tyre walls round the outside of
  the bends (`TYRE_WALLS`), catch fencing in front of the spectators
  (`CATCH`), none of it solid (a kart that wide is put back); the covered
  `GRANDSTAND` north of the hill and the jump (`tierAt()`), three grass
  `BANKS` (`bankAt()`, `bankY()`: walkable; their berms past the fence,
  `out`, `bankLand()`, `BANKS_AREA`), the clubhouse's roof `TERRACE` and
  its stairs, `CLUBHOUSE` (its floor, the trophy cabinet), the café's
  `CAFE` tables, the `PODIUM` (`PODIUM_RECT`); the `PLAZA` inside the gate
  with the ticket `KIOSK`, the gate's `ARCH` and the path's `FLAGS`, the
  `TOWER` (timing) at the pit lane's east end, the `PADDOCK` behind the
  garages with its team `TENTS` and `TRANSPORTERS` (`TEAM_COLOURS`); the
  LED `SCREENS` (`screenLegs()`; kartpark3d.ts paints one live picture on
  them all, `KartPark.board()`, and the cabinet's trophies from the save,
  `trophies()`); the approach's `TOTEM`, `APPROACH_SIGNS`, `COACH_LOT` and
  `COACHES`; `FLOODLIGHTS`
  (`FLOOD`, under the Emporium); the car park in the loop (`CAR_PARK`,
  `BAY_COLS`, `BAYS`, `PARKED`), `KART_LAMPS`, `KART_TREES` and the
  people (`KART_PEOPLE`: on the banks, sitting in the grandstand, on the
  terrace, the plaza and in the paddock; `trim` ones left out on phones);
  `FACILITY_SOLIDS` (in `SOLIDS`), `KART_RECTS` / `KART_AREA`.
- **Nothing clips** (`docs/kart-west-plan.md` Phase 2, tested in
  `tests/kartclip.test.ts`): the tunnel's tube (`TUBE_R`, `TUBE_IN` in
  kartcircuit.ts) and the flyover's deck (`DECK_OUT`, `DECK_DEPTH`,
  `RAIL_H`) are wide enough that a kart's side never reaches the tube's
  wall or the railing, with headroom over the driver; the deck's columns
  (`SUPPORTS`, `SUPPORT_OUT`) stand off every stretch below; a kart is put
  back (`RESET_AT`, kartcircuit.ts) before its side reaches the tyre walls
  (`TYRE_OUT`) or the armco (`ARMCO_OUT`), which keep that far from every
  stretch; karts bump as two circles each (`KART_BODY` in kartpark.ts,
  nose and tail); the race camera goes through `camRoom()` (inside the
  tube with the kart in it, under the deck with the kart below it, over
  the ground; kart.ts adds the banks). The trackside furniture is
  `kartside.ts` (DOM-free): `MARSHALS` and each way round's `BOARDS`
  (every turn's number, braking markers, chevrons, facing the track,
  `cornersOf()`), each placed clear of the run-off, the barriers, the
  catch fencing, the banks, everything built, the floodlights, the trees,
  the columns and each other (`FIXED`); the two ways' boards are shown one
  at a time, so they keep off their own way's only. Anything new
  trackside goes through them and the test.
- **The live crowd and the podium** (`docs/kart-west-plan.md` Phase 4)
  are `kartcrowd.ts` (DOM-free, tested in `tests/kartcrowd.test.ts`): fans
  cheer (crowdclips.ts `cheer` / `sitcheer`, acts.ts `cheerOver()`) while a
  kart goes by (`excited()`, `FAN_REACH`), when you overtake (`WAVE`) and
  through the ceremony, asked through life.ts's `CHEER.fn` (set by the race,
  null otherwise); the marshals' flags (`marshalFlags()`: green after the
  start, yellow up the track from a spin, blue for a kart being lapped, the
  chequered at the line on the last lap; `KART_VIEW.flags`, waved by
  kartgrounds3d.ts); and the ceremony after a race (`CEREMONY`,
  `podiumSpot()`, `ceremonyAt()`, `ceremonyCam()`, `confettiAt()`: the top
  three on the podium, the trophy, the confetti, the camera move, then the
  results; still under reduced motion).
- **The rules** are `kart-sim.ts` (DOM-free, seeded, a fixed 60 Hz tick,
  tested), racing on the rebuild's circuit (`kartcircuit.ts`) since
  Phase 2: `createKartSim(setup)` → `step(dt, input)` returning events.
  Arcade karts (`tune()` from the 0..1 stats, times the engine class's
  pace; `turnRate()`), a hop into a drift (`T.drift` stages,
  `T.driftBoost`), boost pads (`pads` on the course), bumps weighted by
  `weight` (a heavy kart ramming a light one spins it), air off the jump
  (`flight()`), banking (more grip), pure racing (no items but in a single race's items mode, Phase 7 of
  `docs/kart-west-plan.md`, the owner's call). **No invisible walls:** kerbs are track; the run-off holds a
  kart to `RUNOFF_CAP` with `RUNOFF_GRIP`; past `RESET_AT` (or over the
  deck's edge) it fades back onto the centre line where it had got to
  (`'reset'`, `RESET_T`, no progress lost). The start (`START`, the
  player's only: gas down just before the GO is a boost, held from early it
  bogs down), the slipstream (`SLIP`: a tow right behind another kart, in
  its line, at speed; everyone's) and your splits (`split` events at each
  lap's thirds, `SECTORS`; the HUD's delta to your fastest lap's,
  `karts.splits` / `keepSplits()` in tycoon.ts; live gaps ahead and behind;
  the personal-best flash) are `docs/kart-west-plan.md` Phase 5, tested in
  `tests/kartdrive.test.ts`. The tunnel's walls are real:
  a kart scrapes along them, slower, never put back. Conditions (`cond`): day,
  night (looks only), rain (`RAIN_GRIP` everywhere). Clean laps (no
  wheel in the run-off) and overtakes are counted per racer. Seven
  rivals (`think()`: pure pursuit on the way they're moving, a lane
  offset, passing a slower kart ahead or holding back, drifting only
  where a bend needs more than full lock, braking planned from
  `cornerSpeed()` back along the track and past the jump's flight,
  coasting instead of boosting towards the deck or the tunnel until
  lined up with the track) with a
  rubber band (`rubber()`); three cups (`CUPS`: `cls`, four `races` of
  { course, laps, cond }, `ai` pace, `skill`, prizes by place), time
  trials (`cup: 'time'`, alone) and `auto` (the sim drives the player:
  the par ghost, the tests, and every kart's cool-down lap after the
  line). Places by progress (`standings()`), the player's finish
  (`done`) and everyone's (`over`). New gameplay goes here first; looks
  and sounds in the view.
- **The rebuild** (the owner's call, `docs/kart-plan.md`): one narrower
  circuit (kerbs, grass and gravel run-off), raced both ways,
  with a pit lane and nothing solid near it, replaces the network in four
  phases. Phase 1 is built: the circuit as data in `kartcircuit.ts`
  (DOM-free, tested in `tests/kartcircuit.test.ts`; twelve corners, lefts
  and rights, the owner's call: no long runs of straight road besides the
  start straight): `CIRCUIT` (the physical track) and `COURSES` (forward
  and reverse; `start`, `jump`, numbered `turns`),
  `TRACK_HALF`, `KERB`, `RUNOFF`, `CLEAR`, `FLY_H`, `BANK`, `MIN_RADIUS`,
  `MAX_SLOPE`, `gridSlots()`, `PIT_LANE`, `BAYS`, `SITE` (garages, hut,
  stand, screen, gate path), `CIRCUIT_SOLIDS`, `GANTRY`, `SUPPORTS`,
  `onCircuit()`, `circuitSurfaceAt()`; the races are `COURSES` /
  `COURSE_IDS` (`circuit`, `circuit-reverse`: name, laps, `pads`) and
  `Cond` / `CONDS`; `groundAt()` (the ground across it: the asphalt's
  plane, the run-off easing down to the lawn at `CLEAR`, the sim's and the
  drawing's both), `enclosed()` (the deck and the tunnel: no run-off, off
  their kerbs a kart is put back). Footprints for walking and driving are
  `CIRCUIT_SOLIDS` (in `SOLIDS`: the fence with the gate's gap, the hut,
  the garages, the stand; **nothing on or beside the track is solid**,
  the owner's call). Phases 2 (the rules race on it, the save is v8), 3
  (the park drawn round it) and 4 (the HUD's minimap, single races in the
  hut, the item slot and button gone) are built. Then the whole circuit
  was scaled down to 60% (the owner's call: faster paced, more lifelike):
  a lap of about 350 tiles (some 630 m), `TRACK_W` 4.4 (four or five
  karts abreast), `RUNOFF` 3, `MIN_RADIUS` 4, the hill `HILL_H` 2 with
  the tunnel on its lower slope and the jump clear of it either way,
  four boost pads (none under a grid or into a deck), the karts about 20%
  slower (`tune()`), par laps about 34 / 29.5 / 27 s (Street / Sport /
  Neon), the park's fence pulled in round it, the save v9.
- **Classes** (`catalog.ts` `KART_CLASSES`, `ClassId`, `CLASS_IDS`): Street
  (Lv 1, 0.82), Sport (Lv 3, 1) and Neon (Lv 8, 1.18) set everyone's pace
  in a race; a cup fixes its class, a time trial picks one. Records and
  boards are per course per class (`recordKey()`).
- **Your kart's look** (`docs/kart-west-plan.md` Phase 6, all free, the
  clubhouse's Karts tab): `KartLook` in mykart.ts (`DEFAULT_LOOK`,
  `cleanKartLook()`, `LOOK_COLOURS`, `KART_DECALS`: the number 1-99,
  decals on the side pods, rims, tyre stripes, helmet and race suit, the
  spark trail, the underglow at night), the save's `karts.look`
  (`setKartLook()` in tycoon.ts; older saves cleaned to the stock look),
  drawn by karts.ts `dress()` / `glow()`; in races you wear the helmet
  (wardrobe.ts `racehelmet`, the Outfit's `helmet`) and the suit. Tested in
  `tests/kartlook.test.ts`.
- **The items mode** (`docs/kart-west-plan.md` Phase 7, the owner's
  picks; a single race's switch, pure racing the default, never in cups,
  time trials or records) is `kartitems.ts` (DOM-free, tested in
  `tests/kartitems.test.ts`): `BOXES` in three rows (`BOX_ROWS`), the
  items `boost`, `shield` and `oil` (`ITEM`, `drawItem()` by place), the
  rivals' sense (`AI_USE`, `clearAhead()`); the sim's `items` setup
  (`Racer.item` / `shieldT` only then, `boxLive()`, `slicks`, events
  `item`, `useItem`, `blocked`); drawn by kart.ts (boxes, slicks, shield
  bubbles), the HUD's slot (`data-kart-slot`), used with E, X or the touch
  Item button (`data-kart-item`, slot `b2`, `.has-items`).
- **The karts** are `mykart.ts` (`PLAYER_KARTS`, `KART_SPECS`: Pocket
  Rocket, Big Wheel, Zip, Tank Kart; `cleanKart()`), priced in `catalog.ts`
  (`KART_CATALOG`, the Rocket free; `KART_MODS`: motor, soft tyres, nitro
  kit, three levels; `kartStats()`), drawn by `karts.ts` (`createKart()`:
  Degen's style, origin on the ground under the middle, +x forward, wheels
  that steer and roll, a seated Degen driver via `seat()`). Only for the
  kart park: never real money, never tied to the store or the token.
- **The save** (`tycoon.ts`, v13): `karts` { model, paint, owned, mods,
  `records` (fastest lap and best run per course and class, `KartTime`),
  `boards` (the local leaderboards, `LEADERBOARD_SIZE` runs per key: your
  own runs for now, built so a server can hold everyone's later),
  `series` (the cup in progress: race, points), `trophies` (cup wins),
  `challenge` (today's daily challenge, done once a day), `parBeaten`,
  `old` (the old tracks' lap records: the network's, kept aside when a
  v7 save moved to the rebuilt circuit (its boards, par ghosts and a
  series on the go were dropped), and the full-size circuit's as
  `full-circuit` / `full-circuit-reverse`, kept aside when a v8 save met
  the scaled-down one (its boards and par ghosts beaten dropped, a series
  kept)) }
  with `buyKart()` / `modKart()` / `kartStatsOf()` / `pickKart()`,
  `finishKartRace()` → `KartResult` (prizes by place, under the daily
  prize cap (`capped`, the economy's Balance bullet above: a cup's and
  single races count, the day's first 6 pay in full, then 35%; a series'
  prize and the challenge don't), lap records in any
  race, run records and boards in time trials, par beaten (`PAR_LAPS`,
  `parLap()`), the daily challenge (`dailyChallenge()`, `dayKey()`,
  `CHALLENGE_PRIZE`), counters `kartRaces` / `podiums` / `kartWins` /
  `cleanLaps` / `overtakes`, XP `kartFinish` / `kartPodium` / `kartWin` / `kartRecord` /
  `parBeaten` / `challenge`) and the series (`startSeries()`,
  `seriesNext()`, `seriesRace()` → `SeriesResult`: `SERIES_POINTS`
  15-12-10-8-6-4-2-1, standings between races, the trophy and
  `SERIES_PRIZES` at the end, XP `seriesWin` / `seriesPodium`;
  `abandonSeries()`); ledger entries `karting` (in) and `karts` (out); six
  missions and five badges in `missions.ts`. Global boards wait for the
  game server (keep the boards' shape server-ready).
- **On screen:** `kart-types.ts` holds the interfaces the three parts agree
  on. `kartpark3d.ts` (`buildKartPark()`, at the boot) is the place: the
  spot's group (the garages with their numbers and the screens, the clubhouse and
  its terrace, the timing tower with its board, both grandstands, the
  gate's arch with SECTOR 7 KART PARK both ways, the kiosk), its people,
  trees, lamps and parked cars, and `KART_VIEW` (the way round and whether
  the pits are closed, which `setCourse()` / `racing()` set and the
  grounds apply when they've come). `kartgrounds3d.ts` (a district loaded
  as you approach, `LAZY_DISTRICTS` id `karts`; signs shared through
  `kartsigns.ts`) draws the rest as sites: the lawn, the paving and the
  banks; the circuit:
  asphalt, edge lines and red-and-white kerbs swept along the centre
  line, banked where it rolls; grass run-off with gravel on the outside
  of the bends where it lies flat, easing down as grass banks where the
  track is raised; the tunnel tube; the jump's striped lip; the flyover's
  railed deck on columns just past its edges, open underneath, with
  abutments at the ramps; the chequered line, both ways' grids and the
  gantry; the pit lane, its bays and the cones that close it in a race
  (`racing()`); the armco, tyre walls and catch fencing (its mesh in the
  FX layer), marshal posts with their booths and flags, the floodlight
  towers, the fence; the paddock's tents with karts on stands; the plaza's
  flags and benches; Kart Road, the loop and the car park with its bays,
  arrows and P sign), and on the main thread the start line, the banner,
  the cones and per course (`setCourse()`, the way round being raced) the
  guidance: pad chevrons, chevron boards on the outside of the bends,
  arrows painted before the turns, numbered corner boards and 3-2-1
  braking markers before the hard corners (one sign atlas, `atlasTex()`).
  The show kart waits in the middle bay (`showSpot`). A race's conditions
  go on the sky through `conditions()` (night: night, rain: rain, day:
  day and dry), and the visitor's own time and weather come back after
  (`raceConditions` in `index.ts`). `kart.ts`
  (`createKartRace()`) runs a race: builds the sim from the save at the
  class's pace, seats Degen, places the karts from the sim every frame
  (tilted with the banking), the chase camera, sparks, flames, dust off
  the run-off and spray in the rain, the sounds (`kart*` kinds in
  `sound.ts`), pays through `finishKartRace()` (and `seriesRace()` in a
  series) + `commit()` and shows the results. **Ghosts** in time trials:
  your best lap on the course and class is recorded as it's set and
  replayed (`degen-city-ghosts-v2` in localStorage, per key; the v1
  ghosts were the full-size circuit's and are cleared), and a par
  ghost is driven by the sim's `auto` at the class's pace; `setGhosts()`
  shows or hides each, the HUD shows the gap. `kart-ui.ts`
  (`createKartUI()`, markup `data-karts`, `data-kart-hud`,
  `data-kart-count`, `data-kart-pops`, `data-kart-result`, the Drift
  touch button `data-kart-drift` in `CityMap.astro`, styles in
  `src/styles/karts.css`) is the clubhouse's menu (Race: the cups as series
  (start, continue, drop); a single race (a cup's rivals at its class and
  level, forward or reverse, day, night or rain, three laps, paid like a
  cup's race, outside any series: `RaceStart.single`, kart.ts skips
  `startSeries()` / `seriesRace()`); time trials with their class and
  ghosts; the daily challenge. Karts: buy, pick, mods, paints. Boards: the
  leaderboards per course and class, your records, par, trophies,
  counters and your laps from the old track (`karts.old`)), the HUD
  (place, lap, clock, last and best lap, the ghost gap, the surface and
  Night / Rain tags, drift meter, the series race, and the minimap
  `data-kart-map`: the circuit's outline drawn once from `CIRCUIT`'s
  samples in world numbers, the flyover's deck over the run below, the
  start line, a dot per kart from `KartHud.dots` with yours lit and on
  top), the countdown, pops and the results card (laps, par, the series
  table with Next race / Drop). `walk.ts` wires them: the clubhouse door's
  prompt opens the menu, a race hides Degen and feeds the kart
  (`kartFrame()`: W/S gas and brake, A/D steer, Space hop and drift;
  touch: the stick, the pedals and Drift over Brake; gamepad: stick, RT /
  LT, A drift, V / R3 the camera, Start quits), `nextRace()` / `quitSeries()` carry a series on, Esc or Quit
  abandons (no prize), closing the results stands Degen up by the clubhouse.
  While racing `.city.is-karting` is on the root and `data-kart` makes the
  header read "Karting · <course>". Under reduced motion the race still
  runs (it's the game) with no camera shake or sparks.
