# City life: traffic, people, buses, boats, dusk

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- **City life** (behaviour and animation of the traffic, the people and
  your car at no cost in memory: the owner's brief, 2026-10) is planned in
  `docs/life-plan.md`; keep it up to date, one phase at a time with the
  owner's sign-off. Rules go in DOM-free code with tests; the view only
  draws them on the meshes the city already has. Phase 1 (traffic that
  behaves) is built: `traffic.ts` (DOM-free, tested in
  `tests/traffic.test.ts`) holds the rules and `life.ts` draws them:
  brake lights (the tail-light mesh's `instanceColor`, bright while
  `braking()`), headlights faint by day, a reaction time at every stop
  (`pullAway()`, a queue peels from the front), a nod under braking and a
  lean in turns (`bodyMotion()`), indicators before turns (`turnsOf()` on
  each route's polyline, `indicating()`, `blinkOn()`; four more instances
  a car in the tail-light mesh, amber lenses under the lamps at
  `CarGeometry.turn`, on the flat of the body: a lit lens laid over one of
  the model's own small details is swallowed by its ink outline) and a
  horn when a car is held up by you (`hornDue()`, `LifeOpts.horn`, the
  `horn` sound). No new draws, no new geometry. The polish plan's Phase 6
  (the owner's call) added to it: your car, bike or kart left parked in the
  road is a `stopper` (drive.ts keeps one per vehicle it owns, `parked`,
  on while it's parked; `r` about half its length), so the traffic queues
  behind it and toots once (`Horn.n`), and a car held that way past
  `HELD_MAX` (12 s) with nobody looking is put back on the road elsewhere
  (`heldTooLong()`, the pool's respawn), so a vehicle left mid-junction
  never stalls a lane for good; and left turns are held against the
  oncoming traffic: each route's way through each junction is a `Cross`
  (`crossOf()`, left crossing the oncoming lane), life.ts keeps each
  vehicle's `Comer` (its junction, how it crosses, how long it has stood at
  its line), and `yieldsLeft()` holds a left-turner at its line while an
  oncoming car on the same green is in the box or about to be
  (`LEFT_NEAR`, `AT_LINE`, `LEFT_PATIENCE`); two left-turners facing each
  other let the first to arrive go, so nothing locks. Phase 2 (your car's feel)
  is built: the rules in `drive-sim.ts` (`carLights()`: brake lights,
  reversing lights, indicators with the wheel below `SIGNAL_SPEED` and
  held `SIGNAL_HOLD`; `gearOf()`: four gears, the revs dropping at each
  shift; `skidding()`: the tyres' sideways speed), drawn by `drive.ts`
  and `createCar()` in cars.ts (lit lens materials swapped on the car's
  own lenses, amber indicator lenses under the lamps, `car.lights()`), a
  horn (H, the Horn button `[data-drive-horn]` over the Brake pedal, your
  car's only through `.in-car`, the gamepad's left stick pressed,
  `drive.horn()`), skid marks (one fixed mesh of `SKID_N` quads with a
  small alpha shader, under the rear wheels while sliding, fading over
  `SKID_FADE`; none under reduced motion; multiply blending isn't honoured
  in the post chain, so don't use it for decals), the `tyres()` screech in
  sound.ts, and the headlights' pool and brake wash as two glow points
  dark by day (the marks and the pools are `carride.ts`'s since the
  vehicle plan's Phase 2, your car's once it's fitted out). Phase 3 (people who notice) is built: `pedestrians.ts`
  (DOM-free, tested in `tests/pedestrians.test.ts`): `crossingLinks()`
  (the walked blocks' corners across one street at a lit junction, never
  an avenue or a junction's middle), `walkLight()` / `redLeft()` (red for
  the cars with time to get over), `takesCrossing()`, `noticing()`
  (`NOTICE`, `NOTICE_HOLD`), `hurry()` (the rain), `outAtNight()` (1 to 5,
  `Env.hour` from sky.ts) and `BENCHES` / `SEAT_H` (data for a later
  seated state); life.ts's people tick walks them (a walker on a crossing
  or waiting at a kerb, `Person.cross` / `wait`, joins the other block's
  lane at the corner it arrives at; stops and faces you within reach;
  sitters go in past 0.6 of rain). Nothing new is drawn. Phase 4 (buses,
  boats and the weather's small reactions) is built: `transit.ts`
  (DOM-free, tested in `tests/transit.test.ts`: `BUS_STOPS` from the
  street plan, along every avenue in town each way (and a few round
  Sunridge's collector, `SUN_STOP_GAP`), in the kerb lane,
  clear of the crossings, the bridges and anything solid on the sidewalk;
  `routeStops()`, `pullIn()` (a bus in the inner lane eases over to the
  kerb and back), `busStep()` (slowing in, a `DWELL` with the brake
  lights on and the doors' hiss, then on); the shelters are
  `transit3d.ts`, a site each, near only, not solid, built in the worker
  too; since the polish plan's Phase 6 the buses carry people: a row of
  heads and shoulders over the City Bus's sills and revellers standing on
  the Party Liner's open top, flat shapes in the fleet's detail as the
  driver is (carfine.ts `crew()`, no draw of their own), and someone of the
  crowd waits at every third shelter (`SHELTER_IDLES`, the idle act `wait`:
  the kerb's look both ways; placed with the crowd in index.ts)), `boats.ts` (DOM-free, tested in `tests/boats.test.ts`: a horn
  before every bridge (`hornDue()`), the speed easing (`cruise()`), the
  wake by the speed (`wakeOf()`), two boats `MOORED` at jetties clear of
  the lanes) and `dusk.ts` (DOM-free, tested in `tests/dusk.test.ts`: the
  lamps coming on one by one at dusk with a flicker (`lampGlow()`, drawn
  by `buildLamps()`'s tick on the halos' and pools' colours; the bulbs
  come up with the night), thunder in heavy rain (`stormStep()`: a soft
  brighten of the sky, never a hard flash, the rumble after; run by
  sky.ts, off under reduced motion), the steam `VENTS` in The Trenches'
  streets (`puff()`; six points near the camera at night, none on
  phones) and the wind (`windStrength()`): the canopies' sway rides in
  their uv (`SWAY`, `Batch.instances()`'s `sway`; the shared paint has no
  texture: `Batch.add()` zeroes every shared geometry's uv, since an
  extruded or lathed shape's uv is its own coordinates, and the canopies'
  mark is `SWAY_MARK`, an exact value no shape lands on; Liberty Bridge's
  arches once stretched across the river in the wind) and `injectWind()`
  in kit.ts swings it in the paint's shader and the ink outlines' normal
  pass (phones' canopies carry none; merging a tile re-normalises normals,
  so never encode anything in their lengths)). The life's sounds go
  through `LifeOpts.sfx` (`horn`,
  `doors`, `boatHorn`; `thunder` from index.ts). **Not character
  animation** (the owner's call): this plan picks which existing clip a
  crowd person plays and where they stand, never a pose, clip or rig
  change on Degen; that's `docs/animation-plan.md`'s (sitting on a bench
  waits for it).
