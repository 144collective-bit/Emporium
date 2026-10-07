"""Make the header logo from the full graffiti logo.

    python scripts/logo_mark.py brand/logo-source.webp src/assets/logo.png

Keeps the main mark (letters, diamond and the splat they sit on), drops the
loose specks and scribbles around it, and crops tight. At header size those
specks read as dirt; the full version stays in brand/ for large uses.
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

LETTERS_BOX = (169, 259, 905, 753)  # letters + diamond in the 1024px source, padded

src, out = sys.argv[1], sys.argv[2]
rgba = np.asarray(Image.open(src).convert("RGBA")).copy()

solid = rgba[..., 3] > 40
labels, n = ndimage.label(solid)
sizes = ndimage.sum(solid, labels, range(1, n + 1))
main = ndimage.binary_dilation(labels == int(np.argmax(sizes)) + 1, iterations=2)
rgba[..., 3] = np.where(main, rgba[..., 3], 0)

img = Image.fromarray(rgba, "RGBA").crop(LETTERS_BOX)
img = img.crop(img.getbbox())
img.save(out, optimize=True)
print(f"{out} {img.size}")
