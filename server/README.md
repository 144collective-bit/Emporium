# Degen City game server

The multiplayer and plot-sales server for Degen City: a Cloudflare Worker
with four kinds of Durable Object. The website itself stays a static build on Hostinger; only
the live game connection goes to Cloudflare.

| File | What it does |
| --- | --- |
| `src/index.ts` | The Worker: `/health`, and `/play` (WebSocket) which asks the Lobby for a city and hands the connection to it. Only pages in `ALLOWED_ORIGINS` (wrangler.jsonc) can connect. |
| `src/lobby.ts` | One for the whole game: picks a city with a free spot (16 players each; "City 2" opens when "City 1" is full). |
| `src/room.ts` | One per city: runs the shared combat rules (`src/scripts/city3d/combat-sim.ts`) at 60 Hz, checks movement and shots, sends positions 15 times a second, relays emotes and fixed phrases, banks points in profiles. |
| `src/profile.ts` | One per player: guest name, wardrobe look, rifle finish, lifetime score (rank comes from the score). Addressed by a hash of the browser's secret guest token. |
| `src/land.ts` | One for the city: plot sales and buildings (`/land`). Checks each payment on PulseChain, records owners, refunds due and every owner's building. |

Shared with the site (bundled in): `src/scripts/net/` (protocol, names, ranks,
wardrobe, emotes, phrases, land API), `src/scripts/city3d/combat-sim.ts`,
`src/scripts/city3d/solids.ts` and `src/data/plots.ts`. Keep those free of DOM
and scene code.

## Deploying from GitHub through Cloudflare (Workers Builds)

The Worker is called **emporium** (it must match `"name"` in `wrangler.jsonc`)
and is connected to this GitHub repository in Cloudflare, so Cloudflare builds
and deploys it on every push to `main`. Its build settings (*Workers & Pages* →
**emporium** → *Settings* → *Build*):

| Setting | Value |
| --- | --- |
| Git branch | `main` |
| Root directory | `server` |
| Build command | `cd .. && npm ci && cd server && npm ci` (the server bundles shared code from `src/`, which needs the site's three.js) |
| Deploy command | `npx wrangler deploy` |
| Build watch paths (optional) | `server/*`, `src/scripts/net/*`, `src/data/plots.ts`, `src/scripts/city3d/combat-sim.ts`, `src/scripts/city3d/solids.ts` |

The server lives at `https://emporium.144collective.workers.dev`. The "Build
site" Action builds the site against that address (a `PUBLIC_GAME_SERVER`
repository variable overrides it). With this
in place, the GitHub Action route below isn't needed (leave its secrets unset
so only one system deploys).

## One-time setup with GitHub Actions instead (the owner)

1. **Create a Cloudflare account** (free) at https://dash.cloudflare.com/sign-up.
2. **Pick your workers.dev subdomain**: in the dashboard open *Workers & Pages*.
   The first time, it asks you to choose a subdomain (for example
   `degenemporium`). The game server will live at
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
7. **Point the site at it**: *Settings* → *Secrets and variables* → *Actions*
   → *Variables* tab → *New repository variable*:
   - `PUBLIC_GAME_SERVER` = `https://emporium.<your-subdomain>.workers.dev`
8. **Rebuild the site**: *Actions* → **Build site** → *Run workflow*, download
   the zip and upload it to Hostinger as usual. The **Online** pill now
   appears in walk mode.

After that, every push to `main` that touches the server redeploys it
automatically.

## Plot sales

Each of the 11 districts is one large plot for 20,000,000 PLS. Buyers pay
from their own wallet straight to **your** wallet. The server checks every
payment on PulseChain before anyone gets a plot: right address, full price,
succeeded, enough confirmations, under a day old, never used twice. The
settings are the `LAND_*` vars in `wrangler.jsonc`:

| Setting | What it does |
| --- | --- |
| `LAND_PAYEE` | **Your** PulseChain wallet address that payments go to. Public address only: never a private key or seed phrase. While it's empty, plots show "Sales open soon". |
| `LAND_CHAIN_ID` | `943` = PulseChain Testnet v4 (test PLS, no real value). `369` = PulseChain mainnet. Starts on the testnet. |
| `LAND_PRICE_PLS` | Price per plot in whole PLS (`20000000`). This is the price that counts; keep `PLOT_PRICE` in `src/data/plots.ts` the same for the demo. |
| `LAND_CONFIRMATIONS` | Blocks a payment needs before the plot is the buyer's (`3`). |
| `LAND_RPC` | Optional: a PulseChain RPC to check payments on. Defaults to the network's public RPC. |

**Opening sales on the testnet:**
1. Put your wallet address in `LAND_PAYEE` in `wrangler.jsonc` and push to
   `main`. The server redeploys itself.
2. Get some free test PLS from the PulseChain testnet faucet and buy a plot
   from another wallet to try the whole flow.

**Going live on mainnet:** set `LAND_CHAIN_ID` to `369` and push. Owners are
kept per network, so the testnet's plots don't carry over: mainnet starts
with every plot for sale.

**Refunds:** if two people pay for the same plot at the same moment, the
second payment (or any short payment) is recorded for a refund. Each one is
written to the Worker's logs as `LAND REFUND DUE` with the buyer's address,
the amount and the transaction hash. Find them in the Cloudflare dashboard:
*Workers & Pages* → **degen-city** → *Logs*. Send those back by hand from
your wallet.

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

Plot sales locally: `npx wrangler dev --var LAND_PAYEE:0x… --var LAND_RPC:<a testnet RPC>`.

Then build the site against it from the repo root:

```sh
PUBLIC_GAME_SERVER=http://localhost:8787 npm run build && npx astro preview
```

`npm run check` type-checks the server.
