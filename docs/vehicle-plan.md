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

### Phase 3: getting in and out

- The moves are already there (the animation revamp's `board` / `alight`
  moments: the walk to the door, the hand on the handle, the duck in, a
  foot out first). This phase makes the door swing open as the hand
  lands and shut once he's in (and the reverse), reads the seat's height
  and the handle from `INTERIORS` instead of `MOMENT.car`'s one size for
  every car, and puts him on the real seat with his hands on the wheel.
  Reviewed in the lab first.
- Each model has its door's hinge, the step-in point and the seat
  (Phase 0's `Interior`). If the driver's side is blocked (a wall, a
  parked car), Degen uses the passenger door and slides across, or, if
  both are blocked, the old instant swap with a quick fade.
- Pressing Get in or Get out again skips to the end; under reduced motion
  it's always the quick version.
- Multiplayer: other players see the same move (a mode flag in
  `protocol.ts`).

### Phase 4: handling with depth

- **Personalities** (`DRIVE` grows from three numbers to a handful:
  weight, body roll, suspension softness, rear-end looseness, steering
  speed): the van wallows and leans, the coupe darts, the pickup bounces
  over kerbs, the muscle car's tail steps out under power, the supercar
  grips. The garage's stat bars stay simple.
- **Drifting:** a held slide, from the handbrake or a power-on turn in the
  rear-drive cars, that you keep going with counter-steer and throttle;
  the skid marks and tyre screech follow it; the tyres mod helps hold it.
- Still arcade: no stalls, no spins you can't get out of.
- **Done when:** each car feels different in a blind test, and the tests
  hold drifts that recover and nothing that spins for ever.

### Phase 5: the garage's customisation (all free)

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

### Phase 6: three more cars

- A **classic** (rounded old-school saloon or roadster, chrome bumpers),
  an **off-roader** (lifted, big tyres, roof lights, a snorkel) and an
  **electric hatch** (smooth, instant pick-up, a whine instead of an
  engine note). Each with its own interior, personality and customisation
  from the start. Made-up names to be picked with the owner.
- Bought with Dorras at a level, as the Street Thunder, Big Rover and
  Hyper Comet are (prices to confirm with the owner).

### Phase 7: motorbikes

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

### Phase 8: the traffic

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

### Phase 9: karts, boats and aircraft

- **Karts:** a better chassis (tube frame, side pods, the engine and
  exhaust behind the seat, a fuller nose), real tyre treads and rims, the
  driver's pose sharper.
- **The hire boat:** a better hull and deck, the helm and its wheel,
  bow spray and a fuller wake.
- **Aircraft:** better shapes, ailerons, flaps and rudder that move with
  the controls, landing gear that folds away properly, for your own and
  the airport's.

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
