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
  gears, skids. The body's lean and squat are drawn in `drive.ts` and
  aren't in the sim.
- `drive.ts`: getting in and out is instant (Degen is hidden or shown),
  chase and roof cameras (V).
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

### Phase 1: your cars, sharper and with an inside

- **Bodywork:** better outlines (rounder shoulders, wheel arches cut into
  the body, not laid on it), panel gaps, vents, made-up badges, side
  repeaters, wheels with brake discs and calipers, tyre sidewalls.
  The traffic shares the same models, so it gets the sharper shells too;
  the finest pieces are near only and phones leave them out.
- **Glass you can see through** on your own car only: a tinted
  transparent glass material, with the outline pass still drawing its
  edges.
- **The interior** (your car only): seats, door cards, dashboard, centre
  console, steering wheel on its column, gauges, mirrors, a headliner;
  Degen seated at the wheel (the kart's `seat()`, posed for a car), seen
  through the glass.
- **Done when:** every one of the eight cars has an interior and sharper
  body, and the bench numbers stay in budget on a phone.

### Phase 2: moving parts and the driver's eye view

- **Suspension you can see:** each wheel on its own spring in the sim
  (`drive-sim.ts`: travel, stiffness and damping per model, the body's
  roll and pitch coming from the springs instead of a drawn-on lean),
  wheels following kerbs and bumps up and down in their arches.
- **Doors** as their own hinged pieces on your car (each model's door
  seams become real cut lines), opened and shut by the view.
- **The steering wheel turns** with the steering; the gauges' needles
  follow the speed and the revs (`gearOf()`).
- **The driver's eye camera:** V steps chase → roof → driver. From the
  seat: Degen's hands on the wheel (`reachArm()`), the live dash, the
  mirrors showing a cheap, low-resolution view behind (or a painted
  stand-in on phones), looking round with the mouse or right stick.
- **Done when:** the springs are tested in the sim and the inside view
  reads well at night and in the rain.

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
