# Degen City multiplayer: the plan

Agreed with the owner. Multiplayer ships in phases, each as a public beta,
clearly labelled. This file is the reference; update it as decisions change.

## Decisions

| Topic | Decision |
| --- | --- |
| Mode | Shared hangout city. PvP only across the river, in places built for it. |
| PvP places | A neon arena and a junkyard / skate park on the south bank (designed with the owner first). |
| Border | The bridges. Crossing the middle shows a "PvP zone" banner and a red edge glow; the north side is always safe. Respawn at the south bridgeheads. |
| PvP rules | 100 health, regen after a few seconds without damage, cartoon knock-out (no gore), respawn after 3 s with brief spawn protection, kill feed ("tagged"). |
| Room size | Up to 16 players per city; more cities ("City 1", "City 2"…) open automatically. |
| Identity | Generated guest name now (vetted word lists, rerollable), wallet sign-in once the real wallet exists. |
| Chat | Emote wheel and fixed phrases only. Nothing typed ever appears in public. Players can mute others. |
| What others see | Outfit and colours, the gun they carry and its finish, name tag, rank badge. |
| Saved | Server-side player profiles (name, outfit, finish, lifetime score, rank); daily and weekly leaderboards (no prizes). |
| Builder | Stays a personal demo in the visitor's browser until the real wallet and pricing exist. |
| Fairness | The server decides hits (it runs `combat-sim.ts`), checks movement and fire rate, and rewinds drones to what the shooter saw. |
| Server | Cloudflare Workers + Durable Objects (one per room, one per profile). The site stays static on Hostinger. |
| Account | The owner creates the Cloudflare account (guided); deploys run from GitHub Actions with a repo secret. |

## How it fits together

```
Visitor's browser                         Cloudflare (server/)
  degenemporium.com (static, Hostinger)     Worker: /play  ──> Lobby DO (which city has room)
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
- Guest identity is a random secret kept in the browser
  (`degen-city-player-v1`); the server only stores its hash.
- The site build reads the server address from `PUBLIC_GAME_SERVER` (a
  GitHub repo variable). Without it, the Multiplayer button stays hidden.

## Phases

1. **Hangout and player profiles** *(built; goes live once the Cloudflare account is set up, see server/README.md)*
   - Cloudflare account, server deploy from GitHub Actions.
   - See other players walk, run and jump; rooms of 16 with auto-sharding.
   - Player profiles on the server: guest name (reroll), outfit wardrobe,
     rifle finish, lifetime score and rank badge, following you across
     visits.
   - Name tags, emote wheel, fixed phrases, mute.
   - Shared target practice: everyone shoots the same dummies and drones,
     scores counted by the server.
   - The Armoury gun store: four guns unlocked by lifetime score; the server
     checks the player is at the counter and has unlocked the gun, and the
     profile remembers the last one taken.
2. **Leaderboards**: daily and weekly boards (target practice now, PvP
   later) in the Controls panel and on a board in the city.
3. **South bank PvP**: design and build the neon arena and junkyard / skate
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
