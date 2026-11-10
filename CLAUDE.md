# Working on this repo

This is **the** Degen Emporium site. An older multi-page site existed before
it and has been retired completely. Build only on what's here.

## The game's name

- The game is **The Trenches** (the owner's call, 2026-11): its title logo
  (`src/assets/trenches-logo.png`, the owner's art with its white
  background cut away) heads the title screen and the maintenance cover
  (the city's header has no logo since the controls plan's Phase 5, the
  owner's call). The homepage's tab
  reads "The Trenches | The Degen Emporium"; the header's title while the
  city loads, the no-3D card and the maintenance cover say The Trenches.
  The city it's set in is still Sector 7 (the welcome tip, the map, the
  places), and The Trenches is also the neighbourhood of that name
  (below). The comic page keeps the Emporium's own name and logo.

## The city's name

- The city is **Sector 7** (the owner's call; it was "Degen City" before).
  Use "Sector 7" in every bit of copy, banner and sign that names the
  city. The localStorage keys and save names keep their `degen-city-`
  prefixes (`degen-city-tycoon-v1` and the rest): renaming them would lose
  every visitor's save.

## Never bring back the old site

- The site is the Sector 7 homepage (`src/pages/index.astro`), the Emporium
  comic page it links into (`src/pages/emporium.astro`) and `404.astro`. Do not
  add or restore pages like `/news`, `/blog`, `/store`, `/shop`, `/alpha`,
  `/tokenomics`, `/vault`, `/terminal`, `/team`, `/projects`, `/about`,
  `/contact` or `/links` unless the owner asks for that page by name.
- Do not restore anything from git history (old pages, art, team portraits,
  graffiti headers, sticker sheets, the acid-green palette, the "Connect"
  wallet button, the "MAINNET" badge). Old commits are history, not source.
- New pages, sections or art only on the owner's explicit request.
- The `nft-minter` branch is a separate project. Never merge it, or copy
  anything from it, into `main` or any website branch.

## How this guide works

- This file is the short version: the rules that hold everywhere, and an
  index. The detail of every district, system and screen (which file holds
  what, the names of its data, how its pieces fit) is in `docs/guide/`, a
  file a topic, moved there word for word from this file.
- **Before changing an area, read its guide file** (the index below), and
  the plan it names in `docs/` if it has one. Don't work from memory of
  how a thing is built.
- **When what a guide file describes changes, update that file**, not this
  one. Add a line here only for a rule that holds across the whole project.
- The plans are `docs/*-plan.md`. Build one phase at a time, each with the
  owner's sign-off, and keep the plan up to date.

## The guide's index

| Working on | Read |
|---|---|
| Downtown, the outer districts, traffic's routes, the ring highway's line, the street plan, the world's size, the river, the wall, the polish and performance plans' status | `docs/guide/city-layout.md` |
| Places, the world map, waypoints, taxis, the river bus, the metro, sound by district | `docs/guide/getting-about.md` |
| The Trenches (streets, projects, commons, grit, street walls, Trench Avenue's places, corner shops, riverside, waterfront, Night Market, The Block) | `docs/guide/trenches.md` |
| Westlake Park, the stadium, the north side's gardens | `docs/guide/westlake.md` |
| Uptown, its towers, plaza, boulevard, Sector 7 Tower, the Sky Wheel, Uptown North | `docs/guide/uptown.md` |
| Crestmont and its hills | `docs/guide/crestmont.md` |
| Southbank Docks | `docs/guide/docks.md` |
| The Neon Mile, its resorts, shows and monorail | `docs/guide/neon-mile.md` |
| Sunridge | `docs/guide/sunridge.md` |
| Lot 9, its tunnel and the Field | `docs/guide/lot9.md` |
| Endswood Estate, what's below ground, its decks | `docs/guide/endswood.md` |
| The raised highway, its exits, turn lanes, country roads, street wear | `docs/guide/highway.md` |
| The ground palette, ground cover, verges, rolls, Southfield, the fringes, lamps by district, the seams, the review shots | `docs/guide/blend.md` |
| Palm Court and Starlight Mall, inside the mall | `docs/guide/mall.md` |
| Sector 7 Airport, flying | `docs/guide/airport.md` |
| The Emporium, the Armoury, Liberty, Kestrel and Harbour bridges | `docs/guide/landmarks.md` |
| How traffic, people, buses and boats behave; dusk, wind, thunder | `docs/guide/city-life.md` |
| The car models, the vehicle upgrade, the garage, driving, motorbikes, boating | `docs/guide/vehicles.md` |
| The kart park, its circuit, races, karts and save | `docs/guide/kart-park.md` |
| Degen's body, skeleton, wardrobe, clothes, tailoring, crowds | `docs/guide/character.md` |
| Motion capture, the animator, contact, moments, emotes, the crowd's acts, the lab | `docs/guide/animation.md` |
| Walk mode, collisions, the ground under a point | `docs/guide/walk-mode.md` |
| The inventory, fists on the street, sparring partners, free play | `docs/guide/inventory.md` |
| Target practice, the guns, the gun store, the Fight Club | `docs/guide/combat.md` |
| Dorras, the market, units, lots, contracts, staff, the Vault, missions, Getting started, the save and its backup | `docs/guide/economy.md` |
| Drop 001's fitting room, the character screen, the premium wardrobe | `docs/guide/fitting-room.md` |
| Menus, the start menu, the header, the hub, pins, touch controls, views, keys | `docs/guide/menus.md` |
| Bloom, z-fighting, cut-out signs, the comic page, palette, type, styles | `docs/guide/visual-rules.md` |
| Phones, start-up, lazy chunks, baked data, textures, draw calls, shadows, near and far, sites, building kits, lazy districts, `?fps`, `?bench`, the snapshot | `docs/guide/performance.md` |
| The owner's live settings (places and features switched from outside) | `docs/guide/live-settings.md` |
| Wallet log-in, multiplayer, the game server | `docs/guide/multiplayer.md` |
| What the tests cover and how they run | `docs/guide/tests.md` |
| Build mode and the grand station (both retired) | `docs/guide/retired.md` |

## Rules that hold everywhere

### The city

- The homepage is Sector 7 in 3D, in Degen's style: black ink outlines,
  flat cartoon shading, PulseChain neon (`src/scripts/city3d/`, three.js).
- **Buildings are places in the city's game**: each opens its own panel,
  never the comic page or an outside link. The comic page, the merch store
  and X / Telegram live in the hub's Map tab only. Places not built yet say
  "coming soon".
- **Nothing that exists moves.** `tests/snapshot.test.ts` holds every
  place, door, lot and street where it stands; rewrite it only when the
  owner moves something on purpose. Prices of lots don't change.
- **The world's size is final** (the wall): new districts go inside it.
  Build on open land only when the owner asks. Anything written against
  the edge must pass `npm test` and `npm run test:wide`.
- Anything new written in fixed numbers south of the river adds
  `SOUTH_SHIFT` or `WIDEN` as its neighbours do (`city-layout.md`).
- **The Emporium is the centrepiece**: keep it the tallest, most detailed
  building. Everything else stays under it, but for the owner's exceptions
  (Uptown's and Uptown North's towers, the Neon Mile's resorts, the Docks'
  cranes, St Aldwyn's spire, the wall).
- **Made-up names only.** Signs, shops, airlines, cars, guns and people use
  fixed made-up copy: never a real brand, make, badge, crew or person,
  never the token, never a price or a number on a sign. Visitors and
  players can't type text that shows.
- **Nothing threatening, and nothing in the city attacks you.** Targets are
  the dummies and the drones only; the crowd is never a target; there's no
  player health outside the Fight Club's ring.
- **Retired, the owner's calls; don't bring any back without the owner:**
  the 2D map, the stage and screen on the hangout square, the skyline ring
  of dark towers, Sector 7 Central (the grand station), the street races,
  Build mode, the rival crew, the test district, the stadium's footbridge,
  the gummy bag.

### The game

- **Dorras** are the city's money: earned by playing, never bought, never
  cashed out, never given a real-money value or called an investment,
  never tied to the token or the Shopify store. Nothing in the city costs
  real money. Loans are a flat fee: no interest, returns or APY wording.
- Rewards are Dorras and XP only: no prizes, nothing real.
- **Free play is on everywhere for now** (`FREE_FOR_NOW` in
  `astro.config.mjs`, the server's `define`); ending it is the owner's call
  (`inventory.md`).
- A change to a save keeps its migration (`cleanSave()` and the other
  `clean*()` loaders), and a new save in localStorage needs its key in
  `BACKUP_KEYS`. The `degen-city-` keys keep their names.
- A new way into a feature goes through `live.closed()`; a new place goes in
  `PLACES` and `LIVE_PLACES`, with its marquee line and live line.

### The code

- **Rules and view are split.** Rules go in DOM-free files with tests
  (no DOM, no scene objects, a seeded generator in the sims); the view only
  draws them. A new rules file goes on `DOM_FREE` in `eslint.config.js`.
  Code the game server bundles stays DOM-free.
- Screens reach the save through `GameDeps` (`save()`, then `commit()`),
  never by writing it themselves.
- When a landmark moves or changes size, update its collision boxes and
  doors with it; when a handler in `walk.ts` changes, change its line in
  `keymap.ts`.
- Run `npm run typecheck`, `npm run lint` and `npm test` before a commit;
  after a build, `npm run budget`. Fix the code, not the test, unless the
  test was wrong, and extend the tests with what you add.

### Performance (the detail is `performance.md`; read it before adding anything drawn)

- **Draw calls are the budget.** Fixed geometry goes through a `Batch` and
  `tileBatch()`, in sites (`site()`), never in bulk outside them; many
  copies are instanced; fine detail is near only. Never change a plain
  `toon()` or `neon()` material's colour at runtime.
- **A new district's drawing is its own chunk** (`LAZY_DISTRICTS`), its
  data DOM-free in the boot; drawing-only data stays out of the boot.
- **Features load when they're used**, through `lazy()`.
- **The budgets** (`scripts/budget.mjs`) are raised only on purpose, never
  to get a build through.
- **Keep phones light**: the low tier's trims stay; check new things on the
  phone tier. Measure with `?fps` and `?bench` before and after anything
  that could make the city heavier.
- One render loop only: (re)start it with `loop()` in `index.ts`.
- Canvas textures go through `canvasTex()` (baked) or `liveTex()` (drawn
  from the save or changed while running). Never call `renderer.compile()`
  bare: use `compileFor()`.
- **Motion is optional**: under `prefers-reduced-motion` the city stands
  still and clock-driven things hold a still frame. Sound is off until the
  visitor turns it on.

### Looks and screens (the detail is `visual-rules.md` and `menus.md`)

- **Minimal bloom, nothing washes out**: only small, very bright things
  pass the threshold; never light a whole roof or slab.
- **Nothing flush**: two faces in one plane flicker; keep them about 5 mm
  apart. Floating cut-out signs need `occlude()`.
- Ground, kerb, tree and lamp colours come from `palette.ts`, never a hex
  of their own.
- **Every menu in the city is the arcade kit** (`.mk`, or `.mk-skin`),
  never the PulseChain gradient; the gradient is for the comic page and
  the site outside the city's menus (`brand/README.md`).
- Every card and menu can be closed. Menu copy is short: labels 1-3 words.
- Any new always-visible overlay goes in `chrome` in `index.ts`; a new
  touch button is a `.tc` with its slot in `LAYOUTS`.
- Check every change at 320, 375, 768, 1024 and 1440px wide, and phones
  upright and on their side: no sideways scroll, nothing overlapping,
  no text clipped by a slanted edge.
- `Base.astro` imports the styles in a fixed order; keep it.

### A new district or place

Each step is explained in `blend.md`, `performance.md` and `character.md`.
In short, a district needs: its streets and blocks in the street plan, its solids, its land in
`KEEPS`, its ground in `INFLUENCES`, its edge in `BY_CHARACTER`, its lamp
in `lampStyle()` (and `SODIUM_AREAS` if sodium), its crowd's style in
`STYLES` / `districtAt()`, its chunk in `LAZY_DISTRICTS` and its builders in
`serveSites()`, any new open patch named in `GAP_NAMES`, tests, and its own
guide file listed in the index above.

## Tests

- `npm run typecheck`, `npm run lint`, `npm test` (`npm test -- drive` runs
  matching files), `npm run test:wide` (the bigger world: run both when
  anything reads the edge), `npm run budget` after `npm run build`. The
  "Build site" Action runs them; a failure means no zip.
- Browser checks (the widths above, walk and drive flows) are done by hand
  with Playwright against `npm run preview`.
- What they cover, file by file: `docs/guide/tests.md`.

## Hosting

- degenemporium.com is a static build hosted on Hostinger, deployed from
  GitHub (the owner linked them, 2026-11: a push to `main` goes live by
  itself; no more zips extracted into `public_html` by hand). The "Build
  site" GitHub Action still builds every push to `main` into a downloadable
  zip (artifact `degenemporium-site`) and runs the checks.
- If the live site ever shows the procedural walk instead of the motion
  capture, the clips file didn't fetch: walk.ts says so once in a toast and
  `?fps` reads `motion capture failed` (a stale or partial upload is the
  usual cause; it's tried again on the next walk).
- Keep the site fully static (no server routes) and keep `public/.htaccess`
  in the build.
- **No multiplayer on degenemporium.com** (the owner's call): the "Build
  site" Action builds without `PUBLIC_GAME_SERVER`, so the city runs on its
  own there: the whole city game in the browser's save, no Online switch,
  multiplayer or Connect wallet. Don't set it in that Action.
- **Multiplayer lives on workers.dev only**: the `server/` Worker (emporium
  on https://emporium.144collective.workers.dev, deployed by Cloudflare's
  Workers Builds from `main`) serves the game server and its own copy of
  the site, built against itself (`build` in `wrangler.jsonc`, which also
  makes the textures and runs the budget, as the Action does: the polish
  plan's Phase 4).

## Content guardrails

- **The token is confidential until launch.** Never put its name, ticker,
  contract address or launch details in the site's markup, alt text, meta
  tags, file names or commit messages. Window 05 shows a blurred *decoy*:
  CSS blur only hides things visually, and the HTML is public. Reveal it
  only when the owner says launch is live.

- All copy is draft until the owner says otherwise; keep the draft note.
- No prices, stats, APYs, audits, partnerships or testimonials unless the
  owner supplies them as facts. Dorras prices in the game (units, lots,
  cars, guns, clothes) are game numbers, not real prices. No financial
  advice: units, lots and shops are places to run in the game, never
  pitched as an investment.
- PulseChain is a real project: say "PulseChain native", never imply an
  official partnership or endorsement.
- Only link to destinations the owner has confirmed (currently X, Telegram
  and the Shopify store in `src/data/site.ts`).
- The Shopify store is public too: anything the site pulls from it (product
  names, images, descriptions) must not reveal the token either.
