# Vehicle plan: more detail and more to do

The owner's brief (2026-10): upgrade the vehicles in the city, with more
detail and more function. Built one phase at a time, each with the
owner's sign-off. Keep this file up to date as phases are built.

## What the owner picked

Asked before planning (2026-10-28):

- **Scope:** every vehicle: your own cars first, then the traffic, the
  karts, the aircraft and the boats.
- **Detail:** interiors, sharper bodywork and moving parts. Wear, dirt
  and damage were left out.
- **Moving parts:** doors that open when you get in and out, and
  suspension you can see working.
- **Getting in and out:** the full version. Degen opens the door, gets in
  and sits, and the door shuts; the same in reverse to get out. Pressing
  again skips it.
- **The inside view:** from the driver's eye, with Degen's hands on a
  steering wheel that turns and live speed and rev needles.
- **Handling:** keep it arcade but add depth: each car its own
  personality, and drifting.
- **The garage:** wheels and rims, body kits and spoilers, liveries and
  decals, underglow. **All free** (the owner's call), never real money.
- **New vehicles:** motorbikes for you (a free scooter, then a street bike
  and a sport bike for Dorras with levels, tuned at the garage), three
  more cars (a classic, an off-roader, an electric hatch), and new traffic
  (delivery trucks, police cars, bikes and scooters).
- **Traffic detail:** sharper bodies with seats and a driver shape behind
  the glass; full interiors only on the car you drive.
- **Phones:** desktop gets everything; phones leave out the finest pieces
  and the budgets hold, as for the rest of the city.
- **Left out:** the car radio (dropped), damage, fuel, cockpits for the
  aircraft and boat.

## Where things stand

- `cars.ts`: each model is a `CarSpec` (outline, cabin, panes, lights,
  seams, handles, `extra()`), built as two geometries (`paint`, `detail`),
  so the traffic costs two draws a model. The glass is opaque: there's
  nothing inside. Far cars are `farCarGeometry()` in one `BatchedMesh`.
- `createCar()`: your car, its own paint, wheels that steer and roll,
  lights (life plan Phase 2).
- `drive-sim.ts`: arcade handling from three 0-1 numbers (`DRIVE` in
  `mycar.ts`: speed, accel, grip), three circles for collisions, lights,
  gears, skids. Your car's body rides its springs (`suspension.ts`, Phase
  2); the kart's lean and squat are drawn in `drive.ts`.
- `drive.ts`: getting in and out is instant (Degen is hidden or shown),
  chase and roof cameras and, in your car, the driver's seat (V).
- `garage-ui.ts`: eight models, twelve paints, four mods (engine, turbo,
  tyres, roof rack).
- The kart (`karts.ts`) seats Degen with `seat()`; the hire boat
  (`boat.ts`) and your aircraft (`fly.ts`, `aircraft.ts`) are their own
  views.

## The rules every phase keeps

- **Draw calls are the budget.** Detail goes through the shared paint and
  vertex colours, near only (`Batch.lod`); a new traffic model is two more
  draws, so new types are added carefully and measured with `?bench`
  (a driving view goes into `BENCH_VIEWS` in Phase 0).
- **Rules first, in DOM-free code with tests** (`drive-sim.ts`, a new
  `bike-sim.ts`, `mycar.ts`, `catalog.ts`); the view only draws them.
- **Made-up names and marks only**: no real make, badge or logo on any
  vehicle, livery or decal; police cars carry made-up city markings.
- **Nothing in the city attacks you**: police cars patrol and never chase,
  stop or bother you.
- **Degen's animation is `docs/animation-plan.md`'s.** Getting in and out
  and riding a bike are new states of his animator, built and reviewed in
  the lab (`?anim`) the way that plan's phases are.
- **The save** gains fields with a `cleanCar()` / `cleanSave()` migration;
  old saves keep their car exactly as it was.
- Check every screen at 320, 375, 768, 1024 and 1440 px wide, upright and
  on its side on phones.

## Phases

### Phase 0: measure and prepare (built)

- `?bench` has a driving view (`drive`: a chase camera's height in the
  east ring avenue's outer lane) and a busy-traffic view (`traffic`: the
  ring's junction with the south cross street). The route is unchanged,
  so its numbers still compare with earlier runs.
- The cars' measurements are `carspec.ts` (DOM-free: `CarSpec`, `CARS`,
  `PAINTS`; cars.ts re-exports them and keeps each model's own touches,
  the code that draws them, in `EXTRAS`). The split moved text only:
  every car is drawn exactly as before.
- What's inside is `carinside.ts` (DOM-free): `INTERIORS`, for every
  model (the bus and the Midnight Exec too, for the traffic's drivers in
  Phase 8): the hip point and recline, the eyes and shoulders, the
  steering wheel (centre, radius, tilt), the dash, the floor and pedals,
  the rear seats (none in the coupe, the muscle car, the supercar, the
  pickup's and the van's cabs) and the driver's door between the body's
  two front seams. Worked out for Degen seated at walk mode's size
  (`SITTER`, from skeleton.ts). `roofAt()` / `beltAt()` read the body's
  roof line and window line.
- `tests/carspec.test.ts` holds it to the body: his head under the roof,
  his eyes over the window line and the dash, both hands on the wheel
  within reach and not cramped, his knees under it, his feet on the floor
  and the pedals behind the bumper, the door wide and tall enough with
  the seat in its doorway, the rear seats' knee and head room.
- **The baseline** (2026-10-28, `?bench` by day at the medium tier,
  1280 x 720, in a headless Chromium on software graphics: its frame
  rates mean nothing, the draws and triangles are what to compare):

  | View | Draws | Triangles |
  |---|---|---|
  | drive (the ring avenue, chase height) | 233 | 0.84 M |
  | traffic (a ring junction) | 118 | 0.33 M |
  | street (downtown, street level) | 424 | 0.93 M |
  | home | 386 | 0.89 M |
  | the route (average / worst draws) | 245 / 468 | 0.72 M |

  Memory: geometry 203 MB, textures 210 MB. The frame times need a real
  laptop and a phone (`?bench`, Copy results): the owner's to paste back.
- **The boot's budget is the tight spot.** `main` stood at 669.8 of
  670 KB (gzipped) before this phase; `INTERIORS` in the boot would have
  pushed it over, so carinside.ts is kept out of it (only the tests read
  it so far). Phase 1 draws the interior as its own chunk, loaded when
  your car is first taken out, and keeps the bodywork's new detail as
  data in the existing loops rather than new code in the boot. If the
  bodywork can't fit, raising the budget is the owner's call, on purpose.

### Phase 1: your cars, sharper and with an inside (built)

- **It loads after the boot.** The boot was at its budget, so the whole
  phase is a chunk of its own, `carfine.ts` (with `carcabin.ts` and
  `carparts.ts`), fetched once the city is up (`idle()` in index.ts). The
  boot carries only a hook in cars.ts: `FINE` (what the chunk adds to
  every model, and how it fits out your car), `cache` and `build()` (the
  chunk builds every model again with its detail and copies it into the
  geometry the traffic and the parked cars already hold, so they take it
  on as they are), and `createCar(id, paint, mine)` (your cars carry
  themselves on their group, `userData.car`, for the chunk to find).
  Until it comes the cars are as they were. The boot ends at 669.99 of
  its 670 KB: the next phase needs the same care, or the owner's say to
  raise it.
- **Every model** (`add()` in carfine.ts, about 710 triangles a car on
  desktops and 520 on phones (a City Hatch was 2,670), no new draws): dark wheel wells (a liner round the inside of each arch and a
  wall behind the tyre: you saw daylight through the arches), a lip round
  each arch, a shoulder crease down the sides, the bonnet's and the boot
  lid's shut lines, a line over the rear bumper, a fuel flap, side
  repeaters, the city's diamond as a badge front and back, two highlights
  up the windscreen, brake discs and calipers behind the spokes; on
  desktops a ring on each tyre's sidewall, projectors in the headlamps and
  fog lamps in the bumper (phones leave those out).
- **Your car** (`fitOut()` in carcabin.ts: the garage's turntable car and
  the one you drive, never the traffic or the taxi):
  - **hollow** where you see in (`hollowFrom()` / `hollowTo()` in
    carinside.ts: from the cabin's back where there's a rear window, else
    from behind the seats, to the windscreen's foot): the model's paint less
    its body and cabin solids, with the nose and the tail solid, the sides
    as skins, the cabin's walls with the windows' band cut out, the roof
    and pillars; the model's detail less what lay in the windows
    (`triangles()`), the dark surrounds back as frames round the openings;
  - **see-through glass**: the model's own panes, tinted and transparent
    in the FX layer, so what's inside is inked through it (the windscreen's
    highlights left off: over clear glass they read as bars);
  - **inside** (from `INTERIORS`): seats (and a bench where there are rear
    seats), door cards, the floor, wheel tubs, a headliner, the dash, a
    binnacle with two gauges, the console and gear lever, pedals, the
    steering wheel on its column; one mesh, the detail material;
  - **you at the wheel**: `car.seat()` sits a Degen there, leant back with
    the seat, his feet on the pedals (`reachLeg()`, moved to skeleton.ts
    beside `reachArm()`), his hands at a quarter to three; drive.ts seats
    him on getting in, as it does the kart's driver;
  - **its wheels** turn with the discs and sidewall rings on; the calipers
    sit on the body behind them (no draws of their own).
  Two more draws for your car (the glass and the inside), the driver's own.
- `tests/carspec.test.ts` holds the hollow round the seats, the dash and
  the pedals too.
- **Checked** in a throwaway viewer and in the city (walking up to the
  garage's car, getting in, driving off): the traffic in every model, your
  eight cars fitted out with Degen at the wheel.
- **Measured** (`?bench`, as Phase 0's baseline: medium tier, by day,
  software graphics, so draws and triangles only):

  | View | Draws (Phase 0) | Triangles (Phase 0) |
  |---|---|---|
  | drive | 257 (233) | 1.01 M (0.84 M) |
  | traffic | 152 (118) | 0.40 M (0.33 M) |
  | street | 420 (424) | 1.04 M (0.93 M) |
  | home | 387 (386) | 0.93 M (0.89 M) |
  | the route | 262 / 455 (245 / 468) | 0.80 M (0.72 M) |

  Triangles are up about a fifth where cars are close (the finer
  segments were trimmed after this run: a car's addition fell from about
  780 triangles to 710). The draws move with the traffic and the crowd in
  view between runs (views with no cars changed moved as much: the park
  129 to 114, The Trenches 229 to 211); the detail adds none. Geometry
  205 MB (203). Frame times wait for a real laptop and phone.

### Phase 2: moving parts and the driver's eye view (built)

- **It loads after the boot too.** Everything is in the cars' fine-detail
  chunk (`carride.ts` beside `carcabin.ts`; the springs' rules in
  `suspension.ts`, DOM-free, so they stay out of the boot). drive.ts gives
  up its own skid marks and lamps' pools to the chunk (your car's only;
  they're carride.ts's now) and calls your car's hooks instead, read live
  from the car (`car.ride`, `car.eye`: a car taken out before the chunk
  came gets them as soon as it's fitted); the kart, and your car until
  then, keep the drawn-on lean. The boot went from 669.99 to 669.28 KB.
- **Suspension you can see** (`suspension.ts`, tested in
  `tests/suspension.test.ts`; in its own module rather than drive-sim.ts
  so the boot doesn't carry it): each wheel on its own spring, the body's
  heave, pitch and roll pulled to the plane through the ground under the
  four wheels and thrown by the load (speeding up lifts the nose, braking
  dips it, a turn leans it out), each a damped spring at the model's `hz`
  and `zeta` (`SPRINGS`: the vans, pickup, SUV and town car soft and
  leaning most, the coupes tight, the supercar tightest), stepped in
  pieces of a 120th of a second, within `most` and each wheel within its
  `travel` of the body (a step bigger than that carries the body with
  it). On the car (`ride()` in carride.ts): everything but the wheels is
  one group, the body, pitching and rolling about the axles' height over
  the wheels, which follow the ground under each up and down in their
  arches (a step of more than 0.3 is a deck or a ramp the car's own
  height already follows).
- **The driver's door** (`makeShell()`): the left side cut at the door's
  seams (`INTERIORS[id].door`), the skin from the sill up, the cabin's
  wall under the roof, the window band (a pillar of the frame either side
  of each cut, `E`) and the glass, and everything lying on it (handles,
  the mirror, the crease, chrome lines and stripes, cut where they cross
  a seam, `splitAt()`) its own piece about a hinge at its front seam;
  opened and shut by `seat()` (wide open as he sits and shut after him,
  open while he steps out and shut behind him; not under reduced motion).
  It's on the group as `userData.door` for Phase 3.
- **The steering wheel turns** with the steering (`STEER_RATIO`), his
  hands going round on it (`hands()` in carcabin.ts, `reachArm()`) as far
  as `HANDS_MOST`; a red mark at the rim's top shows it turning. **The
  gauges**, lit by night (`dashMat()`: `lit`, under the bloom's
  threshold), their needles the speed and the revs (`gearOf()`), with a
  strip of light along the dash.
- **The driver's eye camera:** V steps chase → roof → driver (the driver
  only in your car fitted out), from his eyes (`eye()`; his head folded
  away while you look from it), looking round with the mouse or the right
  stick as the chase camera does, the near plane brought in for the dash
  (`close` in drive.ts, put back on getting out).
- **The mirrors are painted stand-ins** for everyone (the rear-view
  mirror under the roof shows a sky over a road): a live view behind is a
  second pass over the city, and the crowd's and the traffic's culling are
  the main camera's, so it would show a city missing what's behind you.
  A live mirror can come later if the owner wants it.
- **At night and in the rain** (checked from the seat): the gauges and the
  dash's strip glow; no rain falls inside the cabin (the rain's shader is
  given a hole round it while you sit in it, `findRain()`); the **wipers**
  sweep while it rains and park after the last wipe once it stops.
- **Checked** in the viewer (the door open on every model, the lean in a
  turn, the wheel and his hands) and in the city (getting in, the seat's
  view by day, at night and in the rain, driving and turning).
- **Measured** (`?bench`, as before):

  | View | Draws (Phase 1) | Triangles (Phase 1) |
  |---|---|---|
  | drive | 247 (257) | 1.02 M (1.01 M) |
  | traffic | 130 (152) | 0.42 M (0.40 M) |
  | street | 416 (420) | 1.03 M (1.04 M) |
  | home | 380 (387) | 0.90 M (0.93 M) |
  | the route | 261 / 490 (262 / 455) | 0.80 M (0.80 M) |

  As Phase 1's: the draws move with the traffic and the crowd in view;
  the views only see your car parked, if at all. Driving it adds the
  door's four draws and the wheel's, the needles', the wipers' and the
  dash's six, all near you. Geometry 195 MB (205). The boot 669.28 KB (663.83 with main's tailoring plan merged),
  the cars' chunk 10.7 KB (6.0).

### Phase 3: getting in and out (built; others see you in it, not yet the move into it)

- **Both front doors** are cut out now (`makeShell()`: each side at the
  door's seams, `doors[0]` the driver's, `doors[1]` the passenger's) and
  move through the car's `door(side, hold)` hook (carride.ts: open now,
  shut after `hold` seconds, easing over `DOOR_T`).
- **The mark** is `carMark()` in moments.ts (DOM-free, tested in
  `tests/moments.test.ts` for every model, both sides and any heading):
  by the door on the side he's on, standing by its back edge `car.out`
  off the body (the test holds him clear of the door's whole swing),
  facing into the doorway turned `car.turn` towards the front, the nearer
  hand (`Mark.hand`) on the handle (`INTERIORS[id].door.handle`, where
  cars.ts lays it, `topLine()` in carinside.ts), the root onto that side's
  real seat with the hips at its hip point. walk.ts opens the door as the
  hand comes to the handle (`HAND_ON` of the reach; it shuts again by
  itself if he never gets in), the car takes him at the clip's `fireAt`,
  and the door shuts after him (`DOOR_SHUT`). In by the passenger's door
  he slides over to the wheel (`SLIDE`).
- **Getting out** (drive.ts `exit()`): out of the driver's door if
  there's room, else the passenger's (then the back or the front, no
  door); that door opens, he steps out from that side's real seat
  (`from`, `seat`), and it shuts behind him (`DOOR_HOLD`).
- **Blocked:** if the spot by the door on his side can't be stood on, the
  quick swap, the city fading out and in round it (`QUICK_FADE`, as fast
  travel's). The planned "the other door if the driver's is blocked" became
  "the door on the side he's on": walking round the car needs a path the
  approach doesn't have, and from the blocked side the other door is a
  walk round anyway.
- **At home** the garage's turntable (solid to walk on) is stood on while
  getting in (`isTurntable()` in walk.ts; the ground there is the disc's
  top, `DISC`), so the moment plays there too; the turntable's car faces
  the way it stands on it (`garage.yaw`).
- **F again** skips to the end (moments.ts `skip()`, as before); under
  reduced motion it's always the quick version, without the fade.
- The boot carries carinside.ts now (walk.ts and drive.ts read
  `INTERIORS`): 665.56 KB of 670.
- **Reviewed** in the city (walking up to the turntable's car, the door
  opening, the duck in, getting out) and in the tests; the animation lab
  has no vehicles, so it wasn't the place for this one.
- **Other players** see you in your vehicle now (the multiplayer plan's
  "What others see", `docs/multiplayer-plan.md`: remoteveh.ts draws their
  car, bike, kart, aircraft or the hire boat). **Held back:** the getting
  in and out itself on their figure (they're in it, then out of it); the
  mode changing from walk to drive in their snapshot rows is where it
  would start.

### Phase 4: handling with depth (built)

- **Each model's feel** is `FEEL` in mycar.ts (drive-sim.ts `Feel`, put
  on the tune by `tune(stats, size, feel)`; the garage's three bars stay
  as they are): `mass` (how quickly the nose answers the wheel), `loose`
  (how readily the tail steps out under power), `rwd` (the back wheels
  drive: the coupe, the pickup, the muscle car and the supercar),
  `steerRate` and `lock`. The hatch is nimble, the saloon steady, the
  coupe darts, the pickup is heavy with a tail that wanders, the van
  wallows, the muscle car's tail steps out under power, the SUV is
  planted, the supercar grips. The springs carry the rest of it
  (suspension.ts `SPRINGS`: the van and the SUV lean most, the pickup
  bounces, zeta 0.34).
- **Drifting** (`CarState.drift`, `DRIFT`): the handbrake at a roll, or
  full power through a turn in a rear-drive car (as much as its tail is
  loose: the muscle car about 30 degrees, the supercar hardly at all),
  breaks the tail away; the grip drops (`DRIFT.grip`), the nose comes
  round quicker (`turn`) and the slide costs some speed (`scrub`).
  Throttle keeps it going while the tail is out, the wheel into the turn
  holds the angle, counter-steer brings the nose back (about half a
  second), lifting off and straightening gives the grip back. The slide
  never goes past `DRIFT.most` (60 degrees) from the nose (`slipOf()`),
  so nothing spins for ever. The skid marks and the screech follow it
  (`skidding()`, as before). The handbrake slows it less than it did
  (3.5 tiles/s², was 5.5), so a drift keeps its speed. The tyres mod helps
  hold one: more grip, less of a runaway.
- **Tested** (`tests/drive.test.ts`): no two models drive alike (0-50,
  turn-in, the turning circle and the slide under power: every pair apart
  by a tenth or more somewhere), the van slower to turn in and wider than
  the coupe; full power steps the rear-drive cars' tails out as loose as
  each is and the front-drive ones grip; a handbrake drift for every model
  breaks away, holds with throttle and the wheel into the turn,
  straightens with counter-steer within a second and recovers on lifting
  off; the tyres mod makes it less of a runaway; and 40 seconds of random
  inputs for every model never pass the slide's most and settle with the
  wheel straight.
- **Checked** in the city: away from the garage, a handbrake turn round
  and round on the south bank avenue, skid marks in arcs, back to a
  straight line on letting go. The blind test is the owner's.
- The boot: 666.08 KB of 670.

### Phase 5: the garage's customisation (all free; built)

- **Wheels:** a handful of rim styles and colours, tyre sizes within each
  model's arches.
- **Body kits:** front splitters, side skirts, rear diffusers and two or
  three spoilers per model, from parts that fit each `CarSpec`.
- **Liveries and decals:** two-tone, racing stripes, flames, a number on
  the doors, the city's made-up marks; painted on one small livery
  texture per car (`liveTex()`: drawn from the save, never baked).
- **Underglow:** neon under the car in the PulseChain colours, kept soft
  so it doesn't bloom out (`soft()`), on at night.
- The garage menu gets tabs (Model, Paint, Wheels, Kit, Livery, Glow);
  every pick shows on the turntable; Keep saves it. The save's car gains
  a `look` (cleaned by `cleanCar()`).

**As built:**

- **The look** is `CarLook` in mycar.ts (the ids only, in the boot:
  `RIMS`, `RIM_COLOURS`, `RIM_SIZES`, `SPLITTERS`, `SKIRTS`, `DIFFUSERS`,
  `SPOILERS`, `LIVERIES`, `CAR_MARKS`, `GLOWS`, an accent paint and a
  number 1-99), `STOCK_LOOK` the model as it comes; `cleanLook()` cleans a
  saved one part by part (a car saved before Phase 5 comes back all
  stock), `cleanCar()` carries it. One look for your car, whichever model.
- **What each looks like and where it goes** is carlook.ts (DOM-free,
  tested in `tests/carlook.test.ts`, out of the boot): the menu's names,
  the rim and glow colours, `RIM_SIZE` (the rim's reach in the tyre: the
  tyre's outside stays put, so a bigger rim is a lower profile),
  `kitFit()` (each part from the model's numbers: the splitter under the
  nose, the skirts between the arches and under the doors' bottom edge so
  a door swings clear, the diffuser under the tail, the spoiler on the
  boot's deck or, over a hatch or a tail door, at the roof's back edge),
  `doorPanel()` (where the number goes). A kit part picked over one the
  model has of its own (`STOCK_PARTS`: the hatch's roof spoiler, the
  coupe's wing, splitter and diffuser, the muscle car's side pipes, the
  SUV's running boards, the supercar's wing...) takes it off: cars.ts's
  `build(id, wheels, bare)` leaves it out (`Parts.has()`), and your car's
  shell is cut from that build (carcabin.ts, shells kept per model and
  `bareOf()`).
- **Drawn** by carstyle.ts in the cars' fine-detail chunk: `dress()` from
  `fitOut()` with the look the car carries (`createCar(..., mine, look)`,
  `userData.look`): the rims (`rimWheel()`: five spoke, mesh, dish,
  turbine, split spoke), the kit on the body so it rides the springs
  (`kitParts()`), the livery as one material on every painted piece (the
  body, both doors, the kit: the pattern worked out in the shader from
  where a point is on the car, a contrast roof, twin stripes over the
  top, a stripe down the sides) with one small texture for the sides
  (`liveTex()`, 512 x 256: the flames, the number in a roundel, the mark;
  right side over left, each reading the right way), and the underglow (a
  pool of light under it, tubes under the sills, `neon(c, 0, 1.3)`: dark
  by day). The wheels and the kit are kept per look and shared; the
  livery's materials and texture and the glow go with the car.
- **The menu:** garage-ui.ts's tabs (`TABS`; the bumpers on a gamepad,
  the arrows on the tabs); Model is the cards, stats and the deal, Paint
  the paints, and the four style tabs rows of chips and swatches
  (`STYLE`); the stock choice of a part the model has its own of reads
  "Its own". The hangar keeps its own grid without tabs.
- Boot cost: 0.7 KB (666.8 of 670 KB at the time; 661.6 once the grand station was retired), the ids and the cleaning.

### Phase 6: three more cars (built)

- A **classic** (rounded old-school saloon or roadster, chrome bumpers),
  an **off-roader** (lifted, big tyres, roof lights, a snorkel) and an
  **electric hatch** (smooth, instant pick-up, a whine instead of an
  engine note). Each with its own interior, personality and customisation
  from the start. Made-up names to be picked with the owner.
- Bought with Dorras at a level, as the Street Thunder, Big Rover and
  Hyper Comet are (prices to confirm with the owner).

**As built** (the names and prices are "Decided" below):

- **Boulevardier** (`classic`): a long bonnet and boot round a rounded
  cabin, round lamps, chrome bumpers under the plates with overriders, a
  chrome spear between the arches, a bonnet ornament, tail fins with a
  round lamp in each tip, chrome hubcaps (`spokes: 0` on chrome). Soft and
  floaty springs; heavy, rear-drive, its tail loose, slow steering.
- **Mud Buster** (`offroad`): lifted (clearance 0.3) on big tyres, boxy
  with a short bonnet and an upright screen, a light bar of four round
  lamps on the roof's front edge, a roof rack with a can strapped on, a
  snorkel up the right wing, a steel bumper with a winch and bull bar
  uprights clear of the lamps, flares over every wheel, mud flaps, rock
  sliders (`p.has('skirts')`: the kit's skirts take their place, its
  `STOCK_PARTS`), the spare on the tailgate. Long-travel springs; heavy,
  front-drive, sure-footed, the grip bar high.
- **Glow Pod** (`ev`): a one-box hatch with one long sweep of glass, the
  grille closed over in the paint, a pale light strip across the nose and
  a red light bar across the tail, a dark glass roof, the charging flap on
  the left front wing, aero discs, no exhaust. Tight springs; planted,
  quick to turn, the pick-up bar next to the supercar's. **Electric:**
  `DRIVE.electric`, so drive.ts reads its gear from `motorOf()` (one gear,
  D; the motor's revs climbing with the speed, tested) and asks the engine
  sound for its `whine` (two soft tones an octave apart climbing high with
  the speed, quieter than the engines).
- Each has its own `CarSpec` (carspec.ts, with paints), seat
  (carinside.ts `SEATS`: the interior tests hold all three), springs
  (`SPRINGS`), feel (`FEEL`), cargo (`CARGO`: 24, 44, 14) and garage copy
  (`DRIVE`, `CAR_CATALOG`), and takes every part of Phase 5's kit. They're
  yours only: the traffic's `MIX` doesn't carry them.
- Boot cost: 1.4 KB (663.0 of 670 KB), the three specs and their touches.

### Phase 7: motorbikes (built)

- Three for you: a **scooter** (free), a **street bike** and a **sport
  bike** (Dorras and levels), tuned at the garage like the cars (engine,
  turbo, tyres; no roof rack, a small top box instead).
- Their own rules in `bike-sim.ts` (DOM-free, tested): arcade, leaning
  into turns by speed, never falling off, soft bumps as the car's; carry
  little cargo.
- Degen rides it: a riding pose and getting on and off, in the animator
  (as Phase 3).
- Chase and helmet-eye cameras; the drive HUD and touch layout as the
  car's.

**As built** (the names and prices are "Decided" below):

- **The bikes** are `mybike.ts` (DOM-free, the boot's: `PLAYER_BIKES`
  `scooter` / `streetbike` / `sportbike`, `BIKES` (each one's length,
  width, wheels, seat, grips, pegs and how far the rider tucks),
  `BIKE_DRIVE`, `BIKE_CARGO` (5, 4, 2: less than any car), `MyBike` saved as
  `degen-city-bike-v1` (in `BACKUP_KEYS`), `cleanBike()`), priced in
  catalog.ts (`BIKE_CATALOG`: the Hop Scoot free, the Alley Cat 9,000 at
  level 3, the Neon Blade 36,000 at level 8; `GarageId` is a car or a
  bike, `garageEntry()`). The save's garage holds both (`garage.owned` /
  `mods`, cleaned in `cleanSave()`), so `buyCar()`, `modCar()` and
  `carStatsOf()` take a bike too; the roof rack is a top box.
- **The rules** are `bike-sim.ts` (DOM-free, tested in
  `tests/bike.test.ts`): the cars' `stepCar()` tuned as a bike
  (`tuneBike()`: narrow, light and rear-driven (`BIKE_FEEL`), its own
  speed range: the scooter slower than any car, the sport bike level with
  the supercar), the lean (`leanTarget()` / `stepLean()`: into a turn by
  the pull of it against gravity, `G`, within each bike's `LEAN.most`, so
  it never falls) and the foot down as it stops (`footDown()`, `REST`).
- **Drawn** by `bikes.ts`, a chunk fetched once the city is up (index.ts
  hands `createBike` to the garage, `setBikeMaker()`): the three models
  (the scooter's body, floorboard, leg shield, stem and top box; the
  street bike's frame, engine, tank, bench, round lamp and exhaust; the
  sport bike's fairing, screen, twin lamps, tail hump and clip-ons), the
  fixed parts merged, the fork steering about its head, both wheels
  showing both faces, and the rider: hips on the seat, leant by the
  bike's `tuck`, hands on the grips (`reachArm()`, turned with the bars),
  feet on the pegs (`reachLeg()`), the left foot coming down as it stops.
- **Your bike** waits on its side stand on the garage's forecourt
  (garage.ts `BIKE_SPOT`, `showBike()`, `takeOutBike()`); drive.ts rides it
  as a third vehicle beside the car and the kart (`kind: 'bike'`): the
  whole bike leans (its group's roll from `stepLean()`), you with it; the
  cameras are the chase camera and your helmet's (V: his eyes, leaning
  with the bike, the view tipping with it); the horn too; the header reads
  "Riding · <bike>" (`on-bike`). Getting on and off are moments
  (`bikeMark()` in moments.ts: beside it on his side, both hands to the
  grips, his leg swung over the seat, `STEP.bike`; off from its seat);
  walk mode's prompts read "Get on" and "Get off".
- **The garage menu** has a Cars / Bikes switch over the cards
  (`.garage-kinds`): the bikes bought, tuned and painted as the cars are,
  each pick on the stand; the style tabs say they're for the cars. Keep
  saves the car and the bike picked, each if it's yours.
- Other players don't see your bike yet (as with the cars: the
  multiplayer plan's next step). Boot cost: 2.4 KB (665.4 of 670 KB).

### Phase 8: the traffic (built)

- **Seats and a driver shape** behind the glass of every traffic car, in
  the same two draws (vertex colours, near only).
- **Delivery trucks:** a box truck and a big rig, pulling over at shops
  and loading bays to unload for a while (as the buses stop, `transit.ts`),
  hazard lights blinking.
- **Police cars:** patrol cars in a made-up city livery on the routes, a
  light bar that flashes now and then; they drive like the rest and
  never chase, stop or bother you.
- **Bikes and scooters** in the traffic, from Phase 7's models, ridden by
  the crowd's figures.
- Every new type is measured on the bench; phones get fewer of them.

**As built:**

- **Three new models**, the traffic's only (never yours, never parked):
  carspec.ts's `police` (**Patrol**: the Cruiser's body in midnight blue,
  `livery` so no seams or handles are drawn on its sides), `truck` (**Box
  Runner**: a tall cab, the cargo box behind it as the spec's `box`, drawn
  in the paint and in its far form too) and `rig` (**Heavy Haul**: a
  sleeper cab on a long bonnet, its deck and fifth wheel behind,
  `FIFTH_WHEEL`), each with its seat, springs and paints; the windscreen of
  the box truck, the rig and the bus starts well up the cab's front
  (`screen`, `screenFoot()`). Their touches are cars.ts `EXTRAS`: the
  patrol car's light bar (dark lenses, `BAR`), push bar, spotlight and
  aerials; the box truck's rails, a band in the city's colours with the
  diamond, marker lights, side guards, fuel tank, the roller shutter, wind
  deflector and visor; the rig's chrome grille, visor, air horns, cab
  lights, exhaust stacks, fuel tanks and steps. **The trailer** is
  `TRAILER` (5.2 long) and `trailerGeometry()`: a box in the rig's colours
  on an underframe, two axles under mudguards, landing legs, doors with
  locking bars over the under-ride guard and its lamps; its far form
  joins the far cars' mesh (`FarModel`).
- **The rules** are `fleet.ts` (DOM-free, tested in
  `tests/fleet.test.ts`): the **loading bays** (`BAYS`, 42 of them: along
  the avenues in town each way, one between each two bus stops, clear of
  the junction ahead (`BAY_AHEAD`) and of a rig's whole length behind
  (`BAY_BEHIND`), never where a rig and a standing bus would overlap,
  never on a bridge), taken with the buses' rules (`routeStops()`,
  `pullIn()`, `busStep()` with `BAY_DWELL`, 10 to 18 s); the **rig along
  its route** (`rigAlong()`, `RIG_LEN`: the tractor ahead, the kingpin on
  its fifth wheel, the trailer's axles behind, so it swings round a corner
  behind the tractor; the tests hold the cab clear of the trailer to 75
  degrees); the **light bar** (`barLit()`, `BAR_FLASH`: 8 s in every 42,
  blue and magenta in turn, each car at its own time); the **bikes**
  (`BIKE_MIX`, `BIKE_PAINTS`, `trafficLean()`: into a turn, at most
  `TRAFFIC_LEAN`, 0.16, so the upright rider never looks wrong on it).
- **The traffic** (life.ts): after the buses, the trucks (box truck and
  rig in turn), the patrol cars, then the cars' mix; each kind a fleet of
  its own (`addFleet()`: paint and detail, the bus's windows, the patrol
  cars' livery panels, `liveryTex()`: SECTOR 7 PATROL by the city's shield
  over white doors, fixed copy; the trailers placed from their rigs). A
  truck at its bay stands with its **hazards** on (both sides'
  indicators); a patrol car never sounds its horn at you; its lit lenses
  are two more instances each in the tail mesh. **The bikes** join once
  bikes.ts is in (`addTrafficBikes()`, from index.ts: `bikeGeometry()`,
  every part merged straight, the paint and the detail as the cars'),
  drawn at the crowd's size (`BIKE_K`), no far form (a speck that far);
  each one's **rider** is one of the crowd (`riders`, kind `ride` in
  `buildPeople()`): his root under the seat, the row for his bike
  (crowdclips.ts `scoot`, `ride`, `tuck`, from acts.ts `ridePose()`, which
  your own bike's rider now shares), its `u` his left foot coming down as
  it stops.
- **The crew** (carfine.ts `crew()`, the fine-detail chunk): through each
  side window the driver's head, shoulders and chest (drawn forward into
  the front door's window where the B pillar would hide him) and the
  headrests behind; through the windscreen and the rear glass his head
  and shoulders and the seats; the patrol car has two up. Flat shapes just
  over the glass in the car's detail: `carGeometry(id, { crew: true })`,
  the traffic's only.
- **How many** (`TIERS` in index.ts): desktop (high and medium) four
  trucks (three on medium), three patrol cars and six bikes; phones two,
  two and three.
- **Measured** (`?bench`, the medium tier by day, headless on software graphics: the draws are what to compare;
  two runs after, the second with the riders all in hoodies, one kind of the crowd's meshes for them):

  | View | Draws before | After (two runs) |
  |---|---|---|
  | traffic (a ring junction) | 121 | 148, 148 |
  | highway junction | 164 | 197, 186 |
  | drive (the ring avenue) | 242 | 264, 267 |
  | street (downtown) | 410 | 427, 437 |
  | home | 379 | 391, 412 |
  | the route (average / worst) | 223 / 470 | 267 / 598, 278 / 498 |

  About 25 to 45 draws more where the traffic is: the new fleets (two draws each, three for the patrol cars with
  their livery; up to 15 with every kind in view) and the riders bringing the crowd's meshes into views with no one
  else on foot. The numbers move from run to run with where the traffic happens to be (the airport's view, with no
  new traffic of its own, went from 114 to 145 between runs), so a real laptop's and a phone's `?bench` are the
  owner's to paste back. Triangles about 0.1 M more; geometry memory 206 to 212 MB. Boot cost: 6 KB (657.3 of
  670 KB).

### Phase 9: karts, boats and aircraft (built)

- **Karts:** a better chassis (tube frame, side pods, the engine and
  exhaust behind the seat, a fuller nose), real tyre treads and rims, the
  driver's pose sharper.
- **The hire boat:** a better hull and deck, the helm and its wheel,
  bow spray and a fuller wake.
- **Aircraft:** better shapes, ailerons, flaps and rudder that move with
  the controls, landing gear that folds away properly, for your own and
  the airport's.

**As built:**

- **The karts** (karts.ts, the kart race's chunk; the numbers are
  `kartframe.ts`, DOM-free, tested in `tests/kartframe.test.ts`):
  `KART_SHAPES` gives each model its wheels, floor, seat, side pods, engine
  and nose. Each kart has:
  - a bent tube frame (`bend()`) with nerf bars, a rear bumper, the rear
    axle on its bearings and stub axles at the front;
  - rounded side pods and a nose (`profile()`);
  - a finned engine with its carburettor or air filter, a chain guard and
    sprocket, and the exhaust bent round to a silencer;
  - pedals under the nose, the steering column and a bolstered seat;
  - tyres with shallow staggered tread blocks on six-spoke rims
    (`kartWheel()`);
  - a three-spoke wheel tilted back towards the driver (`WHEEL_TILT`).

  The driver is posed by `kartPose()`: seated low with his knees up, each
  foot on its pedal through `reachLeg()` (measured from the leg's own hip
  joint), his hands on the wheel's grips through `reachArm()` as it turns.
  The test holds his hands and feet within 1.5 cm. The motorbike rider's
  feet are reached the same way now (acts.ts `ridePose()`, `tests/bike.test.ts`).
- **The hire boat** (riverlife3d.ts `hireBoat()`, the river's chunk):
  - The hull has V sections with flare and a sweeping sheer (`hullAt()`,
    `hull()`): a navy bottom, white topsides, a cyan boot stripe and a
    liner inside.
  - The deck has a teak sole and gunwale caps, and a foredeck with a
    non-skid pad, a bow rail, cleats and red and green side lights.
  - The console has a windscreen, a compass and a throttle lever. There's
    a bench with a backrest, a rounded outboard with its leg, cavitation
    plate and prop, and a flag.
  - The helm is a group of its own that boat.ts turns with the rudder
    (`turnHelm()`).
  - Spray comes off the bow from `SPRAY.from` of top speed (`sprayOf()`,
    a few dozen points, none under reduced motion). The wake is a streak
    with two arms at the Kelvin angle (`KELVIN`, `wakeShape()`: longer,
    wider and stronger with speed). Both are in boat-sim.ts and tested in
    `tests/boat.test.ts`.
- **The aircraft**: the moving parts' rules are `airframe.ts` (DOM-free,
  tested in `tests/airframe.test.ts`), and aircraft.ts draws them:
  - **Control surfaces:** the wings, tailplanes and fins are data
    (`PANELS`, laid by `place()`). Each surface (`SURFACES`) is cut out of
    its panel's trailing edge (`notched()`) and hinged along the cut
    (`frames()`, `surfaceMatrix()`). That's ailerons, two flaps a side on
    the airliner and one on the small jet and the prop plane, elevators
    and the rudder.
  - **What moves them** (`stepAirframe()`): your own aircraft's surfaces
    follow the stick (fly.ts passes it on the pose). The airport's follow
    how their timetabled poses roll, pitch and turn (`targetsOf()`), with
    the elevator held a little up through a banked turn and the rudder
    steering on the ground. The flaps come down with the gear in the air,
    part down rolling and up when parked, and slide back as they drop.
  - **The gear** (`LEGS`): a strut with its torque link, axle and wheels,
    hung from a pivot. On the ground it's down; it folds over `GEAR_TIME`
    (`legMatrix()`): the nose leg aft into the nose, the mains inward into
    a new belly fairing (`FAIRINGS`). It's hidden once it's up. The test
    holds every folded wheel inside the body or the fairing, the struts
    inside them or the wing, and the down wheels on the ground. The prop
    plane keeps its fixed spatted gear; the helicopter its skids.
  - **Better shapes:** the belly fairing, flap-track fairings under the
    airliner's wing, antennas and the tail cone's exhaust.
  - **Draw calls:** a fleet's surfaces are one instanced box (coloured per
    surface: the panel's, or the livery for the rudder; `paint()` repaints
    it), and its legs one instanced mesh per kind of leg (nose, mains).
    That's two or three draws more for a jet's fleet, one more for the prop
    plane's. Boot cost: 2.6 KB (659.9 of 670 KB): aircraft.ts and
    airframe.ts are in the boot with the airport.

## Decided (the owner left these to Claude, 2026-10-28)

1. **Names, prices and levels** (made up; none is a real make or model):
   the classic **Boulevardier** (22,000, level 5), the off-roader **Mud
   Buster** (30,000, level 7), the electric hatch **Glow Pod** (40,000,
   level 8); the scooter **Hop Scoot** (free), the street bike **Alley
   Cat** (9,000, level 3), the sport bike **Neon Blade** (36,000, level
   8). They sit between the garage's prices today (18,000 to 64,000).
2. **The traffic gets the sharper shells in Phase 1**, the finest pieces
   near only: one set of models, and the bench sees the real cost at once.
3. **The police livery:** midnight blue with white doors, SECTOR 7 PATROL
   along the sides and a made-up shield (the city's own mark), a light
   bar flashing blue and magenta now and then; no siren chases.
4. **How many:** on desktop three police cars and six bikes in the
   traffic, on phones two and three.
5. **The order stays.** Getting in and out (Phase 3) turned out smaller
   than planned: the animation revamp's moments (`moments.ts`: `board` /
   `alight`) already walk Degen to the door, reach for the handle and
   duck him in; Phase 3 makes the door swing with it and seats him on
   the real interior.
