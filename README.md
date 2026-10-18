# The Degen Emporium

A PulseChain native store: merch, tools and a token. This repo is the
website, built with [Astro](https://astro.build): a living 3D city on the
homepage, whose buildings lead into the comic-book Emporium page.

## Run it

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
```

## Put it live (Hostinger)

degenemporium.com is hosted on Hostinger as a static site.

1. **Get the zip.** Every push to `main` builds the site: on GitHub open
   **Actions -> Build site**, pick the latest green run and download
   **degenemporium-site** under Artifacts. (Or run `npm run build` locally
   and use everything inside `dist/`.)
2. **Upload.** In hPanel open **File Manager -> public_html**, back up or
   remove the old files, upload the zip and **Extract** it right there, so
   `index.html` sits directly in `public_html`. Delete the zip afterwards.
3. **Check** https://degenemporium.com (hard refresh if the old version
   shows).

`public/.htaccess` ships with every build: it serves the site's 404 page,
compresses text files and caches the fingerprinted files in `/_astro/` for a
year. It starts with a dot, so some file managers hide it.

## What's here

| Path | What it is |
| --- | --- |
| `src/pages/index.astro` | The homepage: Degen City |
| `src/pages/emporium.astro` | The Emporium: the comic page |
| `src/pages/404.astro` | Not-found page |
| `src/components/CityMap.astro` | The city page (see Degen City below) |
| `src/scripts/city3d/` | The 3D city |
| `src/lib/city.ts` | The 2D city map |
| `src/components/ComicPage.astro` | The six comic windows (desktop page, mobile cards) |
| `src/components/Nav.astro` | Header: logo, PulseChain badge, X and Telegram |
| `src/styles/global.css` | All styles and the colour tokens |
| `src/data/site.ts` | Site name, description, social and store links |
| `src/assets/` | Processed art the site imports |
| `brand/` | Original art as supplied, palette notes, how to regenerate art |
| `scripts/` | Art pipeline: cutouts, header logo, favicons, share card |
| `public/` | Favicons, share card, web manifest |

## Degen City

The homepage is a living 3D city in Degen's style: ink outlines, flat
cartoon shading and PulseChain neon, built with [three.js](https://threejs.org).

- **Explore:** drag to move, right-drag or two fingers to turn, scroll or pinch
  to zoom. The camera flies in on load.
- **Buildings are doors:** hover lights a building up; clicking it flies the
  camera in and opens a glass panel with that section and a button onward.
- **The Emporium** is the centrepiece: a black-and-gold flagship palace that
  fills its block, under a great gold-ribbed dome with the logo on top. It
  has a grand columned front on the street corner, LED screens and tickers
  on both street fronts, a helipad, a viewing deck and searchlights on its
  corner pavilions, and a forecourt fountain. After dark, marquee lights chase
  along its cornices, pavilions and dome ribs.
- **Alive:** cars and buses stop at traffic lights, Degen-style people walk
  the sidewalks and queue at the shop, boats on the river, drones, a blimp,
  birds by day, sparks from the workshop, a swinging crane.
- **Sky:** day, sunset and night follow the visitor's clock (or pick one in
  City settings); rain comes and goes, with wet neon streets.
- **Sound:** a synthesised city hum, rain and a beat near the Emporium, off
  until the visitor turns it on.
- **Every device:** phones get a lighter version that idles at 30fps and runs
  at full rate while you touch it; slow devices step quality down
  automatically. Pin labels shrink with distance and fold to dots when they
  would overlap. Without WebGL, or after choosing "2D map", the original
  isometric SVG map is shown instead. Reduced motion gives a still city.

### Walk mode

Press **Walk** to play as Degen (balaclava, red cap, green shades, suit, a bag
of Gas Fee Gummy Bears) and explore on foot.

- **Desktop:** click the city to capture the mouse, then move it to look
  around (up at the towers and the sky too). WASD or arrow keys to move and
  strafe, hold Shift to run (R or Caps Lock toggles it), Space to jump (hold
  for a higher jump), right-click to aim in close, V for first person, scroll
  for camera distance, E to enter a door. Esc frees the mouse; press it again
  to stop walking.
- **Phones:** joystick bottom-left (push it to the edge to run), Run and Jump
  buttons bottom-right, drag anywhere else to look.
- **Gamepads:** left stick moves, right stick looks, A jumps, LB or L3 runs,
  LT aims, Y enters a door, View switches to first person.
- **Controls** (top-left while walking) sets look speed, invert up/down and
  first person, and lists the keys. The settings are saved in the browser.
- The camera sits over his shoulder, slides in front of walls instead of
  going through them, and widens a little when he runs.
- The world is solid: landmarks, your buildings, the fountain and the river
  block you (bridges don't), kerbs step up and down, and cars stop for you.
- Walk up to a landmark's door and press **E** (or tap the prompt) to open its
  panel right where you stand.

### City builder (demo)

Press **Build** to switch to build mode. The districts around the city
(North, West and East, past the ring roads) are divided into 99 plots.

- **Pick a plot** (tap, click or use the arrow keys) to see its size, tier and
  price.
- **Buy it** with the demo wallet: connect, confirm, and watch the simulated
  "Approve in wallet" and "Confirming on PulseChain" steps.
- **Build on it:** choose from eight buildings (house, shopfront, tower, loft,
  arcade, pocket park, warehouse, billboard lot) and customise walls, neon,
  floors, sign and rotation with a live preview. Edit, demolish or release
  the plot (refunds the demo PLS) any time.

Everything is simulated for now: no wallet connects, nothing touches
PulseChain and no real PLS moves. Progress is saved in the visitor's browser,
and **Reset demo** clears it. Prices in `src/data/plots.ts` are placeholders.
When the real wallet is ready, it plugs into `src/scripts/city3d/store.ts`.

| Building | Panel button goes to |
| --- | --- |
| The Emporium (centre palace) | `/emporium` |
| Drop 001 (shop, shutters down) | `/emporium#drop`, or the Shopify store once `SHOP_OPEN` is true |
| The Workshop | `/emporium#workshop` |
| The Vault | `/emporium#vault` |
| Building site | `/emporium#plan` |
| Signal tower | X |
| Post office | Telegram |

The Directory lists the same places. On phones the welcome card has a close
button and stays closed on return visits.

### Where it lives

| Path | What it is |
| --- | --- |
| `src/components/CityMap.astro` | The page: 2D map, 3D host, pins, settings, panels, directory |
| `src/scripts/city3d/index.ts` | Boot, quality tiers, camera, hover/click, panels, loop |
| `src/scripts/city3d/world.ts` | Ground, roads, river, trees, lamps, skyline |
| `src/scripts/city3d/landmarks.ts` | The buildings, signs and their animations |
| `src/scripts/city3d/life.ts` | Traffic and lights, people, boats, drones, blimp, birds |
| `src/scripts/city3d/sky.ts` | Time of day, sun and moon, fog, clouds, rain |
| `src/scripts/city3d/post.ts` | Ink outlines and bloom |
| `src/scripts/city3d/sound.ts` | Ambient sound |
| `src/scripts/city3d/walk.ts` | Walk mode: Degen, mouse / keyboard / touch / gamepad controls, camera, collisions, door prompts |
| `src/scripts/city3d/plots.ts` | Plot grid, build-mode overlay, the eight buildings |
| `src/scripts/city3d/store.ts` | Demo wallet, simulated purchases, saved progress |
| `src/scripts/city3d/builder-ui.ts` | Build mode: wallet chip, plot panel, customiser, purchase dialog |
| `src/data/plots.ts` | Plot prices (placeholders), building catalogue, colours, sign texts |
| `src/scripts/city3d/kit.ts` | Toon materials, canvas textures, batching |
| `src/lib/city.ts` | The 2D isometric map (fallback and loading poster) |

## The six windows (`/emporium`)

| Window | Content |
| --- | --- |
| 01 | Brand statement: Degen, headline, follow on X |
| 02 | Drop 001 (merch), coming soon. "Enter the store" is disabled until `SHOP_OPEN` in `src/data/site.ts` is true |
| 03 | X and Telegram |
| 04 | The tools: Terminal, DEX, Launcher |
| 05 | The token: blurred and marked classified until launch (decoy content only) |
| 06 | The plan, roughly |

All copy is draft and marked as such on the page. A red "Coming soon"
stamp marks the whole page as a preview.

## Brand

Colours come from the PulseChain gradient (red, magenta, violet, blue,
cyan). See `brand/README.md` for the palette and the rules that keep it
readable.
