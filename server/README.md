# Degen City game server

The multiplayer server for Degen City: a Cloudflare Worker with four kinds
of Durable Object. (Plot sales for PLS were retired: district plots are
bought with Dorras in the city's own game, in the browser.) The same Worker also serves the website
(a static build) at https://emporium.144collective.workers.dev.

| File | What it does |
| --- | --- |
| `src/index.ts` | The Worker: `/health`; `/play` (WebSocket) joins the game in `?game=` (a hangout city, or a private game's link) or, without it, asks the Lobby for a city with room, and hands the connection to that game's Room; `/games` (GET `?mode=`: a mode's public games for the Multiplayer menu's Browse; POST `{ mode, map }`: make a private game); `/me` (the player's own profile for the menu); `/auth/*` (accounts.ts). Playing online needs an account: `/play` (in its hello), `/games` and `/me` want its session (`Authorization: Bearer`). Only pages in `ALLOWED_ORIGINS` (wrangler.jsonc) can connect or ask. |
| `src/lobby.ts` | One for the whole game: the Multiplayer menu's games (`src/scripts/net/games.ts`): the public hangout cities (16 players each; "City 2" opens when "City 1" is full) and the private games made from the menu, kept in storage until nobody has been in one for a day. |
| `src/room.ts` | One per game (a city or a private game): runs the shared combat rules (`src/scripts/city3d/combat-sim.ts`) at 60 Hz, checks movement and shots, sends positions 15 times a second, relays emotes and fixed phrases, banks points in profiles. |
| `src/profile.ts` | One per account: player name (the account's username), wardrobe look, rifle finish, lifetime score (rank comes from the score); a new one starts fresh (nothing comes from the browser's solo save). Named in the account: a hash of its id (`src/keys.ts`). |
| `src/accounts.ts` | One for the game: accounts. An account is a username, an email and a password, nothing else (the owner's call): `/auth/signup`, `/auth/login` (username or email; five wrong tries lock a username for 15 minutes), `/auth/forgot` (a reset link to the account's email) and `/auth/reset`, `/auth/me`, `/auth/username`, `/auth/email`, `/auth/password` (the last two need the current password), `/auth/logout`; `/auth/config` says whether reset emails are set up. Session tokens last 30 days; only hashes of tokens and reset links are stored. |
| `src/login.ts` | What logging in needs without Cloudflare (tested in `tests/login.test.ts`): password hashes (PBKDF2-SHA256, 100,000 rounds, the most Cloudflare takes), the lock-out, where a reset link opens and the reset email. |

Shared with the site (bundled in): `src/scripts/net/` (protocol, the games and
their modes, the username filter and the account API, names, ranks, wardrobe, emotes, phrases), `src/scripts/city3d/combat-sim.ts`
and `src/scripts/city3d/solids.ts`. Keep those free of DOM and scene code.

## Deploying: the GitHub Action, only

The Worker is called **emporium** (it must match `"name"` in `wrangler.jsonc`).
It serves the game server **and its own copy of the whole website** at
https://emporium.144collective.workers.dev: `wrangler deploy` runs the site
build first (`build` in `wrangler.jsonc`, with `PUBLIC_GAME_SERVER`) and
publishes `../dist` as static assets.

The **Deploy game server** Action (`.github/workflows/deploy-server.yml`)
deploys it on every push to `main`, and on demand (*Actions* → **Deploy
game server** → *Run workflow*). It's the only thing that should: Cloudflare's
own Git build (Workers Builds) must stay **disconnected** (*Workers & Pages*
→ **emporium** → *Settings* → *Build* → *Disconnect*). Left connected, it
published the site on its own, without the game server, over the Action's
deploy: every game route (`/health`, `/play`, `/auth/*`) answered an empty
404 and nobody could connect.

## One-time setup (the owner)

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

After that, every push to `main` redeploys it
automatically.

## Logging in: the secrets (the owner)

Signing up and logging in (a username, an email and a password) work with
nothing more. Password reset emails and the private list of blocked names
each need a secret. Add a secret in the Cloudflare dashboard: *Workers &
Pages* → **emporium** → *Settings* → *Variables and Secrets* → *Add* →
type **Secret**, its name and its value → *Deploy*. (Or from a computer:
`cd server && npx wrangler secret put NAME`.) Until the email key is
there, "Forgot your password?" says resets are coming soon.

**Reset emails** (`EMAIL_API_KEY`, and `EMAIL_FROM`): built for Resend
(https://resend.com, free for 3,000 emails a month). Make an account, add
your domain (*Domains* → *Add Domain* → degenemporium.com) and put the DNS
records it lists into the domain's DNS at Hostinger, wait for it to say
*Verified*, then *API Keys* → *Create API Key* (sending access) → copy it
into `EMAIL_API_KEY`. `EMAIL_FROM` is who the email is from, for example
`Sector 7 <no-reply@degenemporium.com>` (an address on the verified domain;
it can be a plain variable in `wrangler.jsonc` `vars` instead of a secret).
The link in the email opens the site on a "Pick a new password" card and
works for 30 minutes.

**Blocked names** (`BLOCKED_NAMES`): words no username may contain, comma
separated (for example the token's name before launch). The filter in
`src/scripts/net/auth.ts` already turns down rude words, links, wallet
addresses and names that pass for staff; this list adds yours without them
ever being written in the code. Case, `_`, `-` and numbers for letters don't
get round it.

## Cost

Durable Objects with SQLite storage are available on Cloudflare's free
Workers plan, which is plenty for building and testing. Logging in with a
password hashes it (tens of milliseconds of CPU each time), more than the free plan's
10 ms a request allows, so accounts need the paid Workers plan (from about
$5 a month plus usage), which the owner has.
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
