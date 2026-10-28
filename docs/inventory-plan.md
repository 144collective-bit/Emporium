# The inventory, switching weapons and fists on the street

The owner's call (2026-10): give Degen an inventory, let him switch
between his weapons, and give him his fists so he can brawl in the
street. Everything here is for the city's game only: Dorras and XP, never
real money, nothing tied to the token or the store. Built one phase at a
time, each with the owner's sign-off; keep this up to date.

## Decisions (the owner's, 2026-10)

| Topic | Decision |
| --- | --- |
| What he carries | **Fists, a loadout of two guns, held things and consumables.** Fists are always slot 1. The two guns are picked at the Armoury (and Trench Arms) from the guns he owns; the rest wait in the locker there. The held things (coffee, boombox, phone, briefcase) are slots too. Consumables start with **the snack** (restores health in a spar or PvP; from the diners and the Night Market); the section is built so more can follow. The delivery crate is not an inventory item (it stays the moment it is). |
| Ammo | **Stays free**: every gun comes full, the counter refills all. **No counter needed to draw**: once a loadout is picked, the hotbar draws either gun anywhere (today he's unarmed until a counter hands a gun over). |
| On screen | **A hotbar strip in the walk HUD** (slots with 1-7 under them), **a Bag tab in the walk pop** beside Controls / Profile / Online / Emote (the list: ammo, mods, the locker, consumables) and **a Bag on the business card** so it reads in the City view too. No radial wheel. |
| On his body | **One gun shown, as today**: the gun in hand, slung or holstered; the second gun isn't drawn on him. |
| Fists | **A hotbar slot** (slot 1): picking it holsters the gun and raises the guard. Not automatic on holstering, no jab with the gun out. |
| Who he can hit | **The dummies and drones** (melee targets), **sparring partners** (bots in the crew's look at fixed spots who fight back only after a "Spar" prompt is accepted) and, online, **other players on the south bank**. The crowd is never a target: a swing near a person makes them step aside (the `bump`), nothing more. |
| Where | **Fists up anywhere in the city.** Sparring partners stand **outside the Fight Club** on the south bank and **in The Trenches** (The Block's court, the boardwalk). |
| Controls unarmed | **Click punch, hold right-click block, G kick, Space dodge standing and jump moving; sprint stays on Shift.** Touch: Punch / Kick / Block take Fire / Aim / Reload's places while fists are picked. Gamepad: X punch, Y kick, LB held block, A dodge. |
| Health | **Only in spars and PvP**: a street spar uses health like a bout; elsewhere nothing hurts Degen, north or south. |
| Animation | **Upper body over the walk**: a punch plays on the arms, spine and head over the motion-captured walk (as the emotes do, `upperW`); kicks and dodges standing still; a keyed guard idle. |
| Styles | **Build the fight plan's Phase 3 with this**: the Kickboxer and Street styles sold by the trainer, so a bought style shows on the street. |
| Rewards | **Street spars pay no Dorras** (for fun); **dummy punches count as takedowns** (XP, counters) and feed **new missions and badges**. |
| Other players | Not yet: no guard flag in the protocol before PvP lands. |
| Order | **Inventory first**, fists after. |

### The controls (the owner's, after Phase 1)

| Topic | Decision |
| --- | --- |
| The inventory | **Tab opens a 4 x 4 grid of 16 spaces and two weapon slots**, replacing the walk pop's Bag list (the hotbar stays). The grid holds **everything he carries**: the guns not in a weapon slot, the held things, the snacks stacked. Opens **anywhere**; open, **the mouse is freed and Degen stops**. |
| Equipping | **Drag and drop, and tap**: drag a gun onto a weapon slot (what was there takes its space) or a weapon back into the grid; a tap selects and shows the actions, a double tap (double click, Enter) does the first. |
| Keys | **1 and 2 draw the weapons; empty hands are the fists** (no fists slot). The drawn weapon's key again puts it away. A weapon can go back into the bag from its slot. Either weapon slot may be empty. |
| Touch and pad | **The Bag button** in the walk tabs opens it; on a gamepad **View**, with first person moved to the right stick's click. |
| Free play | **Every item free while testing** (a test switch: every price 0, no level or score needed), on the preview only, off before going live. |

## What's already there

- **Switching guns exists, without a screen.** Once geared up at a
  counter, any gun you own can be swapped to anywhere: X or Q steps,
  1-7 picks by number (in `WEAPON_IDS` order), the touch Swap button,
  LB / RB on a gamepad. Each gun keeps its own ammo (`stash` in
  `combat-sim.ts`), a gun not carried yet comes full, the new gun fires
  after `SWAP_TIME`. Online the `swap` message carries it and the server
  checks it (`combat.swap()`, `sim.swap()`).
- **Fists exist only in the ring.** `fight-sim.ts` (jab, cross, hook,
  uppercut, front kick, roundhouse, block, parry, dodge, stamina,
  knockdowns, bots) runs inside an `arena` circle; `fight.ts` draws it
  with its own clips (`fight-anim.ts`, `fight-figure.ts`) over its own
  movement, hiding the walker. The trainer's Styles tab says "coming
  soon" (fight plan Phase 3).
- **Things in his hands.** The look's `held` (`profile-data.ts`), put
  away while a gun is out (`hero.held.visible` in walk.ts). The crate
  for Load / Unload (`moments.ts`, `walk.carry()`).
- **The save.** `tycoon.ts` (v10): the guns owned and their mods
  (`buyGun()` / `modGun()`), `wardrobe`, `fight` (style, styles, the
  record). The last gun carried, lifetime score and finish:
  `degen-city-combat-v1` or the server profile.

## How it fits together

```
inventory.ts      the rules, DOM-free, tested in tests/inventory.test.ts
inventory-ui.ts   the hotbar, the Bag tab and the business card's Bag;
                  markup in CityMap.astro, styles src/styles/inventory.css
brawl.ts          fists on the street: the fight sim's moves out of the
                  ring, on the walker (the view; the rules in fight-sim.ts)
brawlsite.ts      the sparring partners' spots (DOM-free, tested)
```

- **`inventory.ts`**: the save's `inventory` (v11, `cleanSave()`
  migrates: a save from before it gets fists, its first two owned guns
  in catalog order with the rifle first, and its held thing):
  `{ guns: [WeaponId, WeaponId | null], held: Held | null, items:
  Partial<Record<ItemId, number>> }`. `slots(save)` gives the hotbar in
  order: fists, gun 1, gun 2, the held thing, then consumables; `pick()`
  what picking a slot means (a gun to `combat.swap()`, fists to the
  brawl, a held thing to the look, a consumable to `use()`);
  `setLoadout()` at the Armoury (only owned guns, no gun twice);
  `buyItem()` / `useItem()` for consumables (`ITEM_CATALOG` in
  `catalog.ts`: the snack, price, where it's sold, `ITEM_MAX` a stack);
  the ledger entry `items`. The two guns' mods stay in `upgrades`.
- **The hotbar** (`inventory-ui.ts`, `[data-hotbar]` in the walk HUD,
  under the ammo on desktop, a row over the touch buttons on phones):
  a slot per entry with its art (`ART` in gunshop.ts for the guns, a
  fists card, the held things' and the snack's icons from one small
  atlas), the number under it, the picked one lit, ammo on the guns, a
  count on the snack. 1-7 pick slots in his order (replacing today's
  catalog order), X / Q step through the guns and fists, the mouse
  wheel steps too (free while walking). Touch: the Swap button becomes
  the hotbar's step and a tap on a slot picks it. Gamepad: d-pad steps.
  It joins `chrome` in index.ts. Phones fold the names and show five
  slots at 320px upright.
- **The Bag tab** (`[data-bag]` in the walk pop, like the Emote tab):
  the loadout with each gun's ammo and mods, the locker (the owned guns
  not carried, "Swap at the Armoury"), the held thing, the consumables
  with Use, and where to buy more. **The business card's Bag tab**
  (tycoon-ui.ts, through `repaint()`): the same list read-only in the
  City view, with the Armoury and the shops as ways in.
- **The Armoury's and Trench Arms' counter** (`gunshop.ts`): the store
  gets a **Loadout** row (two slots; tap a slot, pick from the owned
  guns) and keeps buying, mods and the refill. Picking a loadout gears
  him up (`combat.equip()` for gun 1, the second in the `stash`, full);
  the counter is no longer needed to draw a gun, only to change the
  loadout or refill.
- **Fists** (`brawl.ts`, walk mode's on-foot chunk): slot 1. Picking
  it holsters the gun (`combat.toggleHolster()`) and raises the guard;
  picking a gun lowers it. The moves run through `createFightSim()` in
  a street setup (no arena, no bout, one fighter, stamina on; the
  opponent joins for a spar): click punch, hold right-click block, G
  kick, Space dodge standing, jump moving; Shift still sprints (the
  guard drops while sprinting and comes back). The clips are the ring's
  (`fight-anim.ts`): punches and the block on the upper body over the
  animator's walk (`upperW`, as the emotes), kicks and the dodge
  standing (the capture steps aside, `mocapW`), a keyed guard idle. The
  sounds are the ring's. The lab gets a Brawl program; `tests/human.test.ts`
  rows for the street clips.
- **Targets.** The dummies and drones: a hit test from the fight sim's
  capsule sweep against each target within reach (`combat-sim.ts` gains
  `melee(id, reach, arc, damage)` so the server can do it too); a
  knocked-down dummy is a takedown (XP, counters). The crowd: a swing
  within reach makes a person step aside (`bump` in life.ts), never a
  hit. Sparring partners (`brawlsite.ts`: `PARTNERS`, each a spot, a
  facing, a bot from `FIGHT_BOTS` and a look; outside the Fight Club,
  on The Block's court, on the boardwalk; solid, idle in the guard,
  "Spar" prompt): accepting starts a street spar with health (the fight
  sim's `bout: null`, an arena of a few tiles round the spot so neither
  wanders off), the fight HUD's bars, a win or a quit ends it, no
  Dorras, XP through `finishFight()` as a spar. Online, other players on
  the south bank when multiplayer resumes (the fight plan's Phase 4).
- **Styles** (fight plan Phase 3): `buyStyle()` / `pickStyle()` in
  tycoon.ts, the trainer's Styles tab selling the Kickboxer and Street
  (`STYLE_CATALOG` in catalog.ts: level and price), the picked style's
  moves in the ring and on the street.
- **Missions and badges** (`missions.ts`): a street chain (three hits
  on a dummy by hand), a spar with each partner, a dummy knocked down
  by hand; badges Bare Knuckle (ten dummies by hand) and Street Fighter
  (every partner beaten).
- **Online** (`protocol.ts`, `PROTOCOL` bumped): the `equip` message
  carries the loadout (two guns) and the server allows a swap only
  within it; the `in` message's fight bits and a guard flag wait for
  PvP (the fight plan's Phase 4).

## Phases (each with the owner's sign-off)

1. **The inventory** (built; as built below). `inventory.ts` and its tests, the save's
   `inventory` (v11), the loadout picked at the counters, the hotbar in
   the walk HUD (1-7 in his order, X / Q / the mouse wheel step, the
   Swap button and the d-pad), the Bag tab in the walk pop, the Bag on
   the business card, the held things as slots, the consumables section
   with the snack (sold at the diners and the Night Market; Use does
   nothing yet outside a spar), a gun drawn anywhere once a loadout is
   picked, the fists slot holstering the gun (the guard comes in Phase
   2). Checked at 320, 375, 768, 1024 and 1440 wide, upright and on
   their side; the protocol bumped and tested on workers.dev.
2. **Fists on the street** (built; as built below). `brawl.ts`: the guard up with empty hands, the
   moves over the walk, the controls above, the dummies and drones as
   melee targets with takedowns, the crowd stepping aside, the sounds,
   the lab's Brawl program and the rubric's rows. The missions and
   badges for dummies by hand.
3. **Sparring partners and styles.** `brawlsite.ts` and its spots, the
   "Spar" prompt, street spars with health and the snack's Use, the
   fight record counting them, their missions and badges; the fight
   plan's Phase 3 styles sold at the trainer and shown on the street.
4. **Online.** When the owner resumes multiplayer: the guard and the
   swings seen by other players, PvP on the south bank (fight plan
   Phase 4).

## Phase 1, as built

- **Modules.** `inventory.ts` (DOM-free, tested in `tests/inventory.test.ts`):
  the hotbar (`slots()`, `slotKey()`, `pickSlot()`, `stepKey()`,
  `SLOTS_MAX`), the loadout (`setLoadout()`, `carryGun()`: a gun already
  in the other slot trades places; gun 1 is never empty), `buyItem()` /
  `useItem()` and `SNACK_BARS`. The save's side is `inventory-save.ts`
  (the `Inventory` type, `emptyInventory()`, `cleanInventory()` for
  `cleanSave()`, `setHeld()`): the boot needs only that, so the rest
  loads with the hotbar and the gun store (the boot's budget had 1.7 KB
  left; it now has 0.1 KB). `inventory-ui.ts` (its own chunk, fetched
  when walking starts or the business card's Bag opens) draws the hotbar,
  the Bag and `bagHtml()`; `gunart.ts` holds the guns' silhouettes for
  the store and the hotbar.
- **The save** (v11): `inventory` { guns, held, items }. A v10 save
  carries the rifle and the first premium gun it bought (catalog order);
  the score-unlocked starters aren't in the save's reach (the browser's
  combat profile knows the score), so they go in at the counter.
- **The hand.** The look's `held` is kept in the save by `setHeld()` (at
  the boot and on every look change, index.ts). Which of fists or the
  thing in his hand is out is the hotbar's (not saved): walking starts
  with the thing in his hand out, as before.
- **Combat** (`combat.ts`): the loadout from the save is the sim's `kit`
  (`setKit()` in combat-sim.ts: a swap goes only within it, a gun put
  back in the locker gives up its ammo, a gun in hand that's no longer
  carried is swapped for gun 1). `draw(id)` gears up anywhere the first
  time (full, as at the counter) and swaps and draws after; `holster()`;
  `ammo(id)` for the hotbar and the Bag; G draws from the loadout when
  he isn't geared up yet.
- **Keys.** 1-7 pick a slot, X steps (Q is the peek since animation
  Phase 4, so it isn't a step), the touch Swap button, RB and the d-pad
  step. **The wheel** wasn't free (it set the camera's distance): with
  the mouse captured it steps the hotbar, with the mouse free it still
  zooms. The owner can reverse this.
- **Where it sits.** Desktops: the bottom-right corner, each slot with
  its name (under the ammo, as planned, is where the compass and the
  pops are). Touch screens: square slots over the right-hand buttons
  upright (the door prompt goes above them), low between the stick and
  the buttons on their side.
- **The store.** A Loadout row over the cards (tap a slot, then a gun;
  "Leave it empty" for gun 2), "Carry as gun 1 / gun 2" on a gun in the
  locker, "Refill & draw" on one carried. Picking gears him up with gun
  1, every gun full.
- **Snacks.** 500 Dorras, five at most (the open question's
  assumptions), ledger line `items` ("Snacks"); not counted as a thing
  bought (three snacks aren't the Fleet mission's three buys). Sold at
  the downtown diners' doors and every Night Market stall's counter,
  a walk prompt each ("Starlite Diner · Snack"), bought there and then.
  Use (the Bag, the hotbar) says it's for a spar.
- **Online.** `PROTOCOL` 4: `equip` carries the loadout (`l`), the new
  `kit` message draws from it anywhere (it gears up a player who isn't
  yet; the loadout itself changes only at a counter), `cleanKit()`; the
  server's swap stays within the loadout through the sim. Not yet tried
  on workers.dev.

## The controls and the grid, as built

- **The weapon slots.** `inventory.guns` is two slots, either may be
  empty (`cleanInventory()` keeps an empty slot 1 that was saved so).
  The hotbar is the slots in order: 1-2 the weapons (empty ones shown),
  3 the thing in his hand, then the snacks; no fists slot. `pickSlot()`
  on the drawn weapon puts it away (`'empty'`), on an empty slot it puts
  the gun away too, so empty hands are the fists. X, the wheel, RB and
  the d-pad step through the weapons carried and empty hands
  (`stepKey()`).
- **The grid** (`inventory.ts`): `carried()` (the guns he owns and may
  carry that aren't in a slot, the held things he owns, the snacks he
  has), `layout()` (16 spaces; what was where stays there, the save's
  `inventory.grid`, keys `gun:` / `held:` / `item:`; anything new takes
  the first free space), `moveCell()`, `equipCell()` (a gun onto a slot,
  what was there takes its space), `unequip()` (a weapon back to a space
  or the first free one; onto another gun they trade, onto anything else
  `'room'`), `swapSlots()`.
- **The panel** (`inventory-ui.ts`, `[data-inv]` in `CityMap.astro`,
  styles in `inventory.css`): Tab or the Bag tab (`[data-inv-open]`, on
  a gamepad View) opens and closes it, as do Esc and ×. Open, the walk
  stops (`still()` in walk.ts), the mouse is freed, the HUD's buttons,
  the hotbar and the prompt step aside (`.city.is-inv`) and the keys are
  the panel's: arrows (the d-pad) move, Enter (A) does the first action,
  1 / 2 still draw. Dragging is pointer events with a ghost under the
  finger (a move of 6 px makes it a drag); the bar under the grid names
  the selection with its actions (Draw / Put away, Back in bag, To /
  Swap slot 1 or 2, Hold it, Use) and a gun's stat bars (damage, fire
  rate, range with its mods on; `STATS` in gunart.ts, the gun store's).
  **The polish** (the owner left it to me): with a mouse, hovering shows
  the same in a tip (`.inv-tip`) and a right-click does the quick move (a
  gun to a weapon slot, a weapon back in the bag, the rest their first
  action); what's dropped settles with a small bounce and the selection
  goes with it (`is-landed`); the panel rises in (neither under reduced
  motion); a key for an empty weapon slot puts the gun away (empty
  hands). The business card's Bag tab shows the
  same grid, read-only (`bagHtml()`). Desktops: a card in the middle;
  phones upright: a sheet over the bottom (flatter spaces on short ones);
  on their side: the weapons beside the grid. Checked at 320, 375, 740 x
  360, 768, 1024 and 1440, with a finger's drag too.
- **The sim** (`combat-sim.ts`): `kit` `null` is any gun (an older
  browser), `[]` none: `setKit()` with an empty kit holsters him. The
  `kit` message's gun (`w`) is optional and the loadout may change
  anywhere now (the server takes it and keeps the swap within it).
- **First person** moved off the gamepad's View to the right stick's
  click (R3).
- **Free play** (`freeplay.ts`, `FREE_PLAY`): built with
  `PUBLIC_FREE_PLAY=1` (set only on the Vercel preview project), every
  price in `catalog.ts` and `tycoon.ts` is 0, every level 1, the guns'
  and finishes' scores 0, the kart cups and the trainer's opponents open from level 1, and `pay()` always pays. The "Build site" Action
  and the Worker's build leave it unset, so the live site folds it away;
  take it off the preview before anything goes live from there.

## Phase 2, as built

- **The rules** are `brawl-sim.ts` (DOM-free, tested in
  `tests/brawl.test.ts`): one fighter of the fight's rules
  (`createFightSim()`) in the save's style, put where Degen stands and
  facing his way every tick, so the sim only times the moves (their
  frames, the chains, the press buffer, the block, the dodge and
  stamina); what a move moves him itself (a strike's step in, the
  dodge's slide) comes back as `dx, dz` and walk mode moves him by it
  through its collisions. A move fires a `strike` on its first active
  frame, once. The guard comes up with any press or the block and stays
  `BRAWL.guard` (4 s) after the last, then drops; sprinting drops it and
  throws nothing. Blocking, he walks no faster than `BRAWL.blockSpeed`.
  Out of stamina: "Out of breath", nothing thrown until some is back.
- **The hits** are `combat-sim.ts`'s `melee(id, x, y, z, yaw, move)`: a
  dummy within the move's reach (and its board's half-width and `MELEE`'s
  slack), inside its arc unless very close, at the strike's height
  (`strikeHeight()` in `fight-moves.ts`, shared with the ring); the
  move's damage, the takedown marked `melee`. Nothing with a gun in his
  hands. The patrol drones fly out of a fist's reach from the street (the
  test holds it): they stay the guns' targets. Online the browser sends
  `{ t: 'melee', m }` and the server runs the same test from where it has
  him (`room.ts`, at most one a `MELEE_GAP`); no protocol bump, an older
  server ignores it.
- **The look** is `brawl.ts` (walk mode's chunk with the hotbar, fetched
  when walking starts): `lay(P, upper, whole)` puts the fight's clip
  (fight-anim.ts) on his pose after the walk has posed him. Punches, the
  block and the guard are the upper body (the arms, the lean, the
  spine's twist with the clip's hip turn, the head, the fists closed)
  over the motion-captured walk through the upper mask (`upperW`); a kick
  or the dodge takes him whole, standing (`rooted`: the motion capture
  steps aside, he doesn't walk). With the guard up he faces where the
  camera looks.
- **Controls** as decided: click punch, right-click held block, G kick
  (empty hands; armed, G holsters as before), Space dodges with the guard
  up and standing (otherwise it jumps), Shift sprints. Touch (`.is-fists`
  on the city's root while his hands are empty): Punch, Block and Kick in
  Fire's, Reload's and Aim's places, Jump dodging as Space does. Gamepad:
  X punch, Y kick (when no prompt is near), LB held block, A dodge; the
  run moved to L3 while the fists are up. The desktop key hint
  (`.fists-hint`) and the Controls panel list them.
- **The crowd** steps aside from a swing (`swing` in `life.ts`: anyone
  within the reach and `BRAWL.crowd` takes a `bump` away from him); never
  a target. **Sounds**: the fight's whoosh on every swing, `punch` /
  `kick` on a hit.
- **Rewards**: a dummy knocked down by hand counts `fistDowns` (as well as
  `dummies`): missions Bare hands (level 1, three) and Street fighter
  (level 3, twenty), badge Bare knuckles (twenty-five).
- **The lab**: the Brawl program (`?anim&prog=brawl`, in the Reel): a
  jab-cross-hook, a kick, punches walking, a dodge and the block; J / K /
  L by hand; the readout's Fists row. The rubric's rows run over the
  motion capture, which the fists only lay their upper body on, so the
  street clips are held in `tests/brawl.test.ts` instead (the legs left
  to the walk, a kick taking them, every move ending on the guard).

## Open questions (small; the owner can answer as they come)

- The snack's price and how many he can stack (assumed 500 Dorras, five
  at most).
- Which partners stand where exactly, and their names (made up; from
  `FIGHT_BOTS`' three, or new ones).
- Whether the Bag on the business card should also let him Use a snack
  from the City view (assumed no: Use is walk mode's).

## Not in scope

Weapons in the ring, grabs and throws, blood or gore (cartoon stars
only), a radial wheel, both guns drawn on his body, a jab with the gun
out, anything typed by players, anything for real money, and any attack
on the crowd.
