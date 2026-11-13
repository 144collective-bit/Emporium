# Visual rules: bloom, z-fighting, cut-out signs, the comic page, palette, type, widths, styles

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- **Minimal bloom, nothing washes out** (the owner's call). Bloom is faint
  and tight (`post.bloom` in `index.ts`: threshold 1.05, 1.2 close up and
  walking; strength at most about 0.3, less close up and on phones, whose
  low-resolution bloom spreads further). Only small, very bright things
  (bulbs, thin neon tubes and caps at 2.4, `glow()`) pass the threshold;
  big lit surfaces stay under it and keep their colour: window and
  shopfront light maps about 1-1.3, screens about 1, sign textures
  1.1-1.8. Lit panels bigger than a tube (hatches, bollard caps, uplights)
  use the softer `soft()` (1.3), and never light a whole roof or slab:
  give it a neon trim instead. Check new lights close up at night on the
  phone tier, not just from the home view.
- **No NaN reaches the bloom.** The bloom's blur spreads a single NaN or
  infinite pixel over the whole screen, which goes black (blinking as the
  bad pixel comes in and out of view). The ink pass (`post.ts`, just before
  the bloom) turns any such pixel black on its own, and `tileBatch()` leaves
  out a piece with NaN corners (with a warning in the console). The one
  that did it (2026-11) was `crest-0-2`'s lot: Coral Drive's bay park-w2 cut to
  the block's corner left its outline a repeated corner and a spike, and
  `insetPoly()` divided by zero; it tidies the outline first now
  (`tidyPoly()`, `streetplan.ts`, tested in `tests/streetplan.test.ts`).
- **Nothing flush** (z-fighting): two faces in the same plane, facing the
  same way, in different colours flicker against each other, even with the
  camera still (a door's side level with the wall it's in, a roof slab's
  edge level with its walls, glass level with its surround, a decal at the
  very height of the paving it lies on). Keep such faces at least about
  5 mm apart, or tuck one just inside the other (a roof slab 6 mm in from
  its walls, hidden by the parapet). Faces pointing into a building, or
  down under something resting on the ground, don't matter (nobody sees
  them).
- Floating cut-out signs (FX layer with a transparent texture, like the roof
  logo) need `occlude()` from `kit.ts`, or the ink outlines of whatever is
  behind them get drawn across them.

- The comic-window layout in `src/components/ComicPage.astro` is the design.
  Each window is defined by its ink outline; keep content inside the slants.
- Palette is the PulseChain gradient for the comic page and the site
  outside the city's menus. Follow `brand/README.md`: gradient for
  borders, glows and large type; `--p-cyan` for small text; buttons are
  gradient-bordered with white text, never gradient-filled. **Every menu
  in the city is the menu plan's arcade kit instead** (the owner's call,
  `docs/menu-plan.md`: the cabinet's palette `--m-*`, no PulseChain
  colours): `.mk` menus, and `.mk-skin` on the rest, which redefines the
  brand's tokens inside it. A new menu or card in the city uses one of the
  two, never the gradient.
- Type: Big Shoulders Display (headlines), Inter (body), JetBrains Mono
  (labels); in the menus' kit Pixelify Sans for headings, tabs and
  buttons (`--font-pixel`).
- Check every change at 320, 375, 768, 1024 and 1440px wide: no sideways
  scroll, no text clipped by a slanted edge.
- Styles: `global.css` (the site: tokens, the comic page, the nav, small
  screens and reduced motion), `city.css` (the city page: pins,
  panels, the mode header, Settings, the Menu), `walk.css` (walk mode, its
  HUD, the fitting room, the gun store, driving), `economy.css` (the business
  card, the market hall and the tycoon panels), then a file per game screen.
  `Base.astro` imports them in that order, which is the order rules apply
  in: keep it.
