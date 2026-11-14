# The faces plan: degens without the balaclava

The owner's call (2026-11): "give the degens a face type that's easy to
render but matches the style of the environment ... with no balaclava or
accessories." The owner's answers:

- **The face:** a toon face. The same head shape as the balaclava
  (`headGeometry()` in body.ts: the nose ridge, cheekbones, brow and chin
  are already sculpted), coloured in a skin tone, with the ink outline
  drawing its edges. Flat ink features are laid on it about a millimetre
  off: bean eyes with a white glint, two brow strokes and a short mouth
  line. No shades, no chain.
- **Who:** the crowd first. Then an unmasked option for the player in the
  wardrobe; Degen as he is in the art keeps the balaclava by default.
- **Hair:** a few styles (buzz, crop, curls, bun, or bald), seeded per
  person like their clothes. A hat or a raised hood covers it; under a hat,
  only the hair at the nape shows.

## How it's drawn (what keeps it cheap)

- **No new draw calls.** Faces, features and hair are pieces on the
  meshes a figure or a crowd kind already has (the plain material,
  coloured per vertex, or by the crowd's wardrobe row).
- **Three colour keys** (`COLOR_KEYS` in wardrobe.ts): `skin` (the
  hands, the eye opening and the face: `Outfit.skin`, the old fixed tone
  by default), `head` (the head itself: the balaclava's black, or the skin
  when `Outfit.face` is set) and `hair` (`Outfit.hair`, its style
  `Outfit.cut`). The balaclava and the unmasked head are one piece: the
  unmasked head only changes its colour.
- **Items:** `mask` (the balaclava's folds, the eye opening and the
  shades: worn unless `face`), `features` (the face's ink: the eyes on every
  level but the far crowd's, the brows, mouth and glints as `detail`) and
  `hair-<cut>` with `hair-nape` under a hat. The far crowd (level 0) has
  the skin and the hair, no features.
- **DOM-free and tested:** the hair's shell (`hairShell()` in wardrobe.ts,
  built from the head's own outline as the hats are) stays clear of the
  head and under every hat; the features sit on the face, never in it
  (`tests/faces.test.ts`). The crowd's skin tones, hair and who goes
  unmasked are in crowdlook.ts (`unmask()`), seeded after the clothes, so
  nobody's clothes change.

## The phases

Each with the owner's sign-off.

1. **The crowd's faces** (built, signed off by the owner, 2026-11). The
   colour keys, the `mask`, `features` and hair items, and the crowd dressed
   by `unmask()`: nearly everyone in the city's crowd unmasked
   (`MASKED_SHARE`, about one in seven, still wears the balaclava and shades,
   and the bouncers all do), a skin tone from `SKIN_TONES` and a hair style
   and colour, seeded. Shots: `docs/faces-shots/` (a close-up; buzz,
   curls, bun and a cap over the nape; the crowd by the Emporium). It costs
   no draw calls; the near crowd's meshes carry about 14% more vertices,
   the far crowd's about 3% (one hair shape for every cut far off).
2. **The player's option** (built, waiting on the owner's sign-off). The
   owner's answers: a Face tab of its own, all free, the shades optional
   on a face. `Look` (profile-data.ts) gets `face`, `tone`, `hair`, `cut`
   (`CUTS`, with `bald`) and `shades`, its colours from `PALETTE.tone` and
   `PALETTE.hair` (the crowd's own); `cleanLook()` keeps looks saved
   before faces in the balaclava and falls back on anything else (the
   game server checks the same). `lookOutfit()` maps it (the tone always,
   on the hands too). Drop 001's fitting room has a **Face** tab: Balaclava,
   Buzz, Crop, Curls, Bun, Bald, with Skin and Hair rows; the Shades tab
   offers Shades or No shades on a face (the lenses' row as before), and
   the Shades Chain is offered only with them on. The shades are their
   own item (`shades` in wardrobe.ts). The character screen says the face
   (`describe()`); the first-person hands and fists take the tone. Other
   players see it (the look is their profile's). The tabs sit five and four
   in two rows. Shots: `docs/faces-shots/fitting.png`,
   `fitting-shades.png`.
3. **Faces that move (optional).** A blink and two or three expressions
   (a grin, a frown) for emotes and the Fight Club, still within the same
   draw calls; held still under `prefers-reduced-motion`.
