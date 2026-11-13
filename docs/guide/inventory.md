# The inventory, fists on the street, sparring partners, free play

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

## The inventory (3D walk mode)

- The plan and its phases are `docs/inventory-plan.md` (the owner's call:
  an inventory, switching weapons, then fists on the street); keep it up to
  date, one phase at a time with the owner's sign-off. Phase 1 (the
  inventory) and the controls after it (the owner's call: Tab opens a 4 x 4
  grid with two weapon slots), Phase 2 (fists on the street, below) and
  Phase 3 (sparring partners and styles, below) are built: what Degen carries is the save's
  `inventory` (v11: two weapon slots, `guns`, either may be empty; the
  thing in his hand, `held`, kept in step with the look by `setHeld()`; his
  consumables, `items`; where each thing lies in the grid, `grid`), its
  shape and cleaning in `inventory-save.ts` (the boot's; `GRID_SIZE` 16,
  `GRID_COLS` 4) and its rules in `inventory.ts` (DOM-free, tested in
  `tests/inventory.test.ts`, loaded with the hotbar and the gun store):
  the hotbar's slots in his order (`slots()`: weapon 1, weapon 2, the
  thing in his hand, the consumables he has; no fists slot: empty hands
  are the fists; `pickSlot()` (the drawn weapon's key again puts it away),
  `stepKey()` through the weapons and empty hands), the grid (`carried()`,
  `layout()`: what was where stays there, the new in the first free
  space; `moveCell()`, `equipCell()` (what was in the slot takes its
  space), `unequip()`, `swapSlots()`), the loadout (`setLoadout()`,
  `carryGun()`), the snack (`ITEM_CATALOG` in catalog.ts, 500 Dorras,
  `ITEM_MAX` five; `buyItem()`, ledger `items`, not counted as a thing
  bought; `useItem()` only in a spar, which comes with the fight plan's
  street spars) and where it's sold (`SNACK_BARS`: the downtown diners'
  doors, the Night Market's stalls and, since the polish plan's Phase 7,
  The Rusty Nail's door, walk prompts `snack:<id>` that buy one there and
  then).
- **The stash** (the home plan's Phase 4): the trunk in Degen's house
  keeps consumables he doesn't carry. The save's `stash` (how many of
  each, up to `STASH_MAX` 20; `cleanStash()` in inventory-save.ts, run by
  `cleanSave()`: a save from before it has none), `stashItem()` and
  `takeItem()` (one at a time, nothing made or lost, never past `ITEM_MAX`
  carried) and `racked()` (the guns he owns and doesn't carry: listed on
  the card, changed in the inventory) in inventory.ts; the card is
  stash-ui.ts (`endswood.md`). Nothing is bought or sold there.
- On screen (`inventory-ui.ts`, a chunk of its own fetched when walking
  starts, with the inventory's keys, the pad, the wheel and the snack
  doors; styles `src/styles/inventory.css`): the hotbar (`[data-hotbar]`,
  bottom-right on desktops with the slots' names; square slots over the
  right-hand buttons on touch screens upright, the door prompt above them,
  low between the stick and the buttons on their side; in `chrome`), **the
  inventory** (`[data-inv]`: Tab, the hub's Bag tab's button
  `[data-inv-open]` or the gamepad's View open and close it, Esc and × close
  it; open, Degen stops, the mouse is freed and `.city.is-inv` hides the
  HUD's buttons, the hotbar and the prompt; the two weapon slots over the
  4 x 4 grid, dragged between with pointer events and a ghost, a tap
  selecting with the actions and a gun's stat bars (`STATS` in gunart.ts)
  in the bar under it, a double tap, double click or Enter the first; with
  a mouse a tip on hover (`.inv-tip`) and a right-click's quick move;
  what's dropped settles with a bounce (`is-landed`) and the panel rises
  in, neither under reduced motion; arrows or the d-pad move round it; a card in
  the middle on desktops, a sheet over the bottom on phones upright, the
  weapons beside the grid on their side) and `bagHtml()` for the business
  card's Bag tab (the same grid, read-only; the Armoury and the Night
  Market as ways in from the City view). 1 / 2 draw a weapon (again puts
  it away), 3-7 the rest, X, the touch Swap button, RB and the d-pad
  step, and the wheel steps while the mouse is captured (free, it still
  sets the camera's distance); first person is the gamepad's right stick
  click. The thing in his hand puts the gun away and takes that out;
  which is out isn't saved (walking starts with the thing in his hand
  out).
- The loadout is picked in the inventory or at the gun store's Loadout row
  (gunshop.ts: tap a slot, then a gun, or "Leave it empty"; picking
  gears him up with the first weapon, all full); the guns
  not carried wait in the bag. Ammo stays free. Either gun is drawn
  anywhere (`combat.draw()`: the first time it gears him up, full; with
  empty hands G kicks, it holsters a gun that's out), and a swap goes only within the loadout (`kit` in combat-sim.ts,
  `setKit()`: `null` any gun (an older browser), `[]` none, which holsters
  him; online the `equip` message's `l` and the `kit` message (its gun `w`
  optional, taken anywhere), `cleanKit()`, `PROTOCOL` 4). The guns'
  silhouettes are `gunart.ts`.
- **Fists on the street** (Phase 2): empty hands are the fists. The rules
  are `brawl-sim.ts` (DOM-free, tested in `tests/brawl.test.ts`): one
  fighter of the fight's rules (fight-sim.ts, the save's style) put where
  Degen stands each tick, so it only times the moves (frames, chains, the
  block, the dodge, stamina) and hands back what a move moves him (a
  step in, the dodge's slide) for walk mode to move him by through its
  collisions; a `strike` on a move's first active frame. The guard is held
  (the owner's call, 2026-11: hold the right mouse button to lift the
  fists, then click to punch): up only while `guard` is held, punches,
  kicks and the dodge thrown only with it up (a press without it is
  nothing, a move going plays out when it's let go), and the guard is the
  block (held between moves he's blocking; no block of its own on the
  street); dropped by sprinting, back when the sprint ends if still held;
  up, he moves no faster than `BRAWL.guardSpeed`. The hits
  are `melee()` in combat-sim.ts (the dummies in reach, arc and height,
  `strikeHeight()` in fight-moves.ts, shared with the ring; the drones
  fly out of a fist's reach; nothing with a gun out; online the `melee`
  message, which the server checks the same way); a dummy down by hand
  counts `fistDowns` too (`takedown(s, kind, hand)`; missions Bare hands
  and Street fighter, badge Bare knuckles). The look is `brawl.ts` (walk
  mode's chunk): `lay()` puts the fight's clip on his pose after the
  walk, the upper body over the motion capture (`upperW`), a kick or the
  dodge whole and standing (`rooted`); the guard held is the fight's
  `guard` clip. Controls: right-click held lifts the guard, and with it up
  click punches (the combo by timing: jab, cross, hook, uppercut), G
  kicks, Space dodges standing (jumps otherwise), Shift sprints; touch
  (`.is-fists` on the root): the ring's Block button is the Guard on the
  street (walk.ts `labelBlockBtn()`, toggled), Punch and Kick showing
  while it's up (`.is-guard`), in Fire's, Aim's and Reload's places;
  gamepad LB held the guard, then X punch, Y kick, A dodge, the run on
  L3. Hold or toggle: the guard is its own job (comfort.ts `guard`, held
  on the keys and the pad, toggled on touch; Settings > Guard), the
  ring's block keeps `block` ("Ring block"). A swing makes anyone near
  step aside (`swing` in life.ts, a `bump`): the crowd is never a target.
  The lab's Brawl program (`?anim&prog=brawl`) plays them.
- **Sparring partners and styles** (Phase 3, with the fight plan's Phase
  3): `brawlsite.ts` (DOM-free, tested in `tests/brawlsite.test.ts`):
  `PARTNERS`, three made-up fighters waiting in the guard, one in each
  style, easy to hard: Big Duke on the lawn behind the Fight Club, Tash on
  The Block's plaza, Old Sal on Pier 7's head; a spar puts you `GAP` in
  front of them (`startOf()`) in a ring round the point between you
  (`arenaOf()`), each ring held clear of everything solid, the lawns' walks,
  beds and furniture, the pocket parks and squares, the benches and the
  people about, on a slab or a deck; their ids and names are
  fight-moves.ts's (`PARTNER_IDS`, `PARTNER_NAMES`), so the boot carries no
  more of them. `createPartners()` (brawl.ts) draws them near Degen idling
  in the guard, facing him as he comes up; their footprints
  (`PARTNER_SOLIDS`) join the grids through `addSolids()` when the chunk
  loads (never the city's `SOLIDS`: the lawns' walks are routed round
  those at the load). The prompt "Spar · <name>" (`spar:<id>`, gated by
  the live settings' `fight`) starts a street spar: fight.ts's kind
  `street`, the partner's ring and ground, a knock-out ends it (yours a
  loss, theirs a win), a quit is a loss, no Dorras, XP as a spar and
  `XP.streetWin` for a win, `fight.partners` on the save. The snack
  (`SNACK_HEAL`) is eaten from the fight HUD's Snack button, E or the
  d-pad's up, in a spar or a street spar. Counters `streetSpars`,
  `partnersBeaten`, `streetChains` (brawl-sim.ts `landed()`); missions
  Sparring partner, One, two, three and Round the city (goal `{ partners }`,
  counted from the record), badge Street Fighter (every partner beaten).
- **Free play** (a test switch, the owner's call: everything free to
  check it all works): `freeplay.ts` (`FREE_PLAY`, Vite's `__FREE_PLAY__`
  from `PUBLIC_FREE_PLAY=1` in `astro.config.mjs`) makes every price in
  `catalog.ts` and `tycoon.ts` 0, every level 1, the guns' and finishes'
  scores 0, the kart cups and the trainer's opponents open from level 1,
  and `pay()` always pay. **Today it's on everywhere** (the owner's test
  phase, 2026-11: "everything is free for a limited time"): `FREE_FOR_NOW`
  in `astro.config.mjs` turns it on in every build of the site (degenemporium.com
  and the Worker's copy), `define` in `server/wrangler.jsonc` in the game server,
  and the start screen says "Everything is free for a limited time"
  (`.city-start-free`). Ending it is the owner's call: `FREE_FOR_NOW = false`
  and the server's `define` removed, together. Otherwise it's set by
  PUBLIC_FREE_PLAY=1 on a test build (the emporium-preview Vercel project).
  The tests never set it. Unset, its branches fold away.
