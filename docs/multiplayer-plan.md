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

## Decisions

| Topic | Decision |
| --- | --- |
| Mode | Shared hangout city. PvP only across the river, in places built for it. |
| PvP places | A neon arena and a junkyard / skate park on the south bank (designed with the owner first). |
| Border | The bridges. Crossing the middle shows a "PvP zone" banner and a red edge glow; the north side is always safe. Respawn at the south bridgeheads. |
| PvP rules | 100 health, regen after a few seconds without damage, cartoon knock-out (no gore), respawn after 3 s with brief spawn protection, kill feed ("tagged"). |
| Room size | Up to 16 players per city; more cities ("City 1", "City 2"…) open automatically. |
| Identity | Generated player names (vetted word lists, rerollable). Guests keep a profile per browser; logging in with a wallet (one signed message, no gas) gives a profile per wallet that follows the player to any browser. A wallet's first login starts fresh. |
| Chat | Emote wheel and fixed phrases only. Nothing typed ever appears in public. Players can mute others. |
| What others see | Outfit and colours, the gun they carry and its finish, name tag, rank badge. |
| Saved | Server-side player profiles (name, outfit, finish, lifetime score, rank); daily and weekly leaderboards (no prizes). |
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
- Arena and junkyard look and layout.
- When the wallet arrives: how a guest profile links to a wallet.
