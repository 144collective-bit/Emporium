# Brand sources

Raw inputs as supplied. The site imports processed versions from `src/assets/`.

| File | What it is | Used for |
| --- | --- | --- |
| `degen-source.webp` | Degen, the mascot, on flat blue | Cut out to `src/assets/degen.png` |
| `pulse-gradient-source.webp` | The PulseChain gradient | The site palette |
| `pulsechain-logo-source.png` | The PulseChain mark, transparent | "PulseChain native" badge (`src/assets/pulsechain.png`) |
| `logo-source.webp` | The graffiti logo, transparent, full splatter | Header mark via `scripts/logo_mark.py` -> `src/assets/logo.png`; its diamond is the $DGN mark and favicon; large uses as-is |

## Palette: the PulseChain gradient

Sampled from `pulse-gradient-source.webp`. Runs red (bottom-left) to cyan
(top-right), as in the PulseChain mark.

| Token | Hex | Stop |
| --- | --- | --- |
| `--p-red` | `#ff0000` | 0% |
| `--p-pink` | `#f10e7d` | 20% |
| `--p-magenta` | `#e219e5` | 32% |
| `--p-violet` | `#8000ff` | 52% |
| `--p-blue` | `#037dff` | 72% |
| `--p-sky` | `#00b0ff` | 84% |
| `--p-cyan` | `#00eaff` | 100% |
| `--ink` | `#05050a` | Page background |

How it's used, so it stays readable:

- **The gradient** carries borders, rules, glows and large type (`--pulse`).
  Gradient *text* uses `--pulse-text`, the same stops lifted so the violet
  middle stays readable on near-black.
- **Small text** accents use `--p-cyan` only: violet is 2.4:1 on black.
- **Buttons** are a gradient border with white text, never a gradient fill:
  no single text colour is readable across the whole red-to-cyan range.
- **Window glows** take the colour of where the window sits on the comic
  page, so the page sweeps red (bottom-left) to cyan (top-right).

## Regenerating the processed art

    pip install numpy scipy pillow
    python scripts/logo_mark.py brand/logo-source.webp src/assets/logo.png

The header logo keeps the letters, diamond and main splat and drops the loose
specks, which read as dirt at header size.

## Re-cutting a character

    python scripts/cutout.py brand/degen-source.webp src/assets/degen.png

The script removes a flat background colour, keeps the largest shape (drops
stray marks such as generator watermarks) and cleans the blue fringe off the
black ink outline.

## The diamond: $DGN mark and favicons

The diamond from the logo is the **$DGN token mark** (window 05, beside the
ticker) and the favicon.

    python scripts/favicons.py
    # also writes src/assets/diamond.png, the transparent token mark

The logo's diamond on near-black with a violet glow -> `public/icon-512.png`,
`apple-touch-icon.png`, `favicon.ico`. The full logo can't be read at tab
size; the diamond can.

## Social share card

`public/og-default.jpg` (1200x630) is rendered from `scripts/og-card.html`
using the site's fonts, the full logo and the Degen cutout:

    node scripts/og-card.mjs

Needs Playwright with Chromium (`npx -y playwright@1 install chromium` once).
Re-run it after changing the logo, Degen or the tagline.
