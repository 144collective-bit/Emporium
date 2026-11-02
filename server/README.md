# Degen City game server

The multiplayer server for Degen City: a Cloudflare Worker with four kinds
of Durable Object. (Plot sales for PLS were retired: district plots are
bought with Dorras in the city's own game, in the browser.) The same Worker also serves the website
(a static build) at https://emporium.144collective.workers.dev.

| File | What it does |
| --- | --- |
| `src/index.ts` | The Worker: `/health`, and `/play` (WebSocket) which asks the Lobby for a city and hands the connection to it. Only pages in `ALLOWED_ORIGINS` (wrangler.jsonc) can connect. |
| `src/lobby.ts` | One for the whole game: picks a city with a free spot (16 players each; "City 2" opens when "City 1" is full). |
| `src/room.ts` | One per city: runs the shared combat rules (`src/scripts/city3d/combat-sim.ts`) at 60 Hz, checks movement and shots, sends positions 15 times a second, relays emotes and fixed phrases, banks points in profiles. |
| `src/profile.ts` | One per player: player name, wardrobe look, rifle finish, lifetime score (rank comes from the score). Addressed by a hash of the browser's secret guest token, or of the wallet address once logged in (`src/keys.ts`). |
| `src/accounts.ts` | One for the game: logging in with a wallet (`/auth/nonce`, `/auth/session`, `/auth/me`, `/auth/rename`, `/auth/logout`). The wallet signs a one-time message (no gas); the session token (30 days, only its hash stored) opens the wallet's profile in the rooms. |

| `src/world.ts` | The city's geometry the Room needs (the boxes bullets stop on, the gun stores' counters), read from `world.gen.txt`, which `scripts/bake-world.mjs` writes from `solids.ts` when the Worker is built (`build` in `wrangler.jsonc`; not in git). |

Shared with the site (bundled in): `src/scripts/net/` (protocol, names, ranks,
wardrobe, emotes, phrases, the sign-in message), `src/scripts/city3d/combat-sim.ts`
and `src/scripts/city3d/boxgrid.ts`. Keep those free of DOM and scene code.

**Keep the Worker's startup light.** Cloudflare refuses a Worker whose
startup (everything at module level) takes too much CPU: the deploy fails
with "Script startup exceeded CPU time limit" [code: 10021]. Importing
`solids.ts` builds every district's layout (about 0.4 s), so the server
never imports it: its boxes are baked at build time instead
(`scripts/bake-world.mjs`, about 40 ms of startup left; `wrangler deploy`
prints "Worker Startup Time"). Don't import `solids.ts`, `layout`-heavy
district modules or anything that works the city out at module level into
`server/src`; bake what's needed the same way. The ray leaves out
Crestmont's hills: no target stands within a gun's reach of them
(`tests/solids.test.ts` holds that, and that the server's ray matches the
browser's everywhere else).

## Deploying from GitHub through Cloudflare (Workers Builds)

The Worker is called **emporium** (it must match `"name"` in `wrangler.jsonc`)
and is connected to this GitHub repository in Cloudflare, so Cloudflare builds
and deploys it on every push to `main`. It serves the game server **and the
whole website** at https://emporium.144collective.workers.dev:
`wrangler deploy` runs the site build first (`build` in `wrangler.jsonc`) and
publishes `../dist` as static assets. Its build settings (*Workers & Pages* →
**emporium** → *Settings* → *Build*):

| Setting | Value |
| --- | --- |
| Git branch | `main` |
| Root directory | `server` (where `wrangler.jsonc` is; a deploy that doesn't use it publishes the site alone as static files, with no game server: `/health` is a 404) |
| Build command | `cd .. && npm ci && cd server && npm ci` (the server bundles shared code from `src/`, which needs the site's three.js) |
| Deploy command | `npx wrangler deploy` |
| Non-production branch deploy command | `npx wrangler versions upload` (the PRs' check) |
| Build watch paths | leave empty (the Worker carries the website now, so every change should redeploy it) |

The server and the site live at `https://emporium.144collective.workers.dev`;
the site is built against that address. With this
in place, the GitHub Action route below isn't needed: leave its secrets unset
(or remove them) so only one system deploys. With both on, every push deploys
twice and the later one wins.

## One-time setup with GitHub Actions instead (the owner)

1. **Create a Cloudflare account** (free) at https://dash.cloudflare.com/sign-up.
2. **Pick your workers.dev subdomain**: in the dashboard open *Workers & Pages*.
   The first time, it asks you to choose a subdomain (for example
   `144collective`). The game server and the site will live at
   `https://emporium.<your-subdomain>.workers.dev`.
3. **Make an API token**: profile icon (top right) → *My Profile* → *API
   Tokens* → *Create Token* → use the **Edit Cloudflare Workers** template →
   choose your account → *Continue to summary* → *Create Token*. Copy it (it's
   shown once).
4. **Find your Account ID**: *Workers & Pages* overview, right-hand side
   (*Account details*), or the long code in the dashboard URL.
5. **Add them to GitHub**: the repository → *Settings* → *Secrets and
   variables* → *Actions* → *New repository secret*:
   - `CLOUDFLARE_API_TOKEN` = the token from step 3
   - `CLOUDFLARE_ACCOUNT_ID` = the ID from step 4
6. **Deploy**: *Actions* → **Deploy game server** → *Run workflow*. When it
   finishes, open `https://emporium.<your-subdomain>.workers.dev/health`;
   it should say `ok`.
7. **Check the address**: the site is built against the address in `build`
   in `wrangler.jsonc` (`PUBLIC_GAME_SERVER`) and listed in `ALLOWED_ORIGINS`;
   change both if your subdomain differs. The site is published with the
   Worker, so the **Online** pill appears in walk mode straight away.

After that, every push to `main` that touches the server redeploys it
automatically.

## Cost

Durable Objects with SQLite storage are available on Cloudflare's free
Workers plan, which is plenty for building and testing. A busy public beta
will likely need the paid Workers plan (from about $5 a month plus usage).
Check Cloudflare's current limits and pricing before switching it on, and
set a usage alert in the dashboard.

## Running it locally

```sh
cd server
npm install
npm run dev            # http://localhost:8787 (uses ../node_modules for three.js: run npm install at the repo root first)
```

`npm run dev` here also builds the website (with `PUBLIC_GAME_SERVER` pointing at
workers.dev) and serves it at http://localhost:8787.

Then build the site against it from the repo root:

```sh
PUBLIC_GAME_SERVER=http://localhost:8787 npm run build && npx astro preview
```

`npm run check` type-checks the server.
