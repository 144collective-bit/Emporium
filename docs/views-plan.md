# The views and controls plan

The owner's call (2026-11): "optimize the controls to be easier to use. I
want the ability to switch views in all walk modes in the vehicles. I also
think we could optimize the general control system to be more accessible
and simple to use." Built one phase at a time, each with the owner's
sign-off. Keep this file up to date. It follows `docs/controls-plan.md`
(the touch buttons' look and slots), which it doesn't change.

## Where it starts

- **The views today**, each vehicle its own set, V on a keyboard, View on
  a gamepad, the touch View button (`[data-drive-view]`) at the wheel:
  - your car: chase, roof, the driver's seat (only once the fine-detail
    chunk has fitted it out, `car.eye()`); `drive.ts` `view` 0-2;
  - your motorbike: chase, helmet; your own kart driven round the city:
    chase, roof (`drive.ts`);
  - the hire boat: chase, helm (`boat.ts` `helm`);
  - your aircraft: chase, nose (`fly.ts` `noseCam`);
  - a kart race: the chase camera only, no View (`kart.ts`; hidden in
    karts.css);
  - rides (the taxi, the metro, the river bus, the monorail) and the
    Fight Club's ring: their own camera, no switching;
  - on foot: over the shoulder or first person, V or the right stick
    pressed; on touch only a checkbox in the hub's Settings
    (`[data-walk-fp]`).
- **The keys drift from mode to mode**: the gamepad's View opens the
  inventory on foot but swaps the camera in a vehicle, and on foot the
  camera is the right stick pressed; on a keyboard the ring blocks with
  Shift and kicks with right-click or G, while fists on the street block
  with right-click held and kick with G (Shift sprints there).
- Sprint, aim, crouch and block each have their own fixed hold or toggle
  (Shift held, Caps Lock locks walking and the touch Sprint locks the
  sprint; right-click held aims; C toggles crouch; block is held).

## The owner's picks

- **Every vehicle the same three views**, stepped through by the one
  camera control: **near** (a close chase camera, the one you get in
  with: third person), **far** (a chase camera further back) and **first
  person** (the driver's seat, the helmet, the kart's seat, the helm, the
  cockpit), then back to near.
- **Views everywhere**: in kart races, on rides (the taxi, the metro, the
  river bus, the monorail), in the Fight Club's ring, and a touch View
  button on foot (first or third person).
- **Not remembered**: every time you get in (or start a ride, a race, a
  fight) it starts in the same view, as today.
- **One key for one job** in every mode, with a small control card for
  each mode on screen. No Simple mode and no remapping for now.
- **The gamepad's camera is the right stick pressed (R3) everywhere**: on
  foot, in every vehicle, on rides and in the ring. View stays the
  inventory on foot.
- **The ring takes the street's keys**: click punch, right-click held
  block, G kick, Space dodge (Shift does nothing in the ring). The
  gamepad's were already the same (X punch, Y kick, LB held block, A
  dodge).
- **The control card**: shown for a few seconds the first time you enter
  each mode, then on request (a key, and the hub's Settings).
- **Comfort: hold or toggle** for sprint, aim, crouch and block, each its
  own setting.
- **Then (the owner's answers to the follow-up questions):** every
  vehicle starts in third person (near); on foot keeps over the shoulder
  (near) and first person; the ring near and far only; on rides you look
  round freely; the gamepad's View at the wheel opens the world map; the
  control card's key is `/` (or `?`) and the d-pad's down; on foot on
  touch, View is a small button up top (as the ring's Snack and Quit);
  hold or toggle changes the touch buttons too.

## Phases

### Phase 1: one camera system in your vehicles

- `views.ts` (DOM-free, tested in `tests/views.test.ts`): the three views
  (`ViewId`: `far`, `near`, `first`), `nextView()`, each vehicle's numbers
  for its far and near chase (distance, height, the field of view) and
  what its first person is called (Seat, Helmet, Helm, Cockpit), so the
  vehicles read one table instead of their own.
- The car, the bike, your own kart, the boat and the aircraft step
  through near, far and first person with V, R3 and the touch View
  button. The car's roof camera goes: until the fine-detail chunk has
  fitted your car out, its first person is a stand-in.
- A small toast names the view as it changes ("Near", "Helmet").
- The gamepad's View button opens the world map at the wheel (it was the
  camera).
- Checked on a keyboard, a gamepad and touch, upright and on its side.
- **Built, waiting on the owner's sign-off.** `views.ts` (DOM-free, tested
  in `tests/views.test.ts`): `ViewId`, `VIEW_ORDER` (near, far, first),
  `START_VIEW` (near), `nextView()`, `CHASE` (each kind's near chase, the
  one it had before to the number, the test holds it; far about twice as
  far back and looking down more), `chaseDistance()`, `FIRST_NAME` /
  `viewName()`. drive.ts (the car, the bike, your kart), boat.ts and
  fly.ts read it, start near on every way in and return the view from
  `toggleView()`; walk.ts's `nextCam()` (V, the touch View button, the
  right stick pressed at the wheel) toasts "Camera · <view>". The gamepad's
  View at the wheel toggles the world map (`travel.toggle()`, walk deps
  `worldMap` / `mapOpen`); while it's open the vehicle coasts and the pad
  hears only View. The car's first person until it's fitted out is the
  roof camera as before (a camera at his eyes inside the plain body would
  look through its unlit insides); the kart's is the seat (the old roof
  numbers, at his head). **Found on the way:** the boat's chase camera
  always sat at its 0.35 minimum, right behind the console: its pivot is
  under street level over the lowered water, and the rolls' check
  (`rollsAlong()`) reads anything under street level as under the ground.
  `cameraRoom()` in walk.ts now skips the hills' and rolls' checks from
  down in the river's channel (`inChannel()`), as it does in Lot 9's
  tunnel; the boat's near and far now stand back as meant. Checked in a
  headless browser on the car (near on the forecourt, Far, the driver's
  seat) and the boat out on the water (near, far, helm); the gamepad and
  touch paths share `nextCam()` with V. The boot's code came to 698.9 of
  its 700 KB.

### Phase 2: views in races, rides and the ring, and on foot

- A kart race: far, near and the kart's seat (Degen's head hidden, the
  wheel in front); the View button comes back in the race's touch layout
  (the `kart` layout's free slot).
- Rides: the taxi (far, near, the back seat), the metro and the monorail
  (far, near, a window seat), the river bus (far, near, the deck); a View
  button in each ride's bar, V and R3. Skip ride and Esc as before.
- The ring: far, near and first person behind your guard; a View
  button in the ring's touch layout.
- On foot on touch: a View button (first or third person, the same as V),
  in a slot that `clash()` keeps clear of the hotbar and the prompt.
- `touchlayout.ts` and its test take the new buttons.
- **Built, waiting on the owner's sign-off.** views.ts grew the rest:
  `RING_ORDER` (near, far) and `nextView(v, order)`; `RACE_FAR` (kart.ts:
  the near distance times 1.9, looking down more) and `RING_FAR` (fight.ts:
  twice as far back, higher, over the right shoulder; held just outside the
  Fight Club's ropes, still under its shed's roof, or a little further out
  of a street spar's ring); the rides' `RIDE_CAM` (the view and where you
  look, `startRide()` from walk.ts's `setRide()`, `rideLook()` from the
  mouse, a drag or the right stick, held within `RIDE_LOOK` and left where
  you leave it), `RIDE_FAR`, `RIDE_FIRST` (Back seat, Window seat, Window
  seat, Deck) and `rideView()`: each ride's own camera is near, far stands
  its offset further out and higher, both orbit the vehicle as you look
  round, and first person stands at the passenger's eye looking ahead
  turned as you look, placed at once. The rides read it (taxi.ts: the back
  seat on the passenger's side of the rear bench, `INTERIORS.sedan`;
  metro-ui.ts and monorail-ui.ts: a window seat in the front car; riverbus-ui.ts:
  standing at the stern's rail); `Ride.kind` names them. kart.ts and
  fight.ts have `toggleView()` (the race's seat at his eyes over
  `seatAt`, the near plane in close for the wheel); every race, fight and
  ride starts near. walk.ts's `nextCam()` takes them all, and on foot
  (over the shoulder or first person, "Camera · First person"): V in every
  mode, R3 on rides, in the ring and the race, the View button in the
  kart and ring layouts' `a3` (touchlayout.ts; the ring family's
  arrangement gains the slot), a View button in each ride's bar
  (`[data-ride-view]`, shown while riding) and on foot up top on the right
  (`[data-walk-view]`, a small `.tc`, lit in first person; the waypoint's
  compass steps down under it on touch). Checked in a headless browser: the
  river bus from Downtown (near, far, the deck, looking round with a drag)
  and the View button on an iPhone-sized screen (placed, lit, toasting).
  The taxi, the metro, the monorail, the kart race and the ring share the
  same code but weren't driven to in the headless run; worth a look on a
  real device. The boot's code came to 699.8 of its 700 KB.

### Phase 3: one key for one job

- `keymap.ts` (DOM-free, tested in `tests/keymap.test.ts`): every mode's
  jobs (`Job`) with their key, gamepad button and touch button, the
  one table walk.ts, the hub's Settings > Keys and the control card read.
  The test holds each job on the same key and button in every mode it's
  in (get in and out, the camera, the horn, the main and second actions,
  the menu), and no two jobs on one key in a mode.
- The ring takes the street's keys (above).
- The gamepad's camera is R3 in every mode.
- The hub's Settings > Keys made from `keymap.ts`, a section for each mode.
- **Built, waiting on the owner's sign-off.** `keymap.ts` (DOM-free, tested
  in `tests/keymap.test.ts`): `KEYMAP`, ten modes (on foot, empty hands and
  a gun out on top of it, the car, the bike, the boat, the aircraft, a
  kart race, the ring, a ride), each job (`Job`) with its keys, gamepad
  buttons and touch button; `bindsOf()`. The test holds a job's main key
  and button the same in every mode it's in, the camera V / R3 / View
  everywhere, F / Y for getting in and out and doors, H / L3 the horn,
  a way out of every mode, the ring's fists the street's, and no two jobs
  on one key or button in a mode unless one `shares` it by context (with
  empty hands Y kicks when there's no prompt, Space dodges with the guard
  up; aiming, LB / RB peek over the hotbar's RB). It stays out of the
  boot: the hub's Settings > Keys is made from it when the site is built
  (CityMap.astro: a section a mode, the on-foot one open; each row shows
  only the input in use, the hub's `data-input`, and a row with nothing on
  it is left out). walk.ts's handlers keep their own code; the changes to
  make them match: the ring blocks with right-click held (it kicked) and
  Shift does nothing there; the gamepad's sprint is L3 only (LB is the
  block and the peek); Start quits a kart race (Y did, which is getting
  in and out everywhere else); B skips a ride; M opens the world map at
  the wheel as on foot. The ring's and the race's hints name V for the
  camera. Checked in a headless browser: Settings > Keys on a keyboard,
  a gamepad and touch, at 1024 and 375 wide. The boot's code stayed at
  699.8 of its 700 KB.

### Phase 4: the control card

- A small card in the kit for each mode (on foot, armed, fists, the car,
  the bike, the boat, the aircraft, the kart race, the ring, rides): its
  jobs and their keys, buttons or touch buttons for the input in use
  (`menukit.ts`'s hints by input), from `keymap.ts`.
- Shown for a few seconds the first time you enter each mode (the modes
  seen kept in `degen-city-walk-v1`), clear of the HUD; again on request
  (a key, and the hub's Settings); Esc or × closes it.
- In `chrome`, so the pins fold under it.
- **Built, waiting on the owner's sign-off.** The card is `[data-ctrlcard]`
  (CityMap.astro, styles in controls.css), filled by `ctrlcard.ts` (its own
  chunk: the key table never comes with the boot) from keymap.ts's
  `cardBinds()` (a mode's own jobs; for empty hands and a gun out, then on
  foot's main ones; the walk toggle and the emotes left out; held to 14
  rows by the test). walk.ts knows the mode (`modeNow()`: a ride, the
  ring, a kart race, the boat, the aircraft, the car or the bike, a gun
  out, empty hands, or on foot with something in hand) and the input in
  use (the last key, gamepad button or stick, or touch), and the first
  time it meets a mode, with no menu open, it shows that mode's card for
  `CARD_AUTO` (9 s), keeping the modes seen in `degen-city-walk-v1`
  (`seen`). Asked for (`/` or `?`, the d-pad's down, the hub's Settings >
  Keys > Show the controls card) it stays, follows you into the next mode
  and repaints for the input you switch to, until `/`, the d-pad's down
  again, Esc (first in walk mode's Esc chain) or its × closes it. Its last
  line says how to bring it back on that input. On a desktop it sits top
  right under the header, below the waypoint's compass; on phones centred
  under the header, below the toasts and clear of the View button, short
  enough to stay off the door prompt (it scrolls). Hidden while the hub,
  the inventory, a shop or a panel is open; in `chrome`. Checked in a
  headless browser: the first walk-in (Empty hands) at 1024 wide and on an
  iPhone-sized screen, the car's card on getting in, `/` and Esc. The boot's
  code came to 700.5 KB, over its 700: the budget went up to 710 under the
  owner's standing call to raise it when needed.

### Phase 5: hold or toggle

- In the hub's Settings, under the walk controls: Sprint, Aim, Crouch and
  Block, each Hold or Toggle (saved in `degen-city-walk-v1`, cleaned like
  its other settings), for the keyboard, the gamepad and touch alike. A
  toggle that's on shows lit (the touch buttons' `aria-pressed`).
- Today's behaviours are the defaults, so nothing changes for anyone who
  doesn't pick.
- **Built, waiting on the owner's sign-off; with it the plan is done.**
  `comfort.ts` (DOM-free, tested in `tests/comfort.test.ts`): `HoldJob`
  (sprint, aim, crouch, block), `Holds` (what was picked; a job left out
  works as before, `DEFAULTS`: Sprint and Aim lock on touch and are held on
  the keyboard and gamepad, Crouch toggles, Block is held), `holdMode()`,
  `press()` and `cleanHolds()`. The hub's Settings > Hold or toggle has a
  Hold / Toggle pair for each (`[data-hold]`), lit as it works on this
  device; a pick is kept in `degen-city-walk-v1` (`holds`) and works the
  same on every input, and changing one lets go of whatever was held or on.
  walk.ts asks at every press: Shift and L3 (sprint), right-click and LT
  (aim; aiming on a toggle, LB / RB peek while the sight is up), C and B
  (crouch: on hold he crouches while it's held and stands when it's let
  go, a slide ending in a crouch too), right-click and LB (block, on the
  street and in the ring), and the touch Sprint, Aim, Crouch and Block
  buttons (`holdButton()`: pressed and let go, lit while on). The control
  card's and Settings > Keys' words lost their "(hold)" and "(toggle)".
  Checked in a headless browser: the settings (picked, saved, lit), C held
  and let go with Crouch on Hold, Shift twice with Sprint on Toggle, and on
  an iPhone-sized screen the touch Sprint as it was (locks) and on Hold,
  Block on Toggle, Crouch as it was. The boot's code came to 701.1 KB.

## Not in it

- Remembering the view, Simple mode, remapping keys, a calmer camera,
  gamepad tuning and a text-size setting (asked, not picked this time).
- The touch buttons' look and slots (the controls plan's), but for the
  new View buttons.

## After the plan: the cameras closer (the owner's call, 2026-11)

- Walking: the over-the-shoulder camera starts 1.7 tiles behind Degen (1.6 on an upright screen), about a third
  in from 2.6 / 2.5 (`WALK_ZOOM` in views.ts). The mouse wheel still sets it after.
- Driving: the car's, the bike's and the kart's near chase is `NEAR_ROAD`, about a quarter in from what it was
  (base 2.7 from 3.6, 0.71 a length from 0.95, 0.06 a unit of speed from 0.1), looking down at 0.22 from 0.26. A
  kart race's near is `RACE_NEAR` (2.5 back from 3.3); its far (`RACE_FAR.scale` 2.5 from 1.9) stays as far back.
- Far, first person, the boat's and the aircraft's cameras are unchanged.
