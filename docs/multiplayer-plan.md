# Sector 7 multiplayer: the plan

Agreed with the owner. Multiplayer ships in phases, each as a public beta,
clearly labelled. This file is the reference; update it as decisions change.

**Status: testing on workers.dev** (owner's call). Multiplayer runs only on
https://emporium.144collective.workers.dev (the Worker in `server/`, which
serves its own copy of the site). degenemporium.com on Hostinger is built
without the game server and stays single-player.

## Testing on workers.dev

The server was parked while the city grew. Getting it fit for today's city:

1. **The server fits today's city** *(built)*:
   - The world is the walkable world (`WORLD_BOUNDS`), not the old
     downtown box: players in The Trenches, Westlake Park, the airport or
     the kart park were dropped without a word.
   - How you're getting about rides in the controls' flags (`MODES`: walk,
     drive, kart, fly, ride, fight), each with its own top speed (`SPEEDS`),
     so driving, karting, flying and rides aren't snapped back. A jump the
     browser makes itself (fast travel, the end of a ride or a race) is
     flagged (`FLAG.warp`) and let through once a second at most; a jump
     isn't checked against where it lands (a hangout: nothing to gain).
     A snap-back only moves Degen on foot.
   - Gearing up works at Trench Arms' hatch as well as the Armoury, and
     the Armoury's mods on your guns go with `equip` / `swap` (the save
     and its Dorras are the browser's, so the server takes the levels it's
     told, cleaned to whole levels 0-3).
   - The server's type check passes again (`CarId` lives in `mycar.ts`).
   - `PROTOCOL` 3: tabs on the old version are told to reload.
2. **What others see** *(next)*: other players driving, karting, flying or
   riding (the mode is in each snapshot row's flags already, `modeOf()`),
   and jumps drawn as jumps rather than slides.
3. **The owner's test** on workers.dev: two browsers (one private, since
   each browser is its own guest), walk mode, Online on; see each other
   downtown and in The Trenches, emotes and phrases, the same dummies, and
   driving and fast travel with no snap-backs.

## The Multiplayer menu and its games

The owner's picks (2026-10-24): clicking **Multiplayer** in the start menu
should help a player find the game and the mode they want, not just drop
them into the city.

### What the player sees

1. **You** (before anything else): their player name (reroll it), their
   Degen's look (changed at Drop 001 in the city), and how they play: as a
   guest (kept for this browser) or logged in with a wallet (the same
   profile in any browser). Guests are welcome everywhere.
2. **Pick a mode**: Hangout (the whole city, free roam), Free for all,
   Team deathmatch, Kart race and Fight Club. Modes not built yet are listed
   and say "coming soon".
3. **Find a game** for that mode:
   - **Browse**: the open games, each with its mode and map (e.g. "Team
     deathmatch · Junkyard", "Hangout · Sector 7") and Join. Nothing more
     on a row for now (no player counts, scores or filters).
   - **Create a private game**: pick the mode and the map; the rest is the
     mode's defaults. It hands back a **link** to share; whoever opens it
     goes straight into that game (no codes to type).
4. **Where to start** (Hangout): the Emporium, The Trenches' Block, the kart
   park and stadium gates, or next to the friend whose link they opened.
5. **Changing game in the city**: a Multiplayer entry in the ☰ Menu (and the
   walk mode Online tab) opens the same Browse / Create screens to switch
   game or leave, without reloading.

### The modes

| Mode | Where | Players | Rules |
| --- | --- | --- | --- |
| Hangout | The whole city | Up to 16 a city, more cities open as they fill | Walk, drive, fly, emotes and phrases. Nothing attacks anyone. No shooting online: target practice is solo only. |
| Free for all | Arena maps only (the junkyard first) | Up to 8 | 5 minutes or first to 25 knock-outs. |
| Team deathmatch | Arena maps only | 4 v 4 | 5 minutes or first to 50 for the team. |
| Kart race | The kart park's circuit, either way round | Up to 8; empty grid slots are the sim's rival karts, so 2 can race | The host picks the course and day, night or rain. |
| Fight Club | The Fight Club's ring | 1 v 1; everyone else in the room watches from the bleachers and queues for the winner | Best of three 90 s rounds, as solo bouts. |

- **Arenas** are maps of their own, walled off from the city, so the
  hangout city stays safe; the **junkyard** (stacked cars, containers,
  ramps and half-pipes) is first, a neon arena may follow.
- **Knock-outs** (the owner's call, shooting other players in arena
  matches only): 100 health, regen after a few seconds without damage, a
  cartoon knock-out (stars, no gore), respawn after 3 s with brief spawn
  protection, a "tagged" feed.
- **Loadouts**: the same guns for everyone, no mods, to start; their own
  guns and mods come later.

### Online progress

- A **separate online profile**, held by the server: online progress never
  touches the solo save, and the solo save never comes online. A new
  online profile **starts fresh** (level 1, starter Dorras, starter car and
  guns) for everyone alike.
- Until the server runs the economy (Dorras, levels, shops, missions; its
  own step), **online pauses it**: the Dorras readout, business card, shops
  and missions say online progress is coming, and the solo save is left
  untouched.

### Steps (each its own PR, with the owner's sign-off)

1. **The menus** *(built)*: You, Pick a mode, Browse, Create a private game
   with its link, Where to start, the ☰ Menu entry; Hangout playable,
   the other modes "coming soon"; online pauses the economy. On the server:
   the Lobby lists the open games and makes private ones (a game id that
   can't be guessed, in the link), and a player joins the game they chose.
   - The games as data: `src/scripts/net/games.ts` (DOM-free, tested in
     `tests/games.test.ts`): `GAME_MODES` (name, blurb, size, maps,
     `ready`), `MAP_NAMES`, ids (`city-N` for the public cities, `p` and
     ten letters or digits for private games, `privateId()`), and the
     Lobby's rules (`pickCity()`, `listGames()`, `gameOf()`,
     `privateAlive()`: a private game lasts a day after it was made or last
     played in, `cleanCreate()`: only a ready mode on one of its maps).
   - The server: `/games` (GET `?mode=` lists, POST makes a private game),
     `/play?game=<id>` (a game that's gone gets a message and the socket
     closes, 4006), `/me` and `/me/rename` (the profile before joining,
     from the guest token or a wallet login). New profiles start fresh.
   - The menu: `mp-menu.ts` (a chunk of its own, loaded when it's first
     opened; styles `mpmenu.css`): from the start menu's Multiplayer, an
     invite link (`?game=<id>&with=<name>`, tidied from the address once
     read), the ☰ Menu's Multiplayer and the walk Online tab's Find a game.
     Its choice goes to the city's `play()` (index.ts: the spot, the game,
     the switch on Online; `multiplayer.ts` `join()` moves between games
     and stands you next to the friend once they're seen). Single player
     now turns the switch to Offline.
   - The pause: `setOnline()` in tycoon-ui.ts holds the solo save as it was
     while in an online game: anything a screen does to it is put back
     with a toast, nothing ticks or is stored, the Dorras readout, level
     pill, mission tracker and guide step aside (`.is-econ-paused`), the
     business card and economy panels say online progress is coming.
     Builds without a game server leave all of it out.
2. **Logging in** *(built)*: A in "Profiles and logging in" below.
3. **Settings and friends** (B below).
4. **The online economy** (C below): the online profile's Dorras, levels,
   shops and missions run by the server.
5. **Fight Club 1 v 1** with spectators and the queue.
6. **The junkyard** with free for all and team deathmatch.
7. **Kart races** online.

## Profiles and logging in

The owner's picks (2026-10-24): a real login on the multiplayer server,
built before the other modes, on the multiplayer branch and left unmerged
until the owner picks multiplayer up again.

### What the owner picked

- **Three ways in, one profile**: a **username and password**, **Google**
  or **Discord**, and a **wallet** (the login that exists today). Any of
  them can be linked to the same profile from the profile card, so one
  player logs in whichever way is to hand.
- **Login required online**: multiplayer needs an account; single player
  never asks for one. Guest play online is retired, and **everyone starts
  fresh**: today's guest profiles aren't carried over. A wallet that
  already has a profile keeps it (it's an account already) and is asked to
  pick a username.
- **Usernames are shown in game** (the owner's call, a change to "nothing a
  player types ever shows": the username is the one thing, and it goes
  through the filter below). The word-list names stay for the city's own
  people and for an account whose name was removed.
- **The username filter**: 3 to 16 letters, digits, `_` and `-`, unique
  whatever the case; no rude words, links, wallet addresses or names that
  pretend to be staff (admin, mod, official, Sector 7, Emporium...); and a
  private blocked list held as a Cloudflare secret (`BLOCKED_NAMES`), so
  the token's name is blocked without ever being written in the repo. The
  server checks it on sign-up and rename; the browser checks it first to
  say why.
- **Forgot your password**: an email reset link. The email is required at
  sign-up with a password (the owner's call; Google, Discord and wallet
  sign-ups ask for it when they first set a password), kept private (never shown, never in a snapshot, only its owner
  sees it on the profile card) and used for resets only. The sending
  service is decided later: built for Resend's API behind a secret
  (`EMAIL_API_KEY`); until one is added, "Forgot password" says it's coming
  soon.
- **The plan is Workers Paid** ($5 a month), so passwords are hashed
  properly: PBKDF2-SHA256 with a salt each (Web Crypto, no package), at
  100,000 rounds, the most Cloudflare's Web Crypto takes (each hash keeps
  its count, so a later raise re-hashes on the next login).
- **A profile carries**: name, look and score (today's profile), online
  progress, settings and a friends list.

### How it works

- **Accounts** (the `Accounts` Durable Object, which already holds the
  wallet logins and sessions) gains users: an id, the username, the
  password's hash and salt, the email, and the ways in linked to it
  (`pw:<username>`, `google:<id>`, `discord:<id>`, `wallet:<address>`).
  Sessions stay as they are: a 30-day token, only its hash stored.
- **Username and password**: `/auth/signup` (username, password, email),
  `/auth/login`, `/auth/forgot` and `/auth/reset` (a one-time link for 30
  minutes, `?reset=<token>` on the site opens a "New password" card). Five
  wrong tries in 15 minutes locks that username and that address for a
  while; the answer never says which of the two was wrong.
- **Google and Discord**: the standard sign-in (OAuth 2 with PKCE): the
  button goes to the provider, which comes back to
  `/auth/google/callback` or `/auth/discord/callback`, checked against a
  one-time `state`; only the provider's account id is kept (never their
  name, picture or email). A first sign-in that way asks for a username.
  Each needs an app registered with the provider (step-by-step
  instructions in `server/README.md`) and its id and secret added in
  Cloudflare (`GOOGLE_CLIENT_ID` / `_SECRET`, `DISCORD_CLIENT_ID` /
  `_SECRET`).
- **Wallet**: as today (one signed message, no transaction, no gas), now
  a way into an account.
- **Joining**: `/play` and `/games` refuse without a session; the room
  opens the account's profile. The guest token is no longer sent.
- **On screen**: the Multiplayer menu's first step, You, becomes Log in /
  Sign up (username and password, Continue with Google, Continue with
  Discord, Connect wallet) until you're logged in; then your username,
  look and Log out. The header's Connect wallet button becomes **Log in**
  and opens the same card, which also links the other ways in, changes
  the username, password and email, and logs out. No outside links but
  the providers' own sign-in pages.

### Steps (each with the owner's sign-off)

- **A. Logging in** *(built)*: all of the above, login required online.
  - The rules both sides share are `src/scripts/net/auth.ts`:
    `usernameProblem()` (the filter: whole stems anywhere, short words as
    whole parts so "classic" and "scrape" pass, staff-like names, the
    owner's `blockedList()`), `passwordProblem()`, `emailOk()`, and the
    account API's shapes (`AuthConfig`, `AccountMe`, `AuthAnswer`).
  - The server: `server/src/accounts.ts` (the routes under `/auth/`,
    listed in `server/README.md`) and `server/src/login.ts` (what needs no
    Cloudflare: PBKDF2-SHA256 at 100,000 rounds, the most Cloudflare's Web
    Crypto takes, each hash keeping its count so a later raise re-hashes on
    the next login; the lock-out, 5 wrong tries for a username and 25 for
    an address; the OAuth helpers; the reset email). Google and Discord
    come back to the Worker, which sends the player on to the site with a
    one-time code (`?login=`), never a token in the address. Each account
    opens one Profile under its username; the room takes the session in
    the hello (`PROTOCOL` 5) and turns away anyone without one ("Log in to
    play online", close 4005). The guest token is gone.
  - The site: `account.ts` (the session, kept as `degen-city-account-v1`),
    `account-ui.ts` (the card: Log in, Make an account, Forgot your
    password, a reset link's new password, a first sign-in's username, and
    the account with its ways in to add, change or take off; over the
    Multiplayer menu), the Multiplayer menu's You step (Log in / Sign up
    until logged in; where it was is kept for the tab while Google or
    Discord have the page, `degen-city-mp-resume`), the header's Log in
    button, the Profile tab's Change name, the Online pill's Log in.
  - Tested: `tests/login.test.ts` (the filter, passwords, emails, hashes,
    the lock-out, the sign-in URLs and ids); the routes end to end against
    `wrangler dev` (signing up, logging in by name or email, the lock-out,
    renames, passwords, a wallet's first sign-in and linking, joining a
    game with and without a session) and in a browser. Google's and
    Discord's own round trips wait for their apps (`server/README.md`).
- **B. Settings and friends**: the Controls panel's settings, sound and
  the view saved on the account; friends added from the players in your
  game, a list showing who's online and in which game, with Join.
- **C. Online progress**: the online economy (Dorras, levels, owned
  things, missions) held by the server.

## Decisions

| Topic | Decision |
| --- | --- |
| Mode | Picked in the Multiplayer menu (above): Hangout (a safe shared city), free for all, team deathmatch, kart races, Fight Club. |
| PvP places | Arena maps of their own (the junkyard first), walled off from the city; the Fight Club's ring. Never in the hangout city. |
| PvP rules | 100 health, regen after a few seconds without damage, cartoon knock-out (no gore), respawn after 3 s with brief spawn protection, kill feed ("tagged"). |
| Room size | Up to 16 players per city; more cities ("City 1", "City 2"…) open automatically. |
| Identity | (The owner's call, built in step 2) An account is needed online, logged into with a username and password, Google, Discord or a wallet, all linkable to one profile; the username, filtered, is the name others see; everyone starts fresh. |
| Chat | Emote wheel and fixed phrases only. Nothing typed ever appears in public. Players can mute others. |
| What others see | Outfit and colours, the gun they carry and its finish, name tag, rank badge. |
| Saved | Server-side player profiles (name, outfit, finish, lifetime score, rank), and the online profile's own progress, starting fresh (above); daily and weekly leaderboards (no prizes). |
| Builder | Real plot sales (20,000,000 PLS a plot, PulseChain Testnet first) through the visitor's wallet and the game server's `Land`; the demo with play money stays for offline visits and local builds. |
| Online / Offline | One switch in the mode header for the whole city: Online joins the shared city while walking and sells real plots; Offline is solo with the demo builder. Remembered per browser, online by default. |
| Fairness | The server decides hits (it runs `combat-sim.ts`), checks movement and fire rate, and rewinds drones to what the shooter saw. |
| Server | Cloudflare Workers + Durable Objects (one per room, one per profile). The same Worker serves the static site at emporium.144collective.workers.dev. |
| Account | The owner creates the Cloudflare account (guided); deploys run from GitHub Actions with a repo secret. |

## How it fits together

```
Visitor's browser                         Cloudflare (server/)
  emporium…workers.dev (static assets)      Worker: /play  ──> Lobby DO (which city has room)
  Walk ─ Multiplayer (beta) ── WebSocket ──>  Room DO "City N" (≤16 players, 60 Hz rules,
                                              15 Hz snapshots, movement checks, emotes)
                                                └─> Profile DO per player (name, outfit,
                                                    finish, lifetime score)
```

- The browser sends its controls about 20 times a second; the room sends
  everyone's positions about 15 times a second and the browser smooths
  between them (about 100 ms behind).
- Your own movement is instant (client-side) and checked by the server
  (speed, world bounds); impossible moves are snapped back.
- The rules module (`src/scripts/city3d/combat-sim.ts`) runs in the room;
  the browser runs a copy only to predict its own shots (tracer, ammo).
- Shared code lives in DOM-free modules the server bundles too:
  `src/scripts/net/` (protocol, names, ranks, wardrobe, emotes, phrases) and
  `src/scripts/city3d/solids.ts` (collision boxes).
- One connection per player: going online in a second tab takes over and
  the first tab stops (it doesn't retry, or the two would keep knocking each
  other off).
- Controls carry every trigger pull since the last message, so a quick tap
  between two messages still fires; the server lets go of the trigger when
  controls stop arriving (hidden tab). After gearing up or swapping guns the
  browser keeps its own gun state until a snapshot agrees.
- Identity is the account's session token (account.ts, kept as
  `degen-city-account-v1`); the server only stores its hash.
- The site build reads the server address from `PUBLIC_GAME_SERVER` (a
  GitHub repo variable). Without it, the Multiplayer button stays hidden.

## Phases

1. **Hangout and player profiles** *(built; goes live once the Cloudflare account is set up, see server/README.md)*
   - Cloudflare account, server deploy from GitHub Actions.
   - See other players walk, run and jump; rooms of 16 with auto-sharding.
   - Player profiles on the server: guest name (reroll), outfit wardrobe
     (picked in Drop 001's fitting room),
     rifle finish, lifetime score and rank badge, following you across
     visits.
   - Name tags, emote wheel, fixed phrases, mute.
   - Shared target practice: everyone shoots the same dummies and drones,
     scores counted by the server.
   - The Armoury gun store: four guns unlocked by lifetime score; the server
     checks the player is at the counter and has unlocked the gun, and the
     profile remembers the last one taken. Once geared up, players swap
     between unlocked guns anywhere (`swap` message, `sim.swap()`); each gun
     keeps its own ammo and the counter refills them all.
   - Plot sales (the `Land` Durable Object): each district is one large plot
     for 20,000,000 PLS. A buyer's wallet pays the owner's wallet directly;
     the server checks the payment on PulseChain (testnet first, mainnet when
     the owner switches) and records the owner and their building for
     everyone. Owners log in with their wallet (no gas) to build.
   - Log in with a wallet (the `Accounts` Durable Object): a basic profile
     per wallet (name, rank, score, wallet, plots owned), used by the game
     rooms and plot building alike.
2. **Leaderboards**: daily and weekly boards (target practice now, PvP
   later) in the Controls panel and on a board in the city.
3. **South bank PvP** (hand-to-hand first: the Fight Club and the fight
   rules are planned in `fight-plan.md`): design and build the neon arena and junkyard / skate
   park; bridge border, health and regen, knock-outs, respawns, kill feed,
   server-checked hits on players with lag compensation.

## Content rules that carry over

- Nothing confidential: no token name, ticker or launch details in names,
  phrases, server code, logs or commit messages.
- Guest names come only from vetted word lists; phrases are a fixed list.
  Once logging in is built, the username is the one thing a player types
  that others see, and only through the filter (above).
- Scores, ranks and finishes are cosmetic: no prizes or token tie-ins.

## Open questions (later)

- Leaderboard reset time (UTC or owner's time zone).
- The junkyard's look and layout (designed with the owner before step 3).
- Which email service sends the reset links (built for Resend's API).
- Whether the email is required at sign-up or optional (without it a
  forgotten password can only be reset through another linked way in).
