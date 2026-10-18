# Working on this repo

This is **the** Degen Emporium site. An older multi-page site existed before
it and has been retired completely. Build only on what's here.

## Never bring back the old site

- The site is the Degen City homepage (`src/pages/index.astro`), the Emporium
  comic page it links into (`src/pages/emporium.astro`) and `404.astro`. Do not
  add or restore pages like `/news`, `/blog`, `/store`, `/shop`, `/alpha`,
  `/tokenomics`, `/vault`, `/terminal`, `/team`, `/projects`, `/about`,
  `/contact` or `/links` unless the owner asks for that page by name.
- Do not restore anything from git history (old pages, art, team portraits,
  graffiti headers, sticker sheets, the acid-green palette, the "Connect"
  wallet button, the "MAINNET" badge). Old commits are history, not source.
- New pages, sections or art only on the owner's explicit request.
- The `nft-minter` branch is a separate project. Never merge it, or copy
  anything from it, into `main` or any website branch.

## Design rules

- The homepage is Degen City in two layers, both in Degen's style (black ink
  outlines, flat cartoon shading, PulseChain neon):
  - **3D** (`src/scripts/city3d/`, three.js): toon materials, ink outlines
    from a normal/depth post-pass, bloom, day/night from the visitor's clock,
    weather, traffic, people, optional synthesised sound. Clicking a
    building flies the camera in and opens a glass panel.
  - **2D** (`src/lib/city.ts`): the isometric SVG map. It's the loading
    poster, the fallback without WebGL, and the "2D map" view.
  Both layers share the core city's block layout; keep them in step when
  buildings change. The ring roads and plot districts exist in 3D only. Spot links, pin copy and panel copy live in
  `src/components/CityMap.astro`. Buildings link only to `/emporium` (or its
  window anchors: `#drop`, `#workshop`, `#vault`, `#plan`) or to the
  confirmed links in `src/data/site.ts`.
- Keep the city's motion optional: under `prefers-reduced-motion` the 3D
  city stands still (no fly-in, no traffic), CSS animations stop and the 2D
  map's SMIL traffic is paused. Sound is always off until the visitor
  turns it on.
- Keep phones light: `src/scripts/city3d/index.ts` picks a quality tier
  (fewer cars and people, no shadows, smaller bloom on phones), runs phones
  at 30fps while nobody is touching the city, and steps quality down
  (pixels, then shadows, then bloom; never the ink outlines) if frames are
  slow.
- Floating cut-out signs (FX layer with a transparent texture, like the roof
  logo) need `occlude()` from `kit.ts`, or the ink outlines of whatever is
  behind them get drawn across them.
- The comic-window layout in `src/components/ComicPage.astro` is the design.
  Each window is defined by its ink outline; keep content inside the slants.
- Palette is the PulseChain gradient. Follow `brand/README.md`: gradient for
  borders, glows and large type; `--p-cyan` for small text; buttons are
  gradient-bordered with white text, never gradient-filled.
- Type: Big Shoulders Display (headlines), Inter (body), JetBrains Mono
  (labels).
- Check every change at 320, 375, 768, 1024 and 1440px wide: no sideways
  scroll, no text clipped by a slanted edge.

## City builder (3D build mode)

- Districts around the core are split into 3 x 3 plots (`DISTRICTS` in
  `src/scripts/city3d/world.ts`, plot grid and building generators in
  `plots.ts`, interface in `builder-ui.ts`). The core landmarks are not for
  sale.
- **Purchases are simulated.** No wallet connects, nothing is sent to
  PulseChain, no real PLS moves; state is saved in the visitor's browser
  (`store.ts`). Keep every builder screen labelled as a demo until the real
  wallet is wired in, and put the real integration behind `store.ts`'s
  `connect()` / `buy()` so the interface doesn't change.
- **Prices in `src/data/plots.ts` are placeholders.** Don't present them as
  real until the owner supplies pricing.
- Visitors can't type text onto buildings: sign texts come from the fixed
  `SIGNS` list, so nothing unexpected (or confidential) appears in public.

## Hosting

- degenemporium.com is a static build hosted on Hostinger (`dist/`
  extracted into `public_html`). The "Build site" GitHub Action builds
  every push to `main` into a downloadable zip.
- Keep the site fully static (no server routes) and keep `public/.htaccess`
  in the build.

## Content guardrails

- **The token is confidential until launch.** Never put its name, ticker,
  contract address or launch details in the site's markup, alt text, meta
  tags, file names or commit messages. Window 05 shows a blurred *decoy*:
  CSS blur only hides things visually, and the HTML is public. Reveal it
  only when the owner says launch is live.

- All copy is draft until the owner says otherwise; keep the draft note.
- No prices, stats, APYs, audits, partnerships or testimonials unless the
  owner supplies them as facts. No financial advice.
- PulseChain is a real project: say "PulseChain native", never imply an
  official partnership or endorsement.
- Only link to destinations the owner has confirmed (currently X, Telegram
  and the Shopify store in `src/data/site.ts`).
- The Shopify store is public too: anything the site pulls from it (product
  names, images, descriptions) must not reveal the token either.
