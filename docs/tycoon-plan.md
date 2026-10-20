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
| The Workshop | **Factory**: turn raw goods into products | 2 |
| Signal tower | **News and contracts**: "deliver 20 crates to East 2" | 3 |
| Post office | **Logistics**: hire deliveries when you'd rather not drive | 3 |
| Apartments | **Staff**: hire workers who raise a business's output | 3 |
| The Vault | **Bank**: your balance, history, savings for expansion | 4 |
| Garage | Cars and cargo space | 2 |

## Build order

1. **The economy core** (built). Dorras, the market hall in the Emporium,
   your stall in the market square, six goods with moving prices, earning
   while you're away, the Dorras readout in the header, buildings as game
   places.
2. **Making and moving goods.** Shop units, the Workshop and gardens as
   producers, warehouses, delivery runs with your car.
3. **Contracts and staff.** Signal tower jobs, Post office logistics,
   Apartment hires.
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
