# Working on this repo

This is **the** Degen Emporium site. An older multi-page site existed before
it and has been retired completely. Build only on what's here.

## Never bring back the old site

- The site is the Degen City homepage (`src/pages/index.astro`), the Emporium
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

## Design rules

- The homepage is Degen City in two layers, both in Degen's style (black ink
  outlines, flat cartoon shading, PulseChain neon):
  - **3D** (`src/scripts/city3d/`, three.js): toon materials, ink outlines
    from a normal/depth post-pass, bloom, day/night from the visitor's clock,
    weather, traffic, people, optional synthesised sound. Clicking a
    building flies the camera in and opens a glass panel.
  - **2D** (`src/lib/city.ts`): the isometric SVG map. It's the loading
    poster, the fallback without WebGL, and the "2D map" view.
  Both layers share the core city's block layout; keep them in step when
  buildings change. The ring roads and plot districts exist in 3D only. Spot links, pin copy and panel copy live in
  `src/components/CityMap.astro`. Buildings link only to `/emporium` (or its
  window anchors: `#drop`, `#workshop`, `#vault`, `#plan`) or to the
  confirmed links in `src/data/site.ts`.
- Keep the city's motion optional: under `prefers-reduced-motion` the 3D
  city stands still (no fly-in, no traffic), CSS animations stop and the 2D
  map's SMIL traffic is paused. Sound is always off until the visitor
  turns it on.
- Keep phones light: `src/scripts/city3d/index.ts` picks a quality tier
  (fewer cars and people, no shadows, smaller bloom on phones), runs phones
  at 30fps while nobody is touching the city, and steps quality down
  (pixels, then shadows, then bloom; never the ink outlines) if frames are
  slow. When frames stay fast again, bloom and then pixels come back (once
  each; shadows stay off, re-enabling them recompiles every material).
- One render loop only: always (re)start it with `loop()` in `index.ts`,
  which cancels any frame already queued. A hidden tab holds its queued frame
  back, so a bare `requestAnimationFrame(frame)` on return stacks a second
  loop (each tab switch another) and the frame rate sinks. 120/144 Hz screens
  draw every other refresh (steady 60-72fps), and nothing is drawn while the
  city is scrolled out of view.
- `?fps` in the address shows a performance readout (`.city-stats`, built in
  `index.ts`): fps, slowest frame, draw calls and triangles per frame, quality
  tier, pixel ratio and any quality stepped down. Use it on real devices
  before and after changes; it's invisible without the parameter.
- The Emporium arcade tower (`emporium()` in `landmarks.ts`, and in
  `city.ts` for the 2D map) is the centrepiece: keep it the tallest, most
  detailed building. Its LED wall shows (`drawWall`), pixel font, ticker and
  signs use fixed copy only (Insert coin, Player 1, Game on, Hi score with
  made-up names, GM degens, Arcade, Prizes); never put token details on
  them. The rooftop hologram is `createDegen()` in hologram light. Its
  podium, claw machines and prize booth are mirrored in `walk.ts`
  (`SOLIDS`, `CAMERA_ONLY`).
- The Armoury (`armoury()` in `landmarks.ts` and `city.ts`) is a modern
  military compound and the players' gun store, not a castle: blast walls
  with razor wire, steel watchtowers, a checkpoint (booth, boom barrier, sign
  gantry) and a flat-roofed concrete gun store with a shopfront, canopy sign
  and a counter where players gear up. It links to the plan window. Keep it
  stealth dark at night (low red and green lights, no floodlights). Its
  soldiers are instanced; the checkpoint guards salute and the barrier lifts
  when the walker (`walker` in `life.ts`) comes near. Its walls, towers,
  checkpoint, store, counter and vehicles are mirrored in `solids.ts`
  `SOLIDS` (shared with the game server).
- Every character is one shared Degen body (`src/scripts/city3d/character.ts`):
  sculpted after the brand art, with knees, elbows and hand sockets (for
  held items such as guns later). `createDegen()` builds one figure (the
  player, the hologram); `createCrowd()` builds instanced crowds
  (pedestrians, soldiers) with a draw call per part, not per person.
  Outfits (`suit`, `hoodie`, `soldier`) only change clothes and colours;
  poses come from the helpers there (walk/run, idle, look, chat, sit, march,
  attention/salute, dance). The cap patch is the Emporium diamond: never put
  another brand's logo on it. Phones get the `light` crowd without small
  details.
- Floating cut-out signs (FX layer with a transparent texture, like the roof
  logo) need `occlude()` from `kit.ts`, or the ink outlines of whatever is
  behind them get drawn across them.
- Every card and menu can be closed: panels, the gun store and the buy
  dialog have an × (`.city-panel-close` / `.shop-close`); drop-open menus
  (City settings, Directory, walk panels with their `.pop-head` ×) also
  close on a tap outside and on Esc. The welcome card has an × on tablets
  and desktops (remembered as `city-card` in localStorage) and isn't shown
  on phones; when it's hidden the "Draft · v0" tag keeps the draft note.
- 3D pin labels stay on screen and fold to dots where they'd sit under the
  city's own buttons and cards (`chrome` in `index.ts`); add any new
  always-visible city overlay to that list.
- The city page has **one header**: the city's own bar (`.city-head` in
  `CityMap.astro`, copy in `head.ts`), slim dark glass. The site bar
  (`Nav.astro`) is left out there (`<Base nav={false}>`) and stays on the
  other pages. Left to right: the logo (home link), the mode title and
  subtitle (City view, Walk mode, Build mode, City map (2D)), then on the
  right (walk tabs, ammo and score while walking), the City / Walk / Build
  switch, and the tools: a ⚙ Settings button (time, weather, sound, reset
  view, 2D map; 3D only, not while walking; never open by default) and a
  ☰ Menu (the directory, then PulseChain native, X and Telegram; not while
  walking). Their cards drop down under them (`.head-panel`, one open at a
  time, with a `.pop-head` ×), spanning the width on phones. Tablets show
  Settings and Menu as icons; phones put logo, title, ⚙ and ☰ on the first
  row and the switch, with names, across the second (walking: title and
  switch, then the walk tabs, ammo and score). Its live height is
  `--head-h`; anything pinned to the top of the city sits below it
  (`top: calc(var(--head-h) + 12px)`).
- The comic-window layout in `src/components/ComicPage.astro` is the design.
  Each window is defined by its ink outline; keep content inside the slants.
- Palette is the PulseChain gradient. Follow `brand/README.md`: gradient for
  borders, glows and large type; `--p-cyan` for small text; buttons are
  gradient-bordered with white text, never gradient-filled.
- Type: Big Shoulders Display (headlines), Inter (body), JetBrains Mono
  (labels).
- Check every change at 320, 375, 768, 1024 and 1440px wide: no sideways
  scroll, no text clipped by a slanted edge.

## Drop 001's fitting room

- Drop 001's panel (`data-panel-tpl="shop"` in `CityMap.astro`) has the
  fitting room (`fitting.ts`): item cards by tab (Fit, Head, Shades, Bags,
  Hand, Extras, Kicks), colours, and a turning preview of the player's Degen drawn by a
  small second renderer with the same ink outlines, only while the panel is
  open (still under reduced motion; drag turns him).
- The look belongs to `profile-ui.ts` (browser and player profile); the
  fitting room only calls `wear()`. Items are free and cosmetic, only for
  the city: no prices, never sold, never tied to the Shopify store or the
  token.
- A new item needs a `Look` field with its palette and rules in
  `profile-data.ts` `cleanLook()` (the server checks it too), the mapping in
  `lookOutfit()`, the part in `character.ts` and an entry in `fitting.ts`
  `TABS`. One hat (`hat`), one bag (`bag`) and one thing in the hand
  (`held`) at a time; `cleanLook()` also upgrades looks saved in older
  formats, so keep its migration when fields change. Held items are put
  away while Degen carries a gun (`Degen.held`).

## Walk mode (3D)

- `src/scripts/city3d/walk.ts`: the playable Degen, over-the-shoulder and
  first-person camera, mouse (pointer lock), keyboard, touch and gamepad
  controls, collisions and door prompts. The Controls panel's settings
  (Look: speed, invert, first person; Shooting: "Aim when firing"
  `settings.autoAds` = off / touch / always) are saved under
  `degen-city-walk-v1` in localStorage. The HUD markup (Controls panel, Run
  and Jump buttons, joystick) is in `CityMap.astro`; `walk.ts` expects every
  `data-walk-*` element to exist.
- Buildings only lift and glow on hover in City view; while walking nothing
  is hovered and nothing lifts (Degen stands on the same ground).
- Esc frees the mouse first and only then stops walking. Door panels free
  the mouse so their links can be clicked.
- While walking (`body.is-walking`, set in `index.ts`) the header drops the
  logo on tablets and phones and the Settings and Menu buttons, and carries the walk tabs
  (Controls, Profile, Online, Emote), ammo and score at the top (two rows on
  phones). The touch buttons stay at the bottom.
- The gun store is compact: a 2 x 2 grid of guns beside the picked gun's
  details; on upright phones a short bottom sheet with the guns in one row.
  Check it at phone widths upright and on its side (no scrolling needed).
- Collision footprints (`SOLIDS`) and door spots (`DOORS`) mirror
  `landmarks.ts`. When a landmark moves or changes size, update both.
  Placed buildings block via `plots.solids()`; parks stay walkable.
- Cars yield to the walker through `walker` in `life.ts`.

## Target practice (3D walk mode)

- Solo shooting practice. Only the player's Degen carries a gun, picked up
  at the gun store counter in the Armoury (`RACK` in `solids.ts`, the
  counter itself in `armoury()`). Targets are the cardboard dummies (`DUMMIES`) and the patrol
  drones; never make pedestrians, soldiers or other characters targets.
- **Rules and view are split, ready for multiplayer.** `combat-sim.ts` owns
  the rules (ammo, fire rate, spread, hits, health, respawns, score, streaks)
  on a fixed 60 Hz tick, takes per-player inputs and emits events. It must
  stay free of DOM, scene objects and `Math.random` (seeded generator only)
  so a server can run it. `combat.ts` is the local view: it feeds the local
  player's input in and draws / plays the events. New gameplay goes in the
  sim first; looks and sounds in the view.
- **The gun store** (`gunshop.ts`, markup `data-shop` in `CityMap.astro`)
  opens at the Armoury counter. Four guns, each defined once in
  `combat-sim.ts` `WEAPONS` (stats, `need` = lifetime score that unlocks it)
  and modelled in `guns.ts` `SPECS` (parts, muzzle, sight, hand spots): the
  Assault Rifle (holo red-dot, also carried by the soldiers via
  `rifleGeometry()`), Buzz SMG, Street Sweeper shotgun (pellets, iron sights)
  and Long Shot marksman rifle (scope, full-screen scope view). Guns unlock
  with score and are free to take: never sell them, price them in money or
  tie them to the token. Keep them cartoon: no real-world gun names, brands
  or markings. A new gun needs a `WEAPONS` entry (with a `short` name for the Swap
  button), a `SPECS` entry (with its
  third-person `hold` spot for the front hand), store art (`ART` in
  `gunshop.ts`) and a shot sound (`SHOT_SOUND` in `combat.ts`).
- In third person (the player and other players), `stance.ts` `holdGun()`
  puts both hands on the gun with `reachArm()` in `character.ts`: the
  shooting hand on the pistol grip (every gun's origin), the other on its
  `hold` spot, or on the magazine during a reload. Longer guns turn Degen
  side-on just enough for the front hand to reach. Call it after the walk
  and jump poses so they don't pull the hands off.
- Finishes (`SKINS`) are cosmetic and work on every gun. Lifetime score,
  finish and last gun are saved in the browser under `degen-city-combat-v1`
  (or the player profile online).
- First person is the default when walking starts. The hands
  (`viewmodel.ts`) are built `K` times bigger and further out (the camera's
  near plane is 0.5 m) and drawn in the front of the depth buffer, with
  their own flat shading (city lamps would otherwise light them wrongly).
  Keep the red dot on the line of sight: scale the whole holder, never only
  its position.
- Hits are hitscan from the camera centre. Bullets stop on everything in
  `SOLIDS` except the dummies' own footprints (`SHOT_SOLIDS`), on plot
  buildings and on the ground. When dummies move, their footprints follow
  `DUMMIES` automatically.
- Keys: click fires, right-click aims, R reloads, G holsters, Q / 1-4 swap
  guns; Caps Lock (not R) toggles run. Where the mouse can't be captured
  (`noLock` in `walk.ts`), click fires and dragging looks. Only a real mouse
  fires from the canvas (taps send mouse events too).
- Swapping (`swap()` in `combat.ts`, `sim.swap()`, the `swap` message): once
  geared up, any unlocked gun, anywhere; each gun keeps its own ammo
  (`stash`), a new one comes full, the counter refills all, and the new gun
  fires after `SWAP_TIME`. On touch the Swap button (`data-walk-swap`, gun's
  `short` name in `data-swap-name`) sits above Fire; the desktop HUD shows the
  gun's name (`data-gun`).
- Touch: dragging the Fire button also looks (one thumb shoots and steers);
  keep its `touch-action: none` so the browser never cancels a held Fire. The
  right-hand buttons and the door prompt must not overlap at any phone size,
  upright or on its side (narrow phones get a smaller stick). With "Aim when firing" on, firing also aims (`aimNow` in
  `walk.ts`, held `AUTO_ADS_HOLD` after the trigger is let go); use `aimNow`,
  not the aim input, for anything that depends on aiming (spread, sight,
  zoom, the aim sent to the server). The combat HUD (`data-cross`, `data-hitmark`, `data-dmg`,
  `data-pops`, `data-mag`, `data-reserve`, `data-reload-hint`, `data-score`,
  `data-streak`), the finish picker (`data-skins`, `data-lifetime`) and the
  Fire / Aim / Reload / Swap buttons live in `CityMap.astro`; `combat.ts` and
  `walk.ts` expect them.
- Gun sounds go through `sfx()` in `sound.ts`, so they stay silent until the
  visitor turns sound on. Under reduced motion the drones hover in place.
- Score, streaks and finishes are for fun only: no prizes, real rewards or
  token tie-ins.

## City builder (3D build mode)

- Each district around the core is **one large plot** (its 3 x 3 squares
  merged into one): North 1-5, West 1-3, East 1-3, and the South row (S1-5)
  across the river. The south bank has its own east-west road
  (`SOUTH_ROAD`, so roads are split into `NS_ROADS` / `EW_ROADS` in
  `world.ts`), a lamp-lit riverside walk, traffic over the four bridges and
  pedestrians round the south row (`DISTRICTS`, `PLOT_PRICE`, `BUILDINGS`, `cleanDesign()` in
  `src/data/plots.ts`, shared with the server). Plot grid, overlay and building
  generators are in `plots.ts`, the interface in `builder-ui.ts`. The core
  landmarks are not for sale.
- **Price: 20,000,000 PLS per plot** (the owner's price, `PLOT_PRICE` and the
  server's `LAND_PRICE_PLS`). The server's value is the one that counts.
- The eight designs (`GEN` in `plots.ts`) are drawn at the large plot's own
  scale (8.2 x 8.2 tiles, front facing +z before the owner's turn), each with
  its site dressed around it from the shared helpers (paving, `tree`, `pine`,
  `lamp`, `bench`, `planter`, `fence`, `bollards`, `lightString`). People-scale:
  doors ~1.2-1.7 tall, floors ~0.95-1.0. Each design pushes its walk-mode
  footprints to `ctx.solids` (turned with the building; parks stay walkable).
  Tower and loft floors are capped in `BUILDINGS` so nothing outgrows the
  Emporium (its roof is ~12.5 tiles up; an 8-floor tower's mast tops out at
  ~11.9). Keep it that way when adding designs.
- **Real sales (live mode)**, when the site is built with `PUBLIC_GAME_SERVER`:
  - `wallet.ts` talks to the visitor's own wallet (EIP-1193). Installed
    wallets (MetaMask, Rabby, OKX and others, as extensions or in a wallet
    app's browser) are found through EIP-6963 (or `window.ethereum`) and
    listed under the name and icon they announce; there are no fixed
    wallet-brand buttons. WalletConnect is always offered after them, for
    phones and computers without an extension (QR code / app switch). Its
    SDK (`@walletconnect/ethereum-provider`, pinned) is only loaded when
    picked or when a saved WalletConnect session reconnects; keep it out of
    the main bundle. It needs `WALLETCONNECT_PROJECT_ID` in `src/data/site.ts`
    (or `PUBLIC_WALLETCONNECT_PROJECT_ID`); empty hides it. WalletConnect
    answers `eth_chainId` with a number, installed wallets in hex (`chainOf`).
    It switches to the sales network or adds it.
  - `land.ts` (the client) sends the plot price straight to the owner's wallet
    and hands the transaction hash to the game server.
  - `server/src/land.ts` (the `Land` Durable Object) checks the payment on
    PulseChain itself and never trusts the browser: the right payee, at least
    the price, success, `LAND_CONFIRMATIONS` deep, under a day old, used once.
    The sender becomes the owner. A late or short payment is stored and logged
    as `LAND REFUND DUE` for a manual refund.
  - Owners log in with their wallet (below: one signed message, no gas) to
    change their building; the server checks every design with
    `cleanDesign()`.
  - Everyone sees every owner's building.
  - No private keys anywhere; only the owner's public receiving address
    (`LAND_PAYEE`) is configured.
- **Network:** `LAND_CHAIN_ID` in `server/wrangler.jsonc`: 943 = PulseChain
  Testnet v4 (test PLS, the current setting), 369 = mainnet. The site reads the
  network from the server. Testnet screens say "test PLS only". Sales show as
  "opening soon" until `LAND_PAYEE` is set. Owners are kept per network.
- **Demo mode** (offline, or no game server): `store.ts` simulates everything
  with play money in the browser and must stay labelled as a demo. Both modes
  sit behind the same `Store` interface, so the UI doesn't change; the Online
  / Offline switch swaps them through `createSwitchStore()` (the live store
  is only made the first time the city goes online), and `builder-ui.ts`
  follows `store.mode` on every change.
- Visitors can't type text onto buildings: sign texts come from the fixed
  `SIGNS` list, so nothing unexpected (or confidential) appears in public.
- No explorer or wallet-brand links: show transaction hashes as text. Only
  the confirmed links in `src/data/site.ts` are linked.

## Multiplayer (beta, paused)

- **Paused by the owner**: the live site is built without a game server
  (see Hosting). The notes below describe the parked code.
- The plan and decisions are in `docs/multiplayer-plan.md`; keep it up to
  date. Phase 1 (hangout, player profiles, shared target practice) is built;
  leaderboards and south-bank PvP come next.
- The game server lives in `server/` (Cloudflare Worker + Durable Objects:
  Lobby, Room per city of 16, Profile per player, Land for plot sales). See
  `server/README.md`.
  The server decides hits, scores and profiles; browsers only predict their
  own shots. New rules go in `combat-sim.ts` (shared), never only in the view.
- Shared code the server bundles must stay free of DOM and scene code:
  `src/scripts/net/*` (except `client.ts`), `combat-sim.ts`, `solids.ts`,
  `src/data/plots.ts`.
  `src/scripts/net/protocol.ts` is the wire format; bump `PROTOCOL` when it
  changes incompatibly.
- Nothing typed by players ever shows: guest names come from the word lists
  and emotes / phrases from the fixed lists in `profile-data.ts`. Review any
  new words or phrases for the content rules below (no token details, no
  financial talk). The server re-checks every value players send.
- Player profiles: player name (from the word lists, reroll), wardrobe look,
  rifle finish, lifetime score and rank, stored on the server against a hash
  of the browser's guest token (`degen-city-player-v1`), or of the wallet
  address once logged in (`server/src/keys.ts`). Offline, the Profile panel
  keeps the look and finish in the browser.
- **Log in with a wallet** (`account.ts`, `account-ui.ts`; server
  `server/src/accounts.ts`, the `Accounts` Durable Object, `/auth/*`): the
  wallet signs `signInMessage()` with a one-time nonce (personal_sign, no
  transaction, no gas); the server recovers the signer and issues a 30-day
  session token (only its hash is stored; the browser keeps it as
  `degen-city-account-v1`). One login covers everything: the room opens the
  wallet's own profile (the token rides in `hello`), and `/land/design`
  checks it. A wallet's first login starts a fresh profile (no guest score,
  name or look carried over), and its look never overwrites the browser's
  own guest look. The **Connect wallet** button sits in the header's tools (`.nav-account`,
  rendered by `CityMap.astro` when there's a game server,
  "Connect" on phones) and in the walk Profile tab (`[data-account-open]`);
  both open the profile card (`[data-account]`). The account and card are
  made with the page (`CityMap.astro`), not with the 3D city, so they work
  on the 2D map and before 3D has loaded; `bootCity()` gets them and fills
  in their `hooks` (Online switch, rename, Build mode). The card shows:
  player name, rank, lifetime score, the wallet (short) and network, and the
  plots it owns (each jumps to Build mode), with New name and Log out. Only
  the visitor sees their own address; other players only see the player
  name. Logging in needs the city Online.
- The site only shows the Online pill and the Online / Offline switch when
  built with `PUBLIC_GAME_SERVER` (set by the Worker's build). Only pages in
  `ALLOWED_ORIGINS`
  (`server/wrangler.jsonc`) can connect.
- **The Online / Offline switch** (`online.ts`, `[data-online-switch]` in the
  mode header, remembered as `degen-city-online-v1`, online by default) is
  one choice for the whole city. Online: walking joins the shared city
  (`multiplayer.ts` connects only while walking) and Build mode sells real
  plots. Offline: solo walking and the demo builder, and nothing calls the
  game server. Go online / Leave in the Online pill flip the same switch. Its
  dot: grey off, cyan ready, yellow joining, green in a city, red full or
  unreachable. It reads "On / Off" up to 900px wide; up to 420px only the
  current side shows (a tap flips it) and City / Walk / Build are icons, so
  the mode header keeps the title.
- PvP will only ever happen across the river (south bank); the city north of
  the bridges stays a safe hangout.

## Hosting

- degenemporium.com is a static build hosted on Hostinger (`dist/`
  extracted into `public_html`). The "Build site" GitHub Action builds
  every push to `main` into a downloadable zip (artifact
  `degenemporium-site`).
- Keep the site fully static (no server routes) and keep `public/.htaccess`
  in the build.
- **Multiplayer is paused** (the owner's call): the "Build site" Action
  builds without `PUBLIC_GAME_SERVER`, so the city runs on its own: solo
  walking and target practice, the builder as the labelled play-money demo,
  no Online switch, multiplayer or Connect wallet. Keep that code working
  (it's all behind `PUBLIC_GAME_SERVER`), but don't develop it further
  until the owner resumes it.
- **Ignore Cloudflare** for now: the `server/` Worker (emporium on
  workers.dev, which also builds a copy of the site) is parked. Don't spend
  time on its deploys unless the owner brings it back.

## Content guardrails

- **The token is confidential until launch.** Never put its name, ticker,
  contract address or launch details in the site's markup, alt text, meta
  tags, file names or commit messages. Window 05 shows a blurred *decoy*:
  CSS blur only hides things visually, and the HTML is public. Reveal it
  only when the owner says launch is live.

- All copy is draft until the owner says otherwise; keep the draft note.
- No prices, stats, APYs, audits, partnerships or testimonials unless the
  owner supplies them as facts (the owner set plots at 20,000,000 PLS). No
  financial advice: plots are city land for building on, never pitched as an
  investment.
- PulseChain is a real project: say "PulseChain native", never imply an
  official partnership or endorsement.
- Only link to destinations the owner has confirmed (currently X, Telegram
  and the Shopify store in `src/data/site.ts`).
- The Shopify store is public too: anything the site pulls from it (product
  names, images, descriptions) must not reveal the token either.
