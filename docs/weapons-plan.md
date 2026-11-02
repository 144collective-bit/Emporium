# The weapons plan

The owner's call (2026-11): improve the weapons. The owner picked **gun
feel** and **design quality**. Build it one phase at a time, each with the
owner's sign-off. Keep this file up to date.

What stays as it is: target practice only (the dummies and the drones;
nothing in the city attacks you, people and cars are never targets), the
rules in `combat-sim.ts` (DOM-free, seeded, 60 Hz, shared with the game
server), cartoon guns with no real-world names or markings, everything
free or for Dorras only.

## Where it stood

Seven guns (`WEAPONS`), the Armoury's mods, two weapon slots, hitscan from
the camera, bloom that opens with each shot, tracers, puffs, hit numbers,
a straight-up kick, the hip or the aim's cone switching at once, the
shotgun reloading all six shells in one go, moving costing nothing.

## Phase 1: gun feel (built)

`gunfeel.ts` (DOM-free, tested in `tests/gunfeel.test.ts`), read by the
rules, the server and the view:

- **Recoil patterns** (`RECOIL`, `recoilAt()`): every shot's kick, up and
  to the side, comes from its place in its string (the sim counts it,
  `SimPlayer.string`, and sends it with the shot, `n`; a pause of
  `STRING_GAP` past the gun's own time between shots starts a new one).
  The same pattern every time, so a spray can be learnt: the full-auto
  guns climb over their first shots, then sway (the rifle drifts right,
  the SMG flicks fast, the Belt Feeder climbs long and sways wide), the
  Tri-Tap steps up a burst at a time, the one-shot guns kick hard with a
  small wobble. The grip mod's softer kick scales the whole pattern.
  walk.ts kicks the view by it and, once the string ends, gives back
  `recover` of the climb, less whatever you pulled back yourself
  (`owedPitch`, `owedYaw`), so it never overshoots.
- **Aiming takes a moment** (`ADS`, 0.16 s for the SMG to 0.4 s for the
  Belt Feeder): the sim eases `SimPlayer.ads` and the cone with it from the
  hip's to the aim's; the first-person hands come up at the same pace
  (`ViewState.adsTime`). Not while reloading.
- **Moving costs accuracy** (`MOVE_SPREAD`, `moveSpread()`): past a walk
  the cone opens with speed up to a run, half as much aiming; in the air
  more again. The input carries `move` and `air` (the server takes the
  speed and the air flag from the controls message). The crosshair shows
  the cone the next shot will fly in (`sim.spreadOf()`).
- **The shotgun loads a shell at a time** (`SHELLS`): opening up, a shell
  every 0.42 s (the grip mod quicker) until it's full or the spare shells
  run out, then the pump; each shell its `reload` event (`shell`) and its
  sound; a pull with a shell in stops it (`stop`) and fires after the pump
  (`pending`). The reload clip (gunfit.ts `reloadAt(..., shells)`) makes
  one trip to the belt per shell, both views.

No wire change: the shot's `n` is the browser's own prediction, the
reload's `shell` events aren't sent and `stop` goes as a reload done.

## Phase 2: design quality (built)

The owner's go: "the guns need to look less blocky". Every gun was boxes
and plain cylinders; their shapes are now `gunshapes.ts` (DOM-free, tested
in `tests/gunshapes.test.ts`), and guns.ts only gives them materials and
finishes.

- Receivers, stocks, grips and magazines are side outlines with rounded
  corners (`fillet()`), extruded across the gun with a bevelled edge
  (`side()`; the faces are inset by the bevel with `inset()`, since three's
  negative `bevelOffset` closes holes up, and a bevel too big for a thin
  wall is halved until the shape is `sound()`); handguards, the pump and the
  holo's hood are rounded sections along the barrel (`section()`); barrels,
  muzzle brakes, flash hiders, the scope, the revolver's cylinder and the
  foregrip are turned (`turned()`, `turnedY()`: a lathe a profile segment,
  so every shoulder keeps a hard edge; muzzles bored); trigger guards are
  tubes along a curve; small parts are boxes with rounded edges (`rbox()`).
- What's new on them: a raked pistol grip with finger grooves and a
  beavertail, a curved trigger in a bent guard; the rifle's flared magwell,
  curved magazine, slip ring, slotted handguard, folding front sight,
  ported brake, castle nut and stock lever; the SMG's vented shroud,
  grooved foregrip and charging knob; the shotgun's vent rib, grooved pump,
  barrel clamp, side saddle of round shells and ghost ring; the marksman
  rifle's slotted handguard, adjustable cheek piece, turned scope with its
  bells, rings and turrets; the revolver's frame round the cylinder's
  window, round barrel with its underlug and vented rib, hammer, grip frame
  under wooden panels, fluted cylinder with its chambers; the Tri-Tap's
  shaped bullpup body and open carry handle; the Belt Feeder's turned
  cooling fins, top cover and belt links. The rails have their teeth, the
  holo sights a hooded frame with a brightness knob.
- Three levels (`GunDetail`): 2 the first-person gun (viewmodel.ts, the
  lab), about 5-9k triangles; 1 the gun in a figure's hands (yours, other
  players'), about 2-4k; 0 the soldiers' parade rifle and the Armoury's
  counter (`rifleGeometry()`), under 1.2k, no bevels or small details
  (`fine()`). Each gun stays four draws (one a material).
- `FIT` didn't move: the tests hold the muzzle at the front, the butt pad
  at the back, the line through a holo or the scope clear, and the front
  hand's reload spot on the magazine, at every level.
- The neon finish's gradient runs front to back along each accent
  (`byKey()` lays its uv along z).
- The store's 2D art (`gunart.ts`) is as it was.

## Later (not picked yet)

- Impacts and feedback: marks where bullets hit walls, casings thrown from
  the gun, the muzzle's light at night, a crosshair that reacts more.
- Targets and scoring: weak spots, damage that drops with range, moving
  dummies.
- Range challenges at the Armoury: pop-up targets, par times, boards.
- A pull in the Tri-Tap's pause kept and fired when it ends (today it's
  lost).
