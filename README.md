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
- **Alive:** cars and buses stop at traffic lights, Degen-style people walk
  the sidewalks and queue at the shop, boats on the river, drones, a blimp,
  birds by day, sparks from the workshop, a swinging crane.
- **Sky:** day, sunset and night follow the visitor's clock (or pick one in
  City settings); rain comes and goes, with wet neon streets.
- **Sound:** a synthesised city hum, rain and a beat near the Emporium, off
  until the visitor turns it on.
- **Every device:** phones get a lighter version; slow devices back off
  automatically. Without WebGL, or after choosing "2D map", the original
  isometric SVG map is shown instead. Reduced motion gives a still city.

| Building | Panel button goes to |
| --- | --- |
| The Emporium (centre tower) | `/emporium` |
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
