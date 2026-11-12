# Wallet log-in and multiplayer

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

## Logging in with a wallet

- **Logging in with a wallet** (`wallet.ts`, `account.ts`, `account-ui.ts`;
  the server's `accounts.ts`, the sign-in message in `src/scripts/net/auth.ts`)
  is part of multiplayer (being tested on workers.dev only): a player profile that follows the
  wallet. It never sends a transaction. No explorer or wallet-brand links;
  only the confirmed links in `src/data/site.ts` are linked.

## Multiplayer (beta, testing)

- **Being tested on workers.dev only** (the owner's call): multiplayer runs
  only on https://emporium.144collective.workers.dev, the Worker in
  `server/` that serves its own copy of the site, built with
  `PUBLIC_GAME_SERVER`. degenemporium.com (Hostinger) stays single-player,
  built without it (see Hosting). Getting it fit for today's city is
  `docs/multiplayer-plan.md`'s "Testing on workers.dev".
- **Movement checks** (`protocol.ts`, tested in `tests/protocol.test.ts`):
  the world is `WORLD_BOUNDS`; the 'in' message's flags carry how you're
  getting about (`MODES`, `modeBits()` / `modeOf()`: walk, drive, kart,
  fly, ride, fight; from `walk.netState()`) and each has its top speed
  (`SPEEDS`, `moveOk()`); a jump the browser sees itself make (fast travel,
  the end of a ride or a race) goes with `FLAG.warp`, which the server
  takes once every `WARP_GAP`. A snap-back (`fix`) only moves Degen on
  foot. Gearing up works at either gun store's counter (the Armoury's
  `RACK`, Trench Arms' `ARMS.counter`), and `equip` / `swap` carry the
  mods on your guns (`cleanMods()`: the save is the browser's).
- **What others see** (the plan's "Testing on workers.dev" step 2): other
  players in their vehicles. What you're in goes to the room as a `veh`
  message (protocol.ts `Vehicle`: kind, model, paint; `cleanVehicle()` on
  the server, the ids from `vehicleids.ts`, DOM-free; `PlayerInfo.veh`;
  `PROTOCOL` 5), and in a vehicle the controls carry its place and heading
  (`walk.netState()`, `vehFace()` / `faceYaw()`, an aircraft's height and
  `FLAG.gear`). `remoteveh.ts` draws it from their snapshots: the car
  steering and braking, the bike leaning with its rider, the kart with its
  driver, the aircraft pitching and banking (airframe.ts's surfaces and
  gear), the hire boat with its driver at the wheel (boat.ts
  `seatAtHelm()` / `helmPose()`); out of sight on a ride. A jump between
  snapshots (`jumped()`) is drawn as a jump. Check it on a local Worker:
  build with `PUBLIC_GAME_SERVER=http://localhost:8787`, run `wrangler dev`
  in `server/` with `ALLOWED_ORIGINS` set to it (and without the config's
  `build` step).
- The plan and decisions are in `docs/multiplayer-plan.md`; keep it up to
  date. Phase 1 (hangout, player profiles, shared target practice) is built;
  leaderboards and south-bank PvP come next.
- The game server lives in `server/` (Cloudflare Worker + Durable Objects:
  Lobby, Room per city of 16, Profile per player, Accounts for wallet
  logins). See `server/README.md`.
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
  wallet's own profile (the token rides in `hello`). A wallet's first login starts a fresh profile (no guest score,
  name or look carried over), and its look never overwrites the browser's
  own guest look. The **Connect wallet** button sits in the header's tools (`.nav-account`,
  rendered by `CityMap.astro` when there's a game server,
  "Connect" on phones) and in the hub's Profile tab (`[data-account-open]`);
  both open the profile card (`[data-account]`). The account and card are
  made with the page (`CityMap.astro`), not with the 3D city, so they work
  before 3D has loaded; `bootCity()` gets them and fills
  in their `hooks` (Online switch, rename). The card shows:
  player name, rank, lifetime score, the wallet (short) and network, and the
  with New name and Log out. Only the visitor sees their own address; other
  players only see the player name. Logging in needs the city Online.
- The site only shows the Online pill and the Online / Offline switch when
  built with `PUBLIC_GAME_SERVER` (set by the Worker's build). Only pages in
  `ALLOWED_ORIGINS`
  (`server/wrangler.jsonc`) can connect.
- **The Online / Offline switch** (`online.ts`, `[data-online-switch]` in the
  mode header, remembered as `degen-city-online-v1`, online by default) is
  one choice for the whole city. Online: walking joins the shared city
  (`multiplayer.ts` connects only while walking). Offline: solo walking, and
  nothing calls the game server. Go online / Leave in the Online pill flip the same switch. Its
  dot: grey off, cyan ready, yellow joining, green in a city, red full or
  unreachable. It reads "On / Off" up to 900px wide; up to 420px only the
  current side shows (a tap flips it) and City / Walk are icons, so
  the mode header keeps the title.
- PvP will only ever happen across the river (south bank), in the Fight
  Club's ring; the city north of the bridges stays a safe hangout.
