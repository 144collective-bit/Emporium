# Security: attacks and scams

The owner's call (2026-11): make the site and the game secure from attacks
and scams. It starts from a full audit (2026-11-04, below). It's built one
phase at a time, each with the owner's sign-off. Keep this file up to date.

## Decisions (the owner's, 2026-11-04)

| Topic | Decision |
| --- | --- |
| Content Security Policy | **Report-only first, then enforced.** Phase 1 sends it in report-only mode, so nothing in the city breaks unseen; Phase 5 switches it to blocking once it's clean. |
| Fair play online | **Move the economy onto the server** (Dorras, purchases and upgrades stored and checked there). It gets a plan of its own, in a later session; Phase 4 here waits for it. |
| Rollout | **One phase at a time**, each signed off before the next. |
| Account settings | **Claude makes what the connectors allow** (asking each time); the rest is a checklist for the owner (Phase 6). |

## What the audit found (2026-11-04)

No critical holes. Nobody could steal a login, run a script on the page or
change the live settings. These were found:

| # | Severity | Finding | Phase |
| --- | --- | --- | --- |
| 1 | Medium | `Lobby.assign()` holds a seat as soon as a socket opens, before its hello, and `/play` has no per-IP limit. The Origin check stops other websites, but not scripts, which can fake it. About 16 bare connections a city fill every city for 2 minutes, and each new guest token makes a stored profile. | 2 |
| 2 | Medium | Outdated packages: Astro ≤7.3.2 (an XSS advisory), vite, undici and follow-redirects, plus wrangler's undici on the server. The WalletConnect chain carries zod 3.x and abitype advisories. | 1 |
| 3 | Low-medium | No security headers on either host: no CSP, no framing block (another site could frame the wallet sign-in), no `nosniff`, referrer policy or HSTS. | 1, 5 |
| 4 | Low today | The server trusts the browser for Dorras-bought guns (`need: 0`), gun mods (`cleanMods`) and up to 5,000 imported points per new guest (`IMPORT_CAP`). Going quiet for 3 s (`AWAY`) skips the speed check, and a shot's direction isn't checked. | 4 |
| 5 | Low | `Accounts.limited()` empties its table at 5,000 entries, so many IPs can reset everyone's limits. Unsigned sign-in codes are only cleared at random, and expired sessions only when used. | 2 |
| 6 | Low | `http://localhost:4321` was in the live server's `ALLOWED_ORIGINS`. | 1 |
| 7 | Latent | `repaint()` (`ui.ts`, and its copy in `tycoon-ui.ts`) parses its string as HTML without escaping. It's safe only because `cleanSave()` keeps listed values only, so a shared save file can't carry markup today. | 5 |
| 8 | Low | The browser signs whatever sign-in message the server sends back (`account.ts` `loginWith()`), and the message isn't the standard EIP-4361 form, so wallets can't warn about a look-alike site. | 3 |
| 9 | Low | Supabase: leaked-password protection off. Public sign-ups need checking. | 6 |
| 10 | Low | `npm run check --prefix server` fails: 54 errors, all from shared browser code type-checked without the DOM types; it was failing before Phase 1 too. Workers Builds doesn't run it, but the GitHub "Deploy game server" workflow does, so that route would fail if its secrets were ever set. | 2 |

Already solid:
- **Wallet login:** each sign-in code works once, is tied to one address and expires in 10 minutes. Signatures are checked with EIP-191 recovery, and only hashes of session tokens are stored.
- **Supabase:** row-level security on every table. Writing settings needs an `admins` row and a two-factor login (`aal2`), every change goes to the audit log, and a trigger checks each value's shape, length and the blocklist.
- **The page:**
  - Server messages, the live settings and wallet names reach it as text or escaped.
  - Wallet icons must be `data:image/`.
  - Nothing uses `eval`, `postMessage` or `document.write`.
- **Saves and caching:** an imported save can't write the login tokens, and the service worker caches only same-origin `/_astro/` files.
- **Secrets:** none in the tree or its history. The WalletConnect project ID is public by design.
- **CI:** both workflows have read-only permissions, and the Cloudflare secrets are used only in the deploy step.

## Phases

### Phase 1: quick hardening (built, waiting on the owner's sign-off)

- **Packages:** `npm audit fix` (non-breaking) in the site and the server: Astro 7.4.5, vite 8.3.5, undici 8.12.3, follow-redirects 1.16.2, wrangler 4.157.0. The server is at 0 advisories. Left on purpose: the WalletConnect chain's zod 3.x and abitype. Zod has no fixed 3.x release, and the only fix npm offers is a WalletConnect downgrade. The risk is memory use in the visitor's own browser, in code loaded only when a wallet connects on workers.dev. Check again when WalletConnect updates.
- **CI:** the GitHub Actions pinned to commit SHAs, with the version in a comment. `.github/dependabot.yml` sends a weekly grouped update for the site's packages, the server's and the Actions.
- **Allowed sites:** `localhost` out of the live `ALLOWED_ORIGINS`. Local dev sets it in `server/.dev.vars` (not in git; `server/README.md`).
- **Headers:** on both hosts, the same set:
  - Hostinger: `public/.htaccess`.
  - workers.dev: `public/_headers`, which Cloudflare's static assets read. On Hostinger it's a plain file showing the same headers, which is harmless (blocking it needs Apache 2.4 syntax, and a wrong line in `.htaccess` would take the whole site down).
  - `tests/headers.test.ts` holds the two to the same values.
  - Enforced now:
    - `Content-Security-Policy: frame-ancestors 'none'; object-src 'none'; base-uri 'self'`, plus `X-Frame-Options: DENY`: nobody can frame the site;
    - `X-Content-Type-Options: nosniff`;
    - `Referrer-Policy: strict-origin-when-cross-origin`;
    - `Strict-Transport-Security` for a year (no subdomains, no preload);
    - `Cross-Origin-Opener-Policy: same-origin-allow-popups` (wallet pop-ups keep working);
    - `Permissions-Policy` turning off the camera, microphone, location, payment and USB.
  - The full policy in report-only mode (`Content-Security-Policy-Report-Only`):
    - scripts from the site itself, `wasm-unsafe-eval` for three's texture transcoder, and `unsafe-inline` for now (the page has two small inline scripts; Phase 5 swaps it for their hashes);
    - workers from the site and `blob:` (three's KTX2 loader);
    - Google Fonts and Reown's fonts;
    - connections to the site, the live config's Supabase function, WalletConnect's relay, verify and RPC, Reown's API and the PulseChain RPCs;
    - WalletConnect's verify and secure frames.
- **CSP reports:** sent to the Worker's `/csp-report` (`server/src/csp.ts`). It takes `report-uri` and Reporting API reports, up to 16 KB each and 30 a minute from one address. It logs the directive, the blocked source and the page (origin and path, no query) to the Worker's logs, and stores nothing.

### Phase 2: keeping the game server up

- A seat is counted only after a valid hello. The Lobby keeps reservations only briefly, and the room reports what's real.
- Connections per IP limited (about 6, so a family or a school on one connection still fits). New guest profiles per IP limited too.
- `Accounts.limited()` stops emptying itself under a flood: entries are dropped oldest first.
- An alarm clears unsigned sign-in codes and expired sessions.
- Messages over a size cap are dropped before they're parsed.
- The server's type check passing again (finding 10).

### Phase 3: anti-scam login (look-alike sites)

- The sign-in message in the standard Sign-In with Ethereum format (EIP-4361), so wallets warn when its domain isn't the site asking.
- The browser checks the message (its own origin, address and chain, a fresh nonce) before it asks the wallet to sign.
- Clear wording at sign-in: "Sector 7 never asks for a transaction, an approval or your seed phrase."
- The WalletConnect project ID locked to the site's domains in the Reown dashboard (Phase 6's checklist if no connector reaches it).
- Player names and phrases can never read as staff ("Admin", "Official", "Support", "Mod"); a test holds it.
- The live config's banners and notes refuse links and wallet addresses, in the Supabase check and in `live.ts`, so a hijacked banner can't send people to a scam.

### Phase 4: fair play online (waiting)

Waits for the economy-on-the-server plan (the owner's call). That plan will cover:
- Dorras and purchases checked on the server;
- no imported score;
- the gap where going quiet skips the speed check;
- shots that point somewhere believable.

### Phase 5: protection inside the page

- `repaint()` takes an escaping tagged template, so anything interpolated is text unless it's marked as markup. Its callers move over to it.
- The CSP enforced: the inline scripts by hash (or moved to files), no `unsafe-inline` for scripts, anything Phase 1's reports showed added or fixed.
- Tests that hold both.

### Phase 6: the owner's accounts

Claude makes what the connectors allow, asking first. The rest is a checklist:
- **Two-factor login:** GitHub, Cloudflare, Hostinger, Supabase and Reown.
- **GitHub:**
  - protect `main` (pushes to it go live on both hosts): no force pushes, changes through pull requests;
  - Dependabot alerts and security updates on (Settings, Code security);
  - secret scanning on.
- **Cloudflare:**
  - rotate the API token;
  - delete the `CLOUDFLARE_*` GitHub secrets if Workers Builds deploys (only one system should);
  - a usage alert.
- **Supabase:**
  - leaked-password protection on;
  - public sign-ups off (one admin user exists).
- **Reown:** the project ID's allowed domains (degenemporium.com, emporium.144collective.workers.dev).
