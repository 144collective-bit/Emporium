# Player accounts, profiles and cloud saves

The owner's call (2026-11): a player login, a profile, and a save that
remembers achievements, purchases, gear and everything else the city's game
keeps, following the player to any device. Built one phase at a time, each
with the owner's sign-off; keep this up to date. Phases 1 (the save on the
server), 2 (the browser's saves per profile) and 3 (the title screen and the
account) are built, waiting on the owner's sign-off.

Everything saved is the city's game: Dorras and XP are earned by playing,
never bought, never cashed out, never tied to the token or the store. An
account changes where the save lives, not what's in it.

## Decisions (the owner's, 2026-11)

| Topic | Decision |
| --- | --- |
| Backend | **The Cloudflare Worker** (`server/`), extended with an accounts and saves API on Durable Objects. degenemporium.com calls it too, for login and saves only. |
| Which sites | **Both**, rolled out **on workers.dev first**, then switched on for degenemporium.com once it's solid. **Multiplayer stays on workers.dev only.** This changes an earlier call: degenemporium.com gets Connect wallet and makes server calls (the account and the save, nothing else). |
| Log in | **Wallet only**: the signed-message login already built (`Accounts` DO, personal_sign, no transaction, no gas, a 30-day session). No email, password or social login. |
| Title screen | **Connect wallet and Play as guest**, two big buttons in place of the name/email and password fields (which go). A returning player whose session is still good goes straight on. |
| Guest progress | **An account always starts fresh.** A guest's progress is never carried into an account. |
| Two saves in one browser | **The guest save stays, untouched.** Logged out you play your guest game, logged in the wallet's; the browser keeps a copy of each. |
| Cheating | **Sanity checks on the server**: every save goes through the same `cleanSave()` the browser uses, and impossible jumps are refused (Dorras, XP and counters growing faster than the game allows for the real time that passed). The economy still runs in the browser. |
| Names | **Typed by the player, unique** (claimed on the server). **No word filter** (the owner's call, asked twice). This changes the content rule "nothing typed by players ever shows", for account names only; guests keep the word-list names. |
| What follows the account | **Everything**: the game's progress, the look and the vehicles, the settings (kept per kind of device: phone and desktop apart) and the kart ghosts. |
| Two devices | **One device at a time.** Opening the game on a second device takes over; the first says it's being played elsewhere and stops saving. |
| Offline | **Play on, sync later.** Logged in with no server, you play from the device's copy and it uploads when the server's back. If another device took over in between, the server's copy wins and you're told. |
| Profile | **Your own profile screen**, a **player card** others see (tap a player online), **pinned badges** (a showcase) and a **public profile page** (a new page, the owner's approval). Never the wallet address, to anyone but yourself. |
| Public page | **`/player/<name>`**: name, level and title, pinned badges, a picture of their Degen, records. No wallet address, no Dorras or worth. |
| Account extras | **Delete my account**, **save history and restore** (the server keeps recent snapshots), **log out everywhere**. The Vault's file backup stays for the guest save. |
| Badges | **Progress bars, tiers, more badges, and rarity** ("12% of players have this", from the server). |
| Leaderboards | **Later, a plan of their own** (the multiplayer plan lists them). This plan keeps their data ready. |

## What's already there

- **The save is the browser's.** `degen-city-tycoon-v1` (`TycoonSave` v12 in
  `tycoon.ts`) holds Dorras, XP, badges, missions, counters, the garage and
  armoury with their mods, the premium wardrobe, places' levels, karts
  (records, boards, trophies), the fight record, the inventory and the places
  visited. Beside it: `-car-v1`, `-bike-v1`, `-plane-v1`, `-look-v1`,
  `-combat-v1` (score, finish), `-walk-v1` (settings, touch layout) and
  `-ghosts-v2` (kart ghosts, the bulk). `BACKUP_KEYS` in `backup.ts` already
  lists all eight, and `readBackup()` already checks and cleans a whole set.
- **They're written in a dozen places**: `tycoon-ui.ts`, `kart.ts`,
  `walk.ts`, `profile-ui.ts`, `garage-ui.ts`, `combat.ts`, `hangar-ui.ts`,
  `vehicleids.ts`, straight to `localStorage`.
- **The server** (`server/`, workers.dev only): `Accounts` (one DO: nonces,
  sessions by hash, wallet sign-in through `recoverSigner()`) and `Profile`
  (a DO per player, keyed by the hash of the guest token or the wallet
  address, `keys.ts`: name, look, finish, lifetime score). A wallet's first
  login already starts a fresh profile.
- **The title screen** (`[data-start-login]` in `CityMap.astro`) has the
  fields but sends nothing. **The account card** (`account-ui.ts`,
  `[data-account]`) shows name, rank, score, the short wallet, New name and
  Log out, and only exists when the site is built with `PUBLIC_GAME_SERVER`.
- **Badges** are lifetime milestones in `missions.ts` (`BADGES`,
  `checkBadges()`, counted from `counters`), shown in the hub's Missions tab.

## The design

### The server

- **`Saves`, a Durable Object per wallet** (`server/src/saves.ts`,
  SQLite-backed, keyed like the profile, `walletKey()`; built in Phase 1):
  the current save, each key in `CLOUD_KEYS` (the backup's `BACKUP_KEYS`,
  the settings as two keys, `degen-city-walk-v1:phone` and `:desktop`)
  stored in pieces of `CHUNK` characters (`split()` / `join()`: one value in
  a Durable Object is limited in size), a `rev` that goes up with every
  write, the `lease` (which device holds it), and the daily snapshots: before
  the first write of each day (UTC) the save as it stood is kept, the last
  `SNAPSHOTS` (10) of them, only the progress (`SNAPSHOT_KEYS`: not the kart
  ghosts, the bulk and only replays, nor the settings, so a restore never
  rolls back the controls).
- **The API** (the session token as `Bearer`; CORS for the allowed pages,
  `ALLOWED_ORIGINS`; `server/src/index.ts`): `GET /save` the save and its
  `rev`; `POST /save/lease` takes the save for this device (a new lease ends
  the old one); `PUT /save` `{ lease, base, saves }` the keys that changed (a
  value, or `null` to clear one; never the city's game) from revision `base`:
  409 for another device's lease (`lease`) or an old `base` (`stale`), 422
  when the checks turn it away (`checks`, the reasons), 429 past 30 a minute;
  `GET /save/history` (each snapshot's day, level, Dorras and XP) and `POST
  /save/restore` `{ lease, day }` (the progress put back, the ghosts and
  settings as they are; the checks measure from it after). On `Accounts`:
  `POST /auth/logout-all` (every session the wallet had until then ends,
  this one too: `revoked:<address>` against each session's `at`) and `POST
  /auth/delete` `{ confirm: "delete" }` (that, and the save, its snapshots
  and the profile wiped; the name too once names are built). The shapes are
  `CloudSave`, `CloudLease`, `CloudPut`, `CloudPutResult` in savecheck.ts.
- **The checks** (DOM-free, `src/scripts/net/savecheck.ts`, shared with the
  server like the rest of `net/`, tested in `tests/savecheck.test.ts`;
  `checkSaves()`): each key cleaned by the browser's own cleaner on the way
  in (`cleanSave()` with the server's clock, `cleanCar()`, `cleanBike()`,
  `cleanPlane()`, the look's `cleanLook()`, `cleanScore()` and
  `cleanSettings()` for the two loaders that live in DOM files; the ghosts
  kept as they are), the cleaned copy is what's kept; each key's size
  (`KEY_MAX`) and the whole save's (`SAVE_MAX`, the backup's 4 MB). Between
  the last game the server accepted and this one (its own clock, `gameAt`;
  the target score's `scoreAt`), the business's worth (`worth()`: Dorras,
  till, goods, property and gear less a loan, both valued at the same
  moment's prices, so the market's swings and buying things don't count, and
  owning what wasn't paid for does), XP, each lifetime counter and the target
  score may grow at most a burst plus a rate per real minute (`GROW`); a
  badge new in the save must be earned by it (`badgeMet()`). The rates are
  generous: the test measures a fully built business with every shelf full
  (about 350 worth and 95 XP a minute) against them, and checks the bursts
  cover the most one sitting can bring in (the three richest missions, a
  Neon series' last race and trophy, the daily challenge, the hardest bout's
  purse, the badges with them), from the game's own tables. A refused save
  keeps the server's copy and says why; the refusals are counted and logged
  (`save refused` in the Worker's logs) for the owner.
- **Names** live with `Accounts` (one place, so unique is easy): claimed
  case-insensitively, freed on a rename or a delete. Rules that aren't a word
  filter but stop broken text: 3-16 characters, letters, digits, spaces,
  `-` and `_`, no leading or trailing space, no invisible characters, no
  look-alike letters from other alphabets.
- **Rarity**: a small `Stats` DO counting how many saves hold each badge
  (adjusted when an accepted save gains or loses one) and how many saves
  there are.

### The browser

- **One door to storage** (built in Phase 2): `saveslot.ts` (DOM-free, no
  imports; `slot()`, the page's) owns every save key: the tycoon save,
  the car, bike and aircraft (`readSaved()` in vehicleids.ts), the look
  (profile-ui.ts), the target score (combat.ts), the walk settings
  (walk.ts), the kart ghosts (kart.ts) and the Vault's backup. Guests read
  and write the keys as they've always been (nothing moves for anyone who
  never logs in); a wallet's sit beside them with its address added
  (`degen-city-tycoon-v1@0xab12...`, `slotKey()`), so the two games never
  touch. Whose slot it is is decided once, as the page starts, from the
  login kept in the browser (`loggedIn()`); logging in or out reloads the
  page (account.ts `onSwitch()`, CityMap.astro), after what's waiting has
  gone up (`beforeLogout()`). A wallet's game takes no backup file (the
  Vault offers "Download a copy" only, and no reminder to back up); files
  load into the guest's game.
- **Syncing** (built in Phase 2): the rules are `cloudsync.ts` (DOM-free,
  tested in `tests/cloudsync.test.ts`: the note kept with the slot,
  `CloudMeta` { rev, lease, dirty }; `pullPlan()`, `uploadBody()`,
  `settle()`, `retryIn()`), the talking `cloudsave.ts` (its own chunk, loaded
  by the page only when it plays a wallet's slot). As the page starts it
  asks for the server's copy (the city's boot waits up to 6 s for it): in
  step, nothing comes down; a new account's first contact sends up
  everything kept here; otherwise the server's copy wins (another device
  played, or the account was deleted and started again; anything changed
  here that never went up is lost, and a card says so once the start menu's
  gone). Then the device takes the lease. Every write to the slot is noted
  and goes up `QUIET` (8 s) after the last change, `MAX_WAIT` (25 s) at most,
  when the tab is hidden, and as the page closes if it's small enough
  (`keepalive`, under 60 KB; anything bigger goes up at the next start).
  The settings go up as this kind of device's (`deviceOf()`: a coarse
  pointer is a phone), and only this kind's come down. Offline (or the
  server down) the game plays on from this copy and tries again (5 s,
  doubling, a minute at most, and when the browser's back online); if
  another device played meanwhile, its copy wins and the card says so (the
  city starts again on it). Two tabs on one device share the slot, the note
  and the lease: a `stale` answer means another tab moved it on, so this
  copy (the newest) goes up again.
- **The card** (built in Phase 2; `[data-cloud]` in CityMap.astro, in the
  menus' kit, styles in city.css; never over the start menu: it waits for it
  to go): another device took the save ("Playing on another device": Play
  here takes it back, the server's copy comes down and the page starts
  again on it; Play as guest logs out), the server turned a save away ("This
  save wasn't kept": Load my saved game), the login ran out ("Your login ran
  out": Log in opens the profile card, and logging in again as the same
  wallet carries on without a reload; Play as guest), or a newer copy came
  in while offline ("Your save moved on": Carry on). Its × closes it; while
  it stands nothing more goes up.
- **A build flag of its own**: `PUBLIC_ACCOUNT_SERVER` (the Worker's
  address), separate from `PUBLIC_GAME_SERVER`, so degenemporium.com can
  have accounts without multiplayer.

## The phases

1. **The save on the server** (workers.dev; built, waiting on the owner's
   sign-off): the `Saves` DO, the API, the lease, the checks and their
   tests, snapshots, and on `Accounts` log out everywhere and delete the
   account (their buttons come in Phase 3). Nothing on screen yet; checked
   with the tests and, end to end against `wrangler dev`, a script logging
   in with a test wallet: a fresh game taken, an edited one turned away, a
   stale base and another device's lease refused, a 3 MB ghost file stored
   in pieces and read back, a snapshot restored with the settings left
   alone, log out everywhere ending every session, and a delete leaving a
   fresh account.
2. **The browser's saves per profile** (built, waiting on the owner's
   sign-off): `saveslot.ts`, every writer moved onto it (tested: a guest's
   keys don't change), `cloudsync.ts` and `cloudsave.ts`, the card, offline
   and back. Logging in with the existing wallet button (workers.dev only
   for now) loads and saves the wallet's own game. Checked in a browser
   against `wrangler dev` with two devices on one wallet: the fresh game
   and each change going up, the second device loading it and taking over,
   the first told and taking it back, an edited save turned away and the
   saved one loaded back, offline play going up when back, a login that ran
   out, and the guest's game untouched throughout.
3. **The title screen and the account** (built, waiting on the owner's
   sign-off): Connect wallet and Play as guest (the fields went), only with
   a game server and when the page isn't already a wallet's game (then
   straight to the menu, "Playing as <name> · Log out", or that the login
   ran out); without a game server straight to the menu too. Connect wallet
   opens the profile card over the title screen (`.mk-modal`, z-index 12),
   and logging in no longer needs the Online switch (that's the shared
   rooms). The card in the menus' kit with New name, Log out, Log out
   everywhere and Delete my account (the word "delete" typed; this browser's
   copy of the wallet's game goes too, the guest's stays). Save history and
   Restore in the Vault's panel for a wallet's game (`historyView()`: each
   day kept, when it was saved, its level and Dorras; a confirm; the page
   starts again on it), reached through `cloudlink.ts`. Anything that puts a
   copy in the slot and reloads seals it first (`seal()`). Checked in a
   browser with a stand-in wallet signing with a test key: logging in from
   the title screen, history after a day's second save, a restore taking
   back a change, log out everywhere, logging in again, and a delete leaving
   a fresh account.
4. **Names**: claim a name when the account's made (the word-list name
   offered as a start), unique on the server, rename from the profile.
   Nametags online and the player card show it.
5. **The profile**: your profile screen in the hub's Profile tab (name,
   level and title, badges, records: karts, fights, target score; what you
   own; play time, which the save starts counting), pinned badges (three),
   the player card for other players online. Never the wallet address to
   anyone else, never Dorras on the card.
6. **The public page**: `/player/<name>` (on a static site: one page,
   `src/pages/player.astro`, and a rewrite in `.htaccess` and on the Worker
   so `/player/<name>` serves it; the page reads the public profile from the
   Worker). A picture of their Degen: a small snapshot the browser renders
   with the stage and uploads when the look changes, so the page doesn't
   load the 3D city. In the comic page's style, not the arcade kit (it's
   outside the city).
7. **Badges upgraded**: progress bars on every locked badge (from the
   counters they're counted from), bronze, silver and gold tiers on the big
   ones, new badges (districts visited, metro and river bus rides, vehicles
   owned, Trenches corner shops, and more), and rarity from `Stats`.
8. **degenemporium.com**: the account flag on in the "Build site" Action,
   the Worker's CORS for the domain, checked at every width; then CLAUDE.md's
   Hosting notes change to match.

## Risks and open points

- **Typed names with no filter, on a public page and over players' heads.**
  The owner's call. The risk to know about: the token is confidential until
  launch, and a player could type its name or ticker as their name, where it
  would be public on `/player/<name>` and in the game. The same goes for
  slurs and for names like "Admin" or "GM". If that ever happens, the
  quickest fix is a reserved-words list on the server's name check (a few
  lines in phase 4); until the owner asks for it, there is none.
- **Free play must not touch real accounts.** The preview built with
  `PUBLIC_FREE_PLAY=1` makes everything free; its saves would fail the
  checks, or worse, pass them. The preview gets no `PUBLIC_ACCOUNT_SERVER`
  (or a test Worker of its own).
- **The checks catch casual edits, not a determined cheat.** Fine while
  nothing is traded and there are no prizes; leaderboards later may want
  more.
- **Storage limits**: ghosts can reach a few MB; Durable Object rows have a
  size limit, so they go up in chunks. The save as a whole stays under
  `BACKUP_MAX`.
- **Privacy**: the server keeps a wallet address and a typed name, nothing
  else personal. Deleting the account removes both.
- **The rules these decisions change** (CLAUDE.md, updated as each phase is
  built, not before): Hosting ("no Connect wallet on degenemporium.com"),
  Multiplayer ("nothing typed by players ever shows", for account names),
  and "Logging in with a wallet" (a wallet now carries the whole save).
