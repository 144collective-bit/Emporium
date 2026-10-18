# The Degen Emporium

A PulseChain native store: merch, tools and a token. This repo is the
website, built with [Astro](https://astro.build): an animated isometric city
on the homepage, whose buildings lead into the comic-book Emporium page.

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
| `src/components/CityMap.astro` | The city page: map, pins, welcome card, directory, drag-to-pan |
| `src/lib/city.ts` | Draws the city SVG: blocks, buildings, traffic, animation |
| `src/components/ComicPage.astro` | The six comic windows (desktop page, mobile cards) |
| `src/components/Nav.astro` | Header: logo, PulseChain badge, X and Telegram |
| `src/styles/global.css` | All styles and the colour tokens |
| `src/data/site.ts` | Site name, description, social and store links |
| `src/assets/` | Processed art the site imports |
| `brand/` | Original art as supplied, palette notes, how to regenerate art |
| `scripts/` | Art pipeline: cutouts, header logo, favicons, share card |
| `public/` | Favicons, share card, web manifest |

## Degen City

A night city in Degen's style (ink outlines, flat shading, PulseChain neon)
that you drag around on desktop or swipe on a phone. Cars drive the avenues,
the signal tower pulses, sparks fly from the workshop and a paper plane
circles the post office. The lit-up buildings are links:

| Building | Goes to |
| --- | --- |
| The Emporium (centre tower) | `/emporium` |
| Drop 001 (shop, shutters down) | `/emporium#drop`, or the Shopify store once `SHOP_OPEN` is true |
| The Workshop | `/emporium#workshop` |
| The Vault | `/emporium#vault` |
| Building site | `/emporium#plan` |
| Signal tower | X |
| Post office | Telegram |

The Directory button lists the same links for anyone who'd rather not
explore. On phones the welcome card has a close button and stays closed on
return visits. With reduced motion turned on, the city stands still.

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
