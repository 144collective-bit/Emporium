# Degen City game server

The multiplayer server for Degen City: a Cloudflare Worker with three kinds of
Durable Object. The website itself stays a static build on Hostinger; only
the live game connection goes to Cloudflare.

| File | What it does |
| --- | --- |
| `src/index.ts` | The Worker: `/health`, and `/play` (WebSocket) which asks the Lobby for a city and hands the connection to it. Only pages in `ALLOWED_ORIGINS` (wrangler.jsonc) can connect. |
| `src/lobby.ts` | One for the whole game: picks a city with a free spot (16 players each; "City 2" opens when "City 1" is full). |
| `src/room.ts` | One per city: runs the shared combat rules (`src/scripts/city3d/combat-sim.ts`) at 60 Hz, checks movement and shots, sends positions 15 times a second, relays emotes and fixed phrases, banks points in profiles. |
| `src/profile.ts` | One per player: guest name, wardrobe look, rifle finish, lifetime score (rank comes from the score). Addressed by a hash of the browser's secret guest token. |

Shared with the site (bundled in): `src/scripts/net/` (protocol, names, ranks,
wardrobe, emotes, phrases), `src/scripts/city3d/combat-sim.ts` and
`src/scripts/city3d/solids.ts`. Keep those free of DOM and scene code.

## One-time setup (the owner)

1. **Create a Cloudflare account** (free) at https://dash.cloudflare.com/sign-up.
2. **Pick your workers.dev subdomain**: in the dashboard open *Workers & Pages*.
   The first time, it asks you to choose a subdomain (for example
   `degenemporium`). The game server will live at
   `https://degen-city.<your-subdomain>.workers.dev`.
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
   finishes, open `https://degen-city.<your-subdomain>.workers.dev/health`;
   it should say `ok`.
7. **Point the site at it**: *Settings* → *Secrets and variables* → *Actions*
   → *Variables* tab → *New repository variable*:
   - `PUBLIC_GAME_SERVER` = `https://degen-city.<your-subdomain>.workers.dev`
8. **Rebuild the site**: *Actions* → **Build site** → *Run workflow*, download
   the zip and upload it to Hostinger as usual. The **Online** pill now
   appears in walk mode.

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

Then build the site against it from the repo root:

```sh
PUBLIC_GAME_SERVER=http://localhost:8787 npm run build && npx astro preview
```

`npm run check` type-checks the server.
