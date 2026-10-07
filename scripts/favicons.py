"""The logo's diamond: the $DGN token mark and the favicons.

    python scripts/favicons.py
    # -> src/assets/diamond.png (transparent, the $DGN mark in window 05)
    # -> public/icon-512.png, apple-touch-icon.png, favicon.ico

The full graffiti logo can't be read at 16-32px, so the icon is its most
recognisable piece: the cyan diamond, lifted out of brand/logo-source.webp
with its black ink outline, centred on the site's near-black with a soft
PulseChain-violet glow behind it.
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
from scipy.spatial import ConvexHull

INK = (5, 5, 10)                   # --ink
GLOW = (128, 0, 255)               # --p-violet
REGION = (380, 250, 630, 465)      # around the diamond in the 1024px source
DIAMOND_SHARE = 0.80               # diamond width as a share of the icon
DIAMOND_TIP_Y = 425                # the lettering starts below this (source y)


def diamond():
    """The diamond and its ink outline, on transparency, cropped tight."""
    src = Image.open("brand/logo-source.webp").convert("RGBA").crop(REGION)
    rgba = np.asarray(src).astype(int)
    r, g, b, a = (rgba[..., i] for i in range(4))

    # The diamond's facets are mint (green above blue). Nothing else near it
    # is: the DEGEN letters are sky cyan, THE and HODL are lime and yellow.
    # Its facets are split by thick ink lines, so take the outline that
    # wraps every mint pixel (convex hull) as the diamond's silhouette.
    mint = (a > 200) & (g > 170) & (g > b + 15) & (r < 150)
    # Keep the facets: sizeable mint shapes above the diamond's tip. Smaller
    # or lower ones are highlights in the lettering around it.
    labels, n = ndimage.label(mint)
    ids = np.arange(1, n + 1)
    sizes = ndimage.sum(mint, labels, ids)
    centre_y = np.array([c[0] for c in ndimage.center_of_mass(mint, labels, ids)]) + REGION[1]
    facets = ids[(sizes >= 100) & (centre_y < DIAMOND_TIP_Y)]
    ys, xs = np.nonzero(np.isin(labels, facets))
    pts = np.column_stack([xs, ys])
    hull = pts[ConvexHull(pts).vertices]
    mask = Image.new("L", src.size, 0)
    ImageDraw.Draw(mask).polygon([tuple(p) for p in hull], fill=255)
    body = np.asarray(mask) > 0

    # Grow it to take in the black outline and the cracks drawn across it
    keep = ndimage.binary_dilation(body, iterations=9) & (a > 0)
    out = np.asarray(src).copy()
    out[..., 3] = np.where(keep, out[..., 3], 0)
    img = Image.fromarray(out, "RGBA")
    return img.crop(img.getbbox())


def icon(size, gem):
    canvas = Image.new("RGBA", (size, size), INK + (255,))

    # Soft violet glow behind the diamond
    r = int(size * 0.34)
    disc = Image.new("L", (size, size), 0)
    disc.paste(150, (size // 2 - r, size // 2 - r, size // 2 + r, size // 2 + r))
    glow = Image.new("RGBA", (size, size), GLOW + (0,))
    glow.putalpha(disc.filter(ImageFilter.GaussianBlur(max(1, size * 0.14))))
    canvas.alpha_composite(glow)

    w = int(size * DIAMOND_SHARE)
    h = round(gem.height * w / gem.width)
    g = gem.resize((w, h), Image.LANCZOS)
    canvas.alpha_composite(g, ((size - w) // 2, (size - h) // 2))
    return canvas.convert("RGB")


gem = diamond()
gem.save("src/assets/diamond.png", optimize=True)
for size, name in [(512, "icon-512.png"), (180, "apple-touch-icon.png")]:
    icon(size, gem).save(f"public/{name}", optimize=True)

# Small sizes are rendered directly rather than shrunk from 512, so the
# outline stays crisp at 16px.
small = [icon(s, gem) for s in (16, 32, 48)]
small[-1].save("public/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], append_images=small[:-1])
print(f"wrote src/assets/diamond.png {gem.size}, public/icon-512.png, apple-touch-icon.png, favicon.ico")
