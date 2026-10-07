# The Degen Emporium

A PulseChain native store: merch, tools and a token. This repo is the
website, a single comic-book homepage built with [Astro](https://astro.build).

## Run it

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
```

## What's here

| Path | What it is |
| --- | --- |
| `src/pages/index.astro` | The homepage |
| `src/pages/404.astro` | Not-found page |
| `src/components/ComicPage.astro` | The six comic windows (desktop page, mobile cards) |
| `src/components/Nav.astro` | Header: logo, PulseChain badge, X and Telegram |
| `src/styles/global.css` | All styles and the colour tokens |
| `src/data/site.ts` | Site name, description, social links |
| `src/assets/` | Processed art the site imports |
| `brand/` | Original art as supplied, palette notes, how to regenerate art |
| `scripts/` | Art pipeline: cutouts, header logo, favicons, share card |
| `public/` | Favicons, share card, web manifest |

## The six windows

| Window | Content |
| --- | --- |
| 01 | Brand statement: Degen, headline, follow on X |
| 02 | Drop 001 (merch), coming soon |
| 03 | X and Telegram |
| 04 | The tools: Terminal, DEX, Launcher |
| 05 | $DGN with its diamond mark: no price, contract TBA, not financial advice |
| 06 | The plan, roughly |

All copy is draft and marked as such on the page.

## Brand

Colours come from the PulseChain gradient (red, magenta, violet, blue,
cyan). See `brand/README.md` for the palette and the rules that keep it
readable.
