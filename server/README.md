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
| `src/profile.ts` | One per account: player name (the account's username), wardrobe look, rifle finish, lifetime score (rank comes from the score); a new one starts fresh (nothing comes from the browser's solo save). Named in the account: a hash of its id, or of its wallet's address for a wallet that had a profile before accounts (`src/keys.ts`). |
| `src/accounts.ts` | One for the game: accounts. Ways in: a username and password (`/auth/signup`, `/auth/login`; five wrong tries lock a username for 15 minutes), Google or Discord (`/auth/oauth`, the providers come back to `/auth/google/callback` / `/auth/discord/callback`, the site swaps the code with `/auth/claim`), a wallet (`/auth/nonce`, `/auth/session`: it signs a one-time message, no gas); a first sign-in with Google, Discord or a wallet picks its username (`/auth/finish`). Forgot your password: `/auth/forgot` emails a reset link, `/auth/reset`. The account: `/auth/me`, `/auth/username`, `/auth/password`, `/auth/email`, `/auth/unlink`, `/auth/logout`; `/auth/config` says which ways are set up. Session tokens last 30 days; only hashes of tokens and links are stored. |
| `src/login.ts` | What logging in needs without Cloudflare (tested in `tests/login.test.ts`): password hashes (PBKDF2-SHA256, 100,000 rounds, the most Cloudflare takes), the lock-out, the Google and Discord sign-in (OAuth 2 with PKCE), the reset email. |

Shared with the site (bundled in): `src/scripts/net/` (protocol, the games and
their modes, the username filter and the account API, names, ranks, wardrobe, emotes, phrases, the sign-in message), `src/scripts/city3d/combat-sim.ts`
and `src/scripts/city3d/solids.ts`. Keep those free of DOM and scene code.

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
| Root directory | `server` |
| Build command | `cd .. && npm ci && cd server && npm ci` (the server bundles shared code from `src/`, which needs the site's three.js) |
| Deploy command | `npx wrangler deploy` |
| Build watch paths | leave empty (the Worker carries the website now, so every change should redeploy it) |

The server and the site live at `https://emporium.144collective.workers.dev`;
the site is built against that address. With this
in place, the GitHub Action route below isn't needed (leave its secrets unset
so only one system deploys).

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

## Logging in: the secrets (the owner)

Usernames and passwords and wallets work with nothing more. Google, Discord,
the reset emails and the private list of blocked names each need a secret.
Add a secret in the Cloudflare dashboard: *Workers & Pages* → **emporium** →
*Settings* → *Variables and Secrets* → *Add* → type **Secret**, its name and
its value → *Deploy*. (Or from a computer: `cd server && npx wrangler secret put NAME`.)
Until a secret is there, its part just isn't offered: no Google or Discord
button, and "Forgot your password?" says it's coming soon.

**Google** (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`):

1. Open https://console.cloud.google.com/ and make a project (top bar →
   *New project*, for example "Sector 7").
2. *APIs & Services* → *OAuth consent screen* → *Get started*: app name
   "Sector 7", your support email, audience **External**, your contact
   email → *Create*. Under *Audience*, *Publish app* (until then only test
   users you list can sign in).
3. *APIs & Services* → *Credentials* → *Create credentials* → *OAuth client
   ID* → type **Web application**, name "Sector 7".
4. *Authorized redirect URIs* → *Add URI*:
   `https://emporium.144collective.workers.dev/auth/google/callback`
   (for testing on your computer also `http://localhost:8787/auth/google/callback`).
5. *Create*: copy the **Client ID** into `GOOGLE_CLIENT_ID` and the **Client
   secret** into `GOOGLE_CLIENT_SECRET`.

Only the basic `openid` scope is asked for: the server keeps Google's account
id and nothing else (no name, picture or email).

**Discord** (`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`):

1. Open https://discord.com/developers/applications → *New Application*,
   name "Sector 7" → *Create*.
2. *OAuth2* → *Redirects* → *Add Redirect*:
   `https://emporium.144collective.workers.dev/auth/discord/callback`
   (and `http://localhost:8787/auth/discord/callback` for testing) → *Save Changes*.
3. On the same page copy the **Client ID** into `DISCORD_CLIENT_ID`; *Reset
   Secret* → copy it into `DISCORD_CLIENT_SECRET` (shown once).

Only the `identify` scope is asked for, and only the Discord user's id is kept.

**Reset emails** (`EMAIL_API_KEY`, and `EMAIL_FROM`): built for Resend
(https://resend.com, free for 3,000 emails a month). Make an account, add
your domain (*Domains* → *Add Domain* → degenemporium.com) and put the DNS
records it lists into the domain's DNS at Hostinger, wait for it to say
*Verified*, then *API Keys* → *Create API Key* (sending access) → copy it
into `EMAIL_API_KEY`. `EMAIL_FROM` is who the email is from, for example
`Sector 7 <no-reply@degenemporium.com>` (an address on the verified domain;
it can be a plain variable in `wrangler.jsonc` `vars` instead of a secret).

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
