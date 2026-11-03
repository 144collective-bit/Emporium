# The controls plan

The owner's call (2026-11): "upgrade the header and controls buttons on
phone. Make a better button system and match the new items to our new
design in the menus." The phone's (and tablet's) touch controls and header
in the menu plan's arcade kit (`docs/menu-plan.md`, the cabinet palette
`--m-*`, no PulseChain colours). Build it one phase at a time, each with
the owner's sign-off. Keep this file up to date.

## Where it starts

- The header already wears the kit (menu plan Phase 4), but an upright
  phone's City view gives it two rows: the logo, the title, Dorras, the
  level and ☰ on top, then a full-width City / Walk switch under them.
- The touch controls kept their old look in the menu plan (its Phase 6):
  round buttons in a dark fill with the PulseChain gradient's magenta and
  cyan rims and glows, words only (but Jump's arrow and Swap's icon).
- Every mode places its own buttons: their styles are spread over
  walk.css, fight.css, karts.css, garage.css, inventory.css and
  economy.css, each with its own `@media` blocks for phones upright, on
  their side and narrow. Fists put Punch, Kick and Block where Fire, Aim
  and Reload are; the car puts tall Gas and Brake pedals bottom right; the
  ring puts its four in other spots again. The same action moves about
  from mode to mode.

## The owner's picks

- **Shape: round, as today, recoloured** in the cabinet palette. No
  gradient rims, no magenta or cyan.
- **Labels: a pixel icon with a short word under it** (a fist and PUNCH,
  an arrow and JUMP, a running figure and SPRINT).
- **Colours: the main action stands out.** Dark buttons with a light
  rim; the main action (Fire, Punch, Gas) coin-yellow (`--m-coin`), Jump
  green (`--m-go`), everything else quiet.
- **Layout: an arc round the thumb.** One big main button in the corner,
  the others in an arc round it at an even distance; every mode fills the
  same slots, so a thumb learns them once.
- **The stick: today's ring and thumb, recoloured.**
- **Pressing: the button brightens while held**, nothing moves. Toggles
  that stay on (Sprint locked, Crouch, Aim) get a clear lit state.
  (Sinking, vibration and live rings round the buttons weren't picked.)
- **Scope: every touch control**: walking and fists, guns, every vehicle
  (car, bike, boat, aircraft, kart), the Fight Club's ring, Snack and
  Quit, and the door prompt.
- **The header on a phone: one slim row**, about 52 px: the mode title and
  subtitle, Dorras, the level pill and ☰, with City / Walk as one small
  toggle button. The logo is left out on phones (kept on tablets and
  desktops). Dorras stays while walking too.
- **Settings:** button size, opacity, left-handed (the layout mirrored)
  and moving the buttons.

## The button system

- **One kit for every touch button**, `controls.css` (last in
  `Base.astro`'s order, so it wins over the modes' older placements; the
  kit's tokens are on `.tc` and the stick too, in menus.css), class `.tc` on
  each button and `.tc-main` / `.tc-go` for the two coloured ones:
  - a round cap in `--m-bezel` with a 2 px `--m-edge` rim and a hard
    `--m-cab` ring outside it, so it reads over a bright street or the
    night;
  - its icon above its word: icons drawn on the kit's pixel grid (16 x 16,
    `currentColor`, crisp edges), one SVG sprite, `<use>` in each button;
    the word short (PUNCH, KICK, AIM), in JetBrains Mono bold (the kit's
    labels): Pixelify's small capital C reads as an O;
  - held (`:active`, `.is-held` from walk.ts where a pointer holds it):
    the cap lifts to `--m-edge`, the rim to `--m-text`; on `.tc-main` the
    coin brightens. Nothing moves, so reduced motion needs nothing more;
  - on (`aria-pressed="true"`): the rim and the icon in `--m-coin`, a
    small lit pip on the rim, and the cap stays lit;
  - off (disabled, out of ammo): `--m-dim`, no rim light.
- **The slots** are data: `touchlayout.ts` (DOM-free, tested in
  `tests/touchlayout.test.ts`): `SLOTS`, the main button's place in the
  corner and the arc's places round it (by angle and distance from the
  main one's middle), worked out for the screen's size and shape (upright,
  on its side, narrow), clear of the safe areas, the hotbar and the door
  prompt; `LAYOUTS`, which action takes which slot in each mode. The test
  holds every mode's buttons apart, on screen and inside the safe areas at
  320 x 568, 375 x 812, 390 x 844, 430 x 932, their sides and the tablets.
  The page sets each button's place as CSS variables from it
  (`--tc-x`, `--tc-y`, `--tc-r`), so one rule places them all and the
  six files' per-mode positions go.
- **The stick** keeps its ring and thumb in the palette: the ring
  `--m-edge` over a see-through `--m-cab`, the thumb `--m-text` with a
  coin rim while it's held.

## Phases

### Phase 1: the button system, on foot

- `controls.css`, the icons' sprite, `touchlayout.ts` and its test.
- Walking (the stick, Jump, Sprint, Crouch), fists (Punch, Block, Kick)
  and guns (Fire, Aim, Reload, Swap) on the arc: the main slot Punch with
  empty hands and Fire with a gun out, Jump beside it, the rest round
  them in the same slots both ways.
- The hotbar and the door prompt placed round the arc, never under it.
- Checked at the widths above, upright and on its side, by day and at
  night, under reduced motion.
- **Built, waiting on the owner's sign-off.** `touchlayout.ts` (`SLOTS`
  as `main`, the inner ring `a1`-`a3` at 0, 45 and 90 degrees and the
  outer `b1` / `b2` at 30 and 70, per shape `up` / `narrow` / `side` in
  `RINGS`; `LAYOUTS`: fists Punch, Jump, Block, Sprint, Kick; armed Fire,
  Jump, Reload, Sprint, Swap, Aim; Crouch over the stick; the hotbar over
  the arc upright and left of Jump on its side; the prompt over the hotbar,
  or in the gap between the stick and the arc on its side), held apart and
  on screen by `tests/touchlayout.test.ts` at fourteen screens.
  `controls.ts` (from walk.ts) sets the variables, again on a resize or a
  gun drawn or put away. `controls.css` is last in `Base.astro`'s order;
  the old placements in walk.css, fight.css (the fists) and inventory.css
  went. The icons are `src/data/tcicons.ts` (`TC_ICONS`, `tcIconPath()`),
  one sprite in CityMap.astro. Two changes from the plan: the buttons'
  words are in the kit's label face (JetBrains Mono bold, as the menus'
  small labels), since Pixelify's small capital C reads as an O; and the
  ring's four buttons wear the new look already (their places are still
  Phase 2's), Dodge in green with Jump's icon. The stick was recoloured
  everywhere, at the wheel too.

### Phase 2: vehicles, the ring and the prompts

- The car, bike, boat and aircraft on the same slots: the main slot Gas
  (Faster in the air), Brake (Slower) beside it, Horn and the camera round
  them; the kart's Drift over Brake. The pedals become round buttons, the
  main one big.
- The readouts (speed, gear, height, throttle) as small arcade panels at
  the top left, in the kit's pixel digits.
- The Fight Club's ring: Punch in the main slot, Kick, Block and Dodge in
  the arc, as on the street; Snack and Quit as small kit buttons up top.
- The door prompt ("Enter", "Get in", "Get out") as a kit button with its
  icon, over the arc.

### Phase 3: the slim header

- One row on an upright phone in both modes: the title and its subtitle
  (cut with an ellipsis), Dorras, the level pill, City / Walk as one
  toggle (its icon the mode you'd go to) and ☰; no logo on phones.
- What walking adds today (the emotes in multiplayer, ammo and score)
  moves off the header on phones: ammo and score beside the hotbar, the
  emotes into the hub's Online tab. (To be confirmed with the owner at
  this phase.)
- `--head-h` follows, so everything pinned under it moves up.

### Phase 4: size, opacity and left-handed

- In the hub's Settings, under the walk controls: Size (Small / Medium /
  Large, a scale on every `.tc` and the stick), Opacity (a slider, the
  buttons' see-through when not held) and Left-handed (`touchlayout.ts`
  mirrors the slots and the stick); saved in `degen-city-walk-v1` and
  cleaned like its other settings. The test holds every size, both hands,
  apart and on screen.

### Phase 5: moving the buttons

- "Arrange buttons" in Settings: a screen over the city with every button
  of a mode family (on foot, vehicles, the ring), dragged where you like,
  held clear of each other, the safe areas and the screen's edge (the same
  check as Phase 1's, `touchlayout.ts`), with Reset; saved per family and
  per screen shape (upright, on its side) in `degen-city-walk-v1`.

## Not in it

- Desktops: no touch controls there; the header's desktop layout stays.
- The 3D city's own look, and the round touch look elsewhere (none).
- UI sounds (the menu plan's: none), vibration, live rings round the
  buttons.
