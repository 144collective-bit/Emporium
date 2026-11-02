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

## Phase 2: design quality (next, waiting for sign-off)

Sharper guns, as the vehicle plan did for the cars. Today every gun in
`guns.ts` is boxes and plain cylinders.

- Each gun's receiver, stock and grip as a side outline extruded with a
  bevel (as the cars' bodies), barrels and sights lathe-turned, a rail
  with its slots, the ejection port, the charging handle, the safety and
  pins, the magazine with its ribs and witness holes, the shotgun's pump
  grooves, the revolver's fluted cylinder, the Belt Feeder's feed cover,
  bipod and belt.
- The finishes (`SKINS`) on the new parts, and a light edge wear on the
  steel.
- Detail by distance: the first-person gun gets the most (it fills the
  screen), the gun in Degen's hands a middle level, other players' and
  the soldiers' rifles the plainest; each merged per material, so a gun
  stays a few draws.
- `FIT` doesn't move: the hands, sights, muzzles and butts stay where
  `tests/gunfit.test.ts` holds them. The store's art (`gunart.ts`) is
  drawn again from the new outlines.
- Checked close up in first person and over the shoulder, by day and at
  night, on the phone tier, and measured with `?fps` and `?bench`.

## Later (not picked yet)

- Impacts and feedback: marks where bullets hit walls, casings thrown from
  the gun, the muzzle's light at night, a crosshair that reacts more.
- Targets and scoring: weak spots, damage that drops with range, moving
  dummies.
- Range challenges at the Armoury: pop-up targets, par times, boards.
- A pull in the Tri-Tap's pause kept and fired when it ends (today it's
  lost).
