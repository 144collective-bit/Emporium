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
  slow.
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
- 3D pin labels stay on screen and fold to dots where they'd sit under the
  city's own buttons and cards (`chrome` in `index.ts`); add any new
  always-visible city overlay to that list.
- Every view mode has the mode header across the top of the city
  (`.city-head` in `CityMap.astro`, copy in `head.ts`): City view, Walk
  mode, Build mode, City map (2D), with the City / Walk / Build switch.
  Its live height is `--head-h`; anything pinned to the top of the city
  sits below it (`top: calc(var(--head-h) + 12px)`).
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
- Esc frees the mouse first and only then stops walking. Door panels free
  the mouse so their links can be clicked.
- While walking, `body.is-walking` (set in `index.ts`) hides the site header
  so the city fills the screen, and the mode header carries the walk tabs
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
  or markings. A new gun needs a `WEAPONS` entry, a `SPECS` entry (with its
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
- Keys: click fires, right-click aims, R reloads, G holsters; Caps Lock (not
  R) toggles run. With "Aim when firing" on, firing also aims (`aimNow` in
  `walk.ts`, held `AUTO_ADS_HOLD` after the trigger is let go); use `aimNow`,
  not the aim input, for anything that depends on aiming (spread, sight,
  zoom, the aim sent to the server). The combat HUD (`data-cross`, `data-hitmark`, `data-dmg`,
  `data-pops`, `data-mag`, `data-reserve`, `data-reload-hint`, `data-score`,
  `data-streak`), the finish picker (`data-skins`, `data-lifetime`) and the
  Fire / Aim / Reload buttons live in `CityMap.astro`; `combat.ts` and
  `walk.ts` expect them.
- Gun sounds go through `sfx()` in `sound.ts`, so they stay silent until the
  visitor turns sound on. Under reduced motion the drones hover in place.
- Score, streaks and finishes are for fun only: no prizes, real rewards or
  token tie-ins.

## City builder (3D build mode)

- Districts around the core are split into 3 x 3 plots (`DISTRICTS` in
  `src/scripts/city3d/world.ts`, plot grid and building generators in
  `plots.ts`, interface in `builder-ui.ts`). The core landmarks are not for
  sale.
- **Purchases are simulated.** No wallet connects, nothing is sent to
  PulseChain, no real PLS moves; state is saved in the visitor's browser
  (`store.ts`). Keep every builder screen labelled as a demo until the real
  wallet is wired in, and put the real integration behind `store.ts`'s
  `connect()` / `buy()` so the interface doesn't change.
- **Prices in `src/data/plots.ts` are placeholders.** Don't present them as
  real until the owner supplies pricing.
- Visitors can't type text onto buildings: sign texts come from the fixed
  `SIGNS` list, so nothing unexpected (or confidential) appears in public.
- **Big plots:** four owned, empty plots in a 2 x 2 square merge into one
  big plot (id `N3-04+08`: its top-left and bottom-right plots;
  `bigPlotAt()`, `plotById()`, `squaresWith()` in `plots.ts`, `merge()` /
  `split()` in `store.ts`). Its building is the same design at
  `BIG_SCALE`, and towers on it stop at `BIG_MAX_FLOORS` so nothing outgrows
  the Emporium. Picking any of its four plots selects the big plot.

## Multiplayer (beta)

- The plan and decisions are in `docs/multiplayer-plan.md`; keep it up to
  date. Phase 1 (hangout, player profiles, shared target practice) is built;
  leaderboards and south-bank PvP come next.
- The game server lives in `server/` (Cloudflare Worker + Durable Objects:
  Lobby, Room per city of 16, Profile per player). See `server/README.md`.
  The server decides hits, scores and profiles; browsers only predict their
  own shots. New rules go in `combat-sim.ts` (shared), never only in the view.
- Shared code the server bundles must stay free of DOM and scene code:
  `src/scripts/net/*` (except `client.ts`), `combat-sim.ts`, `solids.ts`.
  `src/scripts/net/protocol.ts` is the wire format; bump `PROTOCOL` when it
  changes incompatibly.
- Nothing typed by players ever shows: guest names come from the word lists
  and emotes / phrases from the fixed lists in `profile-data.ts`. Review any
  new words or phrases for the content rules below (no token details, no
  financial talk). The server re-checks every value players send.
- Player profiles: guest name (reroll), wardrobe look, rifle finish,
  lifetime score and rank, stored on the server against a hash of the
  browser's guest token (`degen-city-player-v1`). Offline, the Profile panel
  keeps the look and finish in the browser.
- The site only shows the Online pill when built with `PUBLIC_GAME_SERVER`
  (a GitHub repository variable). Only pages in `ALLOWED_ORIGINS`
  (`server/wrangler.jsonc`) can connect.
- PvP will only ever happen across the river (south bank); the city north of
  the bridges stays a safe hangout.

## Hosting

- degenemporium.com is a static build hosted on Hostinger (`dist/`
  extracted into `public_html`). The "Build site" GitHub Action builds
  every push to `main` into a downloadable zip.
- Keep the site fully static (no server routes) and keep `public/.htaccess`
  in the build. The only live service is the separate game server
  (`server/`, Cloudflare), deployed by the "Deploy game server" Action.

## Content guardrails

- **The token is confidential until launch.** Never put its name, ticker,
  contract address or launch details in the site's markup, alt text, meta
  tags, file names or commit messages. Window 05 shows a blurred *decoy*:
  CSS blur only hides things visually, and the HTML is public. Reveal it
  only when the owner says launch is live.

- All copy is draft until the owner says otherwise; keep the draft note.
- No prices, stats, APYs, audits, partnerships or testimonials unless the
  owner supplies them as facts. No financial advice.
- PulseChain is a real project: say "PulseChain native", never imply an
  official partnership or endorsement.
- Only link to destinations the owner has confirmed (currently X, Telegram
  and the Shopify store in `src/data/site.ts`).
- The Shopify store is public too: anything the site pulls from it (product
  names, images, descriptions) must not reveal the token either.
