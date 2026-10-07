"""Cut a character out of a flat-colour background.

    python scripts/cutout.py brand/degen-source.webp src/assets/degen.png

Treats every pixel near the background colour (sampled from the image
border) as background, keeps only the largest remaining shape (which drops
stray marks such as generator watermarks), feathers the edge and removes
the background colour's fringe from semi-transparent edge pixels.
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

HARD, SOFT = 28.0, 80.0  # colour distance: <= HARD is background, >= SOFT is solid

src, out = sys.argv[1], sys.argv[2]
rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
h, w, _ = rgb.shape

border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
bg = np.median(border, axis=0)
dist = np.linalg.norm(rgb - bg, axis=2)

# Solid foreground = not background-coloured, then keep the largest shape.
fg = dist > HARD
labels, n = ndimage.label(fg)
sizes = ndimage.sum(fg, labels, range(1, n + 1))
fg = labels == (int(np.argmax(sizes)) + 1)

# Feather: inside the shape alpha is 1, except within 2px of the edge where
# it follows the colour distance (anti-aliased outline pixels).
edge_band = fg & ~ndimage.binary_erosion(fg, iterations=2)
alpha = fg.astype(np.float32)
alpha[edge_band] = np.clip((dist[edge_band] - HARD) / (SOFT - HARD), 0, 1)

# Comic art is outlined in black ink, so dark edge pixels are blends of ink
# and background: split them into ink + transparency so no blue rim is left.
# Light edge detail (e.g. a gold chain) is left alone.
ink_band = fg & ~ndimage.binary_erosion(fg, iterations=3)
luma = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
ink = ink_band & (luma < 130)
k = np.clip(np.min(rgb / np.maximum(bg, 1), axis=2), 0, 1)  # share of background
alpha[ink] = np.minimum(alpha[ink], 1 - k[ink])

# Bright edge pixels whose colour leans the same way as the background
# (cyan specks beside a gold chain, say) are background bleed: drop them.
chroma = rgb - rgb.mean(axis=2, keepdims=True)
bg_chroma = bg - bg.mean()
sim = (chroma @ bg_chroma) / (np.linalg.norm(chroma, axis=2) * np.linalg.norm(bg_chroma) + 1e-6)
bleed = ink_band & ~ink & (sim > 0.75)
alpha[bleed] = 0

# Un-mix the background colour from partially transparent pixels.
a = alpha[..., None]
safe = np.where(a > 0.02, a, 1)
clean = np.clip((rgb - (1 - a) * bg) / safe, 0, 255)
clean = np.where(a > 0.02, clean, 0)

rgba = np.dstack([clean, alpha * 255]).astype(np.uint8)
img = Image.fromarray(rgba, "RGBA")
img = img.crop(img.getbbox())
img.save(out, optimize=True)
print(f"background {bg.round().astype(int).tolist()} -> {out} {img.size}")
