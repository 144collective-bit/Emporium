# Player accounts, profiles and cloud saves

The owner's call (2026-11): a player login, a profile, and a save that
remembers achievements, purchases, gear and everything else the city's game
keeps, following the player to any device. Built one phase at a time, each
with the owner's sign-off; keep this up to date. Nothing here is built yet.

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

- **`Saves`, a Durable Object per wallet** (SQLite-backed, keyed like the
  profile, `walletKey()`): the current save as one row per key in
  `BACKUP_KEYS` (the ghosts in chunks under the row-size limit), a
  `revision` that goes up with every write, `lease` (which device holds it),
  and up to 10 daily snapshots for restore.
- **The API** (`/save/*`, the session token as `Bearer`, CORS for both
  sites' origins): `GET` the save and its revision; `POST /save/lease` takes
  the save for this device (a new lease ends the old one); `PUT` sends the
  keys that changed with the revision it was based on and the lease, and is
  refused if either is stale; `GET /save/history` and `POST /save/restore`;
  `DELETE /account` (the save, the profile, the name, every session).
- **The checks** (DOM-free, `server/src/savecheck.ts`, shared rules from
  `tycoon.ts`, tested): each key cleaned by its own cleaner; the tycoon save
  must come out of `cleanSave()` unchanged; between the last accepted save
  and this one, Dorras, XP and each counter may grow at most by a generous
  rate times the real time that passed (worked out from the game's own best
  earning rates, with headroom); owned lists hold only real ids. A refused
  save keeps the server's copy and tells the browser why; repeated refusals
  are logged for the owner.
- **Names** live with `Accounts` (one place, so unique is easy): claimed
  case-insensitively, freed on a rename or a delete. Rules that aren't a word
  filter but stop broken text: 3-16 characters, letters, digits, spaces,
  `-` and `_`, no leading or trailing space, no invisible characters, no
  look-alike letters from other alphabets.
- **Rarity**: a small `Stats` DO counting how many saves hold each badge
  (adjusted when an accepted save gains or loses one) and how many saves
  there are.

### The browser

- **One door to storage**: `saveslot.ts` (DOM-free apart from storage, which
  it's given) owns every save key. Guests read and write the keys as they are
  today (nothing moves for anyone who never logs in); a wallet's saves sit
  under their own prefix (`degen-city-w-<hash>-...`), so the two games never
  touch. Every file that writes a save goes through it. Switching profile
  (log in, log out) reloads the page, as loading a backup does.
- **Syncing**: `cloudsave.ts` uploads what changed a few seconds after a
  `commit()`, when the tab is hidden, and before the page unloads (a
  `keepalive` request); offline it marks the save as waiting and tries again
  when the connection's back. The settings go up as two copies, one for
  phones and one for desktops (the touch layout means nothing on a laptop).
- **Taking over**: on start the browser takes the lease. If another device
  takes it, the next `PUT` is refused and a card says the game is being
  played elsewhere, with Play here (take it back, loading the server's copy)
  and Play as guest.
- **A build flag of its own**: `PUBLIC_ACCOUNT_SERVER` (the Worker's
  address), separate from `PUBLIC_GAME_SERVER`, so degenemporium.com can
  have accounts without multiplayer.

## The phases

1. **The save on the server** (workers.dev): the `Saves` DO, the API, the
   lease, the checks and their tests, snapshots. Nothing on screen yet;
   checked with a test page or the tests.
2. **The browser's saves per profile**: `saveslot.ts`, every writer moved
   onto it (tested: a guest's keys don't change), `cloudsave.ts`, the
   takeover card, offline and back. Logging in with the existing wallet
   button now loads and saves the wallet's own game.
3. **The title screen and the account**: Connect wallet and Play as guest
   (the fields go), going straight on with a good session; the account card
   in the menus' kit (`.mk-skin`) with Log out, Log out everywhere and
   Delete my account (typed confirm); save history and Restore in the
   Vault's panel for account saves.
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
