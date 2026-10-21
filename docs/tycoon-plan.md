# Degen City tycoon: the plan

The city is turning into a business game with its own money. This is the
plan the owner agreed, and where each phase stands. Keep it up to date.

## Basics

- **Money: Dorras.** Earned by playing. They can't be bought yet and can never
  be cashed out. No prices in real money, no investment talk, nothing about
  the token.
- **Saving:** in the browser for now (`degen-city-tycoon-v1`). The save is
  plain data so it can move to the game server later.
- **Pace:** businesses earn a little while you're away (capped) and much more
  while you play.
- **No real money anywhere.** Dorras are only earned. Plot sales for PLS
  were retired in Phase 5; if top-ups ever come, they go through the game
  server (a browser balance can be edited and lost), never a browser balance.

## How you grow

1. **A market stall.** Everyone starts with a free stall in the market square.
   Buy stock in the market hall, set your prices, and the city's passers-by
   buy from you.
2. **Shop units.** Small lots of your own: a shop, studio, garden or
   warehouse.
3. **Big lots** (the owner's call in Phase 4): three Dorras-only lots east of
   Makers' Row, for a superstore, a factory, a depot or your offices.
4. **District plots** (Phase 5, the owner's call): the 16 district plots are
   the top of the property ladder, bought with Dorras at the Vault's estate
   agent and built on in Build mode. Sales for PLS were retired: nothing in
   the city costs real money.

## Supply chain (from phase 2)

- Gardens grow raw goods, the Workshop or a studio makes them into products,
  warehouses store them and shops sell them.
- Shops that are kept stocked sell more.
- Driving stock between your businesses yourself pays a bonus; a van carries
  more than a hatch.

## The landmarks as game places

The buildings no longer link to the comic page. The comic page, the merch
store, X and Telegram are in the ☰ Menu.

| Landmark | Role | Phase |
| --- | --- | --- |
| The Emporium | **Market hall**: buy and sell goods at prices that move | 1 (built) |
| Drop 001 | **Clothes**: the fitting room; the original wardrobe is free, the premium wardrobe costs Dorras | built, 5 |
| The Armoury | **Guns**: the starters unlock with score; premium guns and every gun's mods cost Dorras | built, 5 |
| The Workshop | **Factory**: turn raw goods into products; levels 1-3 | 2 (built), 5 |
| Signal tower | **News, contracts and the mission board** | 3 (built), 5 |
| Post office | **Couriers**: send goods between your places when you'd rather not drive | 3 (built) |
| Apartments | **Staff**: hire workers who raise a business's output | 3 (built) |
| The Vault | **Bank and estate agent**: what you're worth, the ledger, loans, the district plots | 4 (built), 5 |
| Garage | **Dealership and tuning**: the starter cars are free, premium cars and mods cost Dorras | 2 (built), 5 |
| Start line (south bank) | **Street races** against the clock | 5 |

## Build order

1. **The economy core** (built). Dorras, the market hall in the Emporium,
   your stall in the market square, six goods with moving prices, earning
   while you're away, the Dorras readout in the header, buildings as game
   places.
2. **Making and moving goods** (built). Makers' Row's four units (garden,
   shop or warehouse), raw goods, the Workshop's factory line, and delivery
   runs in your car.
3. **Contracts and staff** (built). Signal tower contracts, Post office
   couriers, staff hired at the Apartments.
4. **The top tier** (built). Big lots bought with Dorras, and the Vault as
   the bank (ledger and loans).
5. **The city's game** (built, one batch, the owner's call): XP, levels and
   titles; the garage sells and tunes cars; the Armoury sells and upgrades
   guns; Drop 001 sells a premium wardrobe; the Vault's estate agent sells
   the district plots; the places you run gain levels; street races on the
   south bank; a mission board at the Signal tower; badges; a cartoon rival
   crew on the south bank. See "Phase 5" below.
6. **Later, with the server.** A shared market between players, south-bank
   security and raids.

Each phase comes with its own tests and docs, and gets the owner's sign-off
before the next one starts.

## Phase 1: how it works

- **Rules:** `src/scripts/city3d/tycoon.ts` (no DOM, tested in
  `tests/tycoon.test.ts`).
  - **Goods** (`GOODS`): Glow Sticks, Gummy Bears, Iced Coffee, Street Tees,
    Sneakers, Neon Signs. Cheap goods sell fast, dear ones slowly.
  - **Market price** (`marketPrice()`): two slow waves through the day,
    about ±26% round each good's base price. It depends only on the time, so
    it's the same for everyone and ready for a server. You buy a little
    above it (`ASK`) and sell back a little under (`BID`).
  - **Your stall** (`STALL_LEVELS`): level 1 holds 3 kinds of goods, 20 of
    each. Upgrades (2,500 and 10,000 Dorras) add shelves, room and
    customers.
  - **Prices at your stall:** Low, Fair or High (`PRICE_LEVELS`): Low sells
    fast on a thin margin, High slowly on a fat one.
  - **Selling** (`advance()`): customers buy at a steady pace per good. Takings
    go into the till until you Collect them. Standing at your stall in walk
    mode doubles the pace (`SERVING`).
  - **Away:** a gap of more than 2 minutes counts as time away: a quarter of
    the pace, up to 4 hours (`OFFLINE_PACE`, `OFFLINE_CAP`).
  - Everyone starts with 600 Dorras (`START_DORRAS`).
- **Screens:** `tycoon-ui.ts`: the Dorras readout in the header (a green dot
  when the till has takings), your stall's card, the market hall in the
  Emporium's panel, and the "while you were away" note.
- **The market square:** `market.ts`, on its own lot (`MARKET` in
  `layout.ts`) east of the East districts. Two rows of four stalls, a MARKET
  gantry, string lights, traders and shoppers. Stall 0 (cyan canopy, YOUR
  STALL) is yours and shows your stock. Its footprints and your spot are
  `MARKET_SITE` / `STALL_SPOT` in `solids.ts`.

## Phase 2: how it works

- **Raw goods** (`RAW_IDS`): Sugar, Coffee Beans, Cotton. They have market
  prices like everything else, but never go on a stall or shop: they go to
  the Workshop or a warehouse.
- **Makers' Row:** four units on their own lot (`UNITS` in `layout.ts`),
  across the street north of the market square. Buying one costs 2,000, then
  4,000, 8,000 and 14,000 Dorras (`UNIT_PRICES`); building on it costs
  500-900 (`UNIT_KINDS`). A unit has to be empty of goods to be rebuilt.
  - **Garden:** grows one crop (`CROPS`: sugar 3, beans 2, cotton 1.5 a
    minute) into its bins (60), also while you're away; it stops when full.
    The crop can change while the bins are empty.
  - **Shop:** a bigger stall: 4 shelves of 50, 1.5x the customers.
  - **Warehouse:** holds 300 of anything.
- **The Workshop** (the landmark's panel, or the card's Workshop tab): one
  job at a time, up to 50 items (`RECIPES`): Gummy Bears (2 sugar), Iced
  Coffee (2 beans), Street Tees (3 cotton), Sneakers (8 cotton). Raw goods
  leave its bay when the job starts; products land in the bay as they're
  made, also while you're away. Making your own is always cheaper than
  buying the product.
- **Your car** moves goods between your places (`CARGO`: Box Van 80,
  Hauler 40, Cruiser 20, City Hatch 16, Street GT 8). Park within a few steps
  of a place (`CAR_R` in `tycoon-ui.ts`) and Load / Unload on the card's Car
  tab. You load at a garden, a warehouse or the Workshop; stock on sale
  stays on the shelves. Unloading at your stall or a shop pays a 10%
  delivery bonus (`DELIVERY_BONUS`).
- **The market hall** delivers what you buy to, and sells from, the place
  picked at its top (stall, a built unit or the Workshop).
- Sending goods without driving: the Post office's couriers (Phase 3).

## Phase 3: how it works

- **Contracts** (the Signal tower's panel; rules `board()`, `accept()`,
  `deliver()` in `tycoon.ts`): a board of four orders that changes every 20
  minutes, the same for everyone (seeded from the time, like market prices).
  Each asks for a number of one product at a building's door (Drop 001, the
  Vault, the Armoury, the Signal tower, the Post office, the Apartments, the
  garage) and pays 1.45-1.8x the goods' base price. Up to three at once, 30
  minutes each, no penalty for giving one up or letting it run out. The
  goods have to come in your car: park by the door, and Deliver is on the
  card's Car tab (on foot at the door the prompt says "Deliver"). A beam of
  light marks each drop-off (`beacons.ts`). The panel also shows the news:
  what's climbing and falling at the market hall, and who wants what.
- **Your car at the market hall:** parked outside the Emporium, the market
  hall can buy straight into it and sell from it (`buyToCar()`,
  `sellFromCar()`), so contracts work before you own a warehouse.
- **Couriers** (the Post office's panel; `ship()`): send up to 50 goods from
  a garden, warehouse or the Workshop to another of your places. A call-out
  fee plus 6% of the goods' price, about a minute plus the distance. Three out
  at once; they arrive while you're away too, and wait if there's no room.
  No delivery bonus, and no contracts: those are for driving.
- **Staff** (the Apartments' panel, a new place in the city; `hire()`): a
  clerk for your stall or a shop (1.5x sales, and full pace while you're
  away), a gardener (1.5x growth) or a Workshop hand (1.5x speed). 250 Dorras
  to hire, then they keep 10% of the value of what they sell, grow or make,
  so they only cost anything while there's work. Paid from the till, then
  your balance; if they can't be paid they leave.
- Saves carry on from Phases 1 and 2 (`cleanSave()`, v3).

## Phase 4: how it works

- **Big lots** (`BIG_LOTS` in `layout.ts`, drawn by `biglots.ts`; rules
  `buyLot()`, `buildLot()` in `tycoon.ts`): Lots A, B and C, 9 x 9, east of
  Makers' Row and the market, on the streets there. 25,000, then 50,000 and
  90,000 Dorras. Built as:
  - **Superstore** (8,000): six aisles of 100, 2.5x the customers; takes a
    clerk.
  - **Factory** (10,000): its own bay (400) and production line, twice the
    Workshop's speed, jobs of up to 100; takes a hand.
  - **Depot** (6,000): holds 1,000 of anything; couriers from it cost half.
  - **Offices** (15,000, one only): your HQ; every stall, shop and
    superstore sells 20% faster.
  They're on the Units tab (chips A, B, C after Makers' Row's 1-4), on the
  market hall's and couriers' lists, and have walk-mode prompts at their
  street fronts. A lot has to be empty (and its factory idle) to rebuild.
- **The Vault** (the bank, its panel `[data-bank]`): what your business is
  worth (balance, till, goods at market price, property paid for, less
  any loan), the ledger (totals in and out by kind, and the latest
  movements; `book()` writes it from every money-changing rule), and loans:
  1,000-50,000 Dorras, limited by your property (1,000 plus half of it), a
  flat 10% fee, and 25% of your takings go to it until it's paid off (or
  pay any time). Only one at a time. No interest rates or savings returns
  anywhere: Dorras are game money.
- Saves carry on from Phases 1-3 (`cleanSave()`, v4).

## Phase 5: the city's game

- **Rules:** `catalog.ts` (prices, levels, the XP curve, mods), `tycoon.ts`
  (the save, v5, and every function that spends or earns), `races.ts`,
  `missions.ts`; all DOM-free and tested (`tests/game.test.ts`). Screens
  get at the save through `GameDeps` in `ui.ts` (`save()`, `commit()`,
  `toast()`, `sfx()`).
- **XP and levels** (`xpForLevel`, `levelFor`, `titleFor`, 40 levels): XP
  for every sale, contract, upgrade, purchase of property, takedown, race and
  mission; badges (lifetime milestones) add more. The level pill in the mode
  header shows it; levels gate the premium catalog and the district plots.
- **The starter tier is free** (the owner's call): the five original cars,
  the four original guns (still unlocked by score) and the original
  wardrobe. Everything new costs Dorras and needs a level.
- **The garage** sells three premium cars (Street Thunder, Big Rover, Hyper
  Comet) and tunes every car: engine, turbo, tyres and a roof rack, three
  levels each (`CAR_MODS`, `carStats`); mods change the handling and the
  boot.
- **The Armoury** sells three premium guns (Hand Cannon, Tri-Tap, Belt
  Feeder) and upgrades any gun at its workbench: barrel, extended mag, grip
  and stock, three levels each (`GUN_MODS`, `applyGunMods`).
- **Drop 001** sells the premium wardrobe (`WARDROBE_CATALOG`): new fits,
  hats, bags, things to hold, a watch and two colour packs.
- **The estate agent** (in the Vault): the sixteen district plots at
  `PLOT_DORRAS`, dearer with each one you own, level `PLOT_LEVEL` to buy;
  building on one costs `BUILD_COSTS` per design (the difference when
  changing); selling back pays `PLOT_REFUND`. Build mode's Plots button
  sums it up.
- **Levels for your places:** units, big lots and the Workshop go up to
  level 3 (`upgradePlace`): more room, more customers, faster work. The
  buildings show it.
- **Street races** (`races.ts`): four courses of checkpoints on the roads
  from the start line on the south bank avenue (in front of South 4), a
  countdown, a prize scaled by par, best times kept, extra XP for par and
  records.
- **Missions** (`missions.ts`): a board in tiers by level, up to three at
  once, progress counted from when you took one (the save's `counters`),
  claim for Dorras and XP. Badges land on their own.
- **The crew** (`combat-sim.ts`): a cartoon rival crew patrols the south
  bank; knocking them down counts for missions and badges. They shove, never
  shoot; the city north of the river stays a safe hangout.
- Saves carry on from Phases 1-4 (`cleanSave()`, v5).

## Phase 6: the kart park (the owner's call)

A Mario-Kart-style place of its own, outside the Parkway in the
north-east: `kartpark.ts` (the site, the track network and the courses as
data), `kart-sim.ts` (the rules), `kartpark3d.ts` (the site in 3D),
`karts.ts` / `kart.ts` (the karts and the race on screen) and `kart-ui.ts`
(the hut's menu, the HUD, the results). Karts stay on the track: they're
racing machines, not city cars.

- **The site:** the whole north-east quadrant outside the Parkway, to the
  world's edge (140 x 144 tiles, about 250 x 260 m: the owner wanted it big,
  the map's main feature), fenced, a slip road and a gate on its south
  side, the kart hut (its door opens the menu), a grandstand along the start
  straight, a big screen, pits.
- **One track network, many courses** (the owner's call): open sectors
  joined at nodes. The Neon Loop (about 370 tiles a lap, 10 wide): the
  start straight down the west side, the west lobe, a diagonal across the
  middle, the east hairpin, back over the middle on a flyover, the hump
  that throws karts into the air. The Summit (about 390): the start
  straight, then north into a banked bowl, a tunnel and a wet patch, and a
  descent back into the west lobe. The Grand Prix (about 685, two laps):
  the north detour, a bridge back over the north sector, down the east
  edge into the hairpin. Each has a reverse course. A dirt shortcut cuts
  the hairpin: slow unless you hit it boosting.
- **The racing:** arcade karts, a hop into a drift that builds a boost in
  three stages, boost pads, bumps weighted by kart, seven rivals on the
  racing line with a rubber band. **Engine classes** set everyone's pace:
  Street (Lv 1), Sport (Lv 3), Neon (Lv 8). **Cups are series** of four
  races with points (15-12-10-8-6-4-2-1), standings between races, a trophy
  and a prize for the series: Rookie (Street), Pro (Sport), Neon (Neon).
  Single races and time trials (alone, no items, pick the class) stay.
- **Leaderboards and ghosts:** fastest lap and best run per course per
  class, local boards of your best runs (built so the game server can hold
  everyone's later), your best-lap ghost and a par ghost in time trials,
  a daily challenge (a course and class, beat the target once a day).
- **Items** from item boxes, dealt by place: Rocket, Oil Slick, Gummy Bomb,
  Homing Pigeon, Shield, Glow Trail. A hit spins a kart for a second;
  nothing ever hurts.
- **The karts:** the Pocket Rocket is free; Zip (Lv 3), Tank Kart (Lv 5)
  and Big Wheel (Lv 8) cost Dorras at the hut, where every kart gets a
  motor, soft tyres and a nitro kit (three levels each) and a paint.
- **The economy:** prizes by place (`CUPS`) and by series (`SERIES_PRIZES`),
  the daily challenge's prize, XP for finishing, podiums, wins, records,
  beating par, series podiums and wins (`XP.kart*`, `XP.series*`), counters
  `kartRaces` / `podiums` / `kartWins` / `kartHits`, six missions and five
  badges. Saves carry on (`cleanSave()`, v7).
- **Later (not built):** global leaderboards on the game server when
  multiplayer resumes; presentation (crowd, fireworks, replays).
