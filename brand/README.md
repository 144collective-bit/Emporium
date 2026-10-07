# Brand sources

Raw inputs as supplied. The site imports processed versions from `src/assets/`.

| File | What it is | Used for |
| --- | --- | --- |
| `degen-source.webp` | Degen, the mascot, on flat blue | Cut out to `src/assets/degen.png`; favicons in `public/` |
| `x-banner-source.jpg` | The X (Twitter) banner | Colour palette only |
| `logo-source.webp` | The graffiti logo, transparent, full splatter | Header mark via `scripts/logo_mark.py` -> `src/assets/logo.png`; large uses as-is |

## Palette (sampled from the banner)

| Token | Hex | Role |
| --- | --- | --- |
| `--acid` | `#a4e01a` | The one accent: CTAs, numbers, highlights |
| `--volt` | `#e6dd15` | Hover on acid buttons, small details |
| `--ice` | `#16c2eb` | Rare second accent (window 03 glow) |
| `--ink` | `#050605` | Page background |

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
