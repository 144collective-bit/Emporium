# The economy: Dorras, the market, units, contracts, staff, lots, the Vault, missions, the save

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

## The economy: Dorras, the market, your units, contracts, staff, big lots and the Vault (Tycoon phases 1-4)

- The plan and its phases are in `docs/tycoon-plan.md`; keep it up to date.
  Build one phase at a time, each with the owner's sign-off.
- **Dorras** are the city's money: earned by playing, never bought and
  never cashed out. Never give them a real-money value, call them an
  investment, or tie them to the token or the Shopify store. Nothing in the
  city costs real money.
- **Rules:** `tycoon.ts`, DOM-free and tested (`tests/tycoon.test.ts`):
  goods (`GOODS`, made-up city goods, nothing about the token; raw goods
  last, since a good's place in the list sets its price rhythm), the market
  price (a function of the time only, the same for everyone and ready for a
  server), places (`PlaceId`: the stall, the four units, the Workshop) with
  `room()` / `holds()`, buy / sell back to or from any place, your stall's
  levels, price levels, units (`buyUnit()`, `buildUnit()`, `setCrop()`), the
  Workshop's jobs (`startJob()`, `cancelJob()`), your car's load
  (`load()` / `unload()`, `CARGO` per model), and `advance()`: sales
  (faster at the place you're serving, slower and capped while away),
  gardens growing and the Workshop working; staff (`hire()`, `roleAt()`,
  paid a share of what they handle, `STAFF_CUT`), couriers (`ship()`) and
  contracts (`board()`, seeded from the time so it's the same for everyone;
  `accept()`, `deliver()`, drop-offs at building doors via `destAt()`); big
  lots (`buyLot()`, `buildLot()`, places `l0`-`l2`, production lines via
  `line()` for the Workshop and factories), the ledger (`book()`, called by
  every rule that moves Dorras) and loans (`borrow()`, `repay()`, a share
  of takings in `advance()`).
  `cleanSave()` cleans anything loaded and upgrades older saves (now v14:
  the Night Market's stall, `night`, below; v13 the daily prize cap's count,
  `prizes`, below; v12 Build mode retired, the district plots a save owned
  refunded in full, `plotRefund()`, with a toast once; v11 brought the
  inventory, `inventory`; v10 The Trenches' corner shops, `corners`);
  keep that migration when the save changes. New economy rules go here
  first.
- **Balance** (the polish plan's Phase 9, the owner's call; the numbers
  before and after are in `docs/tycoon-plan.md`, "Balance"): **the daily
  prize cap** (`PRIZE_CAP` in catalog.ts: the day's first 6 cup races (a
  cup's and single races) and first 4 purses won pay in full, then 35%;
  the save's `prizes` { day (`dayKey()`), races, bouts }, brought to today
  by `prizesToday()`, `cappedPrize()`, `prizesLeft()`; older saves start at
  zero; `KartResult.capped` / `FightResult.capped` put "Daily prize cap ·
  35%" on the result cards (kart-ui.ts, fight-ui.ts); a series' prize, the
  daily challenge, time trials and the XP are never capped; the owner's
  live `prizes` switch still pays 0). **The business side raised**: XP a
  sale 3 (was 1), a contract 80 (was 40), a courier sent and a Workshop
  or factory job finished 20 each (`XP.ship`, `XP.job`, new), and **the
  sold-out bonus** (`SOLD_OUT`: a shelf whose run since it was last empty,
  `Slot.run`, is 10 or more pays a tenth of the run's takings straight to
  your balance when its last item sells, the ledger's `soldOut` ("Sold
  out"), and `XP.soldOut` 15; shorter runs pay nothing, so stocking one
  at a time earns no more than its sales; `Sales.soldOut` / `bonus` tell
  the screens). Existing saves keep their Dorras.
- **The city's game (Phase 5)** sits on the same save: XP and levels
  (`xp`, `level()`, `addXp()`), owned cars and guns with their mods
  (`buyCar()` / `modCar()` / `carStatsOf()`, `buyGun()` / `modGun()`; the
  clothes are all free since `docs/wardrobe-plan.md` Phase 1), levels for the places you run (`upgradePlace()`,
  `capOf()`, `capacityMul()`), missions, badges and the
  `counters` everything watches (`count()`, `takedown()`). Prices, the
  level each thing needs, the XP curve and what each mod does are
  `catalog.ts`; the board and badges `missions.ts`. All DOM-free, tested in `tests/game.test.ts`. The starter
  tier (the five original cars, the four original guns, the original
  wardrobe) stays free; everything new costs Dorras and needs a level.
  Screens reach the save through `GameDeps` in `ui.ts` (`save()`, then
  `commit()` once the rules have changed it; `toast()`, `sfx()`), never
  by writing the save themselves.
- Goods only move between your places in your car (or by buying them
  straight there at the market hall). Stock on sale (stall, shops) can't be
  loaded back; that keeps the delivery bonus from being farmed.
- **Screens:** `tycoon-boot.ts` (the save `degen-city-tycoon-v1`, its
  tick, the Dorras readout, the missions and the card's shell, in the
  boot) and `tycoon-ui.ts` (the screens, a chunk fetched the first time
  the card or a panel's part opens): the Dorras
  readout, your business card (`[data-biz]`, the hub's Business tab:
  `openCard()` shows the hub on it, `h.hub`; the till on top, then the Stall / Units / Workshop / Car / Bag tabs; the Bag is the inventory's, read-only), the
  market hall, filled into the Emporium's panel (`[data-market]`, with its
  deliver-to / sell-from picker, your car included when it's parked outside),
  and the Workshop's (`[data-workshop]`), Signal tower's (`[data-contracts]`:
  news and the contract board), Post office's (`[data-couriers]`) and
  Apartments' (`[data-staff]`) and the Vault's (`[data-bank]`: worth,
  ledger, loans) panels: `PANELS` in `tycoon-ui.ts`, mounted
  with `mountPanel()` from `open()` in `index.ts`. One card at a time: opening a
  panel closes the business card and the other way round. Esc closes the card
  first. The views tick every second and are patched in place (`repaint()`
  / `morph()`), so a button never changes under a finger; keep new views
  going through `repaint()`.
- **The market square:** `market.ts`, on the `MARKET` lot (`layout.ts`,
  in `EXTRA_LOTS` with the garage), drawn in world numbers. Two rows of four
  stalls, the MARKET gantry (its cut-out sign uses `occlude()`), the
  string-light pole, traders and shoppers from the shared crowd (so it's built
  before `buildLamps` and `buildLife`). Stall 0 is yours and shows your
  stock (`show()`). Counters are at a Degen's waist (0.5). Footprints,
  the gantry, the pole and your spot are `MARKET_SITE` / `STALL_SPOT` in
  `solids.ts` (tested in `tests/solids.test.ts`).
- **Makers' Row:** `units.ts`, on the `UNITS` lot (in `EXTRA_LOTS`) north
  of the market square: four units of 4.1 x 4.1 (`UNIT_SITE` in
  `solids.ts`, drawn in each unit's own numbers: u across the front, v back
  from it), each drawn from the save (to let, empty, garden, shop,
  warehouse) and rebuilt only when what it shows changes. Their footprints
  are `unitSolids()` (per kind, `UNIT_SHAPES`), fed to walking and driving
  with the big lots' (`placedSolids` in `index.ts`). Signs use `occlude()`.
- In walk mode, standing at your stall or a unit's door (`places()` in
  `tycoon-ui.ts`, the walk deps `places` / `openPlace`) shows a prompt (F or
  a tap) that opens the card on that place, and standing at a stall or shop
  doubles its customers. The Workshop's door opens its panel. Your car
  parked near one of your places (stall, a built unit or the Workshop) lets
  the Car tab load and unload there; the garage menu says how much each car
  carries. Your contracts' drop-offs get a "Deliver" prompt at the door and
  a beam of light (`beacons.ts`, up to three).
- **Big lots** (Phase 4, the owner's call): three 9 x 9 lots east of
  Makers' Row (`BIG_LOTS` in `layout.ts`, in `EXTRA_LOTS`; `LOT_SITE`,
  `LOT_SHAPES`, `lotSolids()` in `solids.ts`), drawn from the save by
  `biglots.ts` (FOR SALE board, empty, superstore, factory, depot, offices),
  rebuilt only when what they show changes; offices stay well under the
  Emporium's height. Units, lots and the Workshop have levels 1-3 (the
  business card's Upgrade row); `units.ts` and `biglots.ts` show the level.
- **Loans and the ledger** are game mechanics with Dorras only: a flat fee,
  no interest rates, savings returns or APY-style wording anywhere.
- **Missions, levels and badges** (Phase 5): the rules are `missions.ts`
  (`MISSIONS` in tiers by level, up to `MISSIONS_MAX` at once, counted from
  the save's `counters` as they stood when taken; `BADGES` are lifetime
  milestones awarded by `checkBadges()`) and `catalog.ts` (`xpForLevel`,
  `levelFor`, `levelProgress`, `titleFor`, `XP` per deed), on the save in
  `tycoon.ts`. The screens are `missions-ui.ts` (styles in `missions.css`):
  the level pill in the header tools next to the Dorras readout
  (`[data-level]`, opening the hub on Missions, where the badges are,
  `[data-badges]`), the mission board at the end
  of the Signal tower's panel (appended by `tycoon-ui.ts` after the
  contracts; its Take / Claim / Give up go through `missions.act()` before
  the economy's buttons), the mission tracker in the walk HUD
  (`[data-missions-tracker]`; a pill with the count on phones) and the
  badge / level-up pops under the header (`[data-mission-pops]`).
  `tycoon.commit()` runs `missions.onCommit()` first, so any screen that
  changes the save and commits gets badges and level-ups checked. Rewards
  are Dorras and XP only: no prizes, nothing real.
- **Getting started** (the new player's first steps): the rules are
  `guide.ts` (DOM-free, tested in `tests/guide.test.ts`): `GUIDE`, seven
  steps in order (stock your stall at the market hall, make 5 sales, take
  your car out, deliver a contract, target practice, a race at the kart park, back up
  your save at the Vault), each with a beam spot (`at`), a way in from the
  City view (`go`: open a panel, or start walking at a free spot facing
  it) and a check on the save (`met()`, lifetime counters, so a step
  already done moves straight on). `advanceGuide()` (run first in
  `missions.onCommit()`) pays each step's small reward (Dorras and XP, the
  ledger's Missions line) once. The save carries `guide` { step, hidden }
  (`GUIDE_STEPS` in `tycoon.ts`; a save from before it that's past level 1
  has it done) and `backup` (when it was last downloaded). On screen
  (`missions-ui.ts`, styles `src/styles/guide.css`): the City view's card
  under the welcome tip (`[data-guide]` in `.city-hud`, 3D only, with the
  way in and an ×; in `chrome`), the top row of the walk tracker (with its
  own ×), the steps at the top of the Signal tower's board (Show / Hide the
  guide) and a cyan beam (`beacons.guide()`). Hiding only hides it; the
  steps still count.
- **Your save as a file:** everything the city keeps in this browser goes
  in one backup (`backup.ts`, DOM-free, tested: `BACKUP_KEYS`,
  `packBackup()`, `readBackup()`; never the guest or wallet login tokens or
  screen preferences). The Vault's panel ("Your save" in `bankView()`)
  downloads it (`sector-7-save-<date>.json`) and loads one: the file is
  checked and the city's game cleaned with `cleanSave()` first, a confirm
  shows its level and Dorras, then every save is replaced and the page
  reloads (`frozen` stops the tycoon storing over it). A level-up from 3 on
  reminds you when the last backup is over a week old. A new save in
  localStorage needs its key in `BACKUP_KEYS` and a loader that cleans what
  it reads.
- **The Apartments** (the tower in the north block, east of the Signal tower, `apartments()` in
  `landmarks.ts`) are a place since Phase 3: spot
  `apartments`, its pin, door (`DOORS`) and panel. The Emporium stays first
  in the 3D `spots` list.
