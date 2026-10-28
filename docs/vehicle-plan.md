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

### Phase 0: measure and prepare

- Add a driving view and a busy-traffic view to `?bench`; record draws,
  triangles, memory and frame times on desktop and a phone as the baseline.
- Split `CarSpec` into what the outside needs and what the inside needs
  (an `Interior` per model: seats, dash, wheel position, the driver's
  seat point), so the later phases add data, not special cases.

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

- A new state in Degen's animator: walk up to the driver's door, open it,
  step in and sit, pull it shut; getting out is the same in reverse. Built
  and reviewed in the lab first.
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

## Open questions for the owner

1. The new cars' and bikes' prices and levels, and their names.
2. Phase 1 changes the shared models, so the traffic gets the sharper
   shells straight away. Is that wanted then, or held back to Phase 8?
3. The police livery: colours and the made-up markings.
4. How many bikes and police cars in the traffic (they cost draws).
5. Should the order change, e.g. handling (Phase 4) before getting in and
   out (Phase 3)?
