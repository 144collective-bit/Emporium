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
- **PLS:** earn-only for now. Topping up with PLS comes later, through the
  game server (a browser balance can be edited and lost, so real money never
  goes through it).

## How you grow

1. **A market stall.** Everyone starts with a free stall in the market square.
   Buy stock in the market hall, set your prices, and the city's passers-by
   buy from you.
2. **Shop units.** Small lots of your own: a shop, studio, garden or
   warehouse.
3. **District plots.** The big plots are the top tier, for chains and towers.
   Plots keep their real PLS sale for when the server returns; the demo
   builder stays as it is in the meantime.

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
| Drop 001 | Clothes (the fitting room, free for now) | built |
| The Armoury | Guns and gear for target practice | built |
| The Workshop | **Factory**: turn raw goods into products | 2 (built) |
| Signal tower | **News and contracts**: "deliver 19 Iced Coffee to the Armoury" | 3 (built) |
| Post office | **Couriers**: send goods between your places when you'd rather not drive | 3 (built) |
| Apartments | **Staff**: hire workers who raise a business's output | 3 (built) |
| The Vault | **Bank**: your balance, history, savings for expansion | 4 |
| Garage | Cars and cargo space | 2 (built) |

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
4. **District plots as the top tier.** The Vault and the bigger buildings.
5. **Later, with the server.** PLS top-ups, a shared market between players,
   south-bank security and raids.

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
