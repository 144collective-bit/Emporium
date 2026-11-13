# Menus, header and controls: closing, pins, the start menu, the header, the menu kit, touch controls, views and keys

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- Every card and menu can be closed: panels, the gun store and the buy
  dialog have an × (`.city-panel-close` / `.shop-close`); the hub
  (`.mk-x`) and the emotes' pop (its `.pop-head` ×) also close on a tap
  outside and on Esc. The welcome card is a one-line
  first-visit tip under the header (`.city-card` in `.city-hud`: GM, "Welcome
  to Sector 7" (the page's h1), how to move, the draft note, an ×). It's
  closed for good with its × (remembered as `city-card` in localStorage) and
  isn't shown on phones; when it's hidden the "Draft · v0" tag in the
  bottom-right corner keeps the draft note.
- **The pins are off by default** (the owner's call, 2026-11): no place
  names or dots float over the 3D city in the City view or walk mode;
  places are found on the world map and the hub's Map tab, and a building
  is still clicked in the City view (no hover lift or glow ring any more:
  each spot's `ring` is taken out of the scene at the boot). The hub's
  Settings > Labels turns them back on (`[data-labels]`, `has-pins` on the
  root, `degen-city-labels-v1`: a screen preference, never in the backup);
  off, nothing is placed each frame. On, 3D pin labels stay on screen and
  fold to dots where they'd sit under the city's own buttons and cards
  (`chrome` in `index.ts`); add any new always-visible city overlay to
  that list. The pins' markup stays (walk mode's door prompts read a
  place's name from it).
- **The start menu** (the owner's call): on every open, `[data-start]` in
  `CityMap.astro` (styles `src/styles/start.css`) covers the whole page
  while the 3D city boots behind it. It's the game's title screen (the
  owner's call: The Trenches' logo over a dark brick wall, the box in the
  menus' arcade kit, its tokens shared from menus.css): first **the log-in
  screen** (`[data-start-login]`: player name or email, password, Log in,
  Play as guest, Create an account). Logging in isn't built yet: the form
  sends and keeps nothing (the password is cleared) and says accounts are
  coming soon; Play as guest goes on to the menu, whose "Playing as guest ·
  Log in" goes back. A phone's keyboard stays down until a field is tapped.
  Single player enters the city (the fly-in runs again, `city.intro()` in
  `index.ts`); every visit opens at Day and Clear (the owner's call: Live
  and Auto, or any other time or weather, are the visitor's to pick, for
  that visit only); Multiplayer says "Coming soon" without `PUBLIC_GAME_SERVER`
  and flips the Online switch on and enters with one; Options holds Time,
  Weather and Sound, driving the header's own
  settings controls (pressed when the city is up, queued until then). The
  root carries `has-start` until a choice is made; the loader and the
  welcome tip wait behind it.
- The city page has **one header**: the city's own (`.city-head` in
  `CityMap.astro`, copy in `head.ts`), clear over the game since the
  controls plan's Phase 5 (the owner's call: no bar, no logo, on every
  screen; the title with a shadow under it, each button its own dark chip,
  touches between them going through to the game). The site bar
  (`Nav.astro`) is left out there (`<Base nav={false}>`) and stays on the
  other pages. Walk mode carries the same header as the City view (the
  owner's call, after Phase 5 had it down to ☰ in play), so City / Walk
  switches between the two from either. Left to right: the mode title and
  subtitle (City view, Walk mode), then on the
  right (the emotes, online, and ammo and score while walking), the City /
  Walk switch (the current mode lit with a glow and a gradient underline,
  the other dimmed), and the tools: in the 3D city (not while walking on
  phones) the Dorras readout (`[data-dorras]`, painted by `tycoon-ui.ts`, a
  green dot when the stall's till has takings; it opens the hub on
  Business) and the level pill (`[data-level]`, `missions-ui.ts`: level,
  XP bar, title; it opens the hub on Missions), then the hub's button
  (`[data-hub-open]`, ☰ Menu, in both modes: the hub, below). Tablets show
  the hub's button as an icon; upright phones show one slim row in both
  modes (the controls plan's Phase 3: the title and subtitle, Dorras, the
  level, City / Walk as one toggle showing the mode you'd go to, ☰; no
  Online switch or Connect wallet: the hub has them), and no phone
  carries ammo, score or the emotes in it. Its live height is
  `--head-h`; anything pinned to the top of the city sits below it
  (`top: calc(var(--head-h) + 12px)`).
- **The menu redesign** (the owner's call: "redesign all menus and upgrade
  their quality and functions", then "no PulseChain colours, make a new
  design completely") is planned in `docs/menu-plan.md`: every menu in the
  city (start menu, header, hub, place panels, shops, business screens,
  fitting room, cards and pops) in a new **retro arcade** design
  (pixel-edged panels, pixel headings, scanlines, blocky buttons that press
  down, a blinking selector) on a new palette with no PulseChain colours
  (the plan's arcade-cabinet palette); one hub menu replacing the old ☰ Menu, Settings and the
  walk tabs (Esc, the header's hub button, Start); phone-first sheets; full
  controller and keyboard use; motion but no UI sounds; the design system
  first (`menus.css`, `menukit.ts`, shown on the gun store), then rolled
  out. The 3D city and the comic page keep their look. Phase 1 is built,
  waiting on the owner's sign-off: `menus.css` (in `armoury.css`'s old
  place in `Base.astro`'s order; the pixel face Pixelify Sans), `menukit.ts`
  (`menuKit(el, { close })`: tabs, the d-pad and arrows, the grabber, the
  hints by input), `menunav.ts` (DOM-free, tested in
  `tests/menunav.test.ts`) and the gun store rebuilt in them (`.mk` in
  `CityMap.astro`, `gunshop.ts`). Phase 2 is built, waiting on the owner's
  sign-off: **the hub** (`hub.ts`, markup `[data-hub]` in `CityMap.astro`,
  styles `.mk-hub` in `menus.css`), the pause screen: tabs Map (World map,
  every place, More's comic and store, PulseChain native, X and Telegram),
  Bag (opens the inventory; what you carry is Business's Bag), Business
  (the business card `[data-biz]`, moved in), Missions (level and badges),
  Profile (look, finish, wardrobe, wallet), Settings (`[data-controls]`:
  time, sky, sound, reset view; the walk controls; keys; credits) and Online
  with a game server (`[data-mp]` is its tab). The page makes it (its own
  chunk, `hubReady`), so it works before 3D and where 3D can't run (Map
  only, `.hub-3d` off); `bootCity(root, wallet, hub)` fills in its hooks.
  It opens from its button, Esc (after whatever else Esc closes; walking,
  after the mouse is freed), Start walking (walk.ts; the fight keeps
  Start) and the pills; walking it pauses the walk (`walk.pause()`, the
  keys and the gamepad are its: `hub.pad()`), its foot's Back to City view
  (`[data-hub-leave]`) leaves walk mode; what opens a screen of its own
  from it closes it first; a place's panel closes it and it closes one.
  `data-hub-walk` / `data-hub-city` show by mode. Phase 3 is built, waiting
  on the owner's sign-off: **the skin** (`.mk-skin` on a menu's root, at the
  end of `menus.css`): the shops and game menus that keep their own markup
  (the garage, the hangar, the kart hut, the trainer, their result cards and
  HUDs, the metro, river bus and taxi cards and bars, the business card)
  take the kit's look by having the brand's tokens redefined inside them;
  give a new panel of that kind the class too. The kart hut and the trainer
  step their tabs with Q / E and LB / RB (`stepTab()`). Phase 4 is built,
  waiting on the owner's sign-off: the place panel, the header and the City
  view's cards wear the skin too; each place's template carries its marquee
  line (`data-marquee`: made-up, fixed copy; a new place needs one), which
  `open()` puts under its name; under that, since the polish plan's Phase 7,
  the **live line** (`livelines.ts`, DOM-free, tested in
  `tests/livelines.test.ts`, a chunk of its own fetched the first time a
  panel opens: `liveLine(id, t)`, one short line from the visitor's clock
  and the place's own timetable for every coming-soon place, `LIVE_IDS`:
  the stadium's next fixture, the club's set, the bar's happy hour, the
  mall's hours, the fountain show's and the volcano's countdowns, the
  Pier House's next river bus, Liberty's next lift, the Night Market after
  dusk, the Harbour Master's tide, Crestmont's and Sunridge's hours;
  made-up, never a price; `open()` puts it in `[data-live-line]` and
  repaints it every half minute while the panel is open). A new coming-soon
  place gets its line there. Phase 5 is built, waiting on the owner's
  sign-off: inside the skin the business views' goods and contracts are
  cards and their steps clear buttons (`.market-row`, `.market-btns`: the
  first step coin). Phase 6 is built, waiting on the owner's sign-off: the
  fitting room, the character screen, the inventory, the world map's frame
  and the walk HUD's prompt, hints, toasts, pops, tracker, compass and
  hotbar wear the skin; the touch controls keep their round look. Phase 7
  (checked at every width, sideways, at night and under reduced motion; the
  old menus' styles gone) is built, and the plan is done. Menu copy is short (the owner's call: "imagine the user has ADHD"): labels 1-3 words, a hint only where a label is unclear (about six words), any other line about eight words, a place's panel one line, the money note ("Dorras are game money only") on the start screen only; a new menu keeps to it (docs/menu-plan.md, "After the plan"). One phase at a time with the owner's sign-off; keep it up
  to date.
- **The controls plan** (the owner's call: "upgrade the header and
  controls buttons on phone", in the menus' design) is planned in
  `docs/controls-plan.md`: every touch control in the arcade kit (round
  buttons recoloured, a pixel icon and a word, the main action coin-yellow
  and Jump green, the rest quiet; brighter while held, lit while on), the
  same slots in an arc round the thumb in every mode (`touchlayout.ts`),
  the header one slim row on phones, then size, opacity, left-handed and
  moving the buttons. One phase at a time with the owner's sign-off; keep
  it up to date. Phase 1 (the button system, on foot) is built, waiting on
  the owner's sign-off: `touchlayout.ts` (DOM-free, tested in
  `tests/touchlayout.test.ts`: the slots by screen shape, `LAYOUTS` per
  mode, the hotbar and the prompt kept clear), `controls.ts` (sets
  `--tc-*` / `--hb-*` / `--pr-*` from it), `controls.css` (last in
  `Base.astro`'s order; `.tc`, `.tc-main`, `.tc-go`), the icons
  `src/data/tcicons.ts` as one sprite in CityMap.astro. Phase 2 (vehicles,
  the ring and the prompts) is built, waiting on the owner's sign-off:
  `layoutFor()` for every `Mode` (on foot, `drive`, `kart`, `ring`, read
  off the root's classes), the pedals as `.tc` buttons, a touch View
  button (`[data-drive-view]`), the readouts in the kit, the prompt's tap
  icon. Phase 3 (the slim header) is built, waiting on the owner's
  sign-off: on phones (upright to 640 wide, on their side to 500 high) the
  ammo is on the hotbar's gun (`.hb-res`), the score in the hub, the emotes
  in the hub's Online tab (hub.ts `PHONE`); upright the header is one row
  (controls.css). Phase 4 (size, opacity, left-handed) is built, waiting
  on the owner's sign-off: `TouchPrefs` (`cleanTouch()`, `touch` in
  `degen-city-walk-v1`) from the hub's Settings (Touch buttons, touch
  screens only); `layoutFor(w, h, mode, prefs)` scales the ring, steps a
  size that doesn't fit back towards Medium until `clash()` finds nothing,
  and mirrors it for the left hand (the stick on the right); `--tc-alpha`
  is the opacity, solid while held. A new touch button is a `.tc` with its
  icon and word, and its slot in `LAYOUTS`; anything new pinned near the
  buttons goes in `clash()`. Phase 5 (the clear header and the installed
  game) is built, waiting on the owner's sign-off: the header clear and
  without its logo on every screen (walk mode's the City view's, above, the
  owner's later call); installed (added
  to the home screen) the game opens full screen with no browser bars
  (`public/site.webmanifest`: `display` fullscreen, standalone on iPhones,
  whose status bar stays, black; the meta tags in `Base.astro`). Phase 6
  (moving the buttons) is built, waiting on the owner's sign-off: Settings >
  Touch buttons > Arrange buttons opens `arrange-ui.ts` (its own chunk; tabs
  On foot / Vehicles / The ring, drag, Reset, Done, ×); a moved item's
  centre is kept in `TouchPrefs.arrange` per family and shape
  (`arrangeKey()`, shares of the screen in the right hand's frame),
  `layoutFor()` falls back to the slots where it clashes, and `moveItem()`
  holds a drag clear through the same `clash()`.
- **City view's free camera** (the owner's call, 2026-11: "the camera
  free, fly round with WASD; near the wall"; always on, true free fly,
  up to the wall's inner face): `freecam.ts` (DOM-free, tested in
  `tests/freecam.test.ts`): `keyDir()` (by `e.code`: WASD and the arrows
  fly, W along the look, up or down with it, A and D level and square to
  it; E or Space up, Q or C down; Shift faster: `FLY.fast`), `wish()`
  (the speed grows with height: `speedAt()`), `easeVel()` (eased in and
  out, at once under reduced motion), `turn()` (mouse look, the pitch
  held in `FLY.pitch`; `POLAR` is the same range for MapControls),
  `clampCam()` (inside `PAN_BOUNDS`, the wall's inner face `PAN_PAD` in,
  over `groundUnder()` by `FLY.floor`, under `ceilingAt()`: the wall's top
  near it, `FLY.ceiling` away from it) and `reach()` (the orbit's pivot
  kept inside the wall along the look). index.ts reads the keys on the
  document only in City view with nothing over it (`flyable()`: no panel,
  hub, map, start menu or account card, not walking; never while typing,
  never with Ctrl, Alt or Meta, Space left to a focused button), moves the
  camera and its target together (`flyStep()`, in the frame loop before
  `controls.update()`), and clamps the camera after orbiting and zooming
  too. The right mouse button looks round where the camera stands (its
  pivot kept as far ahead); MapControls' right-drag orbit is off
  (`mouseButtons.RIGHT = null`), Ctrl or Shift with the left still
  orbits, the left pans, the wheel zooms (to `FLY.pivot` close). A key
  pressed during a fly-in to a place takes the camera back. Touch keeps
  its drag and pinch. The hub's Settings > Controls has a City view list
  (`FLY_KEYS` in keymap.ts, keys and mouse only, hidden on a gamepad or
  touch: `.km-city`), the header's hint on a desktop reads "WASD to fly"
  (head.ts), and `?fps` shows `camera x, y, z` in City view.
  **It bumps into the city** (the owner's call, 2026-11: what walk mode's
  camera bumps into, sliding along the faces, every move):
  `freecollide.ts` (DOM-free, tested in `tests/freecollide.test.ts`):
  `sweep()` moves a direction at a time (x, z, then y) against the boxes
  grown by `CAM_R` (0.6), stopping at the first face whatever the move's
  length (nothing tunnels), flying under boxes with a bottom (`b[5]`: the
  highway's deck, the airport's departures deck, Endswood's galleries),
  and letting a camera already inside a box out of it; `bump()` takes
  them from `CAMERA_GRID` (solids.ts, with every district's solids as its
  chunk joins them). It's its own chunk, loaded by `lazy()` once the city
  is up (`camSolids` in index.ts; the boot never carries the solids):
  until it comes the camera flies through. index.ts sweeps WASD's move
  in `flyStep()`, and every other move (orbit, zoom, the drag, touch, the
  damping) from where the camera was before `controls.update()`; a move
  that shifted the target too (the drag, the zoom to the cursor) is held
  back with the camera. Fly-ins to places aren't swept.
- **The views and controls plan** (the owner's call: "switch views in all
  walk modes in the vehicles", the controls simpler and more accessible)
  is planned in `docs/views-plan.md`: near, far and first person in every
  vehicle, ride, race and the ring (not remembered: near, third person,
  every time; the ring near and far only; rides look round freely), a
  touch View button up top on foot, one key for one job (`keymap.ts`; the
  gamepad's camera R3 everywhere, the ring on the street's keys), a
  control card per mode (`/`, the d-pad's down), hold or toggle for
  sprint, aim, crouch and block (touch too). One phase at a time with the
  owner's sign-off; keep it up to date. Phase 1 (your vehicles) is built,
  waiting on the owner's sign-off: `views.ts` (DOM-free, tested in
  `tests/views.test.ts`: `VIEW_ORDER` near, far, first; `START_VIEW`;
  `CHASE`, each kind's near the chase camera it had, far further back;
  `chaseDistance()`, `viewName()`), read by drive.ts, boat.ts and fly.ts;
  walk.ts's `nextCam()` (V, the touch View button, R3 at the wheel) with a
  "Camera · <view>" toast; the gamepad's View at the wheel toggles the
  world map (`travel.toggle()`, the vehicle coasting while it's open).
  `cameraRoom()` skips the hills' and rolls' checks from down in the
  river's channel (they read under street level as underground: the
  boat's chase camera had sat at its minimum). Phase 2 (races, rides, the
  ring, on foot) is built, waiting on the owner's sign-off: views.ts's
  `RING_ORDER`, `RACE_FAR`, `RING_FAR` (kart.ts and fight.ts
  `toggleView()`), and the rides' `RIDE_CAM` / `startRide()` /
  `rideLook()` / `rideView()` (each ride's own camera near, far further
  out, first person at the passenger's eye: `RIDE_FIRST`; free looking),
  read by taxi.ts, metro-ui.ts, monorail-ui.ts and riverbus-ui.ts
  (`Ride.kind`); `nextCam()` in walk.ts for every mode and on foot; the
  View button in the kart and ring layouts' `a3`, in each ride's bar
  (`[data-ride-view]`) and on foot up top (`[data-walk-view]`). Phase 3
  (one key for one job) is built, waiting on the owner's sign-off:
  `keymap.ts` (DOM-free, tested in `tests/keymap.test.ts`, out of the
  boot: `KEYMAP`, every mode's jobs with their keys, gamepad buttons and
  touch buttons; a job on the same key and button in every mode it's in,
  no two jobs on one in a mode unless `shares` says so); the hub's
  Settings > Keys is made from it at build time (a section a mode, only
  the input in use shown, `data-input`); the ring on the street's keys
  (right-click held block, Shift nothing), the gamepad's sprint L3 only,
  Start quits a kart race, B skips a ride, M opens the world map at the
  wheel too. When a handler in walk.ts changes, change its line in
  keymap.ts. Phase 4 (the control card) is built, waiting on the
  owner's sign-off: `[data-ctrlcard]`, painted by `ctrlcard.ts` (its own
  chunk) from `cardBinds()` for walk.ts's `modeNow()` and the input in use,
  shown for `CARD_AUTO` the first time in each mode (`seen` in
  `degen-city-walk-v1`) and on request (`/` or `?`, the d-pad's down, the
  hub's Settings > Keys > Show the controls card; Esc, × or the key again
  closes it); in `chrome`. The boot's budget went to 710 with it. Phase 5
  (hold or toggle) is built, waiting on the owner's sign-off, and the plan
  is done: `comfort.ts` (DOM-free, tested in `tests/comfort.test.ts`:
  `Holds`, `DEFAULTS` (as it always was: Sprint and Aim lock on touch,
  held elsewhere; Crouch toggles; Block held), `holdMode()`, `press()`,
  `cleanHolds()`), the hub's Settings > Hold or toggle (`[data-hold]`,
  `holds` in `degen-city-walk-v1`), asked by walk.ts at every press of
  sprint, aim, crouch and block on every input (touch: `holdButton()`).
  A new held or toggled job goes in `HOLD_JOBS`.
