# Brand sources

Raw inputs as supplied. The site imports processed versions from `src/assets/`.

| File | What it is | Used for |
| --- | --- | --- |
| `degen-source.webp` | Degen, the mascot, on flat blue | Cut out to `src/assets/degen.png`; favicons in `public/` |
| `x-banner-source.jpg` | The X (Twitter) banner | Colour palette only |

## Palette (sampled from the banner)

| Token | Hex | Role |
| --- | --- | --- |
| `--acid` | `#a4e01a` | The one accent: CTAs, numbers, highlights |
| `--volt` | `#e6dd15` | Hover on acid buttons, small details |
| `--ice` | `#16c2eb` | Rare second accent (window 03 glow) |
| `--ink` | `#050605` | Page background |

## Re-cutting a character

    pip install numpy scipy pillow
    python scripts/cutout.py brand/degen-source.webp src/assets/degen.png

The script removes a flat background colour, keeps the largest shape (drops
stray marks such as generator watermarks) and cleans the blue fringe off the
black ink outline.
