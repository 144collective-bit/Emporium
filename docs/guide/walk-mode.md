# Walk mode

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

## Walk mode (3D)

- `src/scripts/city3d/walk.ts`: the playable Degen, over-the-shoulder and
  first-person camera, mouse (pointer lock), keyboard, touch and gamepad
  controls, collisions and door prompts. The walk controls' settings (the
  hub's Settings tab)
  (Look: speed, invert, first person; Hold or toggle for sprint, aim,
  crouch and block, `settings.holds`, comfort.ts; Shooting: "Aim when
  firing" `settings.autoAds` = off / touch / always) are saved under
  `degen-city-walk-v1` in localStorage. The HUD markup (the controls, Run
  and Jump buttons, joystick) is in `CityMap.astro`; `walk.ts` expects every
  `data-walk-*` element to exist.
- Nothing lifts or glows on hover (the owner's call, with the pins off by
  default); the cursor shows a building is clickable in City view, and
  while walking nothing is hovered (Degen stands on the same ground).
- The over-the-shoulder camera starts 2.6 tiles behind him, 2.5 on an upright screen (`homeZoom()` in
  walk.ts; the mouse wheel sets it after), its shoulder offset eased on an upright screen so he stays in
  the middle (all of it armed, so the crosshair stays off his head).
- Esc frees the mouse first and only then opens the hub (its Back to City
  view stops walking). Door panels free the mouse so their links can be
  clicked.
- While walking (`body.is-walking`, set in `index.ts`) the header is the
  City view's (the title, Dorras, the level, City / Walk, ☰) and carries
  the emotes (online), ammo and score too (on phones the ammo is the hotbar's, the score the
  hub's and the emotes the hub's Online tab's: the controls plan's Phase 3). The touch buttons stay at the bottom (hidden while
  the hub is open, `.is-hub`).
- The gun store is the menus' kit's sample (`.mk-store`, gunshop.ts): the
  guns as cards in a grid of four with the picked
  gun's details under them; on upright phones a bottom sheet with the guns
  in one row that scrolls across. Check it at phone widths upright and on
  its side.
- Collision footprints (`SOLIDS`) and door spots (`DOORS`), both in
  `solids.ts` with the walk-mode start (`WALK_SPAWN`), mirror
  `landmarks.ts`. When a landmark moves or changes size, update both.
  What's built on your units and big lots blocks via `placedSolids()`;
  parks stay walkable.
- **The ground under a point** is `groundheight.ts` (the polish plan's
  Phase 10; DOM-free, tested in `tests/groundheight.test.ts`):
  `createGroundHeight({ leavesOpen })` gives walk.ts its `groundAt(x, z,
  yNow)`, asking `GROUND_LAYERS` in order, each a `GroundLayer` that
  `take`s (its height is the answer: the tunnel, a verge, the hills, the
  rolls, the mall's floors, the river's banks, the turntable), goes `over`
  (its height or the base, and stop: the bridges, the raised highway, the
  departures deck, Liberty Bridge) or `lift`s the base and goes on (the
  jetty, the terraces, the sky deck, the circuit, the banks); the order
  resolves the overlaps (the tunnel first, the decks before the river's
  banks, the mall by `yNow`, the kart park's flyover last). The test holds
  the old `groundAt()` word for word against it at over 20,000 points and
  heights. A new thing stood on goes in as a layer, in its place in the
  order.
- Checks go through the collision grid (`boxgrid.ts`, `BoxGrid`: boxes in
  cells of `CELL`, a query gives every box touching an area in the list's
  order): `SOLID_GRID` for walking, `CAMERA_GRID` for the walk camera,
  bullets through `rayBoxes()` (the server too), and driving and flying
  ask for the boxes within `reachOf()` / `flyReach()` of the vehicle
  (`solids(x, z, reach)`). `tests/boxgrid.test.ts` holds them to exactly
  the answers of checking every box; keep new checks going through it.
- Cars yield to the walker through `walker` in `life.ts`.
