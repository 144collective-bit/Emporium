"""Favicons from Degen's head on the PulseChain gradient.

    python scripts/favicons.py
    # -> public/icon-512.png, apple-touch-icon.png, favicon.ico

The gradient runs red (bottom-left) to cyan (top-right), as in the
PulseChain mark.
"""
import numpy as np
from PIL import Image

STOPS = [  # position, colour - sampled from brand/pulse-gradient-source.webp
    (0.00, (255, 0, 0)),
    (0.20, (241, 14, 125)),
    (0.32, (226, 25, 229)),
    (0.52, (128, 0, 255)),
    (0.72, (3, 125, 255)),
    (0.84, (0, 176, 255)),
    (1.00, (0, 234, 255)),
]


def gradient(size):
    y, x = np.mgrid[0:size, 0:size] / (size - 1)
    t = (x + (1 - y)) / 2  # 0 at bottom-left, 1 at top-right
    pos = np.array([p for p, _ in STOPS])
    cols = np.array([c for _, c in STOPS], dtype=float)
    rgb = np.stack([np.interp(t, pos, cols[:, i]) for i in range(3)], axis=-1)
    return Image.fromarray(rgb.astype(np.uint8), "RGB").convert("RGBA")


degen = Image.open("src/assets/degen.png").convert("RGBA")
x0, y0, x1, y1 = degen.crop((0, 0, degen.width, 470)).getbbox()  # the head
side = max(x1 - x0, y1 - y0) + 40
cx = (x0 + x1) // 2
head = degen.crop((cx - side // 2, -20, cx + side // 2, side - 20))

for size, name in [(512, "icon-512.png"), (180, "apple-touch-icon.png")]:
    icon = gradient(size)
    h = head.resize((int(size * 0.92), int(size * 0.92)), Image.LANCZOS)
    icon.alpha_composite(h, ((size - h.width) // 2, size - h.height))
    icon.convert("RGB").save(f"public/{name}", optimize=True)

Image.open("public/icon-512.png").save("public/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("wrote public/icon-512.png, apple-touch-icon.png, favicon.ico")
