# Vehicles: the cars, the vehicle upgrade, the garage, driving, bikes, boating

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- **Cars** are `src/scripts/city3d/cars.ts`: real-proportion cartoon models
  (City Hatch, Cruiser, Street GT coupe, Hauler pickup, Box Van, City Bus,
  Street Thunder, Big Rover, Hyper Comet, the Boulevardier classic, the Mud
  Buster off-roader and the Glow Pod electric hatch (the last three yours
  only, not in the traffic), and Uptown's Midnight Exec, a long black
  saloon, the Patrol car, the Box Runner truck and the Heavy Haul rig with
  its trailer (`TRAILER`, `trailerGeometry()`), in the traffic only;
  made-up names, never a real make or badge), each a bevelled extruded
  body and cabin with blacked-out window frames and glass, light clusters
  (lamp shape `lamp`) with bezels and indicators, a grille, door seams and
  handles (`seams`, `handles`), sills, exhausts, mirrors, bumpers, plates
  and fat lathe-turned tyres on spoked rims (`rim`, `spokes`), plus each
  model's own touches in `EXTRAS` (spoilers, stripes, flares, a light bar,
  a ladder, roof pods); the numbers are `carspec.ts`'s. Keep `top` and `cabin` as the side outline: the
  garage cards draw their silhouettes from them. A model is two
  geometries, `paint` (each car its own colour, `PAINTS`) and `detail`
  (vertex colours), plus the bus's lit windows, so the traffic in `life.ts`
  costs two draw calls a model. Parked cars use `parkedCars()`; give them a
  footprint in `solids.ts`. Keep a new model inside a 1.7-wide lane and in
  scale with Degen: every vehicle is drawn at `CAR_SCALE` (0.88, the scale
  plan's cars, docs/scale-plan.md) of the numbers it's written in (`DRAWN`
  in carspec.ts, what the drawing, the inside and the springs work in);
  `CARS` is them at their size in the world, what everything else reads (a
  hatch's roof about 0.84 tiles up, just under Degen's head). Degen sits in
  a car's drawn numbers at `IN_CAR` (carinside.ts), and `inWorld()` gives a
  seat and door in the world's.
- **The vehicle upgrade** (the owner's call: more detail and more function
  for every vehicle) is planned in `docs/vehicle-plan.md`: interiors and
  sharper bodywork, doors and suspension that move, getting in and out,
  the driver's eye view, handling with personality and drifting, free
  customisation at the garage, three more cars, motorbikes, new traffic
  (delivery trucks, police that never chase, bikes), then the karts, the
  boat and the aircraft. Keep it up to date, one phase at a time with the
  owner's sign-off. Phase 0 (measure and prepare) is built: the cars'
  measurements are `carspec.ts` (DOM-free: `CarSpec`, `CARS`, `PAINTS`,
  re-exported by cars.ts, which keeps each model's own touches in
  `EXTRAS`), what's inside them `carinside.ts` (DOM-free, kept out of the
  boot: `INTERIORS`, each model's seat, recline, eyes, shoulders, wheel,
  dash, floor, pedals, rear seats and driver's door, for Degen seated at
  `DRIVER_SCALE` (`SITTER`); `roofAt()`, `beltAt()`), tested in
  `tests/carspec.test.ts` (his head under the roof, his eyes over the
  window line and the dash, the wheel in reach and over his knees, the
  door on the body's seams), and `?bench` has a driving view and a
  traffic view (`drive`, `traffic`). Phase 1 (sharper cars, your car with
  an inside) is built, all in a chunk fetched once the city is up
  (`carfine.ts`, `carcabin.ts`, `carparts.ts`; index.ts's `idle()`): the
  boot carries only cars.ts's hook (`FINE`, `cache`, `build()`, and
  `createCar(..., mine)`, your cars on their group's `userData.car`), and
  the chunk builds every model again with its detail and copies it into
  the geometry the traffic and the parked cars hold (`add()`: dark wheel
  wells, arch lips, a shoulder crease, shut lines, a fuel flap, side
  repeaters, the diamond badge, windscreen highlights, brake discs and
  calipers; desktops also sidewall rings, projectors and fog lamps), and
  fits your car out (`fitOut()`: hollow where you see in, `hollowFrom()` /
  `hollowTo()` in carinside.ts; its glass see-through in the FX layer; the
  inside from `INTERIORS`; Degen at the wheel through `car.seat()`, which
  drive.ts calls on getting in). Phase 2 (moving parts and the driver's
  eye view) is built, in the same chunk: the springs' rules are
  `suspension.ts` (DOM-free, tested in `tests/suspension.test.ts`: each
  wheel on its own spring, `SPRINGS` per model, the body's heave, pitch
  and roll from the ground under the wheels and the load of speeding up,
  braking and turning, each wheel within its `travel`), and `carride.ts`
  drives your fitted car through hooks drive.ts reads live from it
  (`car.ride()`: the body, everything but the wheels in one group, on its
  springs, the wheels up and down in their arches, the steering wheel
  turning with his hands on it, the gauges' needles, the wipers in the
  rain, the skid marks; `car.eye()`: the driver's-seat camera, V's third
  view, his head folded away and no rain inside the cabin, the rain's
  shader given a hole round it; `seat()` shows the lamps' pools); the kart keeps drive.ts's drawn-on lean. The
  mirrors are painted stand-ins. Phase 3 (getting in and out) is built (other players see you in
  your vehicle, remoteveh.ts, but not the move into it yet): both front doors are cut out
  (`doors`) and swing through `car.door(side, hold)`; `carMark()` in
  moments.ts (tested) stands him by the door on his side, clear of its
  swing, the nearer hand on its handle (`INTERIORS[id].door.handle`), the
  root onto that side's real seat; walk.ts opens the door as the hand
  comes to it (`HAND_ON`), from the passenger's side he slides over
  (`SLIDE`), drive.ts `exit()` opens the door he leaves by; a blocked
  side is the quick swap with a fade (`QUICK_FADE`), reduced motion the
  quick swap without; at home the turntable is stood on to get in
  (`isTurntable()`, `DISC`). Keep new car detail in that chunk: the
  boot is under its budget (660.4 of 670 KB with Build mode gone and the inventory plan's Phase 3 merged, and the multiplayer's vehicle ids: Phase 3 brought carinside.ts into it, Phase 5 the look's ids, Phase 6 three specs, Phase 7 the bikes' numbers and rules, Phase 8 the traffic's models, rules and riders, Phase 9 the aircraft's moving parts; Crestmont's Phases 2-6 came in at about the same size, its Phase 2 having packed the routes tighter; 663.3 with its Phase 7's landmarks, 666.0 with its Phase 8's life, 666.3 with its Phase 9's metro spur; 668.5 with Southbank Docks' Phases 1 and 2; 672.0 with its Phase 3's port, the budget raised to 680 on purpose, the owner's go; with Sunridge's Phase 1 (the owner's call: "raise the limit when needed, we want quality") about 676; 659.9 after the start-up pass, docs/performance-plan.md: the synth loaded on use and the crowd's cycles rounded; 669.2 with the weapons plan's first phases and the Neon Mile's Phase 1, mostly the traffic's routes down its boulevard; 673.4 with its Phase 2's resorts, 674.8 with its Phase 3's landmarks, 677.3 with its Phase 4's monorail, 678.2 with its Phase 5's life; 680.4 with main's menu kit and blended ground merged in, the budget raised to 690 on purpose, the owner's go; the owner has said to raise it when needed; 690.9 with the blend plan's Southfield, the budget raised to 700; 694.6 with main's world out to -680 to 720 and the blend plan's verges; 698.7 with Lot 9, its homes kept in its chunk; 700.4 with the raised highway's Phase 1b, the viaduct's shape read at the boot, the budget raised to 720 under the owner's standing call; 706.8 with its Phases 2-4, the ramps' routes and the signs' data; 718.6 of 730 with its Phases 5-9, its Phase 9 having moved the signs' and fences' data out; 723.5 with main's kart park west merged in; 725.0 with Endswood's move of Lot 9 and Lot 9's Field; 728.8 of 740 with Endswood's Phases 2-5 on top (its streets' routes, its blocks' and street level's solids, its decks walked on), the budget raised to 740 under the owner's standing call; the polish plan's audit measured 715.5 before the raised highway's Phases 5-9 and Endswood, and its Phase 4 (the baked data a fetched file, the economy's screens and target practice chunks of their own) took about 52 off, docs/polish-plan.md; 693.2 of 740 with the two merged; 703.2 of 740 measured 2026-11-12, with the wall, the Docks' life, the civic quarter and Endswood carried west in). Phase 4 (handling with
  depth: each model's feel and drifting) is built, in the sim (drive-sim.ts, mycar.ts `FEEL`; see Driving your
  car below). Phase 5 (the garage's customisation, all free) is built: `CarLook` in mycar.ts (the ids,
  `cleanLook()`, carried by `cleanCar()`), carlook.ts (DOM-free, tested in `tests/carlook.test.ts`: names,
  colours, `kitFit()`, `doorPanel()`, `STOCK_PARTS` / `bareOf()`: a kit part over the model's own takes it off
  through `build(id, wheels, bare)`), drawn by carstyle.ts in the fine-detail chunk (`dress()` from `fitOut()`:
  rims, the kit on the body, the livery as one material on every painted piece with a `liveTex()` for the sides,
  the underglow dark by day), the garage menu's tabs (Model, Paint, Wheels, Kit, Livery, Glow). Phase 7
  (motorbikes) is built: `mybike.ts` (the Hop Scoot scooter free, the Alley Cat and the Neon Blade for Dorras;
  `BIKES`, `MyBike` saved as `degen-city-bike-v1`), `bike-sim.ts` (DOM-free, tested in `tests/bike.test.ts`: the
  cars' rules tuned as a bike, the lean into turns by speed within its most, the foot down as it stops), drawn by
  `bikes.ts` (a chunk fetched after the boot; the rider astride, hands on the grips, feet on the pegs); bought
  and tuned at the garage (the Cars / Bikes switch; the save's garage holds both, `GarageId`; the roof rack is a
  top box), waiting on its stand on the forecourt, ridden by drive.ts as a third vehicle (see Riding your
  motorbike below). Phase 6 (three
  more cars) is built: the **Boulevardier** (`classic`: chrome bumpers and overriders, tail fins, chrome hubcaps; a
  soft, wandering rear-drive feel), the **Mud Buster** (`offroad`: lifted on big tyres, roof lights and rack, a
  snorkel, a steel bumper with a winch, rock sliders (the kit's skirts take their place), the spare on the
  tailgate; heavy and sure) and the **Glow Pod** (`ev`: the grille closed over, light bars nose and tail, a glass
  roof, aero discs, no exhaust; `DRIVE.electric`: one gear, `motorOf()` in drive-sim.ts, and the engine's
  `whine` voice in sound.ts), each with its own spec, interior, springs, feel and cargo, bought at the garage
  (`CAR_CATALOG`: 22,000 at level 5, 30,000 at 7, 40,000 at 8); yours only, never in the traffic's `MIX`. Phase 8
  (the traffic) is built: the rules are `fleet.ts` (DOM-free, tested in `tests/fleet.test.ts`): delivery trucks
  (carspec.ts `truck`, the Box Runner with its cargo `box`, and `rig`, the Heavy Haul tractor with its trailer
  following it along the route, `rigAlong()`) pull in at loading bays (`BAYS` on the avenues between the bus
  stops, the buses' `busStep()` with `BAY_DWELL`) with their hazards on; patrol cars (`police`: midnight blue,
  SECTOR 7 PATROL by the city's shield on white door panels (life.ts `liveryTex()`, fixed copy), a light bar
  flashing blue and magenta now and then, `barLit()`) drive like the rest and never chase, stop or sound a horn
  at you; bikes and scooters (Phase 7's models, `BIKE_MIX`, bikes.ts `bikeGeometry()` once its chunk is in,
  `addTrafficBikes()`) carry one of the crowd (life.ts `riders`, the rows `scoot` / `ride` / `tuck` from acts.ts
  `ridePose()`, your own rider's pose too) and lean a little into turns (`trafficLean()`); every traffic car
  shows its driver and seats behind the glass (carfine.ts `crew()`, `carGeometry(id, { crew: true })`, the
  traffic's only). Desktop four trucks (three on medium), three patrol cars, six bikes; phones two, two, three
  (`TIERS`). Phase 9 (karts, the hire boat and aircraft) is built: the karts' numbers and their driver are
  `kartframe.ts` (DOM-free, tested in `tests/kartframe.test.ts`: `KART_SHAPES`, `kartPose()`: his feet on the
  pedals through `reachLeg()` from the leg's own hip joint, his hands on the wheel's grips), drawn by karts.ts (a
  bent tube frame, side pods, a finned engine and its exhaust, treaded tyres on spoked rims); the hire boat
  (`hireBoat()`: a V hull, a foredeck, the console, the helm turning with the rudder) throws spray and a wake at
  the Kelvin angle (boat-sim.ts `sprayOf()`, `wakeShape()`); the aircraft's moving parts are `airframe.ts`
  (DOM-free, tested in `tests/airframe.test.ts`: `PANELS`, the control surfaces cut out of their trailing edges
  (`SURFACES`, `notched()`, `frames()`, `surfaceMatrix()`), moved by `stepAirframe()` (your own from the stick,
  the airport's from how their poses turn; the flaps with the gear), and the gear's `LEGS` folding into the body
  and its belly fairing (`FAIRINGS`, `legMatrix()`, `GEAR_TIME`)), one instanced mesh for a fleet's surfaces and
  one per kind of leg in aircraft.ts's `createFleet()`.

## The garage and your car (3D walk mode)

- `drive.ts` drives one vehicle at a time, your car or your kart (both can
  be out: "Get in" takes the nearest; `carState` / `inCar` are the car's
  own; `recallKart()` sends the kart to the pits).
- The garage is on the south bank, east of S5, facing the south bank
  avenue (`GARAGE` in `layout.ts`; drawn by `garage.ts` in world numbers,
  not the landmarks' drawing grid). A flat-roofed workshop with an open bay
  and a car lift, a roller door, an office, a neon GARAGE roof sign, and a
  showroom turntable on the forecourt with the player's own car on it. It
  has no pin and links nowhere; it's walk-mode only. Its footprints, the
  turntable and the office door are `GARAGE_SITE` in `solids.ts`.
- The office door's prompt opens the garage menu (`garage-ui.ts`, markup
  `data-garage` in `CityMap.astro`, on the `.shop` panel in the kit's
  skin): five models (`PLAYER_CARS`: the bus is city-only) with card
  silhouettes drawn from each model's outline at one scale, three stat bars
  and twelve paints; tabs (`data-garage-tabs`: Model, Paint, Wheels, Kit,
  Livery, Glow) for the free customisation (vehicle plan Phase 5, above). Each pick shows on the turntable; Keep saves it,
  closing without keeping puts the saved car back. While it's open the
  camera eases to the turntable (`frameShowroom()` in `walk.ts`, over the
  shoulder so the first-person hands stay out of shot) and the picture
  slides with `setViewOffset` so the car sits beside the panel (wide
  screens, panel on the right) or above it (phones, bottom sheet). The
  turntable turns only while the menu is open, and never under reduced
  motion. Check it upright and on its side at phone widths (no scrolling).
- Your car (`mycar.ts`, DOM-free): `{ model, paint }`, cleaned by
  `cleanCar()`, saved in the browser as `degen-city-car-v1`. `DRIVE` holds
  each model's garage copy and its 0-1 speed / pick-up / grip (for the
  handling), `CARGO` its boot. Eleven models: the five starters are free,
  the Street Thunder, Big Rover, Hyper Comet, Boulevardier, Mud Buster and
  Glow Pod are bought with Dorras at
  the garage (`CAR_CATALOG`), and every car is tuned there (`CAR_MODS`:
  engine, turbo, tyres, roof rack, three levels each; `carStatsOf()` feeds
  the handling and the boot). Only for the city: never tied to the store or
  the token, never real money.
- `createCar()` in `cars.ts` builds one car with its own paint, steerable
  rolling wheels (`drive()`) and lights. The turntable's car is the one you
  drive (`takeOut()` in `garage.ts` hands it to `drive.ts`).

## Driving your car (3D walk mode)

- `drive-sim.ts` holds the rules, DOM-free like `combat-sim.ts`:
  - **Handling:** arcade. Speed tapers to the model's top speed; brake, then reverse. Steering uses a bicycle model that eases off with speed. Grip sets how quickly the slide follows the nose. Each model has its own feel (vehicle plan Phase 4: `FEEL` in mycar.ts, `Feel` in the sim: weight, how loose the tail is, rear drive, steering speed and lock). **Drifting** (`CarState.drift`, `DRIFT`): the handbrake at a roll, or full power through a turn in a rear-drive car, breaks the tail away; throttle keeps it going, counter-steer straightens it, lifting off brings the grip back, and the slide never passes `DRIFT.most` from the nose (`slipOf()`), so nothing spins for ever. Tested in `tests/drive.test.ts`.
  - **Collisions:** soft and safe. The car is three circles along its length. It slides along `SOLIDS` (minus the turntable), placed buildings and the river walls (`RIVER_WALLS`, open at the bridges). It bumps softly off traffic and people, never through them.
  - **Tuning:** `tune()` turns `DRIVE`'s 0-1 numbers into speeds. New handling goes in the sim first.
- `drive.ts` is the view:
  - **Getting in:** "Get in" at your car, on the turntable (it drives off facing the avenue) or wherever it was left.
  - **The car on screen:** it climbs kerbs smoothly, leans into turns and squats under gas or brakes (your car fitted out on its springs, `suspension.ts` and `carride.ts`; the kart and an unfitted car on the drawn-on lean). The wheels roll and steer.
  - **Cameras** (views.ts, docs/views-plan.md): near and far chase cameras that swing in behind, where you can look around and they settle back; pulled in by buildings like the walk camera. Near for the car, the bike and the kart is `NEAR_ROAD` (the owner's call, 2026-11: about a quarter closer and a little lower than it was, falling back less with speed; a kart race's near is `RACE_NEAR`, its far as far back as before); far, the boat's and the aircraft's are as they were. V (R3, the touch View button) steps near, far, first person: in your car fitted out the driver's seat (`car.eye()`; the near plane comes in for it and goes back on getting out; the roof camera until it's fitted out), on your bike the helmet, in your kart the seat. Every time you get in it starts near.
  - **Readout:** speed in km/h and the gear (`data-drive-hud`).
  - **Sound:** a synthesised engine (`engine()` in `sound.ts`) plus bump and door sounds, all through the sound switch.
  - **Getting out:** "Get out" anywhere. Degen steps out of the left door, or wherever there's room, and the car stays parked and solid to walk round. Leaving walk mode parks it too.
  - **Sending it home:** the garage menu's Keep calls it back to the turntable ("Bring my car home"). A reload puts it back there too.
- Traffic stops for your car (`walker.r` in `life.ts` reaches further while driving), and queues behind it, your bike or your kart wherever you leave them parked (drive.ts's `stoppers` entries; life.ts toots once and puts a car held out of sight too long back on the road elsewhere: the polish plan's Phase 6). `bodies` in `life.ts` shares where the traffic and the pedestrians are, for the soft bumps.
- **Controls:**
  - Keyboard: W / S (or arrows) gas and brake / reverse, A / D steer, Space handbrake, H horn, V camera, F get out.
  - Touch: the stick steers (and pedals when no pedal is held), with Gas and Brake buttons (`data-drive-gas`, `data-drive-brake`), Horn and View (`data-drive-view`, the camera) in the controls plan's slots (`touchlayout.ts` `drive`: a bigger stick bottom-left, Gas the big button in the corner, Brake beside it); Get out at the top right and the speed at the top left, all clear of the phone's safe areas. Getting out brings the walk layout back.
  - **Two thumbs at the wheel** (the owner's call: "two finger touch points always available, never interrupting each other"; `touchdrive.ts`, DOM-free, tested in `tests/touchdrive.test.ts`): every finger is followed on its own (on the window, captured), so one landing or lifting never lets another go. The stick floats at the wheel (car, bike, kart, boat, aircraft, a kart race: walk.ts `atWheelNow()`): a thumb landing on the city low on the stick's side (`inSteerZone()`, `ZONE`) is the stick, its ring moved under the thumb; a little dead middle and full lock at `STICK.full` of the ring (`stickRead()`, the vehicles' `joy.sx` / `sy`; on foot and in the ring the stick reads as before, `joy.x` / `y`). A pedal finger presses the pedal it's on or the nearer (`pedalAt()`, `pedalFingers`), so a thumb rolled from Gas onto Brake switches without lifting, and one landing on the city just round the pedals (`inPedalZone()`, `PEDAL_REACH`) presses one; the pedals light by what's pressed (`.is-held`). Walk mode keeps the phone's own gestures (Safari's pinch, its long-press magnifier and callout, Android's long-press menu) off the controls and the city (`touchstart` / `touchmove` prevented on `.tc`, the stick and the canvas, `gesturestart` too), and the control card lets every touch through to the game but its × (controls.css).
  - Gamepad: left stick steers (pressed: the horn), RT gas, LT brake, A handbrake, Y get out, the right stick pressed the camera, View the world map; the right stick or the mouse looks.
- While driving, `.city.is-driving` hides the walk and combat HUD, and the header says "Driving · <car>" (`head.ts`). A gun is holstered on getting in. Your car's lights, horn, skid marks and gears are the city life plan's Phase 2 (above; `docs/life-plan.md`).
- Check the pedals, stick, prompt and readout at phone widths, upright and on their side: nothing may overlap.

- `drive.update()` returns the tiles moved; walk mode counts them on the
  save every ten tiles (`counters.driven`, for missions and badges).
- `?spawn=x,z[,yaw]` in the address starts walk mode at a spot, and `?fps`
  shows where Degen stands: use them to check a place on a real device.
- **The street races were retired** (the owner's call): no start line,
  gantry or board on the south bank avenue, no race menu, HUD or results,
  no race missions or badges, and no race times in the save. Racing lives
  at the kart park only. Don't bring them back without the owner. The
  pieces their screens left behind (the big countdown digits, the results
  card, the list rows and tags) are shared by the kart and fight menus in
  `src/styles/cards.css`, still under their `.race-*` class names.

## Riding your motorbike (3D walk mode)

- Your bike (vehicle plan Phase 7, `docs/vehicle-plan.md`) waits on its side stand on the garage's forecourt
  (garage.ts `BIKE_SPOT`, between the bay line and the office door, facing the avenue); "Get on" there or wherever
  you left it. Getting on is a moment (`bikeMark()`: beside it, hands to the grips, a leg over the seat); "Get off"
  anywhere leaves it on its stand, solid to walk round.
- drive.ts rides it as a third vehicle (`kind: 'bike'`, the car's HUD, touch layout and keys; `on-bike` on the
  root, the header "Riding · <bike>"): bike-sim.ts's lean tips the whole bike and you with it, your left foot comes
  down as it stops, V swaps the chase camera for your helmet's (tipping with the lean), H sounds the horn. Its
  lights are the car's (`carLights()` in drive-sim.ts, `bike.lights()` in bikes.ts): the tail lamp swaps to the brake
  or reversing lens and small amber indicators under the mirrors and beside the tail lamp flash a side, the lenses'
  materials shared from cars.ts `lampMaterials()` (the polish plan's Phase 6).
- Bought, tuned (engine, turbo, tyres, a top box) and painted at the garage on the Cars / Bikes switch; the kit,
  livery and glow tabs are the cars'. Only for the city: never real money, never tied to the store or the token.

## Boating (3D walk mode)

- The hire boat (river plan step 4c, the owner's pick): moored along the quay east of Downtown's landing (`HIRE` in `riverbus.ts`, its ladder a gap in the railing through `atGangway()`, a BOAT HIRE board); "Take a boat" at the top of the ladder (`boat` in walk.ts's prompts, closed by the live settings' `boat`).
- The rules are `boat-sim.ts` (DOM-free, tested in `tests/boat.test.ts`): `TUNE` (arcade: thrust to `top`, a gentle `astern`, the rudder biting harder with speed, the slide dying away), `stepBoat()` (cut into steps a 30th of a second at most; the hull three circles, `circles()`, pushed out of the banks, the world's ends, `WATER_SOLIDS` and every other boat, losing the speed it had into them; nothing is damaged), `WATER_SOLIDS` (everything standing in the water, the landings, and the bridges' spans too low for its top, `lowSpans()`: the ring highway's all the way across, so it keeps between them), `moversAt()` (the river's own boats, the river bus, the tall ship), `leaveAt()` (stopped alongside a landing, or at its mooring). New handling goes in the sim first.
- `boat.ts` is the view, its own chunk loaded the first time you take it (`loadBoat()` in walk.ts): the model (`hireBoat()` in riverlife3d.ts, which draws the moored one while `HIRE_VIEW.out` is false) with Degen at the wheel (seated, his hands on the wheel through `reachArm()`, as the kart's driver), the bow lifting with speed, a lean in the turns, a wake; near and far chase cameras (look round, they settle back) and the helm camera (V, R3; views.ts); the car's readout (`data-drive-hud`: km/h and F / N / R) and engine, the boats' horn (H, the touch Horn button, the left stick pressed); the lane boats come from life.ts's `bodies.boats`. It sets `is-boating` on top of `is-driving` (the car's touch layout; its own key hint `.boat-hint`) and `data-boat` (the header reads "Boating · Hire boat"). Get out shows when it lies stopped alongside a landing (Degen at the top of its gangway, facing the river) or at the mooring; the boat goes home, as it does when walk mode ends on the water.

## Where your car and bike live now (docs/home-plan.md Phase 2)

- Your car's and bike's home is **Degen's compound in the Ends' far west**
  (home.ts, docs/ends-far-west-plan.md Phase 2: both in his double garage,
  a door each, noses out: `CAR_HOME`, `BIKE_HOME`; until that phase it was
  the end house of a terrace, the bike on its driveway), not the city
  garage's turntable and stand as the sections
  above say. The city garage is a showroom: garage.ts moves the same car
  and bike onto its turntable and stand while its menu is open
  (`garage.at('city')`) and home again when it closes. "Bring my car home"
  (the menu's Keep, a reload) sends them to the Ends. The garage menu opens
  at both garages' doors, and at his workshop's roller door on its Kit tab
  (`HOME_WORKSHOP_DOOR`, `garageUI.show('kit')`).
