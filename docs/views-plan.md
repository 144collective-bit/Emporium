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

- **Every vehicle the same three views**, stepped through in this order
  by the one camera control: **far** (a chase camera further back),
  **near** (a close chase camera) and **first person** (the driver's seat,
  the helmet, the kart's seat, the helm, the cockpit).
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

## Phases

### Phase 1: one camera system in your vehicles

- `views.ts` (DOM-free, tested in `tests/views.test.ts`): the three views
  (`ViewId`: `far`, `near`, `first`), `nextView()`, each vehicle's numbers
  for its far and near chase (distance, height, the field of view) and
  what its first person is called (Seat, Helmet, Helm, Cockpit), so the
  vehicles read one table instead of their own.
- The car, the bike, your own kart, the boat and the aircraft step
  through far, near and first person with V, R3 and the touch View
  button. The car's roof camera goes: until the fine-detail chunk has
  fitted your car out, its first person is a stand-in at the driver's eye
  height (the roof camera's numbers, brought down to the seat).
- A small toast names the view as it changes ("Near", "Helmet").
- The gamepad's View button does nothing in a vehicle (it was the camera).
- Checked on a keyboard, a gamepad and touch, upright and on its side.

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

### Phase 3: one key for one job

- `keymap.ts` (DOM-free, tested in `tests/keymap.test.ts`): every mode's
  actions (`Action`) with their key, gamepad button and touch button, the
  one table walk.ts, the hub's Settings > Keys and the control card read.
  The test holds each job on the same key and button in every mode it's
  in (get in and out, the camera, the horn, the main and second actions,
  the menu), and no two jobs on one key in a mode.
- The ring takes the street's keys (above).
- The gamepad's camera is R3 in every mode.
- The hub's Settings > Keys made from `keymap.ts`, a section for each mode.

### Phase 4: the control card

- A small card in the kit for each mode (on foot, armed, fists, the car,
  the bike, the boat, the aircraft, the kart race, the ring, rides): its
  jobs and their keys, buttons or touch buttons for the input in use
  (`menukit.ts`'s hints by input), from `keymap.ts`.
- Shown for a few seconds the first time you enter each mode (the modes
  seen kept in `degen-city-walk-v1`), clear of the HUD; again on request
  (a key, and the hub's Settings); Esc or × closes it.
- In `chrome`, so the pins fold under it.

### Phase 5: hold or toggle

- In the hub's Settings, under the walk controls: Sprint, Aim, Crouch and
  Block, each Hold or Toggle (saved in `degen-city-walk-v1`, cleaned like
  its other settings), for the keyboard, the gamepad and touch alike. A
  toggle that's on shows lit (the touch buttons' `aria-pressed`).
- Today's behaviours are the defaults, so nothing changes for anyone who
  doesn't pick.

## Not in it

- Remembering the view, Simple mode, remapping keys, a calmer camera,
  gamepad tuning and a text-size setting (asked, not picked this time).
- The touch buttons' look and slots (the controls plan's), but for the
  new View buttons.
