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
2. **Fight Club 1 v 1** with spectators and the queue.
3. **The junkyard** with free for all and team deathmatch.
4. **Kart races** online.
5. **The online economy**: the online profile's Dorras, levels, shops and
   missions run by the server.

## Decisions

| Topic | Decision |
| --- | --- |
| Mode | Picked in the Multiplayer menu (above): Hangout (a safe shared city), free for all, team deathmatch, kart races, Fight Club. |
| PvP places | Arena maps of their own (the junkyard first), walled off from the city; the Fight Club's ring. Never in the hangout city. |
| PvP rules | 100 health, regen after a few seconds without damage, cartoon knock-out (no gore), respawn after 3 s with brief spawn protection, kill feed ("tagged"). |
| Room size | Up to 16 players per city; more cities ("City 1", "City 2"…) open automatically. |
| Identity | Generated player names (vetted word lists, rerollable). Guests keep a profile per browser; logging in with a wallet (one signed message, no gas) gives a profile per wallet that follows the player to any browser. A wallet's first login starts fresh. |
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
- Guest identity is a random secret kept in the browser
  (`degen-city-player-v1`); the server only stores its hash.
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
- Scores, ranks and finishes are cosmetic: no prizes or token tie-ins.

## Open questions (later)

- Leaderboard reset time (UTC or owner's time zone).
- The junkyard's look and layout (designed with the owner before step 3).
- When the wallet arrives: how a guest profile links to a wallet.
